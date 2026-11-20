/* Approximate coordinates for Buea neighbourhoods (lng, lat), used to place people and jobs on the map
   until real addresses are stored on the server. */
import { db } from './db';

export type LngLat = [number, number];



export function kmBetween(a: LngLat, b: LngLat) {
  const R = 6371;
  const toR = (x: number) => (x * Math.PI) / 180;
  const dLat = toR(b[1] - a[1]);
  const dLng = toR(b[0] - a[0]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[1])) * Math.cos(toR(b[1])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
