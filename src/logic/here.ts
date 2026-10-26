/* Where the person is: live GPS position and the city name it resolves to.
   Used by the map, distances and the "city" shown in headers. Works anywhere in the world. */
import * as Location from 'expo-location';
import { db } from '../data/db';
import { bump } from './live';
import type { LngLat } from '../data/geo';

let busy: Promise<LngLat | null> | null = null;

export const hasCoord = () => Array.isArray(db.user.coord);

/** Permission state without asking. */
export async function locGranted() {
  try {
    return (await Location.getForegroundPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/** Get the current position (asks for permission only when `ask` is true) and update the city name. */
export function locate(ask = false): Promise<LngLat | null> {
  if (busy) return busy;
  busy = (async () => {
    try {
      let p = await Location.getForegroundPermissionsAsync();
      if (!p.granted && ask && p.canAskAgain !== false) p = await Location.requestForegroundPermissionsAsync();
      if (!p.granted) return null;
      const pos =
        (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 })) ||
        (await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), new Promise<null>((r) => setTimeout(() => r(null), 12_000))]));
      if (!pos) return null;
      const c: LngLat = [pos.coords.longitude, pos.coords.latitude];
      db.user.coord = c;
      if (db.user.cityAuto !== false) {
        try {
          const g = (await Location.reverseGeocodeAsync({ latitude: c[1], longitude: c[0] }))[0];
          const name = g?.city || g?.district || g?.subregion || g?.region;
          if (name) db.user.city = name;
          if (g?.isoCountryCode) db.user.country = g.isoCountryCode;
        } catch {}
      }
      bump();
      return c;
    } catch {
      return null;
    } finally {
      setTimeout(() => (busy = null), 0);
    }
  })();
  return busy;
}

/** Person picked a city by hand: stop overwriting it from GPS. */
export function setCityManually(city: string) {
  db.user.city = city;
  db.user.cityAuto = false;
  bump();
}
/** Go back to the city from GPS. */
export async function gpsCity(): Promise<boolean> {
  db.user.cityAuto = true;
  const c = await locate(true);
  return !!c;
}
