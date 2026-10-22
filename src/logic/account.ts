/* Accounts: sign-up, roles (Regular / Business), businesses, Pro, profile data. */
import { db, makeDb, setDb, ui, uid, MyBiz, Service } from '../data/db';
import { CATS, SKILLS, lvOf } from '../data/catalog';
import { toast } from '../ui/overlay';
import { bump, cancelAll, later } from './live';
import { curBiz, bizName, isW, nowT, mySkill, ensureSkillList, add, P } from './core';
import { resumeSims, bizLog } from './work';
import { clearSaved } from './persist';
import { stopAdTicker } from './career';

export const wantsWork = () => db.user.intents.includes('find');

/** Fresh account after sign-up / log-in (keeps the demo data). */
export function startApp(viaLogin = false) {
  db.loggedIn = true;
  db.user.role = 'worker';
  ui.feedView = 'all';
  ui.appStarted = true;
  resumeSims();
  toast(viaLogin ? 'Welcome back!' : 'Welcome to bolo' + (db.user.name ? ', ' + db.user.name.split(' ')[0] : '') + '!');
  bump();
}
export function enterBusinessOnly() {
  db.loggedIn = true;
  ui.appStarted = true;
  resumeSims();
  bump();
}

export async function logout() {
  cancelAll();
  stopAdTicker();
  await clearSaved();
  setDb(makeDb());
  ui.appStarted = false;
  ui.meTab = 'Profile';
  ui.feedView = 'all';
  bump();
}

/** Switch between the Regular profile and a business page. Returns false when it needs a business first. */
export function setRole(r: 'worker' | 'client', quiet = false): 'ok' | 'needBiz' | 'bizOnly' {
  if (db.user.bizOnly && r === 'worker') return 'bizOnly';
  if (r === 'client' && !curBiz()) {
    if (db.BIZ.list.length) db.BIZ.active = db.BIZ.list[0].id;
    else return 'needBiz';
  }
  if (db.user.role !== r) {
    db.user.role = r;
    if (r === 'worker') ensureSkillList();
    ui.cat = null;
    ui.q = '';
    if (!quiet) toast(r === 'worker' ? 'Switched to your Regular profile' : `Switched to ${bizName(curBiz())} · Business`);
  }
  bump();
  return 'ok';
}
export function useBiz(id: string) {
  db.BIZ.active = id;
  db.user.role = 'client';
  ui.meTab = 'Company';
  toast(`Switched to ${bizName(curBiz())} · Business`);
  bump();
}
export const MAX_FREE_BIZ = 2;
export const canAddBiz = () => db.BIZ.list.length < MAX_FREE_BIZ || db.user.pro.business;

/* ---------------- businesses ---------------- */
export function newBizDraft(): MyBiz {
  return { id: uid('mb'), name: '', sector: '', size: '', city: 'Buea', area: 'Molyko', address: '', phone: '', email: '', web: '', about: '', rccm: '', niu: '', logo: null, color: '#f6ee5c', verified: 'none', draft: true, recruiters: [], team: [], contracts: [], events: [], ads: [] };
}
export function saveBiz(b: MyBiz, opts: { submitDocs?: boolean } = {}) {
  const pct = (() => {
    const f = [b.name, b.sector, b.size, b.city, b.address, b.phone, b.email, b.about, b.rccm, b.niu, b.logo || b.color];
    return Math.round((f.filter(Boolean).length / f.length) * 100);
  })();
  b.draft = pct < 100;
  const i = db.BIZ.list.findIndex((x) => x.id === b.id);
  const isNew = i < 0;
  if (isNew) {
    db.BIZ.list.push(b);
    b.events.unshift({ icon: 'storefront', text: `Business page <b>${b.name || 'Your business'}</b> created`, at: nowT() });
  } else db.BIZ.list[i] = b;
  db.BIZ.active = b.id;
  db.user.role = 'client';
  if (opts.submitDocs && b.rccm && b.niu && b.verified === 'none') {
    b.verified = 'review';
    later(5000, () => {
      b.verified = 'verified';
      toast(`✅ ${bizName(b)} is now a verified business`);
    });
  }
  bump();
  return isNew;
}

/** Business-only account created from the welcome screen. */
export function createBusinessAccount(o: { owner: string; email: string; phone: string; biz: MyBiz }) {
  db.user.name = o.owner;
  db.user.contact = o.email || o.phone;
  db.user.intents = ['biz'];
  db.user.bizOnly = true;
  db.user.role = 'client';
  db.PR.ct.email = o.email;
  db.PR.ct.phone = o.phone;
  db.BIZ.list = [];
  saveBiz(o.biz, { submitDocs: true });
  enterBusinessOnly();
  toast(`Welcome to bolo, ${o.biz.name}!`);
}

export function invite(name: string, role: string) {
  const b = curBiz()!;
  b.recruiters.push({ n: name, r: role, pending: 1 });
  toast('Invite sent to ' + name);
  bump();
}

/* ---------------- Pro ---------------- */
export function payPro(kind: 'regular' | 'business', done: () => void) {
  later(1400, () => {
    db.user.pro[kind] = true;
    toast(kind === 'regular' ? '🎉 Welcome to bolo Pro' : '🎉 Business Pro is active');
    done();
  });
}
export function cancelPro(kind: 'regular' | 'business') {
  db.user.pro[kind] = false;
  toast('Plan cancelled — you keep it until the end of the month');
  bump();
}

/* ---------------- my profile data ---------------- */
export function services(): Service[] {
  if (!db.PR.services) {
    const m = mySkill();
    const o = CATS.map((c) => c[0]).find((n) => n !== m && !db.user.skills.includes(n)) || 'Cleaner';
    db.PR.services = [
      { id: 's1', skill: m, price: 5000, unit: 'per job', where: 'At the client’s place', desc: '', pub: true, boost: 0 },
      { id: 's2', skill: o, price: 0, unit: 'per job', where: 'At the client’s place', desc: '', pub: false, draft: true, boost: 0 },
    ];
  }
  return db.PR.services;
}
export const passedTests = () => Object.keys(db.PR.tests).filter((k) => db.PR.tests[k] === 'passed');
export function syncContacts() {
  const c = db.user.contact || '';
  if (!db.PR.ct.phone && /^\+?\d[\d\s]{5,}$/.test(c)) db.PR.ct.phone = c.replace(/^\+?237\s?/, '');
  if (!db.PR.ct.email && c.includes('@')) db.PR.ct.email = c;
}
/** Profile completeness items: [label, done, action-key]. */
export function prItems(): [string, boolean, string][] {
  syncContacts();
  const w = isW();
  return [
    ['Profile photo', !!db.user.avatar, 'photo'],
    ['Your name', !!db.user.name, 'edit'],
    ['Phone number', !!db.PR.ct.phone, 'contacts'],
    ...((w
      ? [
          ['Publish a service', services().some((s) => s.pub), 'service'],
          ['Pass a skill test', passedTests().length > 0, 'test'],
          ['Work experience', db.PR.exp.length > 0, 'exp'],
          ['Intro video', !!db.PR.video, 'video'],
        ]
      : []) as [string, boolean, string][]),
    ['Languages', db.PR.langs.length > 0, 'langs'],
    ['ID document', db.PR.docs.id === 'verified', 'doc'],
  ];
}
export const prPct = () => {
  const it = prItems();
  return Math.round((it.filter((x) => x[1]).length / it.length) * 100);
};

export function saveSkills(d: { main: any; others: any[]; level: string; years: number; langs: [string, string][] }) {
  const all = [d.main, ...d.others].filter(Boolean);
  db.user.skillList = all.map((e) => ({ ...e, x: JSON.parse(JSON.stringify(e.x || {})), xo: JSON.parse(JSON.stringify(e.xo || {})), c: e.c || 'Admin' }));
  db.user.skills = [...new Set(db.user.skillList.map((e) => e.c as string))];
  db.user.level = d.level;
  db.user.years = d.years;
  db.PR.langs = d.langs.map((x) => [...x] as [string, string]);
  if (db.PR.services && db.PR.services[0]) db.PR.services[0].skill = mySkill();
  bump();
}
export { lvOf, SKILLS };

/* ---------------- following ---------------- */
export function toggleFollow(id: string) {
  const i = db.followed.indexOf(id);
  if (i >= 0) db.followed.splice(i, 1);
  else db.followed.push(id);
  bump();
}
export const followingCount = () => db.followed.filter((id) => P(id)).length;
export { add };
