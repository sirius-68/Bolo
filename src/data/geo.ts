/* Approximate coordinates for Buea neighbourhoods (lng, lat), used to place people and jobs on the map
   until real addresses are stored on the server. */
import { db } from './db';

export type LngLat = [number, number];

export const BUEA: LngLat = [9.2705, 4.1525];


/** Centre of the map: the person's live position when known (anywhere in the world), else Buea. */
export const anchor = (): LngLat => (db.user.coord as LngLat | null) || BUEA;

/** Where to draw a listing. The sample listings are laid out around the person's own position,
    keeping their distances from each other, so the map works in any city. */
/** Where a job or person is on the map (already rounded for privacy on the server). Callers only pass ones with a real place. */
export function placeOf(_id: string, _area?: string, real?: [number, number] | null): LngLat {
  return real ? [real[0], real[1]] : anchor();
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
