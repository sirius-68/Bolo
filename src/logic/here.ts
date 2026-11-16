/* Where the person is: live GPS position and the city name it resolves to.
   Used by the map, distances and the "city" shown in headers. Works anywhere in the world. */
import * as Location from 'expo-location';
import { db } from '../data/db';
import { bump } from './live';
import type { LngLat } from '../data/geo';
import { MAPBOX_TOKEN } from '../lib/mapbox';

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

export type Place = { city: string; region?: string; iso?: string; coord?: LngLat };

/** Why a position could not be read (for a message that tells the person what to do). */
export type GpsFail = 'denied' | 'blocked' | 'off' | 'unknown';
/** Where the phone is right now, as a place name. Does not change anyone's saved city: the caller decides what it is for
    (my own city, a business's city, a CV). */
export async function gpsPlace(): Promise<Place | GpsFail> {
  try {
    let p = await Location.getForegroundPermissionsAsync();
    if (!p.granted && p.canAskAgain !== false) p = await Location.requestForegroundPermissionsAsync();
    if (!p.granted) return p.canAskAgain === false ? 'blocked' : 'denied';
    if (!(await Location.hasServicesEnabledAsync().catch(() => true))) return 'off';
    const pos =
      (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 })) ||
      (await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), new Promise<null>((r) => setTimeout(() => r(null), 12_000))]));
    if (!pos) return 'unknown';
    const coord: LngLat = [pos.coords.longitude, pos.coords.latitude];
    let city = '';
    let iso: string | undefined;
    let region: string | undefined;
    try {
      const g = (await Location.reverseGeocodeAsync({ latitude: coord[1], longitude: coord[0] }))[0];
      city = g?.city || g?.district || g?.subregion || g?.region || '';
      iso = g?.isoCountryCode || undefined;
      region = g?.region || undefined;
    } catch {}
    // the phone's own lookup can be missing (no Google services): ask the map service instead
    if (!city) {
      const hit = (await reverseCity(coord))[0];
      if (hit) ({ city, iso, region } = { city: hit.city, iso: hit.iso || iso, region: hit.region });
    }
    return city ? { city, iso, region, coord } : 'unknown';
  } catch {
    return 'unknown';
  }
}

const GEO = 'https://api.mapbox.com/geocoding/v5/mapbox.places/';
function fromFeature(f: any): Place | null {
  const city = String(f?.text || '').trim();
  if (!city || !Array.isArray(f?.center)) return null;
  const ctx: any[] = Array.isArray(f.context) ? f.context : [];
  const region = ctx.find((c) => String(c.id).startsWith('region'))?.text;
  const iso = String(ctx.find((c) => String(c.id).startsWith('country'))?.short_code || f.properties?.short_code || '')
    .slice(0, 2)
    .toUpperCase();
  return { city, region, iso: iso || undefined, coord: [f.center[0], f.center[1]] };
}
async function geo(path: string, params: string): Promise<Place[]> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch(`${GEO}${path}.json?${params}&language=en&access_token=${MAPBOX_TOKEN}`, { signal: ctl.signal });
    if (!r.ok) return [];
    const j = await r.json();
    const seen = new Set<string>();
    return ((j?.features || []) as any[])
      .map(fromFeature)
      .filter((x): x is Place => !!x)
      .filter((x) => {
        const k = `${x.city}|${x.region || ''}|${x.iso || ''}`.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
  } catch {
    return [];
  } finally {
    clearTimeout(t);
  }
}
/** Cities and towns that match what was typed, in one country (any country in the world). Empty when offline. */
export function searchCities(text: string, iso?: string): Promise<Place[]> {
  const q = text.trim();
  if (q.length < 2) return Promise.resolve([]);
  return geo(encodeURIComponent(q), `types=place,locality&autocomplete=true&limit=7${iso ? `&country=${iso.toLowerCase()}` : ''}`);
}
const reverseCity = (c: LngLat) => geo(`${c[0]},${c[1]}`, 'types=place,locality&limit=1');

/** Person picked a city by hand: stop overwriting it from GPS.
    The city is also looked up on the map (when the phone can), so distances and "near you" follow it
    even without GPS. If the lookup fails, the name is kept as typed. */
export function setCityManually(city: string, iso?: string, country?: string, known?: LngLat) {
  const name = city.trim().replace(/\s+/g, ' ');
  if (!name) return;
  db.user.city = name;
  db.user.cityAuto = false;
  if (iso) db.user.country = iso;
  bump();
  void (async () => {
    try {
      // GPS, when it is on, knows better than a city centre
      if (await locGranted()) return;
      let c: LngLat | undefined = known;
      if (!c) {
        const hit = (await searchCities(name, iso))[0] || null;
        const dev = hit ? null : (await Location.geocodeAsync(country ? `${name}, ${country}` : name).catch(() => []))[0];
        c = hit?.coord || (dev ? [dev.longitude, dev.latitude] : undefined);
      }
      if (!c || db.user.city !== name) return;
      db.user.coord = c;
      lastSaved = null;
      saveLocation(c);
      bump();
    } catch {}
  })();
}
/** My own city from GPS again (after it was typed by hand). Returns the place, or why it failed. */
export async function gpsCity(): Promise<Place | GpsFail> {
  const p = await gpsPlace();
  if (typeof p === 'string') return p;
  db.user.cityAuto = true;
  db.user.city = p.city;
  if (p.iso) db.user.country = p.iso;
  if (p.coord) {
    db.user.coord = p.coord;
    saveLocation(p.coord);
  }
  bump();
  return p;
}
