/* Approximate coordinates for Buea neighbourhoods (lng, lat), used to place people and jobs on the map
   until real addresses are stored on the server. */
import { db } from './db';

export type LngLat = [number, number];

export const BUEA: LngLat = [9.2705, 4.1525];

export const AREA_COORDS: Record<string, LngLat> = {
  Molyko: [9.2905, 4.1497],
  'Great Soppo': [9.2532, 4.1585],
  Bonduma: [9.2822, 4.1459],
  'Mile 17': [9.3058, 4.1418],
  Checkpoint: [9.2712, 4.1549],
  Bomaka: [9.3125, 4.1355],
  Muea: [9.3215, 4.1225],
  'Clerks Quarter': [9.2358, 4.1628],
  'Buea Town': [9.2395, 4.1592],
  Hybrid: [9.2905, 4.1497],
  'Remote / online': [9.2705, 4.1525],
};

/** Small, stable offset per id so several pins in one neighbourhood don't stack. */
function jitter(id: string): LngLat {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const a = ((h & 0xffff) / 0xffff) * Math.PI * 2;
  const r = 0.003 + (((h >>> 16) & 0xff) / 0xff) * 0.008;
  return [Math.cos(a) * r, Math.sin(a) * r];
}
/** Centre of the map: the person's live position when known (anywhere in the world), else Buea. */
export const anchor = (): LngLat => (db.user.coord as LngLat | null) || BUEA;

/** Where to draw a listing. The sample listings are laid out around the person's own position,
    keeping their distances from each other, so the map works in any city. */
export function coordOf(id: string, area?: string): LngLat {
  const base = (area && (AREA_COORDS[area] || AREA_COORDS[area.split(' · ')[0]] || AREA_COORDS[area.split(',')[0]])) || BUEA;
  const a = anchor();
  const [dx, dy] = jitter(id);
  return [a[0] + (base[0] - BUEA[0]) + dx, a[1] + (base[1] - BUEA[1]) + dy];
}
/** Distance in km between two points (haversine). */
export function kmBetween(a: LngLat, b: LngLat) {
  const R = 6371;
  const toR = (x: number) => (x * Math.PI) / 180;
  const dLat = toR(b[1] - a[1]);
  const dLng = toR(b[0] - a[0]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[1])) * Math.cos(toR(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
