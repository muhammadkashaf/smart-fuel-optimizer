// Google Routes is called only from the server; callers receive provider-neutral route geometry.
const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const FIELD_MASK = "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.routeLabels";

export class RoutingError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const validCoordinates = (value) => value &&
  typeof value.lat === "number" && Number.isFinite(value.lat) && Math.abs(value.lat) <= 90 &&
  typeof value.lng === "number" && Number.isFinite(value.lng) && Math.abs(value.lng) <= 180;

export function decodePolyline(encoded) {
  if (typeof encoded !== "string" || !encoded || encoded.length > 100000) return null;
  const coordinates = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    const deltas = [];
    for (let axis = 0; axis < 2; axis++) {
      let result = 0, shift = 0, chunk;
      do {
        if (index >= encoded.length || shift > 30) return null;
        chunk = encoded.charCodeAt(index++) - 63;
        if (chunk < 0 || chunk > 63) return null;
        result += (chunk & 0x1f) * 2 ** shift;
        shift += 5;
      } while (chunk >= 0x20);
      deltas.push(result % 2 ? -(result + 1) / 2 : result / 2);
    }
    lat += deltas[0]; lng += deltas[1];
    const point = { lat: lat / 1e5, lng: lng / 1e5 };
    if (!validCoordinates(point)) return null;
    coordinates.push([point.lng, point.lat]);
  }
  return coordinates.length >= 2 ? coordinates : null;
}

export function createRoutingProvider({ fetcher = (...args) => fetch(...args), getKey = () => process.env.GOOGLE_ROUTES_API_KEY, timeoutMs = 15000 } = {}) {
  return {
    async directions(start, destination) {
      const key = getKey()?.trim();
      if (!key) throw new RoutingError(503, "ROUTING_NOT_CONFIGURED", "Route planning is not configured yet. Please contact your administrator.");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetcher(ROUTES_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key, "X-Goog-FieldMask": FIELD_MASK },
          body: JSON.stringify({
            origin: { location: { latLng: { latitude: start.lat, longitude: start.lng } } },
            destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
            travelMode: "DRIVE",
            routingPreference: "TRAFFIC_UNAWARE",
            computeAlternativeRoutes: true,
            polylineQuality: "OVERVIEW",
            regionCode: "pk",
          }),
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          if (response.status === 429) throw new RoutingError(429, "ROUTING_RATE_LIMIT", "The route service is busy. Please wait a minute and try again.");
          if ([401, 403].includes(response.status)) throw new RoutingError(503, "ROUTING_UNAVAILABLE", "Route planning is temporarily unavailable. Please contact your administrator.");
          if (response.status === 404 || data?.error?.status === "NOT_FOUND") throw new RoutingError(422, "NO_ROUTE", "No driving route was found. Try nearby roads or more specific locations.");
          if (response.status === 400 || response.status === 422) throw new RoutingError(422, "INVALID_LOCATION", "These locations could not be routed. Choose more specific locations near a road.");
          throw new RoutingError(503, "ROUTING_UNAVAILABLE", "The route service is temporarily unavailable. Please try again later.");
        }
        if (!data || (data.routes !== undefined && !Array.isArray(data.routes))) throw new RoutingError(502, "INVALID_PROVIDER_RESPONSE", "The route service returned an incomplete result. Please try again.");
        const routes = (data.routes ?? []).map((route) => {
          const seconds = typeof route?.duration === "string" && /^\d+(?:\.\d+)?s$/.test(route.duration) ? Number(route.duration.slice(0, -1)) : NaN;
          const coordinates = decodePolyline(route?.polyline?.encodedPolyline);
          if (!Number.isFinite(route?.distanceMeters) || route.distanceMeters <= 0 || !Number.isFinite(seconds) || seconds <= 0 || !coordinates) {
            throw new RoutingError(502, "INVALID_PROVIDER_RESPONSE", "The route service returned an incomplete result. Please try again.");
          }
          return { distanceKm: route.distanceMeters / 1000, durationMinutes: seconds / 60, geometry: { type: "LineString", coordinates } };
        });
        return { routes };
      } catch (error) {
        if (error instanceof RoutingError) throw error;
        if (controller.signal.aborted) throw new RoutingError(504, "ROUTING_TIMEOUT", "The route service took too long to respond. Please try again.");
        // Never expose provider URLs, headers, keys, or raw Google errors to callers.
        throw new RoutingError(503, "ROUTING_UNAVAILABLE", "The route service could not be reached. Please try again later.");
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

export const routingProvider = createRoutingProvider();
