import { importLibrary, setOptions } from '@googlemaps/js-api-loader';

let configured = false;

export function loadGoogleLibrary<T extends keyof google.maps.ImportLibraryMap>(name: T) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return Promise.reject(new Error('Google Maps is not configured. Add the browser key and reload the page.'));
  if (!configured) {
    setOptions({ key, v: 'weekly', language: 'en', region: 'PK' });
    configured = true;
  }
  return importLibrary(name);
}
