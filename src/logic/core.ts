/* Shared helpers and selectors over the data model. */
import { db, ui, Person, Post, Thread, Notif, MyBiz, Mentorship, Opp } from '../data/db';
import { lvOf, SKILLS } from '../data/catalog';
import { logoPic } from './pics';

/* ---------------- formatting ---------------- */
export const k = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1000 ? (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + 'k' : String(n));
export function dayText(key: string, time?: string) {
  const d = new Date();
  const fmt = (x: Date) => x.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const at = time ? ', ' + time : '';
  if (key === 'Today') return fmt(d) + at;
  if (key === 'Tomorrow') {
    d.setDate(d.getDate() + 1);
    return fmt(d) + at;
  }
  if (key === 'This week') {
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7));
    return 'By ' + fmt(d);
  }
  return key + (key && time && !/flexible|soon|month/i.test(key) ? at : '');
}
export const nowT = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
export const kmOf = (s?: string) => {
  const m = String(s || '').match(/[\d.]+/);
  return m ? +m[0] : 0;
};
export const fname = (n: string) => (/^(Mr|Mrs|Ms|Dr)\.? /.test(n) ? n : n.split(' ')[0]);
export const first = (id: string) => fname(P(id)?.name || '');
export const digits = (s: string) => s.replace(/\D/g, '');
export const isEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim());
export const has = (a: (string | number)[], x: string | number) => a.includes(x);
export function toggle<T>(a: T[], x: T): boolean {
  const i = a.indexOf(x);
  if (i >= 0) {
    a.splice(i, 1);
    return false;
  }
  a.push(x);
  return true;
}
export function add<T>(a: T[], x: T) {
  if (!a.includes(x)) a.push(x);
}

/* ---------------- people & accounts ---------------- */
export const isW = () => db.user.role === 'worker';
/** A person by app id. Someone not loaded yet shows a neutral placeholder (and is fetched), never a crash. */
export const P = (id: string): Person => {
  if (id === 'me') return me();
  const p = db.P[id];
  if (p) return p;
  const { ensurePeople, ensureBiz, facePic } = require('./server');
  // unknown yet: fetch real ids in the background; anything else (empty, or an id from old sample data) just gets the placeholder
  const real = /^[0-9a-f]{8}-[0-9a-f]{4}-/i;
  if (id && id.startsWith('b_') && real.test(id.slice(2))) void ensureBiz([id.slice(2)]).then(() => require('./live').bump());
  else if (id && real.test(id)) void ensurePeople([id]).then(() => require('./live').bump());
  id = id || '?';
  return { name: 'getit member', role: 'Member', years: 0, rate: 0, dist: '', area: '', photo: facePic('?', id), jobs: 0, reviews: '0', followers: 0 } as Person;
};
/** What the person wrote on their profile (bio, experience, services…), when loaded from the server. */
export const profileRaw = (id: string): any => require('./server').PROFILE_RAW[id];
export const curBiz = (): MyBiz | null => db.BIZ.list.find((b) => b.id === db.BIZ.active) || null;
export const bizName = (b?: MyBiz | null) => (b && b.name ? b.name : 'Your business');
export const bizInitials = (b?: MyBiz | null) =>
  ((b && b.name) || 'B')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
export const bizLogo = (b?: MyBiz | null) => (b && b.logo ? b.logo : logoPic(bizInitials(b), (b && b.color) || '#f6ee5c', b?.color === '#3d5af1' ? '#fff' : '#000'));
export const mySkill = () => db.user.skills[0] || '';
/** A placeholder service older versions added by themselves (a skill the person never chose, no price). */
export const madeUpService = (x: any) => !!x && x.draft && !+x.price && x.id === 's2' && !db.user.skills.includes(x.skill);
export const myPhoto = () => db.user.avatar || 'img/me';
export const myCity = () => (db.user.city || '').replace(/ CM$/, '') || 'your area';
/** City for labels; empty when unknown. */
export const cityLabel = () => (db.user.city || '').replace(/ CM$/, '');
export function me(): Person {
  const u = db.user;
  const st = require('./server').myStats();
  const base: Person = { name: u.name || 'You', role: isW() ? mySkill() || 'Member' : 'Client', tag: 'You', years: u.years, rate: st.rating, dist: 'You', area: myCity(), photo: myPhoto(), verified: u.verified ? 1 : 0, jobs: st.jobs_done, reviews: String(st.reviews), followers: st.followers, self: 1 };
  if (!isW()) {
    const b = curBiz();
    if (b) Object.assign(base, { name: bizName(b), role: 'Business', photo: bizLogo(b), client: 1, biz: 1, area: b.area || b.city || '', verified: b.verified === 'verified' ? 1 : 0 });
  }
  base.pin = base.photo;
  return base;
}
const madeUpSkill = (e: any, skills: string[]) => !!e && e.n === 'Plumbing' && !e.custom && e.lv === 'Intermediate' && !Object.keys(e.x || {}).length && !Object.keys(e.xo || {}).length && (e.c !== 'Plumber' || !skills.includes('Plumber'));
/** The person's skills in detail, kept in step with the skill categories on their profile.
    Only what they chose: an empty list stays empty. */
export function ensureSkillList() {
  const u = db.user;
  if (!Array.isArray(u.skillList)) u.skillList = [];
  if (u.skillList.some((e) => madeUpSkill(e, u.skills))) u.skillList = u.skillList.filter((e) => !madeUpSkill(e, u.skills));
  u.skills.forEach((c) => {
    if (u.skillList!.some((e) => e.c === c)) return;
    // the skill they named for their CV when it belongs to this category, otherwise the category itself
    const s = SKILLS.find((x) => x.c === c && x.n === u.cv?.prof) || SKILLS.find((x) => x.c === c && x.n.toLowerCase() === c.toLowerCase());
    u.skillList!.push(s ? { si: s.i, n: s.n, a: s.a, c, x: {}, xo: {}, lv: 'Intermediate' } : { si: -1, n: c, a: SKILLS.find((x) => x.c === c)?.a || 'Other', c, x: {}, xo: {}, lv: 'Intermediate', custom: 1 });
  });
  return u.skillList;
}
export const NOTIFS = (): Notif[] => (isW() ? db.NOTIFS_W : db.NOTIFS_C);
export const THREADS = (): Record<string, Thread> => (isW() ? db.THREADS_W : db.THREADS_C);
export const ORDER = (): string[] => (isW() ? db.ORDER_W : db.ORDER_C);
export function thread(id: string): Thread {
  const T = THREADS();
  if (!T[id]) {
    T[id] = { time: nowT(), msgs: [] };
    ORDER().unshift(id);
  }
  return T[id];
}
export const unreadMsgs = () => ORDER().reduce((a, id) => a + (THREADS()[id]?.unread || 0), 0);
export const unreadNotifs = () => NOTIFS().filter((n) => !n.read).length;
export const postById = (id: string) => db.POSTS.find((p) => p.id === id) || db.POSTS.find((p) => (p as any).tmp === id);
export function aboutOf(id: string) {
  const r = profileRaw(id) || {};
  const list: { n?: string; c?: string }[] = r.skill_list || [];
  const spec = [...new Set([...list.map((x) => x.n || x.c || ''), ...(r.skills || [])].filter(Boolean))].slice(0, 8) as string[];
  return { bio: (r.bio || P(id)?.about || '') as string, spec, cred: [] as [string, string][], since: r.created_at as string | undefined };
}

/* ---------------- search filters ---------------- */
export type Filters = typeof ui.F;
export function ageDays(t?: string) {
  const s = (t || '').toLowerCase();
  if (!s || /now|min|h ago|^\d+h$/.test(s)) return 0;
  if (/yesterday/.test(s)) return 1;
  const d = s.match(/(\d+)\s*(day|d\b)/);
  if (d) return +d[1];
  const w = s.match(/(\d+)\s*w/);
  if (w) return +w[1] * 7;
  return 30;
}
/** Kilometres between two map positions. */
function kmBetween(a: [number, number], b: [number, number]) {
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(b[1] - a[1]);
  const dLng = r(b[0] - a[0]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a[1])) * Math.cos(r(b[1])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}
/** Where distances are measured from: the city chosen in the filters, otherwise where I am. */
export const filterOrigin = (F: Filters = ui.F): [number, number] | null => F.cityAt || (db.user.coord as [number, number] | undefined) || null;
/** Distance to a place from the filter's origin. Unknown places are infinitely far: they never pass a distance filter
    and sort last under "Nearest" (they used to count as 0 km and pass everything). */
export const kmTo = (c?: [number, number] | null, F: Filters = ui.F) => {
  const o = filterOrigin(F);
  return o && c ? kmBetween(o, c) : Infinity;
};
/** Compare two distances; unknown ones (Infinity) go last and equal ones keep their order. */
const far = (a: number, b: number) => (a === b ? 0 : a < b ? -1 : 1);
/** Age of a post in days, from its real time when we have it. */
const postAge = (po: Post) => (po.at ? (Date.now() - po.at) / 86400000 : ageDays(po.time));
/** A job's place: its own pin when it has one, otherwise where its owner is. */
const jobKm = (po: Post, F: Filters) => {
  const own = kmTo(po.coord as [number, number] | undefined, F);
  return own < Infinity ? own : kmTo(P(po.client!)?.coord as [number, number] | undefined, F);
};
/** "In this city": within reach of the city's position when it is known, otherwise by its name in the address. */
function inCity(coord: [number, number] | undefined, text: string, F: Filters) {
  if (!F.city) return true;
  if (text.toLowerCase().includes(F.city.toLowerCase())) return true;
  return !!F.cityAt && !!coord && kmBetween(F.cityAt, coord) <= (F.dist || 30);
}

export const pinOf = (id: string) => String(1000 + ((parseInt(id.replace(/\D/g, '').slice(-4)) || 4271) % 9000));
