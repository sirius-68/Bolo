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

let lastSaved: { t: number; c: LngLat } | null = null;
/** My exact position is private (for directions on my bookings); the public profile shows it rounded to ~1 km. */
function saveLocation(c: LngLat) {
  if (!db.uid) return;
  const moved = lastSaved ? Math.abs(lastSaved.c[0] - c[0]) + Math.abs(lastSaved.c[1] - c[1]) : 1;
  if (lastSaved && moved < 0.003 && Date.now() - lastSaved.t < 30 * 60_000) return;
  lastSaved = { t: Date.now(), c };
  const { supabase } = require('../lib/supabase');
  void supabase.rpc('set_my_location', { lat: c[1], lng: c[0] });
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
      saveLocation(c);
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

/** Person picked a city by hand: stop overwriting it from GPS.
    The city is also looked up on the map (when the phone can), so distances and "near you" follow it
    even without GPS. If the lookup fails, the name is kept as typed. */
export function setCityManually(city: string, iso?: string, country?: string) {
  const name = city.trim().replace(/\s+/g, ' ');
  if (!name) return;
  db.user.city = name;
  db.user.cityAuto = false;
  if (iso) db.user.country = iso;
  bump();
  void (async () => {
    try {
      const hit = (await Location.geocodeAsync(country ? `${name}, ${country}` : name))[0];
      if (!hit || db.user.city !== name) return;
      // GPS, when it is on, knows better than a city centre
      if (await locGranted()) return;
      const c: LngLat = [hit.longitude, hit.latitude];
      db.user.coord = c;
      lastSaved = null;
      saveLocation(c);
      bump();
    } catch {}
  })();
}
/** Go back to the city from GPS. */
export async function gpsCity(): Promise<boolean> {
  db.user.cityAuto = true;
  const c = await locate(true);
  return !!c;
}
