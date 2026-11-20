/* Joining getit to offer a skill: what someone picks on the two sign-up steps is kept here until they have
   an account (the last step), then written to their profile in one go. */
import { db } from '../data/db';
import { CATS, SKILLS } from '../data/catalog';
import { bump } from '../logic/live';
import { cityLabel } from '../logic/core';
import { markStarted, setMode, titleOf, tradeFor, understand } from './data';

export type Way = 'go' | 'come' | 'online';
export type Draft = {
  /** what they typed or tapped ("Plumber", "baker") */
  skill: string;
  /** the trade it belongs to, when it is one of ours */
  trade: string | null;
  ways: Way[];
  /** how far they go for a job, in km (0 = the whole city) */
  range: number;
  /** who can hire them online */
  reach: 'city' | 'country' | 'anywhere';
};
const fresh = (): Draft => ({ skill: '', trade: null, ways: [], range: 5, reach: 'country' });
let draft: Draft | null = null;

export const workerDraft = () => (draft ||= fresh());
export const hasWorkerDraft = () => !!draft && !!draft.skill.trim() && draft.ways.length > 0;
export const dropWorkerDraft = () => {
  draft = null;
};

/** The skills shown first on step 1. */
export const POPULAR = ['Plumber', 'Electrician', 'Tailor', 'Hairdresser', 'Cleaner', 'Mechanic', 'Driver', 'Cook', 'Builder', 'Teacher', 'Nanny', 'Designer'];
/** Trades that fit what is being typed ("hair" → Hairdresser), best first. */
export function tradesLike(text: string): string[] {
  const q = text.toLowerCase().trim();
  if (!q) return POPULAR;
  const out: string[] = [];
  const add = (c?: string | null) => c && !out.includes(c) && out.push(c);
  CATS.forEach(([c]) => c.toLowerCase().startsWith(q) && add(c));
  add(tradeFor(q));
  CATS.forEach(([c]) => c.toLowerCase().includes(q) && add(c));
  return out.slice(0, 6);
}

/** One line about how they work, for the profile card ("Plumber · Molyko, Buea · up to 5 km"). */
export function workLine(d: { skill: string; ways: Way[]; range: number }, place: string) {
  const local = d.ways.includes('go') || d.ways.includes('come');
  return [d.skill, local ? place : '', d.ways.includes('go') ? (d.range ? `up to ${d.range} km` : `all of ${cityLabel() || 'the city'}`) : '', d.ways.includes('come') ? 'own shop' : '', d.ways.includes('online') ? 'works online' : ''].filter(Boolean).join(' · ');
}

/** Write the draft to the profile (after sign-in). Skills already on the account are kept; the new one comes first. */
export function applyWorkerDraft(): boolean {
  const d = draft;
  if (!d || !d.skill.trim() || !d.ways.length) return false;
  const u = db.user;
  const name = titleOf(d.skill);
  const cat = d.trade || name;
  if (!u.intents.includes('find')) u.intents = ['find', ...u.intents];
  u.skills = [cat, ...u.skills.filter((c) => c !== cat)];
  const list = Array.isArray(u.skillList) ? u.skillList.filter((e) => e.c !== cat) : [];
  const known = SKILLS.find((x) => x.c === cat && x.n.toLowerCase() === name.toLowerCase());
  u.skillList = [known ? { si: known.i, n: known.n, a: known.a, c: cat, x: {}, xo: {}, lv: 'Intermediate' } : { si: -1, n: name, a: SKILLS.find((x) => x.c === cat)?.a || 'Other', c: cat, x: {}, xo: {}, lv: 'Intermediate', custom: 1 }, ...list];
  db.PR.area = { ...db.PR.area, radius: d.range || 50, ways: d.ways, reach: d.ways.includes('online') ? d.reach : undefined } as any;
  db.PR.wst = 'open';
  setMode('work');
  markStarted();
  draft = null;
  bump();
  // a skill typed in their own words: ask which trade it belongs to, so people looking for that trade find them
  if (!CATS.some(([c]) => c === cat))
    void understand(name).then((r) => {
      if (!r.trade || db.user.skills.includes(r.trade)) return;
      db.user.skills = db.user.skills.map((c) => (c === cat ? r.trade! : c));
      (db.user.skillList || []).forEach((e) => e.c === cat && (e.c = r.trade!));
      bump();
    });
  return true;
}
