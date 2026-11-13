/* Career: internships & programs, courses, mentorships, groups, ads. */
import { router } from 'expo-router';
import { db, ui, uid, Course, Mentorship, Opp, Ad } from '../data/db';
import { toast } from '../ui/overlay';
import { logoPic } from '../ui/kit';
import { bump, later, every } from './live';
import { P, isW, curBiz, bizName, WORKERS, nowT, mOwner, THREADS, ORDER, thread, fname, xaf, myCity } from './core';
import { bizLog } from './work';
import { notify } from './notify';
import { supabase } from '../lib/supabase';
import { friendly } from './remote';
import { R, groupKey, refreshCareer, refreshChats } from './server';

const fail = (e: any) => toast(friendly(e));

/* ---------------- internships & programs ---------------- */
export type OppForm = { kind: string; title: string; cat: string; desc: string; dur: string; start: string; mode: string; paid: string; amount: string; seats: number; deadline: string; lv?: string };
const fmtD = (d: string) => {
  const x = new Date(d);
  return d && !isNaN(+x) ? x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
};
export function publishOpp(f: OppForm): 'opp' | 'course' {
  // courses are listings that link to the school's own site
  if (f.kind === 'Course') {
    router.push('/list-course' as any);
    return 'course';
  }
  const b = curBiz()!;
  const amt = +String(f.amount).replace(/\D/g, '') || 0;
  const o: Opp = {
    id: uid('tmp_op'),
    biz: db.BIZ.active!,
    mine: 1,
    kind: f.kind,
    title: f.title.trim(),
    cat: f.cat || 'Admin',
    dur: f.dur,
    start: fmtD(f.start) || 'Flexible',
    mode: f.mode === 'Online' ? 'Online' : `${f.mode} · ${b.area || b.city}`,
    pay: f.paid === 'Paid' ? (amt ? `XAF ${amt.toLocaleString('en-US')} / month stipend` : 'Paid · stipend on request') : f.paid === 'Fee' ? `XAF ${amt.toLocaleString('en-US')} fee` : f.paid === 'Free' ? 'Free' : 'Unpaid',
    seats: f.seats,
    joined: 0,
    deadline: fmtD(f.deadline) || 'Rolling',
    desc: f.desc.trim() || 'Details coming soon.',
    skills: [],
    people: [],
    st: {},
  };
  db.OPPS.unshift(o);
  bizLog('cap', `Published ${f.kind.toLowerCase()} <b>${o.title}</b>`);
  bump();
  (async () => {
    if (!b.remoteId) return fail('Your business page is still saving. Try again in a moment.');
    const { cat, dur, start, mode, pay, deadline, desc, skills } = o;
    const { data, error } = await supabase.from('opportunities').insert({ business_id: b.remoteId, kind: o.kind, title: o.title, seats: o.seats, data: { cat, dur, start, mode, pay, deadline, desc, skills } }).select('id').single();
    if (error) {
      db.OPPS = db.OPPS.filter((x) => x !== o);
      bump();
      return fail(error);
    }
    o.id = data.id;
    toast(`${f.kind} published in Career`);
    bump();
  })();
  return 'opp';
}
export function joinOpp(id: string) {
  const o = db.OPPS.find((x) => x.id === id)!;
  o.applied = 1;
  o.joined++;
  bump();
  supabase
    .from('opportunity_applications')
    .insert({ opportunity_id: id })
    .then(({ error }) => {
      if (error) {
        o.applied = undefined;
        o.joined = Math.max(0, o.joined - 1);
        bump();
        return fail(error);
      }
      toast(o.kind === 'Training program' ? `You asked to join “${o.title}”` : `Application sent to ${db.BIZ_SAMPLE[o.biz]?.name || 'the business'}`);
    });
}
export function answerApplicant(oid: string, pid: string, st: 'acc' | 'dec') {
  const o = db.OPPS.find((x) => x.id === oid)!;
  (o.st = o.st || {})[pid] = st;
  if (st === 'dec') o.joined = Math.max(0, o.joined - 1);
  toast(st === 'acc' ? `${P(pid).name} accepted. We’ve let them know` : `${P(pid).name} declined`);
  if (!isW()) bizLog(st === 'acc' ? 'checkc' : 'x', `${st === 'acc' ? 'Accepted' : 'Declined'} <b>${P(pid).name}</b> for <b>${o.title}</b>`);
  bump();
  supabase.from('opportunity_applications').update({ status: st }).eq('opportunity_id', oid).eq('user_id', R(pid)).then(({ error }) => error && fail(error));
}

/* ---------------- courses ---------------- */
export function enroll(id: string, done: () => void) {
  const c = db.COURSES.find((x) => x.id === id)!;
  later(300, () => {
    if (!db.myLearning.includes(id)) db.myLearning.push(id);
    c.startAt = c.quick ? Date.now() + 60_000 : nextClassAt();
    c.done = c.done || 0;
    learnerGroup(c);
    scheduleClass(c);
    toast(`You’re enrolled in “${c.title}”`);
    done();
  });
}
export const nextClassAt = () => {
  const d = new Date();
  d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
  d.setHours(18, 0, 0, 0);
  return d.getTime();
};
/** The learner's class group for a course they joined: the trainer posts lesson links and announcements here. */
export function learnerGroup(c: Course) {
  const gid = 'gl_' + c.id;
  if (!db.P[gid]) db.P[gid] = { name: `${c.title} · Class`, group: 1, client: 1, role: 'Class group', photo: c.prov.logo, pin: c.prov.logo, area: '', dist: '', rate: 5, years: 1, jobs: 0, reviews: '0', followers: 0 } as any;
  const T = db.THREADS_W;
  if (!T[gid]) {
    T[gid] = { time: nowT(), group: 1, course: 1, members: [], unread: 0, msgs: [{ d: 'Today' }, { sys: `Class group for “${c.title}”` }] };
    if (!db.ORDER_W.includes(gid)) db.ORDER_W.unshift(gid);
  }
  return gid;
}
/** When the class starts: a message in the class group, a notification and a pop-up. */
export function scheduleClass(c: Course) {
  if (!c.startAt) return;
  const ms = c.startAt - Date.now();
  if (ms <= 0 || ms > 6 * 3600_000) return; // only time it while the app is likely open
  // 10 minutes before: a reminder (skipped for classes that start sooner than that)
  if (ms > 10 * 60_000)
    later(ms - 10 * 60_000, () => notify({ type: 'reminder', cat: 'reminders', key: `cls:${c.id}:${c.startAt}:10`, text: `“${c.title}” starts in 10 minutes.`, go: { k: 'coursePage', id: c.id } }));
  later(ms, () => {
    const gid = learnerGroup(c);
    const th = db.THREADS_W[gid];
    th.msgs.push({ sys: '🔴 Class is live now' }, { f: 'them', t: `${c.prov.n}: We’re starting! Tap “Join class” on the course page or here: bolo.app/live/${c.id}`, at: nowT() });
    th.unread = (th.unread || 0) + 1;
    th.time = nowT();
    notify({ type: 'live', cat: 'reminders', key: `cls:${c.id}:${c.startAt}:live`, text: `Your class “${c.title}” is live now. Tap to join.`, go: { k: 'live', id: c.id } });
    toast(`“${c.title}” is starting now`);
    bump();
  });
}
/** The always-live demo course: its class started 5 minutes ago whenever you look. */
export function keepLive(c: Course) {
  if (c.startAt && Date.now() - c.startAt < 80 * 60_000 && Date.now() >= c.startAt) return false;
  c.startAt = Date.now() - 5 * 60_000;
  return true;
}
export const LIVE_ID = 'c_live';
export function ensureLiveCourse() {
  let c = db.COURSES.find((x) => x.id === LIVE_ID);
  if (!c) {
    c = { id: LIVE_ID, live: 1, title: 'Live demo class: join any time', prov: { n: 'bolo Academy', logo: logoPic('bA', '#e11d48', '#fff') }, cat: 'Business', lv: 'Beginner', dur: '1 hour', type: 'Skill', fmt: 'Online', reg: '', price: 0, old: 0, prof: '', skills: ['Getting the most from a live class', 'Whiteboard, chat and Q&A', 'Recordings and timestamps'], mo: 0 } as Course;
    db.COURSES.unshift(c);
  }
  keepLive(c);
  return c;
}
/** Join the demo live class straight away (enrols you if needed, no payment). */
export function joinLiveDemo() {
  const c = ensureLiveCourse();
  if (!db.myLearning.includes(c.id)) {
    db.myLearning.push(c.id);
    c.done = c.done || 0;
    learnerGroup(c);
  }
  keepLive(c);
  bump();
  return c;
}
/** Courses enrolled before class times existed get the next Monday class. */
export function ensureClassTime(c: Course) {
  if (c.live) return keepLive(c);
  if (c.quick || (c.startAt && c.startAt + 90 * 60_000 > Date.now())) return false;
  c.startAt = nextClassAt();
  scheduleClass(c);
  return true;
}
/** Leave a course: it disappears from My learning (the class group stays in Messages until you leave it). */
export function leaveCourse(id: string) {
  db.myLearning = db.myLearning.filter((x) => x !== id);
  const c = db.COURSES.find((x) => x.id === id);
  if (c) c.done = 0;
  toast('You left the course');
  bump();
}
const two = (n: number) => String(n).padStart(2, '0');
/** "2d 4h", "3h 05m" or "04:59" until a time. */
export function timeLeft(ms: number) {
  if (ms <= 0) return 'now';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${two(m)}m` : `${two(m)}:${two(s % 60)}`;
}
export const classWhen = (t: number) => new Date(t).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
/** A live class runs for 90 minutes from its start. */
export const isLive = (c: Course, now = Date.now()) => !!c.startAt && now >= c.startAt && now < c.startAt + 90 * 60_000;
/** Courses you teach as a Regular profile (tutor). */
export const tutorCourses = () => db.COURSES.filter((c) => c.mine && !c.biz);
/** Learner progress, 0–100. */
export const coursePct = (c: Course) => Math.round((Math.min(c.done || 0, lessonsOf(c).length) / lessonsOf(c).length) * 100);
/** Minutes for each lesson (stable per course). */
export const lessonMin = (c: Course, i: number) => 12 + ((c.id.length * 7 + i * 11) % 24);
/** Lessons shown on the course page, made from what the course teaches. */
export const lessonsOf = (c: Course) => [...c.skills, 'Final project and certificate'];
export function enrollPeople(c: Course, ids: string[]) {
  c.people = c.people || [];
  ids.forEach((id) => {
    if (!c.people!.includes(id)) {
      c.people!.push(id);
      (c.prog = c.prog || {})[id] = 0;
    }
  });
  c.enrolled = c.people.length;
  const gid = courseGroup(c);
  ids.forEach((id) => THREADS_ALL(gid)?.msgs.push({ sys: `${fname(P(id).name)} enrolled and joined` }));
  if (c.mine && ids.length)
    notify({ type: 'enrol', cat: 'applicants', who: ids[0], inbox: c.biz ? 'C' : 'W', key: `enrol:${c.id}:${ids.join(',')}`, text: ids.length > 1 ? `and ${ids.length - 1} other${ids.length > 2 ? 's' : ''} enrolled in “${c.title}”` : `enrolled in “${c.title}”`, go: { k: 'course', id: c.id } });
  bump();
}
export function setProgress(cid: string, pid: string, v: number) {
  const c = db.COURSES.find((x) => x.id === cid)!;
  (c.prog = c.prog || {})[pid] = v;
  const gid = 'g_cg' + cid;
  if (v >= 100) THREADS_ALL(gid)?.msgs.push({ sys: `🎓 ${fname(P(pid).name)} completed the course` });
  toast(v >= 100 ? `Certificate sent to ${P(pid).name}` : `Progress updated · ${v}%`);
  bump();
}
export function removeStudent(cid: string, pid: string) {
  const c = db.COURSES.find((x) => x.id === cid)!;
  c.people = (c.people || []).filter((x) => x !== pid);
  c.enrolled = c.people.length;
  courseGroup(c);
  THREADS_ALL('g_cg' + cid)?.msgs.push({ sys: `${fname(P(pid).name)} was removed` });
  toast(`${P(pid).name} removed`);
  bump();
}
export function announce(cid: string, t: string) {
  const c = db.COURSES.find((x) => x.id === cid)!;
  const g = courseGroup(c);
  const th = THREADS_ALL(g)!;
  th.msgs.push({ f: 'me', t: '📢 ' + t, at: nowT(), st: 'sent' });
  th.time = nowT();
  toast('Announcement sent to ' + (c.people || []).length + ' students');
  bump();
}
const THREADS_ALL = (gid: string) => db.THREADS_C[gid] || db.THREADS_W[gid];

/* ---------------- mentorships & groups ---------------- */
export const groupLogo = (m: Mentorship) => {
  const t = m.title
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return logoPic(t || 'MG', m.color || '#f47b3b', '#000');
};
/** The group chat of a mentorship (made on the server when the mentorship is published). */
export function mentorGroup(m: Mentorship, _asMentor?: boolean) {
  const cid = (m as any).cid as string | undefined;
  return cid ? groupKey(cid) : '';
}
export function joinMentor(id: string) {
  const m = db.MENTORSHIPS.find((x) => x.id === id)!;
  m.joinedMe = 'req';
  bump();
  supabase
    .from('mentorship_members')
    .insert({ mentorship_id: id })
    .then(({ error }) => {
      if (error) {
        m.joinedMe = null;
        bump();
        return fail(error);
      }
      toast(`Request sent to ${fname(mOwner(m).name)}. You’ll join the group when they accept`);
    });
}
export type MentorForm = { title: string; field: string; format: '1-to-1' | 'Group'; dur: string; price: 'Free' | 'Paid'; amount: string; seats: number; desc: string; rules: string[] };
export function publishMentor(f: MentorForm) {
  const amt = +String(f.amount).replace(/\D/g, '');
  const biz = isW() ? null : curBiz();
  const m: Mentorship = {
    id: uid('tmp_mm'),
    mine: 1,
    asBiz: biz ? biz.id : null,
    title: f.title.trim(),
    field: f.field || db.user.skills[0] || 'Admin',
    format: f.format,
    dur: f.dur,
    price: f.price === 'Free' || !amt ? 'Free' : `XAF ${amt.toLocaleString('en-US')} / month`,
    seats: f.seats,
    joined: 0,
    people: [],
    st: {},
    desc: f.desc.trim() || 'Details coming soon.',
    rules: [...f.rules],
  };
  db.MENTORSHIPS.unshift(m);
  if (biz) bizLog('follow', `Published mentorship <b>${m.title}</b>`);
  bump();
  (async () => {
    const { field, format, dur, price, desc, rules } = m;
    const { error } = await supabase.from('mentorships').insert({ business_id: biz?.remoteId || null, title: m.title, seats: m.seats, data: { field, format, dur, price, desc, rules, color: m.color } });
    if (error) {
      db.MENTORSHIPS = db.MENTORSHIPS.filter((x) => x !== m);
      bump();
      return fail(error);
    }
    toast('Mentorship published in Career. Its group chat is in your messages');
    await refreshCareer();
    await refreshChats();
  })();
}
export function answerMentee(mid: string, pid: string, st: 'acc' | 'dec') {
  const m = db.MENTORSHIPS.find((x) => x.id === mid)!;
  (m.st = m.st || {})[pid] = st;
  if (st === 'acc') m.joined++;
  toast(st === 'acc' ? `${P(pid).name} accepted. They’re in the group now` : `${P(pid).name} declined`);
  bump();
  supabase
    .from('mentorship_members')
    .update({ status: st === 'acc' ? 'yes' : 'dec' })
    .eq('mentorship_id', mid)
    .eq('user_id', R(pid))
    .then(({ error }) => (error ? fail(error) : refreshChats()));
}
/** A new group chat with the people picked. Returns its chat key. */
export async function createGroup(o: { title: string; desc: string; rules: string[]; color: string; members: string[] }): Promise<string | null> {
  const { data, error } = await supabase.rpc('create_group', { p_title: o.title.trim(), p_about: o.desc.trim(), p_color: o.color, p_rules: o.rules, p_members: o.members.map(R).filter(Boolean) });
  if (error) {
    fail(error);
    return null;
  }
  await refreshChats();
  toast('Group created');
  return groupKey(data as string);
}
export function courseGroup(c: Course) {
  let m = db.MENTORSHIPS.find((x) => x.course === c.id);
  if (!m) {
    m = { id: 'cg' + c.id, plain: 1, course: c.id, mine: 1, asBiz: c.biz, title: `${c.title} · Class`, desc: `Class group for “${c.title}” by ${c.prov.n}. Announcements, lesson links, files and questions.`, field: '', format: 'Group', dur: c.dur, price: '', seats: c.seats || 500, joined: 0, people: [], rules: ['respect', 'onTime'], color: '#7be0a7' };
    db.MENTORSHIPS.push(m);
  }
  m.people = [...(c.people || [])];
  m.joined = m.people.length;
  const gid = mentorGroup(m, true);
  db.P[gid].role = 'Class group';
  db.P[gid].photo = db.P[gid].pin = logoPic('CL', '#7be0a7', '#000');
  const th = (isW() ? db.THREADS_W : db.THREADS_C)[gid];
  if (th) {
    th.members = [...m.people];
    if (!th.course) {
      th.course = 1;
      th.unread = 0;
      th.msgs = [{ d: 'Today' }, { sys: `Class group created for “${c.title}”` }];
    }
  }
  return gid;
}
export const groupOf = (gid: string) => db.MENTORSHIPS.find((x) => x.id === db.P[gid]?.mentorship);
export function leaveGroup(gid: string) {
  const m = groupOf(gid);
  const cid = gid.startsWith('g_') ? gid.slice(2) : '';
  [db.THREADS_W, db.THREADS_C].forEach((T) => delete T[gid]);
  [db.ORDER_W, db.ORDER_C].forEach((O) => {
    const i = O.indexOf(gid);
    if (i >= 0) O.splice(i, 1);
  });
  if (m && m.joinedMe) {
    m.joinedMe = null;
    m.joined = Math.max(0, m.joined - 1);
  }
  toast(`You left “${m?.title || db.P[gid]?.name || 'the group'}”`);
  bump();
  (async () => {
    if (m && !m.mine) await supabase.from('mentorship_members').delete().eq('mentorship_id', m.id).eq('user_id', db.uid!);
    if (cid) {
      const { error } = await supabase.from('conversation_members').delete().eq('conversation_id', cid).eq('user_id', db.uid!);
      if (error) fail(error);
    }
  })();
}
export function deleteGroup(gid: string) {
  const cid = gid.startsWith('g_') ? gid.slice(2) : '';
  [db.THREADS_W, db.THREADS_C].forEach((T) => delete T[gid]);
  [db.ORDER_W, db.ORDER_C].forEach((O) => {
    const i = O.indexOf(gid);
    if (i >= 0) O.splice(i, 1);
  });
  toast('Group deleted');
  bump();
  if (cid) supabase.rpc('delete_group', { p_conversation: cid }).then(({ error }) => error && fail(error));
}
/** Groups with the "no private messages" rule: you can still message the mentor; please keep to the rules. */
export function requestDM(mid: string) {
  db.DMREQ[mid] = 'ok';
  bump();
}
/** Is messaging this person blocked by a group rule? */
export function dmBlocked(id: string) {
  const m = db.MENTORSHIPS.find((x) => x.by === id && x.joinedMe && (x.rules || []).includes('noDM') && !x.mine);
  if (m && db.DMREQ[m.id] !== 'ok' && !THREADS()[id]?.msgs?.some((x) => x.f === 'me')) return m;
  return null;
}

/* ---------------- businesses enrol employees ---------------- */
export function enrolEmployees(_kind: 'course' | 'mentor' | 'opp', _id: string, _n: number) {
  toast('Team enrolment is coming soon. Share the page with your team for now');
}

/* ---------------- ads (pay per 100 people reached) ---------------- */
export const AD_RATE = 500;
export const adRate = () => (db.user.pro.business ? Math.round(AD_RATE * 0.8) : AD_RATE);
export const adsOf = () => {
  const b = curBiz();
  if (!b) return [] as Ad[];
  return (b.ads = b.ads || []);
};
export function adTargets(): [string, string, string, string][] {
  return [
    ...db.POSTS.filter((p) => p.mine && p.as === 'business' && p.biz === db.BIZ.active).map((p) => ['vac', p.id, p.title!, 'Vacancy'] as [string, string, string, string]),
    ...db.OPPS.filter((o) => o.mine && o.biz === db.BIZ.active).map((o) => ['opp', o.id, o.title, o.kind] as [string, string, string, string]),
    ...db.COURSES.filter((c) => c.mine && c.biz === db.BIZ.active).map((c) => ['course', c.id, c.title, 'Course'] as [string, string, string, string]),
    ['page', 'page', bizName(curBiz()), 'Company page'],
  ];
}
export const adHead = (t: [string, string, string, string]) => (t[0] === 'page' ? `Work with ${bizName(curBiz())}` : t[0] === 'course' ? `New course: ${t[2]}` : t[0] === 'opp' ? `Apply now: ${t[2]}` : `We’re hiring: ${t[2]}`);
/** Story ads: extra per 100 people reached, plus a price for every second people must watch before they can close it. */
export const STORY_EXTRA = 150;
export const SEC_RATE = 40;
export const MAX_SKIP = 10;
export const adCost = (reach: number, fmt: 'card' | 'story' = 'card', skip = 0) => Math.round((reach / 100) * (adRate() + (fmt === 'story' ? STORY_EXTRA + Math.min(MAX_SKIP, skip) * SEC_RATE : 0)));
export function launchAd(a: { t: [string, string, string, string]; head: string; text: string; areas: string[]; fields: string[]; reach: number; days: number; fmt?: 'card' | 'story'; skip?: number }) {
  const ad: Ad = { id: uid('ad'), t: a.t, head: a.head || adHead(a.t), text: a.text, areas: a.areas, fields: a.fields, reach: a.reach, days: a.days, reached: 0, clicks: 0, apps: 0, status: 'active', paid: adCost(a.reach, a.fmt, a.skip), start: nowT(), fmt: a.fmt || 'card', skip: a.fmt === 'story' ? a.skip || 0 : 0 };
  adsOf().unshift(ad);
  startAdTicker();
  bizLog('rocket', `Launched ad <b>${ad.head}</b> · ${ad.reach.toLocaleString('en-US')} people`);
  toast(`🚀 Ad is live, reaching ${ad.reach.toLocaleString('en-US')} people`);
  bump();
}
export const adPct = (ad: Ad) => Math.min(100, Math.round((ad.reached / ad.reach) * 100));
let adTicker: any = null;
export function stopAdTicker() {
  adTicker = null;
}
export function startAdTicker() {
  if (adTicker) return;
  adTicker = every(3000, () => {
    let changed = false;
    db.BIZ.list.forEach((b) =>
      (b.ads || []).forEach((ad) => {
        if (ad.status !== 'active') return;
        const inc = Math.min(ad.reach - ad.reached, Math.round(ad.reach * (0.04 + Math.random() * 0.05)));
        ad.reached += inc;
        ad.clicks += Math.round(inc * 0.07);
        if (Math.random() < 0.5) ad.apps += Math.round(inc * 0.01);
        if (ad.reached >= ad.reach) ad.status = 'done';
        changed = true;
      }),
    );
    if (!changed) return 'skip';
  });
}
export { xaf, myCity, ORDER, ui };
