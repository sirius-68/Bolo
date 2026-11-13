/* The real data behind the app. Everything other people create (people, posts, jobs, offers, chats, bookings,
   notifications, career listings) comes from Supabase and is kept live with realtime. The screens keep reading
   the same local model (db); this module fills it from the server and turns server rows into the app's shapes.

   Ids: the signed-in person is 'me' everywhere in the app. Other people are their account id; a business page
   is 'b_' + its id; a group chat is 'g_' + its conversation id. */
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { db, Booking, BizSample, Course, Mentorship, Msg, MyBiz, Notif, Opp, Person, Post, Review, Thread } from '../data/db';
import type { Expert, Service as ExService } from '../data/experts';
import { logoPic, net } from '../ui/kit';
import { bump } from './live';
import { fill } from './persist';

/* ================================================================ ids and small helpers */
export const ME = () => db.uid || '';
/** server account id → app id */
export const L = (uid?: string | null) => (!uid ? '' : uid === db.uid ? 'me' : uid);
/** app id → server account id (a business page → its owner) */
export function R(id: string): string {
  if (id === 'me') return db.uid || '';
  if (id.startsWith('b_')) return db.P[id]?.uid || '';
  return id;
}
export const bizKey = (bid: string) => 'b_' + bid;
export const groupKey = (cid: string) => 'g_' + cid;
/** my business page (local) for a server business id */
export const myBizOf = (bid?: string | null): MyBiz | undefined => (bid ? db.BIZ.list.find((b) => b.remoteId === bid) : undefined);

export function uuid() {
  const h = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) s += '-';
    else if (i === 14) s += '4';
    else if (i === 19) s += h[(Math.random() * 4) | 8];
    else s += h[(Math.random() * 16) | 0];
  }
  return s;
}

const two = (n: number) => String(n).padStart(2, '0');
export const hm = (ts: string | number) => {
  const d = new Date(ts);
  return isNaN(+d) ? '' : `${two(d.getHours())}:${two(d.getMinutes())}`;
};
/** "now", "5min ago", "3h ago", "Yesterday", "3 days ago", "2w ago" (the filters read these). */
export function ago(ts: string | number) {
  const t = +new Date(ts);
  if (isNaN(t)) return '';
  const m = Math.max(0, (Date.now() - t) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${Math.floor(m)}min ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  if (m < 2880) return 'Yesterday';
  if (m < 10080) return `${Math.floor(m / 1440)} days ago`;
  return `${Math.floor(m / 10080)}w ago`;
}
export function dayLabel(ts: string | number) {
  const d = new Date(ts);
  const today = new Date();
  const y = new Date(Date.now() - 864e5);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
/** Short time for chat lists: 14:05 today, "Yesterday", or a date. */
export const listTime = (ts: string | number) => (dayLabel(ts) === 'Today' ? hm(ts) : dayLabel(ts));

/** Distance from me, e.g. "1.4km away" (empty when either position is unknown). */
export function kmFromMe(lng?: number | null, lat?: number | null) {
  const me = db.user.coord;
  if (!me || lng == null || lat == null) return '';
  const km = haversine(me, [lng, lat]);
  return `${km < 10 ? km.toFixed(1) : Math.round(km)}km away`;
}
export function haversine(a: [number, number], b: [number, number]) {
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(b[1] - a[1]);
  const dLng = r(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[1])) * Math.cos(r(b[1])) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
const initials = (n: string) =>
  (n || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
const PALETTE = ['#f6ee5c', '#a9b6ff', '#7be0a7', '#f47b3b', '#f6a4b4', '#3d5af1'];
const colorOf = (id: string) => PALETTE[(id || 'x').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
export const facePic = (name: string, id: string) => logoPic(initials(name), colorOf(id), colorOf(id) === '#3d5af1' ? '#fff' : '#000');
const pic = (url?: string | null) => (url ? 'uri:' + url : null);

/* ================================================================ people and business pages */
const PROFILE_COLS = 'id,name,avatar_url,city,bio,role,biz_only,intents,skills,skill_list,level,years,work_status,hire_status,area,experience,education,languages,services,verified,availability,created_at,lng,lat,followers,following,jobs_done,hires,rating,reviews';
export function personFrom(r: any): Person {
  const skills: string[] = r.skills || [];
  // someone who lists no skills is here to hire (or just looking): no "Hire" button, no years of experience
  const client = !skills.length;
  const name = r.name || 'bolo member';
  const photo = pic(r.avatar_url) || facePic(name, r.id);
  return {
    name,
    role: skills[0] || 'Member',
    tag: skills.slice(1, 3).join(' · ') || undefined,
    years: skills.length ? r.years || 0 : 0,
    rate: Number(r.rating) || 0,
    dist: kmFromMe(r.lng, r.lat),
    area: r.area?.home || r.city || '',
    photo,
    pin: photo,
    verified: r.verified ? 1 : 0,
    jobs: r.jobs_done || 0,
    reviews: String(r.reviews || 0),
    followers: r.followers || 0,
    hires: r.hires || 0,
    client: client ? 1 : undefined,
    about: r.bio || '',
    uid: r.id,
    coord: r.lng != null ? [r.lng, r.lat] : undefined,
    skills,
    handle: name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, ''),
  } as Person;
}
/** Extra profile details for the profile page (bio, experience, services…), by app id. */
export const PROFILE_RAW: Record<string, any> = {};

function bizFrom(b: any): { p: Person; s: BizSample } {
  const logo = pic(b.logo_url) || logoPic(initials(b.name), b.color || '#f6ee5c', b.color === '#3d5af1' ? '#fff' : '#000');
  const p: Person = { name: b.name || 'Business', role: 'Business', client: 1, biz: 1, area: b.area || b.city || '', dist: '', rate: 0, years: 0, photo: logo, pin: logo, verified: b.verified === 'verified' ? 1 : 0, jobs: 0, reviews: '0', followers: 0, hires: 0, sector: b.sector, about: b.about, uid: b.owner_id, bizId: b.id } as Person;
  const s = { name: p.name, sector: b.sector || '', size: b.size || '', area: p.area, logo, about: b.about || '', rate: 0, jobs: 0, hires: 0, reviews: '0', followers: 0, web: b.web || '', email: b.email || '', phone: b.phone || '' } as BizSample;
  return { p, s };
}

/** A read that failed (no connection, a server hiccup) must never be mistaken for "nothing there":
    it throws, so the lists on screen stay as they were instead of going empty. */
function need<T extends { error: any }>(r: T): T {
  if (r.error) throw r.error;
  return r;
}

/** Make sure these people (server ids) are in the local model. */
export async function ensurePeople(ids: (string | null | undefined)[]) {
  const want = [...new Set(ids.filter((x): x is string => !!x && x !== db.uid && !db.P[x]))];
  if (!want.length) return;
  for (let i = 0; i < want.length; i += 100) {
    const { data, error } = await supabase.from('profile_cards').select(PROFILE_COLS).in('id', want.slice(i, i + 100));
    if (error) return; // couldn't ask: leave them unknown (the placeholder shows) and try again later
    (data || []).forEach((r: any) => {
      db.P[r.id] = personFrom(r);
      PROFILE_RAW[r.id] = r;
    });
  }
  // accounts that are gone: show a neutral placeholder rather than crash
  want.forEach((id) => {
    if (!db.P[id]) db.P[id] = gone(id);
  });
}
/** Make sure these business pages (server ids) are in the local model. */
export async function ensureBiz(bids: (string | null | undefined)[]) {
  const want = [...new Set(bids.filter((x): x is string => !!x && !db.P[bizKey(x)] && !myBizOf(x)))];
  if (!want.length) return;
  const { data } = await supabase.from('businesses').select('id,owner_id,name,sector,size,city,area,about,logo_url,color,verified,web,email,phone').in('id', want);
  (data || []).forEach((b: any) => {
    const { p, s } = bizFrom(b);
    db.P[bizKey(b.id)] = p;
    db.BIZ_SAMPLE[bizKey(b.id)] = s;
  });
}
/** Refresh one person (profile page). */
export async function loadPerson(id: string) {
  if (id === 'me' || id.startsWith('g_')) return;
  if (id.startsWith('b_')) {
    const bid = id.slice(2);
    if (!isUuid(bid)) db.P[id] = gone(id);
    else if (!myBizOf(bid)) {
      const { data, error } = await supabase.from('businesses').select('id,owner_id,name,sector,size,city,area,about,logo_url,color,verified,web,email,phone').eq('id', bid).maybeSingle();
      if (data) {
        const { p, s } = bizFrom(data);
        db.P[id] = p;
        db.BIZ_SAMPLE[id] = s;
      } else if (!error) db.P[id] = gone(id);
    }
  } else {
    const real = isUuid(id);
    const { data, error } = real ? await supabase.from('profile_cards').select(PROFILE_COLS).eq('id', id).maybeSingle() : { data: null, error: null };
    if (data) {
      db.P[id] = personFrom(data);
      PROFILE_RAW[id] = data;
    } else if (!error) db.P[id] = gone(id); // asked and there is no such account
  }
  if (db.P[id] && db.P[id].name !== GONE) await loadReviewsOf(id);
  bump();
}
export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || '');
/** Marker for an account that no longer exists (or never did): lists skip it, its profile says so. */
export const GONE = 'Deleted account';
const gone = (id: string): Person => ({ name: GONE, role: 'Member', years: 0, rate: 0, dist: '', area: '', photo: facePic('?', id), jobs: 0, reviews: '0', followers: 0, uid: id }) as Person;
export const isGone = (id: string) => db.P[id]?.name === GONE;
/** People to browse and hire: the newest members (nearest first in the lists). */
async function loadPeople() {
  const { data } = need(await supabase.from('profile_cards').select(PROFILE_COLS).neq('id', ME()).eq('visible', true).order('created_at', { ascending: false }).limit(400));
  (data || []).forEach((r: any) => {
    db.P[r.id] = personFrom(r);
    PROFILE_RAW[r.id] = r;
  });
}
/** Find people by name or skill (beyond the ones already loaded). */
export async function searchPeople(q: string) {
  const term = q.replace(/[%,()]/g, ' ').trim();
  if (term.length < 2) return;
  const { data } = await supabase.from('profile_cards').select(PROFILE_COLS).neq('id', ME()).eq('visible', true).or(`name.ilike.%${term}%,city.ilike.%${term}%`).limit(30);
  (data || []).forEach((r: any) => {
    db.P[r.id] = personFrom(r);
    PROFILE_RAW[r.id] = r;
  });
}
/** Reviews people left about someone (profile page). */
export async function loadReviewsOf(id: string) {
  const uid = R(id);
  if (!uid) return;
  const { data } = await supabase.from('reviews').select('id,reviewer_id,stars,tags,body,what,created_at').eq('reviewee_id', uid).order('created_at', { ascending: false }).limit(50);
  await ensurePeople((data || []).map((r: any) => r.reviewer_id));
  db.REVIEWS[id] = (data || []).map(
    (r: any): Review => ({ stars: r.stars, tags: r.tags || [], text: r.body || '', name: r.reviewer_id === db.uid ? db.user.name || 'You' : db.P[r.reviewer_id]?.name || 'bolo member', photo: r.reviewer_id === db.uid ? db.user.avatar || facePic(db.user.name, ME()) : db.P[r.reviewer_id]?.photo || facePic('?', r.reviewer_id), time: ago(r.created_at) }),
  );
}

/* ================================================================ posts and jobs */
const POST_COLS = 'id,author_id,business_id,kind,title,body,photos,cat,area,status,urgent,budget_num,data,created_at,lng,lat,likes,comments,offers';
export function postFrom(r: any): Post {
  const mine = r.author_id === db.uid;
  const myBiz = myBizOf(r.business_id);
  const author = r.business_id ? (mine ? 'me' : bizKey(r.business_id)) : L(r.author_id);
  const d = r.data || {};
  const photos = (r.photos || []).map((u: string) => (u.startsWith('uri:') ? u : 'uri:' + u));
  const po: Post = {
    ...d,
    id: r.id,
    kind: r.kind,
    title: r.title || undefined,
    text: r.body || '',
    cat: r.cat || undefined,
    area: r.area || '',
    urgent: !!r.urgent,
    photos,
    time: ago(r.created_at),
    at: +new Date(r.created_at),
    likes: r.likes || 0,
    comments: r.comments || 0,
    offers: r.offers || 0,
    status: r.status,
    coord: r.lng != null ? [r.lng, r.lat] : undefined,
    mine: mine ? 1 : undefined,
    as: r.business_id ? 'business' : 'regular',
    biz: r.business_id ? (mine ? myBiz?.id || null : bizKey(r.business_id)) : null,
  };
  if (r.kind === 'request') po.client = author;
  else po.by = author;
  if (!po.src && photos[0] && r.kind !== 'request') po.src = photos[0];
  // keep the offers already loaded for my own jobs
  const old = db.POSTS.find((x) => x.id === r.id);
  if ((old as any)?.tmp) (po as any).tmp = (old as any).tmp;
  if (old?.offerList) po.offerList = old.offerList;
  if (old?.booked) po.booked = old.booked;
  return po;
}
/** One post that isn't in the feed yet (opened from a notification or a link). */
export async function loadPost(id: string) {
  const { data } = await supabase.from('post_feed').select(POST_COLS).eq('id', id).maybeSingle();
  if (!data) return;
  await Promise.all([ensurePeople([data.author_id]), ensureBiz([data.business_id])]);
  if (!db.POSTS.some((p) => p.id === id)) db.POSTS.push(postFrom(data));
  if (data.author_id === db.uid) await loadApplications();
  bump();
}
async function loadPosts() {
  const [recent, mine] = await Promise.all([
    supabase.from('post_feed').select(POST_COLS).neq('status', 'closed').order('created_at', { ascending: false }).limit(300).then(need),
    supabase.from('post_feed').select(POST_COLS).eq('author_id', ME()).order('created_at', { ascending: false }).limit(200).then(need),
  ]);
  const rows = [...(mine.data || []), ...(recent.data || [])].filter((r: any, i, a) => a.findIndex((x: any) => x.id === r.id) === i);
  await Promise.all([ensurePeople(rows.map((r: any) => r.author_id)), ensureBiz(rows.map((r: any) => r.business_id))]);
  db.POSTS = rows.filter((r: any) => !blockedIds().has(r.author_id)).map(postFrom).sort((a, b) => (b.at || 0) - (a.at || 0));
}
const BLOCKED = new Set<string>();
const blockedIds = () => BLOCKED;

/** My offers/applications, and the offers on my own jobs. */
async function loadApplications() {
  const myPostIds = db.POSTS.filter((p) => p.mine && p.kind === 'request').map((p) => p.id);
  const [mineQ, onMine] = await Promise.all([
    supabase.from('applications').select('id,post_id,price,when_text,msg,cv,stage,created_at').eq('applicant_id', ME()).then(need),
    myPostIds.length ? supabase.from('applications').select('id,post_id,applicant_id,price,when_text,msg,cv,stage,created_at').in('post_id', myPostIds).neq('stage', 'withdrawn').order('created_at').then(need) : Promise.resolve({ data: [] as any[] }),
  ]);
  db.myOffers = {};
  (mineQ.data || []).forEach((a: any) => {
    if (a.stage === 'withdrawn') return;
    const po = db.POSTS.find((p) => p.id === a.post_id);
    const app = po?.as === 'business';
    db.myOffers[a.post_id] = { id: a.id, price: a.price, when: a.when_text, state: ['short', 'interview', 'offer', 'hired', 'accepted'].includes(a.stage) ? 'acc' : 'sent', app: app ? 1 : undefined, stage: stageText(a.stage, app), cv: a.cv };
  });
  await ensurePeople((onMine.data || []).map((a: any) => a.applicant_id));
  myPostIds.forEach((pid) => {
    const po = db.POSTS.find((p) => p.id === pid)!;
    po.offerList = (onMine.data || [])
      .filter((a: any) => a.post_id === pid && a.stage !== 'declined')
      .map((a: any) => ({ id: a.id, by: L(a.applicant_id), price: a.price, when: a.when_text, msg: a.msg, stage: po.as === 'business' ? (a.stage === 'accepted' ? 'hired' : a.stage) : undefined, cv: a.cv }));
    const acc = (onMine.data || []).find((a: any) => a.post_id === pid && (a.stage === 'accepted' || a.stage === 'hired'));
    if (acc && po.as !== 'business') po.booked = L(acc.applicant_id);
  });
  // offers the other way round need their posts loaded (e.g. an old job not in the recent feed)
  const missing = (mineQ.data || []).map((a: any) => a.post_id).filter((id: string) => !db.POSTS.some((p) => p.id === id));
  if (missing.length) {
    const { data } = need(await supabase.from('post_feed').select(POST_COLS).in('id', missing));
    await Promise.all([ensurePeople((data || []).map((r: any) => r.author_id)), ensureBiz((data || []).map((r: any) => r.business_id))]);
    (data || []).forEach((r: any) => db.POSTS.push(postFrom(r)));
  }
}
export function stageText(stage: string, app?: boolean) {
  if (!app) return stage === 'accepted' ? 'Booked' : stage === 'declined' ? 'Not chosen' : undefined;
  return (
    {
      applied: 'Application sent',
      short: 'Shortlisted, interview soon',
      interview: 'Interview invite',
      offer: 'Job offer received',
      hired: 'Hired',
      accepted: 'Hired',
      declined: 'Not selected this time',
    } as Record<string, string>
  )[stage];
}

/* ================================================================ likes, saves, follows */
export const SAVE_KIND: Record<string, string> = { savedJobs: 'job', saved: 'person', savedPosts: 'post', savedOpps: 'opp', savedCourses: 'course', savedCos: 'company', savedMentors: 'mentor' };
async function loadMine() {
  const [likes, saves, follows, blocks] = await Promise.all([
    supabase.from('post_likes').select('post_id').eq('user_id', ME()).then(need),
    supabase.from('saves').select('kind,target_id').eq('user_id', ME()).then(need),
    supabase.from('follows').select('followee_id').eq('follower_id', ME()).then(need),
    supabase.from('blocks').select('blocked_id').eq('blocker_id', ME()).then(need),
  ]);
  db.liked = (likes.data || []).map((x: any) => x.post_id);
  Object.entries(SAVE_KIND).forEach(([list, kind]) => ((db as any)[list] = (saves.data || []).filter((x: any) => x.kind === kind).map((x: any) => L(x.target_id))));
  const fol = (follows.data || []).map((x: any) => x.followee_id as string);
  await ensurePeople(fol);
  db.followed = [...fol.map(L), ...db.savedCos];
  BLOCKED.clear();
  (blocks.data || []).forEach((x: any) => BLOCKED.add(x.blocked_id));
}
export const isBlocked = (id: string) => BLOCKED.has(R(id));
/** The people I blocked (their ids). */
export const blockedList = () => [...BLOCKED];
/** My public numbers (followers, jobs done, rating) as others see them. */
const MINE: { followers: number; following: number; jobs_done: number; hires: number; rating: number; reviews: number } = { followers: 0, following: 0, jobs_done: 0, hires: 0, rating: 0, reviews: 0 };
export const myStats = () => MINE;
async function loadMyStats() {
  const { data } = need(await supabase.from('profile_stats').select('*').eq('id', ME()).maybeSingle());
  if (data) Object.assign(MINE, { ...data, rating: Number(data.rating) || 0 });
  const { data: p } = need(await supabase.from('profiles').select('verified').eq('id', ME()).maybeSingle());
  if (p) db.user.verified = !!p.verified;
}
/** People who follow me (app ids). */
export async function myFollowers(): Promise<string[]> {
  const { data } = await supabase.from('follows').select('follower_id').eq('followee_id', ME()).limit(500);
  const ids = (data || []).map((x: any) => x.follower_id as string);
  await ensurePeople(ids);
  return ids.map(L);
}
export function setBlocked(id: string, on: boolean) {
  const u = R(id);
  if (on) BLOCKED.add(u);
  else BLOCKED.delete(u);
}

/* ================================================================ chats */
const CHAT_FILE_TTL = 60 * 60 * 24 * 7;
function convKey(c: any, members: any[]): { key: string; inbox: 'W' | 'C' } {
  if (c.kind === 'group') {
    const key = groupKey(c.id);
    const mentorship = db.MENTORSHIPS.find((m) => (m as any).cid === c.id);
    const photo = logoPic(initials(c.title || 'Group'), c.color || '#a9b6ff', '#000');
    db.P[key] = { ...(db.P[key] || {}), name: c.title || 'Group', role: 'Group', group: 1, years: 0, rate: 0, dist: '', area: '', photo, pin: photo, jobs: 0, reviews: '0', followers: 0, mentorship: mentorship?.id, about: c.about } as Person;
    return { key, inbox: 'W' };
  }
  const other = members.find((m) => m.user_id !== db.uid)?.user_id || '';
  if (c.business_id) {
    if (myBizOf(c.business_id)) return { key: other, inbox: 'C' };
    return { key: bizKey(c.business_id), inbox: 'W' };
  }
  return { key: other, inbox: 'W' };
}
/** Turn a server message into a chat bubble. */
function msgFrom(m: any, conv: { kind: string }, others: any[]): Msg {
  const mine = m.sender_id === db.uid;
  const at = hm(m.created_at);
  const d = m.data || {};
  const base: Msg = { id: m.id, f: mine ? 'me' : 'them', at, ts0: +new Date(m.created_at) };
  if (m.kind === 'sys' || !m.sender_id) return { ...base, sys: m.body, f: undefined, call: d.call ? 1 : undefined, missed: d.call ? !!d.missed : undefined };
  if (mine) base.st = m._st || (others.some((o) => +new Date(o.last_read_at) >= +new Date(m.created_at)) ? 'read' : 'sent');
  if (conv.kind === 'group' && !mine) base.by = L(m.sender_id);
  const who = conv.kind === 'group' && !mine ? (db.P[m.sender_id]?.name || 'Member').split(' ')[0] + ': ' : '';
  switch (m.kind) {
    case 'offer':
      return { ...base, k: 'offer', job: d.job, price: d.price, when: d.when, dur: d.dur, state: d.state, wk: (d.worker || 'sender') === 'sender' ? (mine ? 'me' : 'them') : mine ? 'them' : 'me' };
    case 'img':
      return { ...base, k: 'img', src: d.url ? 'uri:' + d.url : undefined, name: d.path };
    case 'file':
      return { ...base, k: 'file', name: d.name || 'File', size: d.size || '', src: d.url, t: d.path };
    case 'loc':
      return { ...base, k: 'loc', t: who + (m.body || '📍 Location'), lat: d.lat, lng: d.lng };
    case 'deleted':
      return { ...base, t: mine ? '🚫 You deleted this message' : '🚫 This message was deleted' };
    default:
      return { ...base, t: who + m.body, fw: d.fw ? 1 : undefined };
  }
}
/** Day separators between messages from different days. */
function withDays(msgs: Msg[]): Msg[] {
  const out: Msg[] = [];
  let last = '';
  msgs.forEach((m) => {
    const day = m.ts0 ? dayLabel(m.ts0) : '';
    if (day && day !== last) {
      out.push({ d: day });
      last = day;
    }
    out.push(m);
  });
  return out;
}
const RAW_MSGS: Record<string, any[]> = {};
const CONVS: Record<string, any> = {};
const MEMBERS: Record<string, any[]> = {};

/** Signed links for chat photos and files (the chat bucket is private). */
async function signFiles(rows: any[]) {
  const paths = rows.filter((m) => (m.kind === 'img' || m.kind === 'file') && m.data?.path && !m.data.url).map((m) => m.data.path);
  if (!paths.length) return;
  const { data } = await supabase.storage.from('chat').createSignedUrls(paths, CHAT_FILE_TTL);
  const map: Record<string, string> = {};
  (data || []).forEach((x: any) => x.signedUrl && (map[x.path] = x.signedUrl));
  rows.forEach((m) => m.data?.path && map[m.data.path] && (m.data = { ...m.data, url: map[m.data.path] }));
}

/** Rebuild one chat in the local model from its server rows. */
function buildThread(cid: string) {
  const c = CONVS[cid];
  if (!c) return;
  const members = MEMBERS[cid] || [];
  const { key, inbox } = convKey(c, members);
  if (!key) return;
  db.CONV[cid] = { key, inbox };
  const T = inbox === 'W' ? db.THREADS_W : db.THREADS_C;
  const O = inbox === 'W' ? db.ORDER_W : db.ORDER_C;
  const hiddenAt = db.HIDDEN[cid] || 0;
  const rows = (RAW_MSGS[cid] || []).filter((m) => +new Date(m.created_at) > hiddenAt);
  if (hiddenAt && !rows.length) {
    delete T[key];
    const i = O.indexOf(key);
    if (i >= 0) O.splice(i, 1);
    return;
  }
  const me = members.find((m) => m.user_id === db.uid);
  const others = members.filter((m) => m.user_id !== db.uid);
  const lastRead = me ? +new Date(me.last_read_at) : 0;
  const old = T[key];
  const th: Thread = {
    ...(old || {}),
    cid,
    time: listTime(c.last_message_at),
    msgs: withDays(rows.map((m) => msgFrom(m, c, others))),
    unread: rows.filter((m) => m.sender_id && m.sender_id !== db.uid && +new Date(m.created_at) > lastRead).length,
    job: c.topic || undefined,
    group: c.kind === 'group' ? 1 : undefined,
    members: c.kind === 'group' ? others.map((o) => L(o.user_id)) : undefined,
    muted: me?.muted ? 1 : undefined,
    uids: members.map((m) => m.user_id),
    typing: 0,
  };
  T[key] = th;
  if (!O.includes(key)) O.push(key);
}
function sortOrders() {
  const t = (inbox: 'W' | 'C', key: string) => {
    const th = (inbox === 'W' ? db.THREADS_W : db.THREADS_C)[key];
    return th?.cid ? +new Date(CONVS[th.cid]?.last_message_at || 0) : 0;
  };
  db.ORDER_W.sort((a, b) => (db.THREADS_W[b]?.pinned || 0) - (db.THREADS_W[a]?.pinned || 0) || t('W', b) - t('W', a));
  db.ORDER_C.sort((a, b) => (db.THREADS_C[b]?.pinned || 0) - (db.THREADS_C[a]?.pinned || 0) || t('C', b) - t('C', a));
}
async function loadChats() {
  const { data: convs } = need(await supabase.from('conversations').select('*').order('last_message_at', { ascending: false }).limit(200));
  const ids = (convs || []).map((c: any) => c.id);
  if (!ids.length) {
    db.THREADS_W = Object.fromEntries(Object.entries(db.THREADS_W).filter(([, th]) => !th.cid));
    db.THREADS_C = Object.fromEntries(Object.entries(db.THREADS_C).filter(([, th]) => !th.cid));
    db.ORDER_W = Object.keys(db.THREADS_W);
    db.ORDER_C = Object.keys(db.THREADS_C);
    db.CONV = {};
    return;
  }
  const [mem, msgs] = await Promise.all([
    supabase.from('conversation_members').select('conversation_id,user_id,role,last_read_at,muted').in('conversation_id', ids).then(need),
    supabase.from('messages').select('id,conversation_id,sender_id,kind,body,data,created_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(2000).then(need),
  ]);
  await signFiles(msgs.data || []);
  Object.keys(CONVS).forEach((k) => delete CONVS[k]);
  (convs || []).forEach((c: any) => (CONVS[c.id] = c));
  Object.keys(MEMBERS).forEach((k) => delete MEMBERS[k]);
  (mem.data || []).forEach((m: any) => (MEMBERS[m.conversation_id] = [...(MEMBERS[m.conversation_id] || []), m]));
  // messages still being sent, or marked "Not sent", only exist on this phone: keep them through the reload
  const unsent = Object.values(RAW_MSGS).flat().filter((m: any) => m._st);
  Object.keys(RAW_MSGS).forEach((k) => delete RAW_MSGS[k]);
  (msgs.data || []).reverse().forEach((m: any) => (RAW_MSGS[m.conversation_id] = [...(RAW_MSGS[m.conversation_id] || []), m]));
  unsent.forEach((m: any) => {
    const L0 = (RAW_MSGS[m.conversation_id] = RAW_MSGS[m.conversation_id] || []);
    if (!L0.some((x) => x.id === m.id)) L0.push(m);
  });
  await Promise.all([ensurePeople([...(mem.data || []).map((m: any) => m.user_id)]), ensureBiz((convs || []).map((c: any) => c.business_id))]);
  // keep pins and chats just opened that have no messages yet; rebuild everything else
  const pins: Record<string, number> = {};
  [db.THREADS_W, db.THREADS_C].forEach((T) => Object.entries(T).forEach(([k, th]) => th.pinned && (pins[k] = 1)));
  const draftsW = Object.entries(db.THREADS_W).filter(([, th]) => !th.cid);
  const draftsC = Object.entries(db.THREADS_C).filter(([, th]) => !th.cid);
  db.THREADS_W = Object.fromEntries(draftsW);
  db.THREADS_C = Object.fromEntries(draftsC);
  db.ORDER_W = draftsW.map(([k]) => k);
  db.ORDER_C = draftsC.map(([k]) => k);
  db.CONV = {};
  ids.forEach(buildThread);
  Object.keys(pins).forEach((k) => {
    if (db.THREADS_W[k]) db.THREADS_W[k].pinned = 1;
    if (db.THREADS_C[k]) db.THREADS_C[k].pinned = 1;
  });
  sortOrders();
}
/** The chat (server id) for an app chat key, opening one on the server if needed. */
export async function convFor(key: string, inbox: 'W' | 'C'): Promise<string> {
  const T = inbox === 'W' ? db.THREADS_W : db.THREADS_C;
  if (T[key]?.cid) return T[key].cid!;
  if (key.startsWith('g_')) return key.slice(2);
  let other = key;
  let business: string | null = null;
  if (key.startsWith('b_')) {
    other = db.P[key]?.uid || '';
    business = key.slice(2);
  } else if (inbox === 'C') {
    const b = db.BIZ.list.find((x) => x.id === db.BIZ.active);
    business = b?.remoteId || null;
  }
  if (!other) throw new Error('This account isn’t available');
  const { data, error } = await supabase.rpc('start_direct', { p_other: other, p_business: business });
  if (error) throw error;
  const cid = data as string;
  CONVS[cid] = CONVS[cid] || { id: cid, kind: 'direct', business_id: business, topic: '', last_message_at: new Date().toISOString() };
  MEMBERS[cid] = MEMBERS[cid] || [
    { conversation_id: cid, user_id: db.uid, last_read_at: new Date().toISOString(), muted: false },
    { conversation_id: cid, user_id: other, last_read_at: new Date(0).toISOString(), muted: false },
  ];
  RAW_MSGS[cid] = RAW_MSGS[cid] || [];
  if (T[key]) T[key].cid = cid;
  db.CONV[cid] = { key, inbox };
  return cid;
}
/** Send a message (shown at once; replaced by the server copy when it comes back). */
export async function sendMessage(key: string, inbox: 'W' | 'C', kind: 'text' | 'offer' | 'img' | 'file' | 'loc' | 'contact', body: string, data: Record<string, any> = {}) {
  const cid = await convFor(key, inbox);
  const id = uuid();
  const row: any = { id, conversation_id: cid, sender_id: db.uid, kind, body, data, created_at: new Date().toISOString(), _st: 'sending' };
  RAW_MSGS[cid] = [...(RAW_MSGS[cid] || []), row];
  if (CONVS[cid]) CONVS[cid].last_message_at = row.created_at;
  buildThread(cid);
  sortOrders();
  bump();
  // signed links expire: only the file's path is stored, each phone makes its own link
  const { url: _url, ...stored } = data;
  const { error } = await supabase.from('messages').insert({ id, conversation_id: cid, kind, body, data: stored });
  const mineRow = (RAW_MSGS[cid] || []).find((m) => m.id === id);
  if (error && error.code !== '23505') {
    // A text stays in the chat marked "Not sent" so it can be retried with a tap; other kinds are taken back.
    if (kind === 'text' && mineRow) mineRow._st = 'failed';
    else RAW_MSGS[cid] = (RAW_MSGS[cid] || []).filter((m) => m.id !== id);
    buildThread(cid);
    bump();
    (error as any).kept = kind === 'text';
    throw error;
  }
  if (mineRow) delete mineRow._st;
  buildThread(cid);
  bump();
  return id;
}
/** Try again to send a message that is marked "Not sent". */
export async function retryMessage(cid: string, id: string) {
  const row = (RAW_MSGS[cid] || []).find((m) => m.id === id);
  if (!row || row._st !== 'failed') return;
  row._st = 'sending';
  row.created_at = new Date().toISOString();
  buildThread(cid);
  bump();
  const { url: _url, ...stored } = row.data || {};
  const { error } = await supabase.from('messages').insert({ id, conversation_id: cid, kind: row.kind, body: row.body, data: stored });
  // "already there" means the first try did reach the server
  if (error && error.code !== '23505') row._st = 'failed';
  else delete row._st;
  buildThread(cid);
  bump();
  if (row._st) throw error;
}
/** Upload a photo or file from the phone into a chat; returns its storage path. */
export async function uploadChatFile(cid: string, localUri: string, ext: string, contentType: string) {
  const { File } = require('expo-file-system');
  const bytes = await new File(localUri).bytes();
  const path = `${cid}/${uuid()}.${ext}`;
  const { error } = await supabase.storage.from('chat').upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
  const { data } = await supabase.storage.from('chat').createSignedUrl(path, CHAT_FILE_TTL);
  return { path, url: data?.signedUrl || '' };
}
export const convOfKey = (key: string, inbox: 'W' | 'C') => (inbox === 'W' ? db.THREADS_W : db.THREADS_C)[key]?.cid;
export const rawMessage = (cid: string, id: string) => (RAW_MSGS[cid] || []).find((m) => m.id === id);
export const membersOf = (cid: string) => MEMBERS[cid] || [];
export const convRow = (cid: string) => CONVS[cid];

let readTimer: Record<string, any> = {};
let readMark: Record<string, string> = {};
/** I've seen this chat: tell the server (read receipts), at most every few seconds. */
export function markRead(cid: string) {
  const me = (MEMBERS[cid] || []).find((m) => m.user_id === db.uid);
  const now = new Date().toISOString();
  if (me) me.last_read_at = now;
  // tell the server once per new message, not on every redraw of the chat
  const L0 = RAW_MSGS[cid] || [];
  const last = L0.length ? L0[L0.length - 1].id : '';
  if (readMark[cid] === last) return;
  readMark[cid] = last;
  if (readTimer[cid]) return;
  readTimer[cid] = setTimeout(async () => {
    delete readTimer[cid];
    await supabase.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', cid).eq('user_id', ME());
    // opening the chat also clears its notifications: new messages and missed calls
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', ME()).in('event_key', ['msg:' + cid, 'missed:' + cid]).is('read_at', null);
  }, 1500);
}

/* ================================================================ bookings */
const BOOKING_COLS = 'id,worker_id,client_id,business_id,post_id,conversation_id,title,when_text,price,amount,area,state,eta_min,log,created_at,dest_lng,dest_lat';
const REVIEWED = new Set<string>();
function bookingFrom(r: any): Booking {
  const iWork = r.worker_id === db.uid;
  const worker = L(r.worker_id);
  const client = r.client_id === db.uid ? 'me' : r.business_id ? bizKey(r.business_id) : L(r.client_id);
  const old = db.BOOKINGS.find((b) => b.id === r.id);
  const log: Record<string, string> = {};
  Object.entries(r.log || {}).forEach(([k, v]) => (log[k] = hm(v as string)));
  return {
    id: r.id,
    worker,
    client,
    title: r.title,
    when: r.when_text || 'Agreed in chat',
    price: r.price || 'Agreed in chat',
    area: r.area || '',
    state: r.state,
    eta: r.eta_min ?? old?.eta ?? 0,
    eta0: old?.eta0 || r.eta_min || 0,
    log,
    as: r.business_id && r.client_id === db.uid ? 'business' : 'regular',
    reviewed: REVIEWED.has(r.id) ? 1 : undefined,
    amt: r.amount,
    cid: r.conversation_id || undefined,
    dest: r.dest_lng != null ? [r.dest_lng, r.dest_lat] : undefined,
    live: old?.live,
    liveAt: old?.liveAt,
    ...(iWork ? {} : {}),
  };
}
async function loadBookings() {
  const [bq, rq] = await Promise.all([
    supabase.from('booking_cards').select(BOOKING_COLS).neq('state', 'cancelled').order('created_at', { ascending: false }).limit(200).then(need),
    supabase.from('reviews').select('booking_id').eq('reviewer_id', ME()).then(need),
  ]);
  REVIEWED.clear();
  (rq.data || []).forEach((r: any) => r.booking_id && REVIEWED.add(r.booking_id));
  const rows = bq.data || [];
  await Promise.all([ensurePeople(rows.flatMap((r: any) => [r.worker_id, r.client_id])), ensureBiz(rows.map((r: any) => r.business_id))]);
  db.BOOKINGS = rows.map(bookingFrom);
  db.hired = [...new Set(db.BOOKINGS.filter((b) => b.client === 'me' && b.state !== 'confirmed').map((b) => b.worker))];
  const onway = rows.filter((r: any) => r.state === 'onway').map((r: any) => r.id);
  if (onway.length) {
    const { data } = need(await supabase.from('booking_locations').select('*').in('booking_id', onway));
    (data || []).forEach(applyLocation);
  }
}
export async function refreshBooking(id: string) {
  const { data } = await supabase.from('booking_cards').select(BOOKING_COLS).eq('id', id).maybeSingle();
  if (!data) return;
  await Promise.all([ensurePeople([data.worker_id, data.client_id]), ensureBiz([data.business_id])]);
  upsertBooking(data);
}
function upsertBooking(r: any) {
  const i = db.BOOKINGS.findIndex((b) => b.id === r.id);
  const was = i >= 0 ? db.BOOKINGS[i].state : null;
  if (r.state === 'done' && was && was !== 'done' && r.client_id === db.uid) setTimeout(() => require('./events').emit('doneAlert', r.id), 300);
  if (r.state === 'onway' && was === 'booked' && r.worker_id === db.uid) {
    const b = db.BOOKINGS[i];
    if (b && require('./tracking').sharingFor() !== b.id) void require('./tracking').startSharing(b, true);
  }
  if (r.state === 'cancelled') {
    if (i >= 0) db.BOOKINGS.splice(i, 1);
  } else if (i >= 0) db.BOOKINGS[i] = { ...bookingFrom({ ...r, dest_lng: r.dest_lng ?? db.BOOKINGS[i].dest?.[0], dest_lat: r.dest_lat ?? db.BOOKINGS[i].dest?.[1] }) };
  else db.BOOKINGS.unshift(bookingFrom(r));
  db.hired = [...new Set(db.BOOKINGS.filter((b) => b.client === 'me' && b.state !== 'confirmed').map((b) => b.worker))];
  bump();
}
function applyLocation(l: any) {
  const b = db.BOOKINGS.find((x) => x.id === l.booking_id);
  if (!b) return;
  b.live = [l.lng, l.lat];
  b.liveAt = +new Date(l.updated_at);
  if (l.eta_min != null) {
    b.eta = l.eta_min;
    if (!b.eta0 || b.eta0 < l.eta_min) b.eta0 = l.eta_min;
  }
}
export const markReviewed = (bid: string) => REVIEWED.add(bid);

/* ================================================================ notifications */
const NOTIF_TYPE: Record<string, string> = { newoffer: 'newoffer', stage: 'accept', booked: 'accept', onway: 'onway', arrived: 'arrived', jobdone: 'jobdone', confirmed: 'accept', cancelled: 'reminder', issue: 'reminder', message: 'message', comment: 'comment', like: 'like', follow: 'follow', review: 'review', enrol: 'enrol', accept: 'accept', mentor: 'mentor', verification: 'account', expert: 'account', rating: 'rating', course: 'course' };
export function goFrom(t: any): Notif['go'] {
  if (!t || !t.k) return undefined;
  if (t.k === 'chat') {
    const c = db.CONV[t.id];
    return c ? { k: 'chat', id: c.key } : { k: 'notifs' };
  }
  if (t.k === 'profile') return t.id === db.uid ? { k: 'me' } : { k: 'profile', id: L(t.id) };
  if (t.k === 'verify') return { k: 'me' };
  return t;
}
function notifFrom(n: any): Notif {
  const who = n.actor_id ? L(n.actor_id) : undefined;
  const msg = n.type === 'message';
  const d = dayLabel(n.created_at);
  return {
    id: n.id,
    g: d === 'Today' ? 'Today' : d === 'Yesterday' ? 'Yesterday' : 'Earlier',
    type: NOTIF_TYPE[n.type] || n.type,
    who,
    time: ago(n.created_at),
    read: n.read_at ? 1 : 0,
    text: msg ? 'sent you a message' : n.body,
    snip: msg ? n.body : undefined,
    go: goFrom(n.target),
    key: n.event_key,
    cat: n.category,
  } as Notif;
}
const NOTIF_RAW: Record<string, any> = {};
function placeNotif(n: any) {
  NOTIF_RAW[n.id] = n;
  const C = !!(n.business_id && myBizOf(n.business_id));
  const N = C ? db.NOTIFS_C : db.NOTIFS_W;
  const other = C ? db.NOTIFS_W : db.NOTIFS_C;
  const j = other.findIndex((x) => x.id === n.id);
  if (j >= 0) other.splice(j, 1);
  const i = N.findIndex((x) => x.id === n.id);
  if (i >= 0) N.splice(i, 1);
  N.unshift(notifFrom(n));
}
async function loadNotifs() {
  const { data } = need(await supabase.from('notifications').select('*').eq('recipient_id', ME()).order('created_at', { ascending: false }).limit(200));
  await Promise.all([ensurePeople((data || []).map((n: any) => n.actor_id))]);
  db.NOTIFS_W = [];
  db.NOTIFS_C = [];
  (data || []).reverse().forEach(placeNotif);
}
export async function setNotifRead(ids: string[]) {
  if (!ids.length) return;
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids).is('read_at', null);
}
export async function deleteNotifRows(ids: string[]) {
  if (!ids.length) return;
  await supabase.from('notifications').delete().in('id', ids);
}

/* ================================================================ career: courses, opportunities, mentorships, experts */
function courseFrom(r: any): Course {
  const d = r.data || {};
  const mine = r.owner_id === db.uid;
  return {
    id: r.id,
    title: r.title,
    prov: d.prov || { n: d.by || 'Course', logo: logoPic(initials(d.by || r.title), '#a9b6ff') },
    cat: d.cat || 'Business',
    lv: d.lv || 'Beginner',
    dur: d.dur || 'Self-paced',
    type: d.type || 'Skill',
    fmt: d.fmt || 'Online',
    reg: d.reg || '',
    price: Number(d.price) || 0,
    old: 0,
    prof: d.prof || '',
    skills: d.skills || [],
    mo: 0,
    url: r.url,
    desc: d.desc || '',
    priceText: d.priceText || undefined,
    views: r.views || 0,
    mine: mine ? 1 : undefined,
    biz: mine && r.business_id ? myBizOf(r.business_id)?.id : undefined,
  } as Course;
}
async function loadCourses() {
  const { data } = need(await supabase.from('course_listings').select('*').order('created_at', { ascending: false }).limit(500));
  db.COURSES = (data || []).map(courseFrom).sort((a, b) => +!!b.mine - +!!a.mine);
}
async function loadOpps() {
  const [oq, sq, mineApps] = await Promise.all([
    supabase.from('opportunities').select('*').eq('status', 'open').order('created_at', { ascending: false }).limit(200).then(need),
    supabase.from('opportunity_stats').select('*').then(need),
    supabase.from('opportunity_applications').select('opportunity_id,user_id,status').then(need),
  ]);
  const joined: Record<string, number> = {};
  (sq.data || []).forEach((s: any) => (joined[s.id] = s.joined));
  const apps = mineApps.data || [];
  await Promise.all([ensureBiz((oq.data || []).map((o: any) => o.business_id)), ensurePeople(apps.map((a: any) => a.user_id))]);
  db.OPPS = (oq.data || []).map((o: any): Opp => {
    const d = o.data || {};
    const mine = o.owner_id === db.uid;
    const people = apps.filter((a: any) => a.opportunity_id === o.id && a.user_id !== db.uid);
    const st: Record<string, 'acc' | 'dec'> = {};
    people.forEach((a: any) => a.status !== 'pending' && (st[L(a.user_id)] = a.status));
    const myApp = apps.find((a: any) => a.opportunity_id === o.id && a.user_id === db.uid);
    return {
      id: o.id,
      biz: mine ? myBizOf(o.business_id)?.id || '' : bizKey(o.business_id),
      kind: o.kind,
      title: o.title,
      cat: d.cat || '',
      dur: d.dur || '',
      start: d.start || '',
      mode: d.mode || '',
      pay: d.pay || '',
      seats: o.seats,
      joined: joined[o.id] || 0,
      deadline: d.deadline || '',
      desc: d.desc || '',
      skills: d.skills || [],
      mine: mine ? 1 : undefined,
      applied: myApp ? 1 : undefined,
      people: mine ? people.map((a: any) => L(a.user_id)) : undefined,
      st: mine ? st : myApp && myApp.status !== 'pending' ? { me: myApp.status } : undefined,
    } as Opp;
  });
}
async function loadMentorships() {
  const [mq, sq, mem] = await Promise.all([
    supabase.from('mentorships').select('*').order('created_at', { ascending: false }).limit(200).then(need),
    supabase.from('mentorship_stats').select('*').then(need),
    supabase.from('mentorship_members').select('mentorship_id,user_id,status').then(need),
  ]);
  const joined: Record<string, number> = {};
  (sq.data || []).forEach((s: any) => (joined[s.id] = s.joined));
  const members = mem.data || [];
  await Promise.all([ensurePeople([...(mq.data || []).map((m: any) => m.owner_id), ...members.map((x: any) => x.user_id)]), ensureBiz((mq.data || []).map((m: any) => m.business_id))]);
  db.MENTORSHIPS = (mq.data || []).map((m: any): Mentorship => {
    const d = m.data || {};
    const mine = m.owner_id === db.uid;
    const ppl = members.filter((x: any) => x.mentorship_id === m.id && x.user_id !== db.uid);
    const st: Record<string, 'acc' | 'dec' | 'pending'> = {};
    ppl.forEach((x: any) => (st[L(x.user_id)] = x.status === 'yes' ? 'acc' : x.status === 'dec' ? 'dec' : 'pending'));
    const me = members.find((x: any) => x.mentorship_id === m.id && x.user_id === db.uid);
    return {
      id: m.id,
      by: mine ? undefined : m.business_id ? bizKey(m.business_id) : L(m.owner_id),
      title: m.title,
      field: d.field || '',
      format: d.format || 'Group',
      dur: d.dur || '',
      price: d.price || 'Free',
      seats: m.seats,
      joined: joined[m.id] || 0,
      desc: d.desc || '',
      rules: d.rules || [],
      mine: mine ? 1 : undefined,
      asBiz: mine && m.business_id ? myBizOf(m.business_id)?.id || null : null,
      people: mine ? ppl.map((x: any) => L(x.user_id)) : undefined,
      joinedMe: me ? (me.status === 'yes' ? 'yes' : me.status === 'req' ? 'req' : null) : null,
      st: mine ? st : undefined,
      color: d.color,
      cid: m.conversation_id,
    } as Mentorship & { cid?: string };
  });
}
export function expertFrom(e: any, p?: any): Expert {
  const d = e.data || {};
  const name = p?.name || 'bolo expert';
  const amount = Number(d.amount) || 0;
  const fmts: string[] = d.formats || [];
  const services: ExService[] = (d.services as ExService[]) || fmts.map((f, i) => ({ id: 's' + i, t: f, price: d.price === 'Free' ? 0 : amount, mins: /60/.test(f) ? 60 : /30/.test(f) ? 30 : undefined, fmt: /CV|written/i.test(f) ? 'Written review' : /Chat/i.test(f) ? 'Chat' : 'Video call', d: f, gets: [] }));
  return {
    id: e.user_id,
    pid: L(e.user_id),
    name,
    pic: p?.avatar_url ? 'uri:' + p.avatar_url : facePic(name, e.user_id),
    head: e.headline || d.headline || '',
    bio: [d.role, d.creds?.length ? d.creds.join(', ') : ''].filter(Boolean),
    about: p?.bio || d.sample || '',
    specs: d.fields || [],
    goals: d.areas || [],
    langs: d.langs || ['English'],
    yrs: Number(d.years) || 0,
    sessions: 0,
    services: services.length ? services : [{ id: 's0', t: 'Career call', price: amount, fmt: 'Video call', d: 'A call about your next career step', gets: [] }],
    reviews: [],
    soon: 1,
  };
}
async function loadExperts() {
  const { data } = need(await supabase.from('experts').select('*').eq('status', 'approved').limit(200));
  const ids = (data || []).map((e: any) => e.user_id);
  const { data: cards } = ids.length ? need(await supabase.from('profile_cards').select(PROFILE_COLS).in('id', ids)) : { data: [] as any[] };
  (cards || []).forEach((r: any) => r.id !== db.uid && ((db.P[r.id] = personFrom(r)), (PROFILE_RAW[r.id] = r)));
  db.EXPERTS = (data || []).map((e: any) => expertFrom(e, (cards || []).find((c: any) => c.id === e.user_id)));
  // my own application
  const { data: mine } = need(await supabase.from('experts').select('*').eq('user_id', ME()).maybeSingle());
  if (mine) {
    const d = mine.data || {};
    db.EXPERT = { ...fill(db.EXPERT, d), status: mine.status === 'submitted' ? 'submitted' : mine.status, headline: mine.headline || d.headline || '' };
  }
}

/* ================================================================ load everything, keep it live */
let loading: Promise<void> | null = null;
let loadingFor = '';
let loadedAt = 0;
/** Signing out: forget everything kept in memory about the account, so nothing carries over to the next one. */
export function resetSession() {
  BLOCKED.clear();
  REVIEWED.clear();
  Object.assign(MINE, { followers: 0, following: 0, jobs_done: 0, hires: 0, rating: 0, reviews: 0 });
  [RAW_MSGS, CONVS, MEMBERS, NOTIF_RAW, PROFILE_RAW].forEach((m) => Object.keys(m).forEach((k) => delete (m as any)[k]));
  Object.values(readTimer).forEach((t) => clearTimeout(t));
  readTimer = {};
  readMark = {};
  loadingFor = '';
  loadedAt = 0;
  net.offline = false;
  net.loading = false;
  net.opening = true;
}
/** Load (or refresh) everything for the signed-in account. Safe to call often. */
export function loadAll(force = false): Promise<void> {
  if (!db.uid) return Promise.resolve();
  const me = db.uid;
  if (loading && loadingFor === me) return loading;
  // coming back to the app again and again doesn't reload everything each time: live updates cover the gap
  if (!force && loadingFor === me && !net.offline && Date.now() - loadedAt < 45000) return Promise.resolve();
  // a load still running for another account (just signed out) finishes first, then this one starts
  const before = loading;
  loadingFor = me;
  let mine: Promise<void> | null = null;
  mine = (async () => {
    if (before) await before.catch(() => {});
    if (db.uid !== me) return;
    const failed: any[] = [];
    // each part loads on its own: one that fails keeps what it had, and doesn't stop the others
    const run = async (fns: (() => Promise<any>)[]) => {
      const rs = await Promise.allSettled(fns.map((f) => f()));
      rs.forEach((r) => r.status === 'rejected' && failed.push(r.reason));
    };
    net.loading = !db.syncedAt;
    try {
      await run([loadMine]);
      await run([loadPeople, loadPosts, loadCourses, loadMyStats]);
      await run([loadApplications, loadMentorships, loadOpps, loadExperts]);
      await run([loadChats]);
      await run([loadBookings, loadNotifs]);
      if (!failed.length) db.syncedAt = loadedAt = Date.now();
      else console.warn('bolo: loading failed', failed.length, String(failed[0]?.message || failed[0]));
      net.offline = failed.length > 0;
    } finally {
      net.loading = false;
      if (db.uid === me) net.opening = false;
      if (loading === mine) loading = null;
      bump();
    }
  })();
  loading = mine;
  return loading;
}
export const refreshPosts = async () => (await loadPosts(), await loadApplications(), bump());
export const refreshChats = async () => (await loadChats(), bump());
export const refreshBookings = async () => (await loadBookings(), bump());
export const refreshCareer = async () => (await Promise.all([loadCourses(), loadOpps(), loadMentorships(), loadExperts()]), bump());
export const refreshNotifs = async () => (await loadNotifs(), bump());
export const refreshMine = async () => (await loadMine(), bump());

let channel: RealtimeChannel | null = null;
/** Live updates: new messages, read receipts, bookings, the worker's position, offers and notifications. */
let wantLive = false;
let dropped = false;
let retry: any = null;
/** The live connection dropped (bad network, long sleep, expired session): connect again and catch up. */
function restartSoon() {
  if (retry || !wantLive) return;
  dropped = true;
  retry = setTimeout(() => {
    retry = null;
    if (!wantLive) return;
    const c = channel;
    channel = null;
    if (c) void supabase.removeChannel(c);
    startRealtime();
  }, 4000);
}
/** When the app comes back to the front: make sure live updates are still connected. */
export function checkRealtime() {
  if (!wantLive) return;
  if (!channel) return startRealtime();
  const st = (channel as any).state;
  if (st !== 'joined' && st !== 'joining') restartSoon();
}
export function startRealtime() {
  if (!db.uid || channel) return;
  wantLive = true;
  const me = db.uid;
  const ch = supabase.channel('bolo-' + me);
  channel = ch;
  ch
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async (e: any) => {
      const m = e.new;
      if (!m?.conversation_id) return;
      const cid = m.conversation_id;
      if (!CONVS[cid]) return void loadChats().then(bump);
      const L0 = RAW_MSGS[cid] || [];
      const i = L0.findIndex((x) => x.id === m.id);
      if (m.kind === 'img' || m.kind === 'file') await signFiles([m]);
      if (i >= 0) L0[i] = { ...L0[i], ...m, _st: undefined, data: m.kind === 'deleted' ? {} : { ...(L0[i].data || {}), ...(m.data || {}) } };
      else RAW_MSGS[cid] = [...L0, m];
      if (e.eventType === 'INSERT') CONVS[cid].last_message_at = m.created_at;
      if (m.sender_id && m.sender_id !== me) await ensurePeople([m.sender_id]);
      buildThread(cid);
      sortOrders();
      bump();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_members' }, (e: any) => {
      const r = e.new?.conversation_id ? e.new : e.old;
      if (!r?.conversation_id) return;
      if (!CONVS[r.conversation_id] || (e.eventType === 'INSERT' && r.user_id === me)) return void loadChats().then(bump);
      const L0 = MEMBERS[r.conversation_id] || [];
      const i = L0.findIndex((x) => x.user_id === r.user_id);
      if (e.eventType === 'DELETE') {
        if (i >= 0) L0.splice(i, 1);
      } else if (i >= 0) L0[i] = { ...L0[i], ...e.new };
      else L0.push(e.new);
      MEMBERS[r.conversation_id] = L0;
      buildThread(r.conversation_id);
      bump();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, (e: any) => {
      const r = e.new;
      if (!r?.id) return;
      void refreshBooking(r.id);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'booking_locations' }, (e: any) => {
      if (e.new?.booking_id) {
        applyLocation(e.new);
        bump();
      }
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${me}` }, async (e: any) => {
      if (e.eventType === 'DELETE') {
        const id = e.old?.id;
        [db.NOTIFS_W, db.NOTIFS_C].forEach((N) => {
          const i = N.findIndex((n) => n.id === id);
          if (i >= 0) N.splice(i, 1);
        });
      } else if (e.new) {
        if (e.new.actor_id) await ensurePeople([e.new.actor_id]);
        placeNotif(e.new);
      }
      bump();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'calls' }, (e: any) => {
      if (e.new?.id) require('./calls').applyCallChange(e.new);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, () => {
      void loadApplications().then(bump);
    })
    .subscribe((status: string) => {
      if (ch !== channel) return; // an old connection being closed
      if (status === 'SUBSCRIBED') {
        // anything that happened while we were disconnected
        if (dropped) {
          dropped = false;
          void loadAll(true);
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') restartSoon();
    });
}
export function stopRealtime() {
  wantLive = false;
  dropped = false;
  if (retry) clearTimeout(retry);
  retry = null;
  const c = channel;
  channel = null;
  if (c) void supabase.removeChannel(c);
}
