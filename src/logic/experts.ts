/* Career experts: search, filters, matching, booking a service with escrow, and reviews.
   Money for a session is taken from the wallet when you book and held by bolo until you
   confirm the session happened (or refunded if it's cancelled). */
import { db } from '../data/db';
import { Expert, ExReview, Service } from '../data/experts';
import { bump } from './live';
import { fname, xaf } from './core';
import { toast } from '../ui/overlay';
import { cancelBooking, confirmDone, sendHireRequest, submitReview } from './work';

export type ExBooking = {
  id: string;
  ex: string;
  svc: string;
  title: string;
  amt: number;
  full: number;
  code?: string;
  date: string;
  when?: string;
  state: 'booked' | 'scheduled' | 'done' | 'cancelled';
  at: number;
  rated?: number;
};

/** Search + filters shared by the list and the Filters screen. */
export const exF = { q: '', goal: '', specs: [] as string[], fmt: '', match: 0 };
export const exFilterCount = () => (exF.goal ? 1 : 0) + exF.specs.length + (exF.fmt ? 1 : 0);
export function clearExFilters() {
  exF.goal = '';
  exF.specs = [];
  exF.fmt = '';
  exF.match = 0;
  bump();
}

/** Sessions with experts are ordinary bookings (they start as a request in chat). */
const STATE: Record<string, ExBooking['state']> = { booked: 'scheduled', onway: 'scheduled', working: 'scheduled', done: 'scheduled', confirmed: 'done' };
function books(): ExBooking[] {
  const out: ExBooking[] = [];
  db.BOOKINGS.forEach((b) => {
    const e = db.EXPERTS.find((x) => x.pid === b.worker);
    if (!e || b.client !== 'me') return;
    out.push({ id: b.id, ex: e.id, svc: '', title: b.title, amt: b.amt || 0, full: b.amt || 0, date: b.when, when: b.when, state: STATE[b.state] || 'scheduled', at: b.amt || 0, rated: b.reviewed });
  });
  return out;
}

export const experts = () => db.EXPERTS.filter((e) => e.pid !== 'me');
export const expertById = (id: string) => db.EXPERTS.find((e) => e.id === id);
export const serviceOf = (e: Expert, sid: string) => e.services.find((s) => s.id === sid);
/** Reviews people left after sessions (and jobs) with this expert. */
export const reviewsOfEx = (e: Expert): ExReview[] => (db.REVIEWS[e.pid || e.id] || []).map((r) => ({ n: r.name, at: r.time, r: r.stars, t: r.text }));
export function exRating(e: Expert) {
  const p = db.P[e.pid || e.id];
  const R = reviewsOfEx(e);
  if (R.length) return { avg: Math.round((R.reduce((n, r) => n + r.r, 0) / R.length) * 10) / 10, n: R.length };
  return { avg: p?.rate || 0, n: Number(p?.reviews || 0) };
}
export const fromPrice = (e: Expert) => Math.min(...e.services.map((s) => s.price));
/** "5 November" */
export function nearestDate(e: Expert) {
  const d = new Date(Date.now() + e.soon * 864e5);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
}

/** Experts matching the search and filters. Matches from the quiz are ranked by how well they fit. */
export function findExperts(f = exF) {
  const q = f.q.trim().toLowerCase();
  const L = experts().filter(
    (e) =>
      (!f.goal || e.goals.includes(f.goal)) &&
      (!f.specs.length || e.specs.some((s) => f.specs.includes(s))) &&
      (!f.fmt || e.services.some((s) => s.fmt === f.fmt)) &&
      (!q || [e.name, e.head, ...e.bio, ...e.specs, ...e.goals, ...e.services.map((s) => s.t)].join(' ').toLowerCase().includes(q)),
  );
  const score = (e: Expert) => (f.goal && e.goals[0] === f.goal ? 2 : 0) + e.specs.filter((s) => f.specs.includes(s)).length + (exRating(e).avg * Math.log2(1 + exRating(e).n)) / 30;
  return L.sort((a, b) => score(b) - score(a) || exRating(b).n - exRating(a).n);
}

/* ---------------- promo codes (come back with payments) ---------------- */
export function promoFor(_code: string): { code: string; off: number; label: string } | null {
  return null;
}
export const priceAfter = (price: number, _code?: string) => price;

/* ---------------- booking ---------------- */
/** The expert as a chat contact (their bolo account). */
export function expertContact(e: Expert) {
  return e.pid || e.id;
}

/** Ask for a session: a request in chat that the expert accepts. Payment is agreed directly until payments go live. */
export function bookService(e: Expert, s: Service, _code?: string): ExBooking | { need: number } {
  sendHireRequest(expertContact(e), s.t, s.price ? xaf(s.price) : 'Free', 'Time to agree in chat');
  const b: ExBooking = { id: 'req_' + s.id, ex: e.id, svc: s.id, title: s.t, amt: s.price, full: s.price, date: nearestDate(e), state: 'booked', at: Date.now() };
  bump();
  return b;
}
export const myExBookings = () => books().filter((b) => b.state !== 'cancelled');
export const activeExBookings = () => books().filter((b) => b.state === 'booked' || b.state === 'scheduled');
export const exBookingsWith = (e: Expert) => books().filter((b) => b.ex === e.id && b.state !== 'cancelled');

/** The session happened. */
export function confirmSession(b: ExBooking) {
  const bk = db.BOOKINGS.find((x) => x.id === b.id);
  if (!bk) return;
  if (bk.state !== 'done') return toast(`${fname(db.P[bk.worker]?.name || 'The expert')} marks the session as done first`);
  confirmDone(b.id);
}
/** Cancelled before the session. */
export function cancelSession(b: ExBooking) {
  void cancelBooking(b.id);
}
export function rateSession(b: ExBooking, r: number, t: string) {
  const e = expertById(b.ex);
  if (!e) return;
  submitReview(expertContact(e), b.id, r, [], t);
}

/* ---------------- "Find a mentor for me" ---------------- */
export const MATCH_Q: { k: 'goal' | 'spec' | 'fmt'; q: string; sub: string; opts: string[] }[] = [
  { k: 'goal', q: 'What do you want help with?', sub: 'Pick the closest one', opts: [] },
  { k: 'spec', q: 'Which field are you in, or moving to?', sub: 'So your expert knows it from the inside', opts: [] },
  { k: 'fmt', q: 'How would you like to work?', sub: 'You can change this later', opts: ['Video call', 'Written review', 'Chat', 'Any'] },
];
export function applyMatch(goal: string, spec: string, fmt: string) {
  exF.goal = goal;
  exF.specs = spec ? [spec] : [];
  exF.fmt = fmt && fmt !== 'Any' ? fmt : '';
  exF.q = '';
  exF.match = 1;
  let L = findExperts();
  // Too narrow: keep the goal, drop the field.
  if (!L.length && spec) {
    exF.specs = [];
    L = findExperts();
  }
  bump();
  return L;
}
