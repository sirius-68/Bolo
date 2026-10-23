/** Mapbox public token (pk.*) — meant to ship in the app. Restrict usage with a billing cap, not URL restrictions. */
export const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN || 'pk.eyJ1IjoiZWtvbGUwMCIsImEiOiJjbXZsNnRiN2MwdW16MnhzYnh1dDNvN3N2In0.xPmANBFVqknkyGnjVNAfbw';

/** The native Mapbox module (missing in Expo Go / web) — callers fall back to the drawn map. */
let M: any = null;
try {
  M = require('@rnmapbox/maps').default;
  M?.setAccessToken?.(MAPBOX_TOKEN);
  M?.setTelemetryEnabled?.(false);
} catch {
  M = null;
}
export const Mapbox = M;
export const hasMapbox = !!M;
