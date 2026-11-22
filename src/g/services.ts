/* Skill → services. A worker has one main skill (Electrician); under it, the services they do (House wiring,
   Sockets and switches…). Every service belongs to the main skill. Requests are matched to a service when the
   words allow it, and ratings are kept per service, so "4.9 ★" never hides that it was earned on another kind of job. */
import { db, Service } from '../data/db';
import { supabase } from '../lib/supabase';
import { SERVICE_LIST, serviceFor, servicesOf } from '../../supabase/functions/_shared/services';
import { tradeFor } from './data';

export { serviceFor, servicesOf };

/** A worker's listed services (their own, shown to clients), from a profile row or my own profile. */
export const listed = (services: any): Service[] => (Array.isArray(services) ? services : []).filter((s: any) => s && s.skill && s.pub !== false && !s.draft);
export const myServices = (): Service[] => listed(db.PR.services);
/** Does this worker say they do this service? (No services listed = general work of the skill: not a "yes".) */
export const offers = (services: any, service?: string | null) => !!service && listed(services).some((s) => s.skill.toLowerCase() === service.toLowerCase());
/** Their starting price for a service (0 when they gave none). */
export const priceFor = (services: any, service?: string | null) => (service ? +(listed(services).find((s) => s.skill.toLowerCase() === service.toLowerCase())?.price || 0) : 0);

/** Is a service typed in someone's own words part of this skill? The word lists answer first; then the server's AI.
    "no" comes with the skill it looks like, so the message can say what to do. When nothing can tell, it is allowed
    (getit's team sees services in the admin panel). */
export async function fitsSkill(trade: string, text: string): Promise<{ ok: boolean; other?: string }> {
  const said = text.trim();
  if (said.length < 3) return { ok: false };
  if (serviceFor(trade, said)) return { ok: true };
  // clearly a service of another skill (it matches that skill's own list)
  const other = Object.keys(SERVICE_LIST).find((t) => t !== trade && servicesOf(t).some((n) => n.toLowerCase() === said.toLowerCase()));
  if (other) return { ok: false, other };
  try {
    const ask = supabase.functions.invoke('understand', { body: { fit: { trade, service: said.slice(0, 60) } } });
    const r: any = await Promise.race([ask, new Promise((res) => setTimeout(() => res(null), 7000))]);
    if (r?.data && typeof r.data.ok === 'boolean') return { ok: r.data.ok, other: typeof r.data.other === 'string' ? r.data.other : undefined };
  } catch {}
  const guess = tradeFor(said);
  return guess && guess !== trade ? { ok: false, other: guess } : { ok: true };
}

/* ---------------- ratings, per service ---------------- */
export type ServiceRating = { service: string; rating: number | null; reviews: number; jobs: number };
const RATINGS: Record<string, { at: number; rows: ServiceRating[] }> = {};
/** What a worker's ratings are made of: one line per service they were rated or booked for ('' = jobs with no
    service named). Read from the server (all reviews, not only the latest shown). */
export async function loadServiceRatings(uid: string): Promise<ServiceRating[]> {
  const hit = RATINGS[uid];
  if (hit && Date.now() - hit.at < 60000) return hit.rows;
  const { data, error } = await supabase.rpc('service_ratings', { p_user: uid });
  if (error || !Array.isArray(data)) return hit?.rows || [];
  const rows = data.map((r: any) => ({ service: String(r.service || ''), rating: r.rating == null ? null : +r.rating, reviews: +r.reviews || 0, jobs: +r.jobs || 0 }));
  RATINGS[uid] = { at: Date.now(), rows };
  return rows;
}
export const serviceRatings = (uid: string) => RATINGS[uid]?.rows || [];
/** "4.8 ★ for all 3 services" needs to say what the number covers: how many different services the ratings are for. */
export function ratingScope(rows: ServiceRating[]): { rated: number; total: number; services: number } {
  const rated = rows.filter((r) => r.reviews > 0);
  return { rated: rated.length, total: rated.reduce((a, r) => a + r.reviews, 0), services: rows.filter((r) => r.service).length };
}
