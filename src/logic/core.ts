/* Shared helpers and selectors over the data model. */
import { db, ui, Person, Post, Thread, Notif, MyBiz, Mentorship, Opp } from '../data/db';
import { CATS, lvOf, SKILLS } from '../data/catalog';
import { logoPic } from '../ui/kit';

/* ---------------- formatting ---------------- */
export const k = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '') + 'M' : n >= 1000 ? (n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0) + 'k' : String(n));
export const xaf = (n: number | string) => 'XAF ' + Number(n || 0).toLocaleString('en-US');
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
  if (p || !id) return p;
  const { ensurePeople, ensureBiz, facePic } = require('./server');
  if (id.startsWith('b_')) void ensureBiz([id.slice(2)]).then(() => require('./live').bump());
  else if (!id.startsWith('g_')) void ensurePeople([id]).then(() => require('./live').bump());
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
export const mySkill = () => db.user.skills[0] || 'Plumber';
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
  const base: Person = { name: u.name || 'You', role: isW() ? mySkill() : 'Client', tag: 'You', years: u.years, rate: st.rating, dist: 'You', area: myCity(), photo: myPhoto(), verified: u.verified ? 1 : 0, jobs: st.jobs_done, reviews: String(st.reviews), followers: st.followers, self: 1 };
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
  return { ...me(), name: u.name || 'You', role: mySkill(), photo: myPhoto(), pin: myPhoto(), client: undefined, biz: undefined, area: myCity(), verified: 1 };
}
/** Other people you can hire (not clients, businesses or groups). */
export const WORKERS = () => Object.keys(db.P).filter((id) => !db.P[id].client && !db.P[id].group && id !== 'me');
export const isGroup = (id: string) => !!db.P[id]?.group;
export const isBiz = (id: string) => !!db.P[id]?.biz;
/** Chat side: true when I'm the one hiring in this conversation. */
export const hiringSide = (id: string): boolean => require('./work').hiringIn(id);

export function ensureSkillList() {
  const u = db.user;
  if (!u.skillList) u.skillList = [];
  u.skills.forEach((c) => {
    if (!u.skillList!.some((e) => e.c === c)) {
      const s = SKILLS.find((x) => x.c === c) || SKILLS[0];
      u.skillList!.push({ si: s.i, n: s.n, a: s.a, c, x: {}, xo: {}, lv: 'Intermediate' });
    }
  });
  if (!u.skillList.length) {
    const s = SKILLS.find((x) => x.n === 'Plumbing')!;
    u.skillList.push({ si: s.i, n: s.n, a: s.a, c: s.c, x: {}, xo: {}, lv: 'Intermediate' });
  }
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
export const listPeople = () => WORKERS().sort((a, b) => db.P[b].rate - db.P[a].rate);
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
