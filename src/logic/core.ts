/* Shared helpers and selectors over the data model. */
import { db, ui, Person, Post, Thread, Notif, MyBiz, Mentorship, Opp } from '../data/db';
import { CATS, lvOf, SKILLS } from '../data/catalog';
import { logoPic } from '../ui/kit';

/* ---------------- formatting ---------------- */
export const k = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1000 ? (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + 'k' : String(n));
export const xaf = (n: number | string) => 'XAF ' + Number(n || 0).toLocaleString('en-US');
/** "Today" / "Tomorrow" / "This week" as a real date, so the text is still right when it's read on another day. */
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
export const budgetNum = (b?: string) => {
  const m = String(b || '').match(/(\d[\d,.]*)\s*(k?)/i);
  return m ? parseFloat(m[1].replace(/,/g, '')) * (m[2] ? 1000 : 1) : 0;
};
export const fname = (n: string) => (/^(Mr|Mrs|Ms|Dr)\.? /.test(n) ? n : n.split(' ')[0]);
export const first = (id: string) => fname(P(id)?.name || '');
export const plural = (n: number, w: string, pl?: string) => `${n} ${n === 1 ? w : pl || w + 's'}`;
export const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};
export const fmtDate = (d: string | Date, withYear = false) => {
  try {
    const x = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(+x)) return '';
    return x.toLocaleDateString('en-GB', withYear ? { day: 'numeric', month: 'short', year: 'numeric' } : { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
};
export const digits = (s: string) => s.replace(/\D/g, '');
export const isEmail = (s: string) => /^\S+@\S+\.\S+$/.test(s.trim());
/** International numbers (+7 915…) need 8–15 digits; older local Cameroon numbers 9. */
export const isPhone = (s: string) => {
  const d = digits(s);
  return (s || '').trim().startsWith('+') ? d.length >= 8 && d.length <= 15 : d.length >= 9;
};

/* ---------------- sets stored as arrays ---------------- */
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
  return { name: 'bolo member', role: 'Member', years: 0, rate: 0, dist: '', area: '', photo: facePic('?', id), jobs: 0, reviews: '0', followers: 0 } as Person;
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
export const bizPct = (b?: MyBiz | null) => {
  if (!b) return 0;
  const f = [b.name, b.sector, b.size, b.city, b.address, b.phone, b.email, b.about, b.rccm, b.niu, b.logo || b.color];
  return Math.round((f.filter(Boolean).length / f.length) * 100);
};
export const isPro = () => (isW() ? db.user.pro.regular : db.user.pro.business);
/** The person's main skill, or '' when they haven't picked one (nothing is assumed for them). */
export const mySkill = () => db.user.skills[0] || '';
/** A placeholder service older versions added by themselves (a skill the person never chose, no price). */
export const madeUpService = (x: any) => !!x && x.draft && !+x.price && x.id === 's2' && !db.user.skills.includes(x.skill);
/** Date typing help: the person types digits only and gets DD/MM/YYYY. `prev` is what was in the box before. */
export function dateMask(v: string, prev = '') {
  const d = (v || '').replace(/\D/g, '').slice(0, 8);
  let out = d.slice(0, 2);
  if (d.length > 2) out += '/' + d.slice(2, 4);
  if (d.length > 4) out += '/' + d.slice(4);
  // typing forward: the slash appears as soon as the day or the month is complete
  if (v.length > prev.length && (d.length === 2 || d.length === 4)) out += '/';
  return out;
}
/** DD/MM/YYYY → YYYY-MM-DD when it is a real date of birth; otherwise null. */
export function dobIso(t: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((t || '').trim());
  if (!m) return null;
  const [dd, mm, yy] = [+m[1], +m[2], +m[3]];
  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  if (dt.getUTCFullYear() !== yy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return null;
  const now = new Date().getFullYear();
  if (yy < 1900 || yy > now - 10) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}
/** YYYY-MM-DD → DD/MM/YYYY (for showing a saved date in the box). */
export const isoToDmy = (iso?: string | null) => (/^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? `${iso!.slice(8, 10)}/${iso!.slice(5, 7)}/${iso!.slice(0, 4)}` : '');
export const myName = () => db.user.name || 'You';
export const myFirst = () => (db.user.name ? db.user.name.split(' ')[0] : '');
export const myPhoto = () => db.user.avatar || 'img/me';
export const myCity = () => (db.user.city || '').replace(/ CM$/, '') || 'your area';
/** City for labels; empty when unknown. */
export const cityLabel = () => (db.user.city || '').replace(/ CM$/, '');
export const myHandle = () => '@' + (db.user.name ? db.user.name.toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '') : 'you');

/** The signed-in person as a Person record (Regular or the active business). */
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
/** Author card for something I posted, as the profile I posted it from. */
export function meAs(as?: string, bizId?: string | number | null): Person {
  if (as === 'business') {
    const b = db.BIZ.list.find((x) => x.id === bizId);
    if (b) return { ...me(), name: bizName(b), role: 'Business', photo: bizLogo(b), pin: bizLogo(b), client: 1, biz: 1, area: b.area || b.city || '', verified: b.verified === 'verified' ? 1 : 0 };
  }
  const u = db.user;
  return { ...me(), name: u.name || 'You', role: mySkill() || 'Member', photo: myPhoto(), pin: myPhoto(), client: undefined, biz: undefined, area: myCity(), verified: 1 };
}
/** Other people you can hire (not clients, businesses or groups). */
export const WORKERS = () => Object.keys(db.P).filter((id) => id !== 'me' && !db.P[id].client && !db.P[id].group && db.P[id].name !== 'Deleted account' && !require('./server').isBlocked(id));
export const isGroup = (id: string) => !!db.P[id]?.group;
export const isBiz = (id: string) => !!db.P[id]?.biz;
/** Chat side: true when I'm the one hiring in this conversation. */
export const hiringSide = (id: string): boolean => require('./work').hiringIn(id);

/** An entry older versions added by themselves: "Plumbing" with nothing filled in, for someone who isn't a plumber. */
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
export const myLevel = () => db.user.level || lvOf(db.user.years);

/* ---------------- role-dependent collections ---------------- */
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

/* ---------------- jobs ---------------- */
/** A post by id (also by the temporary id it had before the server saved it). */
export const postById = (id: string) => db.POSTS.find((p) => p.id === id) || db.POSTS.find((p) => (p as any).tmp === id);
export function postVisible(p: Post) {
  if (p.kind !== 'request') return true;
  if (p.mine) return isW() ? p.as !== 'business' : p.as === 'business' && p.biz === db.BIZ.active;
  return true;
}
export const openJobs = () =>
  db.POSTS.filter((p) => p.kind === 'request' && !p.mine).sort(
    (a, b) => (+db.user.skills.includes(b.cat!) - +db.user.skills.includes(a.cat!)) || ((b.urgent ? 1 : 0) - (a.urgent ? 1 : 0)),
  );
export const listJobs = () => db.POSTS.filter((p) => p.kind === 'request' && !p.mine && p.client !== 'me');
/** People you can hire: members who list at least one skill, nearest first (then best rated). */
export const listPeople = () =>
  WORKERS()
    .filter((id) => (db.P[id].skills || []).length)
    .sort((a, b) => (kmOf(db.P[a].dist) || 999) - (kmOf(db.P[b].dist) || 999) || db.P[b].rate - db.P[a].rate);
export const myVacancies = () => db.POSTS.filter((p) => p.mine && p.as === 'business' && p.biz === db.BIZ.active);
export const myPersonalJobs = () => db.POSTS.filter((p) => p.mine && p.as !== 'business');
export const myOpps = () => db.OPPS.filter((o) => o.mine && o.biz === db.BIZ.active);
export const myCourses = () => db.COURSES.filter((c) => c.mine && c.biz === db.BIZ.active);
export function oppBiz(o: Opp): { name: string; logo: string; id: string | null } {
  if (o.mine) {
    const b = db.BIZ.list.find((x) => x.id === o.biz);
    return { name: bizName(b), logo: bizLogo(b), id: null };
  }
  const s = db.BIZ_SAMPLE[o.biz];
  return { name: s.name, logo: s.logo, id: o.biz };
}
export function mOwner(m: Mentorship): { name: string; photo: string; sq?: boolean; sub: string; id?: string } {
  if (m.mine) {
    if (m.asBiz) {
      const b = db.BIZ.list.find((x) => x.id === m.asBiz);
      return { name: bizName(b), photo: bizLogo(b), sq: true, sub: 'Business' };
    }
    return { name: db.user.name || 'You', photo: myPhoto(), sub: 'You' };
  }
  const bs = db.BIZ_SAMPLE[m.by!];
  if (bs) return { name: bs.name, photo: bs.logo, sq: true, sub: 'Company', id: m.by };
  const p = db.P[m.by!];
  return { name: p.name, photo: p.photo, sub: `${p.role} · ${p.years} yrs`, id: m.by };
}

/* ---------------- about / profile content ---------------- */
/** About a person: only what they wrote themselves (nothing generated). */
export function aboutOf(id: string) {
  const r = profileRaw(id) || {};
  const list: { n?: string; c?: string }[] = r.skill_list || [];
  const spec = [...new Set([...list.map((x) => x.n || x.c || ''), ...(r.skills || [])].filter(Boolean))].slice(0, 8) as string[];
  return { bio: (r.bio || P(id)?.about || '') as string, spec, cred: [] as [string, string][], since: r.created_at as string | undefined };
}

/* ---------------- search filters ---------------- */
export type Filters = typeof ui.F;
export const fCount = (F: Filters = ui.F) => (F.dist ? 1 : 0) + (F.rate ? 1 : 0) + (F.ver ? 1 : 0) + (F.urgent ? 1 : 0) + (F.budget ? 1 : 0) + (F.sort !== 'best' ? 1 : 0) + (F.type ? 1 : 0) + (F.posted ? 1 : 0) + (F.by ? 1 : 0) + (F.exp ? 1 : 0);
/** "now", "12mins ago", "2h ago", "Yesterday", "3 days ago", "1w" → age in days. */
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
export function matchPerson(id: string, q: string, cat: string | null, F: Filters = ui.F) {
  const p = P(id);
  if (!p) return false;
  if (q && !(p.name + ' ' + p.role + ' ' + (p.tag || '') + ' ' + p.area).toLowerCase().includes(q)) return false;
  if (cat && p.role !== cat) return false;
  if (F.dist && kmOf(p.dist) > F.dist) return false;
  if (F.rate && p.rate < F.rate) return false;
  if (F.ver && !p.verified) return false;
  if (F.exp && (p.years || 0) < F.exp) return false;
  return true;
}
export function matchJob(po: Post, q: string, cat: string | null, F: Filters = ui.F) {
  const c = P(po.client!);
  if (q && !((c?.name || '') + ' ' + po.cat + ' ' + po.title + ' ' + po.area + ' ' + (po.text || '')).toLowerCase().includes(q)) return false;
  if (cat && po.cat !== cat) return false;
  if (F.dist && !po.mine && kmOf(c?.dist) > F.dist) return false;
  if (F.urgent && !po.urgent) return false;
  if (F.budget && budgetNum(po.budget) < F.budget) return false;
  if (F.type && !(po.type || '').includes(F.type)) return false;
  if (F.posted && ageDays(po.time) >= F.posted) return false;
  if (F.by === 'company' && !(po.biz || c?.biz)) return false;
  if (F.by === 'person' && (po.biz || c?.biz)) return false;
  return true;
}
export function sortJobs(L: Post[], F: Filters = ui.F) {
  if (F.sort === 'near') return L.slice().sort((a, b) => kmOf(P(a.client!)?.dist) - kmOf(P(b.client!)?.dist));
  if (F.sort === 'budget') return L.slice().sort((a, b) => budgetNum(b.budget) - budgetNum(a.budget));
  if (F.sort === 'new') return L.slice().sort((a, b) => ageDays(a.time) - ageDays(b.time));
  return L;
}
export function sortPeople(L: string[], F: Filters = ui.F) {
  if (F.sort === 'near') return L.slice().sort((a, b) => kmOf(P(a).dist) - kmOf(P(b).dist));
  if (F.sort === 'rate') return L.slice().sort((a, b) => P(b).rate - P(a).rate);
  if (F.sort === 'exp') return L.slice().sort((a, b) => (P(b).years || 0) - (P(a).years || 0));
  return L;
}

export const CAT_NAMES = CATS.map((c) => c[0]);
export const pinOf = (id: string) => String(1000 + ((parseInt(id.replace(/\D/g, '').slice(-4)) || 4271) % 9000));
