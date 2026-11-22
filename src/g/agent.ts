/* The getit agent, for people hiring: it asks workers a few at a time, checks prices against a budget, and comes
   back with the best offer (or books it, when told to). The rules live on the server (migrations 0025–0026):
   this file starts it, asks where it stands, and words its pick. */
import { db, Post } from '../data/db';
import { supabase } from '../lib/supabase';
import { bump } from '../logic/live';
import { friendly } from '../logic/remote';
import { refreshPosts } from '../logic/server';
import { JobForm, postJob } from '../logic/work';
import { money } from './data';

export type Want = 'now' | 'today' | 'tomorrow' | 'week';
export type AgentOffer = {
  id: string;
  worker_id: string;
  name: string;
  price: string;
  amount: number;
  when: string;
  note: string;
  counter: number | null;
  counter_state: 'asked' | 'yes' | 'no' | 'skip' | null;
  /** within the budget and in time */
  fit: boolean;
  /** above the budget */
  over: boolean;
  rating: number | null;
  reviews: number;
  /** their rating for the service this request is for (null when they have none for it) */
  service_rating: number | null;
  service_reviews: number;
  jobs: number;
  does_service: boolean;
  verified: boolean;
};
export type AgentStep = { k: string; at: string; t: string; s: string };
export type AgentView = {
  post: string;
  state: 'asking' | 'pick' | 'booked' | 'nobody' | 'stopped';
  budget: number | null;
  want: Want;
  auto: boolean;
  round: number;
  pick: string | null;
  booking: string | null;
  log: AgentStep[];
  service: string | null;
  title: string;
  trade: string;
  told: number;
  offers: AgentOffer[];
  tries: Tries;
};
export type Tries = { used: number; free: number; pro: boolean };
export const triesLeft = (t?: Tries | null) => (t ? Math.max(0, t.free - t.used) : 3);

/** From the app's "When?" choices to what the agent is told. */
export const WANT_OF: Record<string, Want> = { 'As soon as possible': 'now', Today: 'today', Tomorrow: 'tomorrow', 'This week': 'week' };
export const WANT_TEXT: Record<Want, string> = { now: 'as soon as possible', today: 'today', tomorrow: 'by tomorrow', week: 'this week' };

const view = (d: any): AgentView | null => (d && typeof d === 'object' && typeof d.state === 'string' ? ({ ...d, log: Array.isArray(d.log) ? d.log : [], offers: Array.isArray(d.offers) ? d.offers : [] } as AgentView) : null);

/** How many free tries are left (null when it can't be asked right now). */
export async function agentLeft(): Promise<Tries | null> {
  const { data, error } = await supabase.rpc('agent_left');
  return error || !data ? null : (data as Tries);
}
/** Where the agent stands on a request of mine (null: it isn't handling it). Asking also lets its clock rules move on. */
export async function agentTick(post: string): Promise<AgentView | null> {
  const { data, error } = await supabase.rpc('agent_tick', { p_post: post });
  return error ? null : view(data);
}
export async function agentStop(post: string) {
  const { data } = await supabase.rpc('agent_stop', { p_post: post });
  return view(data);
}
export async function agentMore(post: string) {
  const { data } = await supabase.rpc('agent_more', { p_post: post });
  return view(data);
}
/** A worker answers "can you do it for the budget?". Returns an error to show, or null. */
export async function agentAnswer(application: string, yes: boolean): Promise<string | null> {
  const { error } = await supabase.rpc('agent_answer', { p_application: application, p_yes: yes });
  return error ? friendly(error) : null;
}

export type Brief = { budget: number | null; want: Want; auto: boolean };
/** Hand a request that is already posted to the agent (or tell it something new). 'pro' = the free tries are used. */
export async function agentStart(post: string, b: Brief): Promise<AgentView | 'pro' | string> {
  const { data, error } = await supabase.rpc('agent_start', { p_post: post, p_budget: b.budget, p_want: b.want, p_auto: b.auto && b.budget != null });
  if (error) return /pro_needed/.test(error.message || '') ? 'pro' : friendly(error);
  return view(data) || 'Something went wrong on our side. Please try again in a few minutes.';
}
/** A request being sent and handed to the agent, by the id it had while it was sent (the screen opens at once and waits on this). */
export const STARTING: Record<string, { state: 'sending' | 'ok' | 'pro' | 'failed'; post?: string; msg?: string }> = {};
/** Post a request and hand it to the agent. Gives the key the agent's screen is opened with; the rest happens in
    the background, and STARTING[key] says how it went. */
export function agentRequest(form: JobForm, b: Brief): string {
  const job = postJob({ ...form, agent: true });
  const key = String(job.id);
  STARTING[key] = { state: 'sending' };
  (async () => {
    const set = (x: (typeof STARTING)[string]) => ((STARTING[key] = x), bump());
    // the request is saved in the background: wait for its real id (a few seconds; longer with a photo)
    for (let i = 0; i < 150 && String(job.id).startsWith('tmp_'); i++) {
      await new Promise((r) => setTimeout(r, 300));
      if (!db.POSTS.includes(job)) return set({ state: 'failed', msg: 'Your request couldn’t be sent. Check your connection and try again.' });
    }
    if (String(job.id).startsWith('tmp_')) return set({ state: 'failed', msg: 'Your request is taking long to send. Open it from Jobs in a moment.' });
    const r = await agentStart(job.id, b);
    // posted, but the agent didn't start: it carries on as an ordinary request, which is said plainly
    if (r === 'pro') return set({ state: 'pro', post: job.id });
    if (typeof r === 'string') return set({ state: 'failed', post: job.id, msg: `${r} Your request was sent as an ordinary one: its offers show under Jobs.` });
    set({ state: 'ok', post: job.id });
  })();
  return key;
}

/* ---------------- wording ---------------- */
/** The rating to show for an offer: for this service when they have one, else their combined rating, said as such. */
export function offerRating(o: AgentOffer, service: string | null): string {
  if (service && o.service_reviews > 0 && o.service_rating) return `${o.service_rating.toFixed(1)} ★ for ${service.toLowerCase()} (${o.service_reviews})`;
  if (o.reviews > 0 && o.rating) return `${o.rating.toFixed(1)} ★ ${service ? 'for all their services' : 'overall'} (${o.reviews})${service ? `, none yet for ${service.toLowerCase()}` : ''}`;
  return o.jobs ? `${o.jobs} ${o.jobs === 1 ? 'job' : 'jobs'} done, not rated yet` : 'New on getit, no ratings yet';
}
/** Why this offer, in the app's own words (always true to the facts; shown at once, and when the AI is not reachable). */
export function whyLocal(v: AgentView, o: AgentOffer): string {
  const first = o.name.split(' ')[0];
  const others = v.offers.filter((x) => x.id !== o.id);
  const bits: string[] = [];
  if (v.budget != null) bits.push(o.over ? `${money(o.amount)} is above your budget of ${money(v.budget)}` : `${money(o.amount)} is within your budget`);
  else bits.push(`${money(o.amount)}`);
  if (!o.over && !o.fit) bits.push(`but ${first} can only come later than you wanted`);
  else if (others.some((x) => !x.fit) && o.fit) bits.push('and can come in time');
  if (v.service && o.service_reviews > 0) bits.push(`rated ${o.service_rating?.toFixed(1)} ★ for ${v.service.toLowerCase()}`);
  const cheaper = others.filter((x) => x.amount < o.amount);
  // why a cheaper offer wasn't picked: it comes too late, or its record for this kind of job is weaker or shorter
  const late = cheaper.filter((x) => !x.fit).length;
  const weaker = cheaper.length - late;
  const n = (k: number) => (k === 1 ? 'one' : String(k));
  const tail = !others.length
    ? ' It is the only offer so far.'
    : cheaper.length && o.fit
      ? ` ${[weaker ? `${n(weaker)} cheaper ${weaker === 1 ? 'offer has' : 'offers have'} a weaker or shorter record` : '', late ? `${n(late)} cheaper ${late === 1 ? 'offer' : 'offers'} can’t come in time` : ''].filter(Boolean).join(', and ')}.`.replace(/^ (.)/, (m, c) => ' ' + c.toUpperCase())
      : ` Best of ${v.offers.length} offers.`;
  return `${first}: ${bits.join(', ')}.${tail}`;
}
const WHY: Record<string, string> = {};
/** The same, worded by the AI from the same facts (null when it can't be reached; the app's own sentence stays). */
export async function whyAI(v: AgentView, o: AgentOffer): Promise<string | null> {
  const key = `${v.post}:${o.id}:${o.amount}`;
  if (WHY[key]) return WHY[key];
  const person = (x: AgentOffer) => ({ name: x.name.split(' ')[0], price: x.amount, when: x.when, rating: x.rating, ratings: x.reviews, service_rating: x.service_rating, service_ratings: x.service_reviews, jobs: x.jobs, does_service: x.does_service });
  try {
    const ask = supabase.functions.invoke('understand', { body: { why: { need: v.title, service: v.service, budget: v.budget, want: WANT_TEXT[v.want], pick: person(o), over: o.over, late: !o.over && !o.fit, others: v.offers.filter((x) => x.id !== o.id).map(person) } } });
    const r: any = await Promise.race([ask, new Promise((res) => setTimeout(() => res(null), 9000))]);
    const text = typeof r?.data?.why === 'string' ? r.data.why.trim() : '';
    // the AI's sentence must carry the real price: one that doesn't is dropped
    if (text.length >= 20 && text.replace(/[ ,.]/g, '').includes(String(o.amount))) return (WHY[key] = text);
  } catch {}
  return null;
}

/** My open request the agent is handling, by id (it carries data.agent). */
export const isAgentPost = (po?: Post | null) => !!po && po.agent === '1';
export const reloadOffers = () => refreshPosts();
