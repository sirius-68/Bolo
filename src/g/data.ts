/* What the getit screens need from the data model: the mode (hiring or working), turning what someone
   typed into a trade, and finding workers for it. */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, Person } from '../data/db';
import { CATS, detectCat } from '../data/catalog';
import { supabase } from '../lib/supabase';
import { bump } from '../logic/live';
import { cityLabel, kmOf } from '../logic/core';
import { PROFILE_COLS, PROFILE_RAW, isBlocked, personFrom } from '../logic/server';

/* ---------------- hiring or working ---------------- */
export const mode = (): 'hire' | 'work' => (db.user.mode === 'work' ? 'work' : 'hire');
export const working = () => mode() === 'work';
export function setMode(m: 'hire' | 'work') {
  db.user.mode = m;
  bump();
}

/* ---------------- first start ---------------- */
const STARTED = 'getit.started';
let started = false;
/** True once someone has gone past the opening screen on this phone (so it isn't shown on every start). */
export const hasStarted = () => started;
export function markStarted() {
  started = true;
  AsyncStorage.setItem(STARTED, '1').catch(() => {});
}
export async function loadStarted() {
  try {
    started = (await AsyncStorage.getItem(STARTED)) === '1';
  } catch {}
}
export function forgetStarted() {
  started = false;
  AsyncStorage.removeItem(STARTED).catch(() => {});
}

/** "Molyko, Buea" when both are known, the city alone, or a prompt to choose. */
export function areaLabel() {
  const home = (db.PR.area?.home || '').trim();
  const city = cityLabel();
  if (home && city && home.toLowerCase() !== city.toLowerCase()) return `${home}, ${city}`;
  return city || home || 'Choose your area';
}
/** False until a city or neighbourhood is known (from location, or chosen by hand). */
export const hasArea = () => !!(cityLabel() || (db.PR.area?.home || '').trim());

/* ---------------- what do you need? ---------------- */
/** Everyday needs shown under "Or pick one": [what people say, the trade]. */
export const NEEDS: [string, string][] = [
  ['Leaking kitchen sink', 'Plumber'],
  ['Power cut in two rooms', 'Electrician'],
  ['Sew a dress for a wedding', 'Tailor'],
  ['Deep clean a 3-room house', 'Cleaner'],
  ['Car won’t start', 'Mechanic'],
  ['Braids at home', 'Hairdresser'],
];

/** Words that point to a trade. Checked in order; the first trade with a match wins. */
const HINTS: [string, RegExp][] = [
  ['Plumber', /plumb|leak|sink|tap\b|faucet|pipe|toilet|drain|water heater|shower/],
  ['Electrician', /electric|power|light|socket|wiring|wire\b|fuse|breaker|generator|bulb|switch/],
  ['Tailor', /tailor|sew|dress|kaba|cloth|trouser|hem\b|alter|zip/],
  ['Cleaner', /clean|laundry|wash|tidy|mop|dust/],
  ['Mechanic', /mechanic|car\b|engine|brake|tyre|tire|oil change|motor|bike/],
  ['Hairdresser', /hair|braid|barber|wig|cornrow|weave|shave/],
  ['Builder', /build|brick|wall|roof|tile|cement|paint|mason|carpent|door|window/],
  ['Driver', /driver|drive me|ride|pick ?up|drop/],
  ['Delivery', /deliver|parcel|package|courier|send .* to/],
  ['Cook', /cook|chef|cater|food for|meal/],
  ['Nanny', /nanny|babysit|child ?care|look after my (child|kid|baby)/],
  ['Teacher', /teach|tutor|lesson|homework|math|english class/],
  ['Designer', /design|logo|flyer|poster|banner/],
  ['Developer', /develop|website|web ?site|app\b|software|program/],
  ['Security', /security|guard|watchman/],
  ['Nurse', /nurse|injection|care for (my )?(mother|father|parent)|elderly/],
  ['Farmer', /farm|harvest|plant\b|weeding/],
  ['Events', /event|wedding plan|decorat|dj\b|mc\b|party/],
  ['Writer', /write|cv\b|letter|translate|proofread/],
  ['Accountant', /account|tax|bookkeep|payroll/],
];
/** The trade for what someone typed ("my sink is leaking" → Plumber), or null when nothing fits. */
export function tradeFor(text: string): string | null {
  const q = text.toLowerCase().trim();
  if (!q) return null;
  const exact = CATS.find(([c]) => q === c.toLowerCase() || q === plural(c));
  if (exact) return exact[0];
  for (const [trade, re] of HINTS) if (re.test(q)) return trade;
  const named = CATS.find(([c]) => q.includes(c.toLowerCase()));
  if (named) return named[0];
  // the longer keyword lists used when a job is posted
  const guess = detectCat(q);
  return guess && CATS.some(([c]) => c === guess) ? guess : null;
}
/** What was understood from someone's words. */
export type Understood = { trade: string | null; title: string };
/** Understand a need: the word list first (instant, works offline); when it finds nothing, the server's AI,
    which also reads French and Pidgin. Gives up after a few seconds so nobody waits on a slow connection. */
export async function understand(text: string): Promise<Understood> {
  const said = text.trim();
  const local = tradeFor(said);
  if (local) return { trade: local, title: titleOf(said) };
  if (said.length < 3) return { trade: null, title: titleOf(said) };
  try {
    const ask = supabase.functions.invoke('understand', { body: { text: said.slice(0, 200) } });
    const r: any = await Promise.race([ask, new Promise((res) => setTimeout(() => res(null), 7000))]);
    const d = r?.data;
    if (d && typeof d.trade === 'string' && CATS.some(([c]) => c === d.trade)) return { trade: d.trade, title: typeof d.title === 'string' && d.title.trim() ? titleOf(d.title) : titleOf(said) };
  } catch {}
  return { trade: null, title: titleOf(said) };
}
/** "Plumber" → "plumbers", "Delivery" → "delivery people". */
export function plural(trade: string) {
  const t = trade.toLowerCase();
  const odd: Record<string, string> = { delivery: 'delivery people', sales: 'sales people', admin: 'admin assistants', security: 'security guards', events: 'event planners', nanny: 'nannies' };
  return odd[t] || t + 's';
}
/** A request title from typed words: first letter up, no trailing full stop. */
export const titleOf = (text: string) => {
  const s = text.trim().replace(/\s+/g, ' ').replace(/[.!]+$/, '');
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
};

/* ---------------- workers for a trade ---------------- */
export type Found = { ids: string[]; failed?: boolean };
/** Ask the server for people who offer this trade, add them to the local model, and return their ids:
    closest first, then best rated. Works signed out too (profiles people chose to show are public). */
export async function findWorkers(trade: string): Promise<Found> {
  let q = supabase.from('profile_cards').select(PROFILE_COLS).eq('visible', true).neq('work_status', 'off').contains('skills', [trade]).limit(60);
  if (db.uid) q = q.neq('id', db.uid);
  const { data, error } = await q;
  if (error) return { ids: localWorkers(trade), failed: true };
  (data || []).forEach((r: any) => {
    db.P[r.id] = personFrom(r);
    PROFILE_RAW[r.id] = r;
  });
  bump();
  return { ids: rank((data || []).map((r: any) => r.id as string)) };
}
/** The same list from what is already on the phone (shown at once, and when there is no connection). */
export function localWorkers(trade: string) {
  return rank(Object.keys(db.P).filter((id) => id !== 'me' && !db.P[id].group && !db.P[id].biz && db.P[id].name !== 'Deleted account' && (db.P[id].skills || []).includes(trade)));
}
function rank(ids: string[]) {
  const far = (p: Person) => kmOf(p.dist) || 999;
  return ids
    .filter((id) => db.P[id] && !isBlocked(id))
    .sort((a, b) => far(db.P[a]) - far(db.P[b]) || db.P[b].rate - db.P[a].rate || db.P[b].jobs - db.P[a].jobs);
}
/** "1.2 km" from the model's "1.2km away"; empty when the distance isn't known. */
export const kmText = (p: Person) => {
  const n = kmOf(p.dist);
  return n ? `${n} km` : '';
};
