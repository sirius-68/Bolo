/* Career experts: search, filters, matching, booking a service with escrow, and reviews.
   Money for a session is taken from the wallet when you book and held by bolo until you
   confirm the session happened (or refunded if it's cancelled). */
import { db, uid } from '../data/db';
import { EXPERT_LIST, EX_PROMOS, Expert, ExReview, Service } from '../data/experts';
import { bump, later } from './live';
import { fname, nowT, thread, xaf } from './core';
import { notify } from './notify';
import { holdAmount, refundAmount, releaseAmount } from './wallet';
import { toast } from '../ui/overlay';

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

const books = () => (((db as any).EXBOOK = (db as any).EXBOOK || []) as ExBooking[]);
const myRev = () => (((db as any).EXREV = (db as any).EXREV || {}) as Record<string, ExReview[]>);

export const experts = () => EXPERT_LIST;
export const expertById = (id: string) => EXPERT_LIST.find((e) => e.id === id);
export const serviceOf = (e: Expert, sid: string) => e.services.find((s) => s.id === sid);
export const reviewsOfEx = (e: Expert) => [...(myRev()[e.id] || []), ...e.reviews];
export function exRating(e: Expert) {
  const R = reviewsOfEx(e);
  const avg = R.length ? R.reduce((n, r) => n + r.r, 0) / R.length : 0;
  return { avg: Math.round(avg * 10) / 10, n: R.length };
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
  const L = EXPERT_LIST.filter(
    (e) =>
      (!f.goal || e.goals.includes(f.goal)) &&
      (!f.specs.length || e.specs.some((s) => f.specs.includes(s))) &&
      (!f.fmt || e.services.some((s) => s.fmt === f.fmt)) &&
      (!q || [e.name, e.head, ...e.bio, ...e.specs, ...e.goals, ...e.services.map((s) => s.t)].join(' ').toLowerCase().includes(q)),
  );
  const score = (e: Expert) => (f.goal && e.goals[0] === f.goal ? 2 : 0) + e.specs.filter((s) => f.specs.includes(s)).length + (exRating(e).avg * Math.log2(1 + exRating(e).n)) / 30;
  return L.sort((a, b) => score(b) - score(a) || exRating(b).n - exRating(a).n);
}

/* ---------------- promo codes ---------------- */
export function promoFor(code: string) {
  const c = code.trim().toUpperCase();
  const p = EX_PROMOS[c];
  if (!p) return null;
  if (c === 'FIRST20' && books().some((b) => b.code === 'FIRST20' && b.state !== 'cancelled')) return null;
  return { code: c, ...p };
}
export const priceAfter = (price: number, code?: string) => {
  const p = code ? promoFor(code) : null;
  return p ? Math.round((price * (1 - p.off)) / 100) * 100 : price;
};

/* ---------------- booking ---------------- */
/** The expert as a chat contact (bolo members already exist; others are added once). */
export function expertContact(e: Expert) {
  const id = e.pid || e.id;
  if (!db.P[id])
    db.P[id] = { name: e.name, role: 'Career expert', photo: e.pic, pin: e.pic, area: '', dist: '', rate: exRating(e).avg, years: e.yrs, jobs: e.sessions, reviews: String(exRating(e).n), followers: 0, verified: 1, about: e.about } as any;
  return id;
}

/** Pay into escrow and book. Returns the booking, or 'funds' with how much is missing. */
export function bookService(e: Expert, s: Service, code?: string): ExBooking | { need: number } {
  const amt = priceAfter(s.price, code);
  const id = uid('exb');
  if (!holdAmount(amt, `${s.t} · ${e.name}`, expertContact(e), id)) return { need: amt - db.WALLET.bal };
  const b: ExBooking = { id, ex: e.id, svc: s.id, title: s.t, amt, full: s.price, code: code ? promoFor(code)?.code : undefined, date: nearestDate(e), state: 'booked', at: Date.now() };
  books().unshift(b);
  const cid = expertContact(e);
  const th = thread(cid);
  th.msgs.push({ sys: `📅 You booked “${s.t}” · ${xaf(amt)} held by bolo until the session` });
  th.time = nowT();
  notify({ type: 'booking', cat: 'mentorship', key: `exb:${id}`, text: `Booked: ${s.t} with ${e.name}. ${xaf(amt)} is held safely until your session.`, go: { k: 'expert', id: e.id } });
  // The expert confirms a time in chat.
  const slot = `${e.soon <= 1 ? 'tomorrow' : b.date}, ${['10:00', '14:00', '18:00'][e.name.length % 3]}`;
  later(6000, () => {
    if (b.state !== 'booked') return;
    b.state = 'scheduled';
    b.when = slot;
    th.msgs.push({
      f: 'them',
      t:
        s.fmt === 'Written review'
          ? `Hi ${fname(db.user.name || 'there')}! Thanks for booking. Please send your CV here as a PDF and tell me the job you’re aiming for. You’ll have my report by ${b.date}.`
          : s.fmt === 'Chat'
            ? `Hi ${fname(db.user.name || 'there')}! Ask your question here with as much detail as you can. I’ll reply within 24 hours.`
            : `Hi ${fname(db.user.name || 'there')}! Thanks for booking. Does ${slot} work for our call? I’ll send the video link here 10 minutes before.`,
      at: nowT(),
    });
    th.time = nowT();
    th.unread = (th.unread || 0) + 1;
    notify({ type: 'message', cat: 'messages', key: `msg:${cid}`, upsert: true, text: `${e.name} replied about your session`, go: { k: 'chat', id: cid } });
    bump();
  });
  bump();
  return b;
}
export const myExBookings = () => books().filter((b) => b.state !== 'cancelled');
export const activeExBookings = () => books().filter((b) => b.state === 'booked' || b.state === 'scheduled');
export const exBookingsWith = (e: Expert) => books().filter((b) => b.ex === e.id && b.state !== 'cancelled');

/** The session happened: the money goes to the expert. */
export function confirmSession(b: ExBooking) {
  const e = expertById(b.ex);
  if (!e || (b.state !== 'booked' && b.state !== 'scheduled')) return;
  b.state = 'done';
  releaseAmount(b.amt, `Paid to ${e.name}`, expertContact(e), b.id);
  toast(`${xaf(b.amt)} released to ${fname(e.name)}`);
  bump();
}
/** Cancelled before the session: full refund to the wallet. */
export function cancelSession(b: ExBooking) {
  const e = expertById(b.ex);
  if (!e || (b.state !== 'booked' && b.state !== 'scheduled')) return;
  b.state = 'cancelled';
  refundAmount(b.amt, b.title, expertContact(e), b.id);
  const th = thread(expertContact(e));
  th.msgs.push({ sys: `Session cancelled · ${xaf(b.amt)} refunded to your wallet` });
  toast(`Cancelled. ${xaf(b.amt)} is back in your wallet`);
  bump();
}
export function rateSession(b: ExBooking, r: number, t: string) {
  const e = expertById(b.ex);
  if (!e || b.state !== 'done') return;
  const L = (myRev()[e.id] = myRev()[e.id] || []);
  const d = new Date();
  L.unshift({ n: `${fname(db.user.name || 'You')} (you)`, at: d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }), r, t: t.trim(), s: b.title });
  b.rated = 1;
  toast('Thanks! Your review helps others choose');
  bump();
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
