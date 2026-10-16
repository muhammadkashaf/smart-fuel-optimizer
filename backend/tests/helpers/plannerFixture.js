// Isolated in-memory test data. This module is never imported by the production server.
import bcrypt from "bcryptjs";
import User from "../../models/User.js";
import Vehicle from "../../models/Vehicle.js";
import Trip from "../../models/Trip.js";
import Budget from "../../models/Budget.js";
import FuelRecord from "../../models/FuelRecord.js";
import Notification from "../../models/Notification.js";
import { routingProvider } from "../../services/routingProvider.js";

export const ids = {
  individual: "111111111111111111111111", organization: "222222222222222222222222", admin: "333333333333333333333333",
  vehicle: "aaaaaaaaaaaaaaaaaaaaaaaa", orgVehicle: "bbbbbbbbbbbbbbbbbbbbbbbb", trip: "cccccccccccccccccccccccc", orgTrip: "dddddddddddddddddddddddd",
};
export const locations = [
  { id: "lahore-1", label: "Gulberg, Lahore, Punjab, Pakistan", coordinates: { lat: 31.5105, lng: 74.3440 } },
  { id: "lahore-2", label: "Lahore Fort, Lahore, Punjab, Pakistan", coordinates: { lat: 31.5880, lng: 74.3153 } },
];
export function fixtureRoutes(start = locations[0].coordinates, destination = locations[1].coordinates) {
  return [36, 42, 30].map((distanceKm, index) => ({ distanceKm, durationMinutes: [40, 35, 46][index], geometry: {
    type: "LineString", coordinates: [[start.lng, start.lat], [74.32 + index * 0.015, 31.55], [destination.lng, destination.lat]],
  } }));
}

export function installPlannerFixture() {
  const restorers = [];
  const replace = (target, key, value) => { const original = target[key]; target[key] = value; restorers.push(() => { target[key] = original; }); };
  const password = bcrypt.hashSync("RoutePlanner123!", 4);
  const users = [
    { _id: ids.individual, id: ids.individual, fullName: "Planner Test", role: "Individual", email: "planner@example.test", password },
    { _id: ids.organization, id: ids.organization, fullName: "Organization Test", role: "Organizational", email: "organization@example.test", password },
    { _id: ids.admin, id: ids.admin, fullName: "Admin Test", role: "Admin", email: "admin@example.test", password },
  ];
  const vehicles = [
    { _id: ids.vehicle, userId: ids.individual, vehicleName: "Toyota Corolla", registrationNumber: "LEA-2026", manufacturer: "Toyota", modelYear: 2024, fuelType: "Petrol", fuelEfficiency: 12, fuelTankCapacity: 50 },
    { _id: ids.orgVehicle, userId: ids.organization, vehicleName: "Fleet EV", registrationNumber: "ORG-2026", manufacturer: "BYD", modelYear: 2025, fuelType: "Electric", fuelEfficiency: 6, fuelTankCapacity: 60 },
  ];
  const trips = new Map();
  const notifications = new Map();
  for (const [id, userId, vehicleId] of [[ids.trip, ids.individual, ids.vehicle], [ids.orgTrip, ids.organization, ids.orgVehicle]]) {
    trips.set(id, { _id: id, userId, vehicleId, startLocation: "Gulberg Lahore", destination: "Lahore Fort", tripDate: new Date("2026-10-20"), priority: "Normal", purpose: "Team meeting", status: "Planned", createdAt: new Date(), updatedAt: new Date() });
  }
  const matches = (item, filter) => Object.entries(filter).every(([key, value]) => value?.$in
    ? value.$in.some((id) => String(id) === String(item[key]))
    : value instanceof Date ? item[key]?.getTime() === value.getTime() : String(item[key]) === String(value));
  const query = (value, populate = () => {}) => ({
    select() { return this; }, sort() { return this; },
    populate() { populate(); return this; },
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject); },
  });
  const tripDoc = (raw) => {
    if (!raw) return null;
    const doc = structuredClone(raw);
    Object.defineProperties(doc, {
      populate: { value: async () => { doc.vehicleId = structuredClone(vehicles.find((vehicle) => vehicle._id === String(doc.vehicleId))); return doc; } },
      save: { value: async () => { doc.updatedAt = new Date(Math.max(Date.now(), doc.updatedAt.getTime() + 1)); trips.set(doc._id, structuredClone(doc)); return doc; } },
      deleteOne: { value: async () => trips.delete(doc._id) },
    });
    return doc;
  };
  replace(User, "findById", (id) => query(users.find((user) => user._id === String(id))));
  replace(User, "findOne", (filter) => query(users.find((user) => matches(user, filter))));
  replace(User, "countDocuments", async () => users.length);
  replace(Vehicle, "countDocuments", async () => vehicles.length);
  replace(Vehicle, "findOne", async (filter) => vehicles.find((vehicle) => matches(vehicle, filter)) ?? null);
  replace(Vehicle, "findById", (id) => query(vehicles.find((vehicle) => vehicle._id === String(id))));
  replace(Vehicle, "find", (filter) => query(vehicles.filter((vehicle) => matches(vehicle, filter))));
  replace(Budget, "findOne", () => query(null));
  replace(FuelRecord, "aggregate", async () => []);
  const notificationKey = (filter) => `${filter.userId}:${filter.dedupeKey}`;
  replace(Notification, "findOneAndUpdate", async (filter, update) => {
    const key = notificationKey(filter);
    const item = notifications.get(key) ?? { _id: String(notifications.size + 1).padStart(24, "0"), ...filter, ...update.$setOnInsert, createdAt: new Date() };
    Object.assign(item, update.$set);
    notifications.set(key, item);
    return item;
  });
  replace(Notification, "updateOne", async (filter, update) => {
    const item = notifications.get(notificationKey(filter));
    if (item && (filter.isResolved === undefined || item.isResolved === filter.isResolved)) Object.assign(item, update.$set);
  });
  replace(Notification, "updateMany", async (filter, update) => {
    for (const item of notifications.values()) {
      if (String(item.userId) !== String(filter.userId) || (filter.type && item.type !== filter.type)) continue;
      if (filter.isResolved !== undefined && item.isResolved !== filter.isResolved) continue;
      if (filter.dedupeKey?.$nin?.includes(item.dedupeKey)) continue;
      Object.assign(item, update.$set);
    }
  });
  replace(Notification, "countDocuments", async (filter) => [...notifications.values()].filter((item) =>
    String(item.userId) === String(filter.userId) &&
    (filter.isRead === undefined || item.isRead === filter.isRead) &&
    (filter.isResolved === undefined || item.isResolved === filter.isResolved)).length);
  replace(Notification, "find", (filter) => {
    const items = [...notifications.values()].filter((item) => String(item.userId) === String(filter.userId));
    let offset = 0;
    let limit = 20;
    const result = { sort() { return this; }, skip(value) { offset = value; return this; },
      limit(value) { limit = value; return this; }, lean: async () => items.slice(offset, offset + limit) };
    return result;
  });
  replace(Trip, "findOne", async (filter) => tripDoc([...trips.values()].find((trip) => matches(trip, filter))));
  replace(Trip, "findById", (id) => { const doc = tripDoc(trips.get(String(id))); return query(doc, () => doc?.populate()); });
  replace(Trip, "find", (filter) => { const docs = [...trips.values()].filter((trip) => matches(trip, filter)).map(tripDoc); return query(docs, () => docs.forEach((doc) => doc.populate())); });
  replace(Trip, "create", async (data) => {
    const model = new Trip(data);
    const invalid = model.validateSync();
    if (invalid) throw invalid;
    const raw = { ...JSON.parse(JSON.stringify(model.toObject())), tripDate: new Date(data.tripDate), createdAt: new Date(), updatedAt: new Date() };
    trips.set(raw._id, raw);
    return tripDoc(raw);
  });
  replace(Trip, "findOneAndUpdate", async (filter, update) => {
    const raw = [...trips.values()].find((trip) => matches(trip, filter));
    if (!raw) return null;
    Object.assign(raw, structuredClone(update.$set), { updatedAt: new Date(Math.max(Date.now(), raw.updatedAt.getTime() + 1)) });
    return tripDoc(raw);
  });
  replace(routingProvider, "directions", async (start, destination) => ({ routes: fixtureRoutes(start, destination) }));
  return { users, vehicles, trips, restore: () => restorers.reverse().forEach((restore) => restore()) };
}
