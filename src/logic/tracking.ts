/* Live tracking: while a worker is on the way, their phone shares its position for that booking only.
   It starts with "Start trip", stops on arrival (or cancel), and only runs while bolo is open.
   The client sees it live on the booking's map; the server deletes the position when the trip ends. */
import * as Location from 'expo-location';
import { db, Booking } from '../data/db';
import { supabase } from '../lib/supabase';
import { toast } from '../ui/overlay';
import { bump } from './live';
import { haversine } from './server';

/** Average city speed used for the arrival estimate (km/h): motorbike and car traffic. */
const CITY_KMH = 22;
let sub: Location.LocationSubscription | null = null;
let current: string | null = null;
let last: { t: number; c: [number, number] } | null = null;

export function etaMin(b: Booking, c: [number, number]) {
  if (!b.dest) return null;
  const km = haversine(c, b.dest);
  return Math.max(1, Math.round((km / CITY_KMH) * 60 + 1));
}
async function push(b: Booking, p: Location.LocationObject, force = false) {
  if (b.state !== 'onway' || current !== b.id) return;
  const c: [number, number] = [p.coords.longitude, p.coords.latitude];
  const moved = last ? haversine(last.c, c) * 1000 : Infinity;
  if (!force && last && moved < 20 && Date.now() - last.t < 15000) return;
  last = { t: Date.now(), c };
  const eta = etaMin(b, c);
  b.live = c;
  b.liveAt = Date.now();
  if (eta != null) b.eta = eta;
  db.user.coord = c;
  bump();
  await supabase.from('booking_locations').upsert({ booking_id: b.id, lat: c[1], lng: c[0], heading: p.coords.heading ?? null, accuracy: p.coords.accuracy ?? null, eta_min: eta });
}
/** Ask for location and start following my position for this booking. Returns the first arrival estimate (minutes) or null. */
export async function startSharing(b: Booking, resume = false): Promise<number | null | false> {
  try {
    const perm = resume ? await Location.getForegroundPermissionsAsync() : await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      if (!resume) toast('Location is off: the client won’t see you on the map. You can turn it on in your phone settings.');
      return null;
    }
    const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    stopSharing();
    current = b.id;
    last = null;
    sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, timeInterval: 8000, distanceInterval: 20 }, (p) => {
      const live = db.BOOKINGS.find((x) => x.id === b.id);
      if (!live || live.state !== 'onway') return stopSharing();
      void push(live, p);
    });
    // the first position goes out as soon as the booking is "on the way" on the server
    setTimeout(() => {
      const live = db.BOOKINGS.find((x) => x.id === b.id);
      if (live) void push(live, first, true);
    }, resume ? 0 : 1200);
    return etaMin(b, [first.coords.longitude, first.coords.latitude]);
  } catch {
    if (!resume) toast('Couldn’t get your location. The trip starts without the map.');
    return null;
  }
}
export function stopSharing() {
  sub?.remove();
  sub = null;
  current = null;
  last = null;
}
export const sharingFor = () => current;
