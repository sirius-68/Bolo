/* Career: internships & programs, courses, mentorships, groups, ads. */
import { db, ui, uid, Course, Mentorship, Opp, Ad } from '../data/db';
import { toast } from '../ui/overlay';
import { logoPic } from '../ui/kit';
import { bump, later, every } from './live';
import { P, isW, curBiz, bizName, bizLogo, WORKERS, nowT, mOwner, THREADS, ORDER, thread, fname, xaf, myCity } from './core';
import { bizLog } from './work';

/* ---------------- internships & programs ---------------- */
export type OppForm = { kind: string; title: string; cat: string; desc: string; dur: string; start: string; mode: string; paid: string; amount: string; seats: number; deadline: string; lv?: string };
const fmtD = (d: string) => {
  const x = new Date(d);
  return d && !isNaN(+x) ? x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
};
export function publishOpp(f: OppForm): 'opp' | 'course' {
  const b = curBiz()!;
  const amt = +String(f.amount).replace(/\D/g, '') || 0;
  if (f.kind === 'Course') {
    const catMap: Record<string, string> = { Developer: 'Development', Designer: 'Design', Accountant: 'Finance', Sales: 'Marketing', Teacher: 'Teaching', Nurse: 'Health', Writer: 'Languages' };
    const c: Course = {
      id: uid('cu'),
      mine: 1,
      biz: db.BIZ.active!,
      title: f.title.trim(),
      prov: { n: bizName(b), logo: bizLogo(b) },
      cat: catMap[f.cat] || (/(Plumb|Electric|Builder|Mechanic)/.test(f.cat) ? 'Trades' : 'Business'),
      lv: f.lv || 'Beginner',
      dur: f.dur,
      type: 'Skill',
      fmt: f.mode === 'Online' ? 'Online' : 'Offline',
      reg: f.mode === 'Online' ? '' : b.city || 'Buea',
      price: f.paid === 'Free' ? 0 : amt,
      old: 0,
      prof: '',
      skills: [],
      mo: 0,
      seats: f.seats,
      enrolled: 0,
      people: [],
      prog: {},
    };
    db.COURSES.unshift(c);
    bizLog('cap', `Published course <b>${c.title}</b>`);
    toast('Course published in Career → Courses');
    const pool = WORKERS().sort(() => Math.random() - 0.5);
    ([[pool.slice(0, 3), 5000], [pool.slice(3, 5), 11000], [pool.slice(5, 6), 17000]] as [string[], number][]).forEach(([ids, t]) =>
      later(t, () => {
        enrollPeople(c, ids);
        if (!isW()) toast(`${ids.length} new student${ids.length > 1 ? 's' : ''} in “${c.title}”`);
      }),
    );
    bump();
    return 'course';
  }
  const o: Opp = {
    id: uid('op'),
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
  toast(`${f.kind} published in Career`);
  WORKERS()
    .slice(0, 3)
    .forEach((id, i) =>
      later(4000 + i * 3500, () => {
        if (o.joined < o.seats) {
          o.joined++;
          o.people!.push(id);
          if (i === 0 && !isW()) toast(`${P(id).name} ${o.kind === 'Training program' ? 'asked to join' : 'applied to'} “${o.title}”`);
        }
      }),
    );
  bump();
  return 'opp';
}
export function joinOpp(id: string) {
  const o = db.OPPS.find((x) => x.id === id)!;
  o.applied = 1;
  o.joined++;
  toast(o.kind === 'Training program' ? `You joined “${o.title}”` : `Application sent to ${db.BIZ_SAMPLE[o.biz]?.name || 'the business'}`);
  bump();
}
export function answerApplicant(oid: string, pid: string, st: 'acc' | 'dec') {
  const o = db.OPPS.find((x) => x.id === oid)!;
  (o.st = o.st || {})[pid] = st;
  if (st === 'dec') o.joined = Math.max(0, o.joined - 1);
  toast(st === 'acc' ? `${P(pid).name} accepted. We’ve let them know` : `${P(pid).name} declined`);
  if (!isW()) bizLog(st === 'acc' ? 'checkc' : 'x', `${st === 'acc' ? 'Accepted' : 'Declined'} <b>${P(pid).name}</b> for <b>${o.title}</b>`);
  bump();
}

/* ---------------- courses ---------------- */
export function enroll(id: string, done: () => void) {
  const c = db.COURSES.find((x) => x.id === id)!;
  later(c.price ? 1300 : 500, () => {
    if (!db.myLearning.includes(id)) db.myLearning.push(id);
    c.startAt = c.quick ? Date.now() + 60_000 : nextMonday();
    c.done = c.done || 0;
    learnerGroup(c);
    scheduleClass(c);
    toast(`You’re enrolled in “${c.title}”`);
    done();
  });
}
const nextMonday = () => {
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
    const mem = WORKERS().slice(2, 9);
    T[gid] = {
      time: nowT(),
      group: 1,
      course: 1,
      members: mem,
      unread: 1,
      msgs: [
        { d: 'Today' },
        { sys: `You joined the class group for “${c.title}”` },
        { f: 'them', t: `${c.prov.n}: Welcome to the class! 👋 Introduce yourself and tell us what you want to learn.`, at: nowT() },
        { f: 'them', t: `${c.prov.n}: The first class starts ${c.quick ? 'in about a minute' : 'next Monday at 18:00'}. The link will appear here.`, at: nowT() },
      ],
    };
    if (!db.ORDER_W.includes(gid)) db.ORDER_W.unshift(gid);
  }
  return gid;
}
/** When the class starts: a message in the class group, a notification and a pop-up. */
export function scheduleClass(c: Course) {
  if (!c.startAt) return;
  const ms = c.startAt - Date.now();
  if (ms <= 0 || ms > 6 * 3600_000) return; // only time it while the app is likely open
  later(ms, () => {
    const gid = learnerGroup(c);
    const th = db.THREADS_W[gid];
    th.msgs.push({ sys: '🔴 Class is live now' }, { f: 'them', t: `${c.prov.n}: We’re starting! Tap “Join class” on the course page or here: bolo.app/live/${c.id}`, at: nowT() });
    th.unread = (th.unread || 0) + 1;
    th.time = nowT();
    db.NOTIFS_W.unshift({ id: uid('n'), g: 'Today', type: 'reminder', who: gid, time: 'now', text: `· your class “${c.title}” is starting now. Join from the course page.` } as any);
    toast(`“${c.title}” is starting now`);
    bump();
  });
}
/** Test course: starts 1 minute after you enrol. */
export function ensureQuickCourse() {
  if (db.COURSES.some((x) => x.id === 'c_quick')) return;
  db.COURSES.unshift({ id: 'c_quick', quick: 1, title: 'Quick test class: starts 1 minute after you enrol', prov: { n: 'bolo Academy', logo: logoPic('bA', '#f6ee5c', '#000') }, cat: 'Business', lv: 'Beginner', dur: '15 minutes', type: 'Skill', fmt: 'Online', reg: '', price: 0, old: 0, prof: '', skills: ['How bolo courses work', 'Joining a live class', 'Using your class group'], mo: 0 });
}
/** Lessons shown on the course page, made from what the course teaches. */
export const lessonsOf = (c: Course) => [...c.skills.map((s, i) => `Lesson ${i + 1} · ${s}`), `Final project and certificate`];
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
/** Create (or reuse) the chat for a mentorship / group. */
export function mentorGroup(m: Mentorship, asMentor: boolean) {
  const gid = 'g_' + m.id;
  if (!db.P[gid]) db.P[gid] = { name: m.title, group: 1, client: 1, role: m.plain ? (m.course ? 'Class group' : 'Group') : 'Mentorship group', photo: groupLogo(m), pin: groupLogo(m), area: '', dist: '', rate: 5, years: 1, jobs: 0, reviews: '0', followers: 0, mentorship: m.id };
  const T = asMentor ? (isW() ? db.THREADS_W : db.THREADS_C) : db.THREADS_W;
  const O = asMentor ? (isW() ? db.ORDER_W : db.ORDER_C) : db.ORDER_W;
  if (!T[gid]) {
    const mem = (m.people || []).length ? m.people! : WORKERS().filter((x) => x !== m.by).slice(5, 8);
    const mentor = fname(mOwner(m).name);
    T[gid] = {
      time: nowT(),
      group: 1,
      members: [...mem],
      unread: asMentor ? 1 : 2,
      msgs: [
        { d: 'Today' },
        { sys: asMentor ? `You created the group for “${m.title}”` : `You joined “${m.title}” · ${m.joined} members` },
        ...(asMentor
          ? [{ f: 'them' as const, t: `${P(mem[0])?.name.split(' ')[0] || 'A mentee'}: Hello ${db.user.name ? db.user.name.split(' ')[0] : ''}! Excited to start 🙏`, at: nowT() }]
          : [
              { f: 'them' as const, t: `${mentor}: Welcome to the group! 👋 Introduce yourself, what do you want to get out of this mentorship?`, at: nowT() },
              { f: 'them' as const, t: `${mentor}: First session is this week. I’ll share the link here.`, at: nowT() },
            ]),
      ],
    };
    if (!O.includes(gid)) O.unshift(gid);
  }
  return gid;
}
export function joinMentor(id: string) {
  const m = db.MENTORSHIPS.find((x) => x.id === id)!;
  m.joinedMe = 'req';
  toast('Request sent');
  bump();
  later(3000, () => {
    m.joinedMe = 'yes';
    m.joined++;
    toast(`🎉 ${mOwner(m).name.split(' ')[0]} accepted you as a mentee`);
    later(200, () => {
      mentorGroup(m, false);
      toast(`💬 ${m.format === 'Group' ? 'Mentorship group' : 'Mentor chat'} added to your messages`);
    });
  });
}
export type MentorForm = { title: string; field: string; format: '1-to-1' | 'Group'; dur: string; price: 'Free' | 'Paid'; amount: string; seats: number; desc: string; rules: string[] };
export function publishMentor(f: MentorForm) {
  const amt = +String(f.amount).replace(/\D/g, '');
  const m: Mentorship = {
    id: uid('mm'),
    mine: 1,
    asBiz: isW() ? null : db.BIZ.active,
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
  toast('Mentorship published in Career');
  if (!isW()) bizLog('follow', `Published mentorship <b>${m.title}</b>`);
  WORKERS()
    .slice(3, 5)
    .forEach((pid, i) =>
      later(4000 + i * 3000, () => {
        if (m.joined < m.seats) {
          m.joined++;
          m.people!.push(pid);
          m.st![pid] = 'pending';
          if (i === 0) toast(`${P(pid).name} wants you as a mentor`);
        }
      }),
    );
  later(4200, () => mentorGroup(m, true));
  bump();
}
export function answerMentee(mid: string, pid: string, st: 'acc' | 'dec') {
  const m = db.MENTORSHIPS.find((x) => x.id === mid)!;
  (m.st = m.st || {})[pid] = st;
  if (st === 'dec') {
    m.joined = Math.max(0, m.joined - 1);
    const th = THREADS_ALL('g_' + mid);
    if (th) th.members = (th.members || []).filter((x) => x !== pid);
  }
  toast(st === 'acc' ? `${P(pid).name} accepted as a mentee` : `${P(pid).name} declined`);
  bump();
}
export function createGroup(o: { title: string; desc: string; rules: string[]; color: string; members: string[] }) {
  const m: Mentorship = { id: uid('gp'), plain: 1, mine: 1, asBiz: isW() ? null : db.BIZ.active, title: o.title.trim(), desc: o.desc.trim() || 'A group on bolo.', field: '', format: 'Group', dur: '', price: 'Free', seats: 500, joined: o.members.length, people: [...o.members], rules: [...o.rules], color: o.color };
  db.MENTORSHIPS.push(m);
  const gid = mentorGroup(m, true);
  const initials = m.title
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  db.P[gid].role = 'Group';
  db.P[gid].photo = db.P[gid].pin = logoPic(initials, o.color, '#000');
  const th = thread(gid);
  th.members = [...o.members];
  th.unread = 0;
  th.msgs = [
    { d: 'Today' },
    { sys: `You created the group “${m.title}”` },
    { sys: `You added ${o.members.slice(0, 3).map((id) => fname(P(id).name)).join(', ')}${o.members.length > 3 ? ` and ${o.members.length - 3} others` : ''}` },
  ];
  th.time = nowT();
  later(2500, () => {
    const f0 = o.members[0];
    if (f0 && THREADS()[gid]) {
      th.msgs.push({ f: 'them', t: `${fname(P(f0).name)}: Thanks for adding me! 👋`, at: nowT() });
      th.time = nowT();
    }
  });
  toast('Group created');
  bump();
  return gid;
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
  [db.THREADS_W, db.THREADS_C].forEach((T) => delete T[gid]);
  [db.ORDER_W, db.ORDER_C].forEach((O) => {
    const i = O.indexOf(gid);
    if (i >= 0) O.splice(i, 1);
  });
  if (m && m.joinedMe) {
    m.joinedMe = null;
    m.joined = Math.max(0, m.joined - 1);
  }
  toast(`You left “${m?.title || 'the group'}”`);
  bump();
}
export function deleteGroup(gid: string) {
  [db.THREADS_W, db.THREADS_C].forEach((T) => delete T[gid]);
  [db.ORDER_W, db.ORDER_C].forEach((O) => {
    const i = O.indexOf(gid);
    if (i >= 0) O.splice(i, 1);
  });
  toast('Group deleted');
  bump();
}
export function requestDM(mid: string) {
  const m = db.MENTORSHIPS.find((x) => x.id === mid)!;
  const o = mOwner(m);
  db.DMREQ[mid] = 'pending';
  toast(`Request sent to ${o.name.split(' ')[0]}`);
  bump();
  later(3500, () => {
    db.DMREQ[mid] = 'ok';
    const t = thread(m.by!);
    t.msgs.push({ sys: `${o.name.split(' ')[0]} accepted your message request` });
    t.time = nowT();
    t.unread = (t.unread || 0) + 1;
    db.NOTIFS_W.unshift({ id: uid('dm'), g: 'Today', type: 'accept', who: m.by, time: 'now', text: 'accepted your request to message them privately.' });
    toast(`✅ ${o.name.split(' ')[0]} accepted. You can message them now`);
  });
}
/** Is messaging this person blocked by a group rule? */
export function dmBlocked(id: string) {
  const m = db.MENTORSHIPS.find((x) => x.by === id && x.joinedMe && (x.rules || []).includes('noDM') && !x.mine);
  if (m && db.DMREQ[m.id] !== 'ok' && !THREADS()[id]?.msgs?.some((x) => x.f === 'me')) return m;
  return null;
}

/* ---------------- businesses enrol employees ---------------- */
export function enrolEmployees(kind: 'course' | 'mentor' | 'opp', id: string, n: number) {
  const it: any = kind === 'course' ? db.COURSES.find((c) => c.id === id) : kind === 'mentor' ? db.MENTORSHIPS.find((m) => m.id === id) : db.OPPS.find((o) => o.id === id);
  it.emp = (it.emp || 0) + n;
  if (kind !== 'course') it.joined += n;
  bizLog('cap', `Enrolled ${n} employee${n > 1 ? 's' : ''} in <b>${it.title}</b>`);
  toast(`${n} employee${n > 1 ? 's' : ''} enrolled in “${it.title}”`);
  if (kind === 'mentor') {
    const m = it as Mentorship;
    later(1000, () => {
      const gid = 'g_' + m.id;
      if (!db.P[gid]) db.P[gid] = { name: m.title, group: 1, client: 1, role: 'Mentorship group', photo: groupLogo(m), pin: groupLogo(m), area: '', dist: '', rate: 5, years: 1, jobs: 0, reviews: '0', followers: 0, mentorship: m.id };
      if (!db.THREADS_C[gid]) {
        db.THREADS_C[gid] = { time: nowT(), group: 1, unread: 1, members: [], msgs: [{ d: 'Today' }, { sys: `${bizName(curBiz())} added employees to “${m.title}”` }, { f: 'them', t: `${mOwner(m).name.split(' ')[0]}: Welcome to your team! We start this week.`, at: nowT() }] };
        db.ORDER_C.unshift(gid);
      }
    });
  }
  bump();
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
