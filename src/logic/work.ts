/* Jobs, offers, bookings, chats and notifications. */
import { db, ui, uid, Booking, Msg, Post, Notif, CvFile } from '../data/db';
import { SERVICES, STAGES } from '../data/catalog';
import { toast, undoBar } from '../ui/overlay';
import { bump, later, every, cancel } from './live';
import { emit } from './events';
import {
  P, isW, thread, nowT, fname, first, xaf, budgetNum, WORKERS, mySkill, myCity, hiringSide, THREADS, ORDER, NOTIFS, curBiz, bizName, postById, add, toggle, has, mOwner,
} from './core';

/* =========================== saves & follows =========================== */
export function toggleSave(id: string) {
  const on = toggle(db.saved, id);
  toast(on ? `${P(id).name} saved` : 'Removed from saved');
  bump();
}
type SaveList = 'savedJobs' | 'saved' | 'savedPosts' | 'savedOpps' | 'savedCourses' | 'savedCos' | 'savedMentors';
export function saveToggle(list: SaveList, id: string, label: string) {
  const on = toggle(db[list] as string[], id);
  toast(on ? `${label} saved` : 'Removed from saved');
  bump();
}
export const isSaved = (list: SaveList, id: string) => has(db[list] as string[], id);
export function follow(id: string) {
  const on = toggle(db.followed, id);
  toast(on ? `Following ${P(id).name}` : `Unfollowed ${P(id).name}`);
  bump();
}
export function likePost(id: string) {
  toggle(db.liked, id);
  bump();
}
export function likeReel(i: number) {
  toggle(db.reelLiked, i);
  bump();
}

/* =========================== hiring a person directly =========================== */
/** Sends a priced job request to a person in chat; they accept and a booking is created. */
export function sendHireRequest(id: string, job: string, price: string, when: string) {
  const th = thread(id);
  th.msgs.push({ d: 'Today' }, { f: 'me', k: 'offer', job, price, when, dur: 'Hire request', at: nowT(), st: 'sent' });
  th.time = nowT();
  th.job = `${job} · Request sent`;
  add(db.hired, id); // shows as "Requested" until they answer
  reply(id, 'hire');
  toast(`Request sent to ${P(id).name}`);
  bump();
}
export const hireState = (id: string): 'none' | 'requested' | 'booked' => {
  if (db.BOOKINGS.some((b) => b.worker === id && b.client === 'me' && b.state !== 'confirmed')) return 'booked';
  const th = THREADS()[id];
  return th?.msgs.some((m) => m.k === 'offer' && m.f === 'me' && !m.state && m.dur === 'Hire request') ? 'requested' : 'none';
};

/* =========================== posting jobs =========================== */
export type JobForm = {
  title: string;
  text: string;
  cat: string;
  budget: string;
  neg: boolean;
  type: string;
  openings: number;
  when: string;
  time: string;
  area: string;
  urgent: boolean;
  photos: string[];
};
export function postJob(f: JobForm): Post {
  const w = isW();
  const b = f.budget.replace(/[^\d]/g, '');
  const job: Post = {
    id: uid('j'),
    kind: 'request',
    client: 'me',
    mine: 1,
    cat: f.cat,
    title: f.title.trim(),
    text: f.text.trim(),
    budget: b ? `XAF ${(+b).toLocaleString('en-US')}${f.neg ? ' · negotiable' : ''}${!w ? ' / month' : ''}` : w ? 'Open to offers' : 'Salary negotiable',
    when: f.when === 'Flexible' ? 'Flexible' : `${f.when}, ${f.time}`,
    area: f.area,
    type: f.type,
    as: w ? 'regular' : 'business',
    biz: w ? null : db.BIZ.active,
    openings: w ? 1 : f.openings || 1,
    time: 'Just now',
    photos: [...f.photos],
    urgent: f.urgent,
    offerList: [],
  };
  db.POSTS.unshift(job);
  if (!w) bizLog('job', `Posted vacancy <b>${job.title}</b>`);
  simulateOffers(job);
  bump();
  return job;
}
function simulateOffers(job: Post) {
  const pool = ((a: string[]) => (a.length ? a : WORKERS()))(WORKERS().filter((id) => db.P[id].role === job.cat));
  const lo = parseInt(((job.budget!.match(/[\d,]+/) || ['10000'])[0]).replace(/,/g, '')) || 10000;
  const asBiz = job.as === 'business';
  pool.slice(0, 3).forEach((id, i) =>
    later(3500 + i * 4500, () => {
      if (!db.POSTS.includes(job)) return;
      const price = Math.round((lo * (0.85 + i * 0.1)) / 500) * 500;
      job.offerList!.push({
        by: id,
        price: asBiz ? job.budget! : `XAF ${price.toLocaleString('en-US')}`,
        when: job.when === 'Flexible' ? 'Tomorrow, 10:00' : job.when!,
        msg: asBiz
          ? ['I’m very interested in this role and can start quickly.', 'I have done this kind of work for years — happy to interview.', 'I live nearby and I’m available full-time.'][i]
          : ['I can do this — I’ve done many jobs like it nearby.', 'Available at that time. I’ll bring my own tools.', 'I’m close by and can come quickly.'][i],
        stage: asBiz ? 'applied' : undefined,
      });
      (asBiz ? db.NOTIFS_C : db.NOTIFS_W).unshift({ id: uid('no'), g: 'Today', type: 'newoffer', who: id, job: job.id, time: 'now' });
      if (asBiz) bizLog('follow', `<b>${P(id).name}</b> applied for <b>${job.title}</b>`);
      const viewingRightSide = isW() === !asBiz;
      if (viewingRightSide) toast(`${P(id).name} ${asBiz ? 'applied to' : 'sent an offer on'} “${job.title}”`);
    }),
  );
}
export function closeJob(id: string) {
  const i = db.POSTS.findIndex((p) => p.id === id);
  if (i >= 0) db.POSTS.splice(i, 1);
  toast('Job closed');
  bump();
}

/* =========================== offers (Regular finds work) =========================== */
export function sendOffer(id: string, price: string, whenKey: string, msg: string, cv: CvFile | null) {
  const po = postById(id)!;
  const p = `XAF ${(+price).toLocaleString('en-US')}`;
  const when = whenKey === 'This week' ? 'This week' : `${whenKey}, 10:00`;
  db.myOffers[id] = { price: p, when, state: 'sent', cv };
  const th = thread(po.client!);
  th.job = `${po.title} · Offer sent`;
  th.msgs.push({ d: 'Today' }, { f: 'me', k: 'offer', job: po.title, price: p, when, dur: `${mySkill()} · ${db.user.years} yrs experience`, at: nowT(), st: 'sent' });
  if (msg) th.msgs.push({ f: 'me', t: msg, at: nowT(), st: 'sent' });
  if (cv) th.msgs.push({ f: 'me', k: 'file', name: cv.name, size: cv.kb + ' KB', at: nowT(), st: 'sent' });
  th.time = nowT();
  toast(`Offer sent to ${P(po.client!).name}`);
  bump();
  later(6000, () => {
    const o = db.myOffers[id];
    if (!o || o.state !== 'sent') return;
    o.state = 'acc';
    th.job = `${po.title} · ${when}`;
    const oc = th.msgs.find((m) => m.k === 'offer' && m.job === po.title && !m.state);
    if (oc) oc.state = 'acc';
    th.msgs.push({ sys: `Job booked · ${po.title} · ${when}` }, { f: 'them', t: 'Great, see you then! 👍', at: nowT() });
    if (ui.openChat !== po.client) th.unread = (th.unread || 0) + 1;
    th.time = nowT();
    createBooking({ worker: 'me', client: po.client!, title: po.title!, when, price: o.price, area: po.area!, as: 'regular' });
    db.NOTIFS_W.unshift({ id: uid('wa'), g: 'Today', type: 'accept', who: po.client, time: 'now', text: `accepted your offer for “${po.title}”.` });
    if (isW()) toast(`🎉 ${P(po.client!).name} accepted your offer!`);
  });
}
export function withdrawOffer(id: string) {
  delete db.myOffers[id];
  toast('Offer withdrawn');
  bump();
}
/** Regular user hires someone who made an offer on their job. */
export function acceptOffer(jobId: string, i: number) {
  const po = postById(jobId)!;
  const o = po.offerList![i];
  po.booked = o.by;
  add(db.hired, o.by);
  const th = thread(o.by);
  th.job = `${po.title} · ${o.when}`;
  th.msgs.push({ sys: `Job booked · ${po.title} · ${o.when} · ${o.price}` });
  th.time = nowT();
  createBooking({ worker: o.by, client: 'me', title: po.title!, when: o.when, price: o.price, area: po.area!, as: 'regular' });
  toast(`You hired ${P(o.by).name} for ${o.when}`);
  bump();
}

/* =========================== applications (vacancies) =========================== */
export function applyVac(id: string, msg: string, cv: CvFile | null) {
  const po = postById(id)!;
  db.myOffers[id] = { price: po.budget!, when: po.type!, state: 'sent', app: 1, stage: 'Application sent' + (db.user.pro.regular ? ' · priority' : ''), cv };
  const th = thread(po.client!);
  th.job = `${po.title} · Application sent`;
  th.msgs.push({ d: 'Today' }, { f: 'me', t: msg, at: nowT(), st: 'sent' });
  if (cv) th.msgs.push({ f: 'me', k: 'file', name: cv.name, size: cv.kb + ' KB', at: nowT(), st: 'sent' });
  th.time = nowT();
  toast(`Application sent to ${P(po.client!).name}`);
  bump();
  later(db.user.pro.regular ? 3500 : 7000, () => {
    const o = db.myOffers[id];
    if (!o) return;
    o.stage = 'Shortlisted — interview soon';
    o.state = 'acc';
    db.NOTIFS_W.unshift({ id: uid('ap'), g: 'Today', type: 'accept', who: po.client, time: 'now', text: `shortlisted you for “${po.title}”. Expect an interview invite.` });
    if (isW()) toast(`🎉 ${P(po.client!).name} shortlisted you!`);
  });
}
export function withdrawApplication(id: string) {
  delete db.myOffers[id];
  toast('Application withdrawn');
  bump();
}
export function setStage(jobId: string, i: number, st: string) {
  const po = postById(jobId)!;
  const o = po.offerList![i];
  o.stage = st;
  if (st === 'short') {
    toast(`${P(o.by).name} shortlisted`);
    bizLog('checkc', `Shortlisted <b>${P(o.by).name}</b> for <b>${po.title}</b>`);
  }
  if (st === 'interview') {
    toast(`Interview invite sent to ${P(o.by).name}`);
    const th = thread(o.by);
    th.msgs.push({ f: 'me', t: `Hello ${first(o.by)}, we’d like to invite you to an interview for “${po.title}”. Are you free tomorrow at 10:00?`, at: nowT(), st: 'sent' });
    th.time = nowT();
    bizLog('calcheck', `Interview invite sent to <b>${P(o.by).name}</b> for <b>${po.title}</b>`);
  }
  bump();
}
export function declineApp(jobId: string, i: number) {
  const po = postById(jobId)!;
  const o = po.offerList!.splice(i, 1)[0];
  toast(`${P(o.by).name} declined — we’ll let them know kindly`);
  bump();
}
export const stageLabel = (k: string) => STAGES.find((s) => s[0] === k)?.[1] || 'Applied';

/* =========================== company contracts =========================== */
export type ContractDraft = { pid: string; i: number; person: string; role: string; pay: string; start: string; dur: string; prob: string; hours: string; terms: string };
export function sendContract(c: ContractDraft) {
  const b = curBiz()!;
  const po = postById(c.pid)!;
  const o = po.offerList![c.i];
  const id = uid('k');
  const start = (() => {
    const d = new Date(c.start);
    return isNaN(+d) ? c.start : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  })();
  b.contracts.unshift({ id, person: c.person, role: c.role, pay: c.pay, start, dur: c.dur, prob: c.prob, hours: c.hours, terms: c.terms, status: 'sent', vac: po.id });
  o.stage = 'offer';
  bizLog('file', `Contract sent to <b>${P(c.person).name}</b> · ${c.role}`);
  toast(`Contract sent to ${P(c.person).name}`);
  bump();
  later(4500, () => {
    const k = b.contracts.find((x) => x.id === id);
    if (!k || k.status !== 'sent') return;
    k.status = 'active';
    o.stage = 'hired';
    add(b.team, c.person);
    db.NOTIFS_C.unshift({ id: uid('kc'), g: 'Today', type: 'accept', who: c.person, time: 'now', text: `signed the contract for “${c.role}”. Welcome to the team!` });
    b.events.unshift({ icon: 'checkc', text: `<b>${P(c.person).name}</b> signed the contract and joined your team`, at: nowT() });
    if (!isW() && db.BIZ.active === b.id) toast(`✍️ ${P(c.person).name} signed — they’re on your team`);
  });
}
export function endContract(id: string) {
  const b = curBiz()!;
  const k = b.contracts.find((x) => x.id === id)!;
  k.status = 'ended';
  k.endedAt = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  b.team = b.team.filter((x) => x !== k.person);
  bizLog('file', `Contract with <b>${P(k.person).name}</b> ended`);
  toast(`Contract with ${P(k.person).name} ended`);
  bump();
}
export function bizLog(icon: string, text: string) {
  const b = curBiz();
  if (!b) return;
  b.events.unshift({ icon, text, at: nowT() });
  if (b.events.length > 30) b.events.pop();
}

/* =========================== bookings & live tracking =========================== */
export const bk = (id: string) => db.BOOKINGS.find((x) => x.id === id);
export const trOther = (b: Booking) => (b.worker === 'me' ? b.client : b.worker);
/** Bookings for the active profile: Regular sees personal jobs both ways, Business sees its company bookings. */
export const myBookings = () => db.BOOKINGS.filter((b) => (isW() ? b.worker === 'me' || (b.client === 'me' && b.as !== 'business') : b.client === 'me' && b.as === 'business'));
const timers: Record<string, any> = {};
export function createBooking(o: Omit<Booking, 'id' | 'state' | 'eta' | 'eta0' | 'log'>) {
  const b: Booking = { id: uid('b'), state: 'booked', eta: 8, eta0: 8, log: { booked: nowT() }, ...o };
  db.BOOKINGS.unshift(b);
  if (b.client === 'me') runSim(b, 6000);
  bump();
  return b;
}
/** Simulates the worker's side for the person who hired. */
export function runSim(b: Booking, delay = 5000) {
  if (timers[b.id]) return;
  const step = () => {
    if (b.state === 'booked')
      timers[b.id] = later(delay, () => {
        setState(b, 'onway');
        step();
      });
    else if (b.state === 'onway')
      timers[b.id] = every(2000, () => {
        b.eta = Math.max(0, b.eta - 1);
        if (!b.eta) {
          cancel(timers[b.id]);
          setState(b, 'working');
          step();
          return false;
        }
      });
    else if (b.state === 'working') timers[b.id] = later(10000, () => setState(b, 'done'));
  };
  step();
}
export function setState(b: Booking, s: Booking['state']) {
  b.state = s;
  b.log[s] = nowT();
  const id = uid('bk');
  const N = b.as === 'business' ? db.NOTIFS_C : db.NOTIFS_W;
  if (b.client === 'me') {
    const w = P(b.worker);
    if (s === 'onway') {
      N.unshift({ id, g: 'Today', type: 'onway', who: b.worker, booking: b.id, time: 'now', text: `is on the way for “${b.title}” · ${b.eta} min` });
      if (ui.appStarted && myBookings().includes(b)) toast(`${w.name} is on the way · ${b.eta} min`);
    }
    if (s === 'working') {
      N.unshift({ id, g: 'Today', type: 'arrived', who: b.worker, booking: b.id, time: 'now', text: `has arrived and started “${b.title}”.` });
      if (ui.appStarted && myBookings().includes(b)) toast(`${w.name} has arrived`);
    }
    if (s === 'done') {
      N.unshift({ id, g: 'Today', type: 'jobdone', who: b.worker, booking: b.id, time: 'now', text: `marked “${b.title}” as done. Please confirm.` });
      if (ui.appStarted && myBookings().includes(b)) emit('doneAlert', b.id);
    }
  }
  if (b.worker === 'me' && s === 'confirmed') db.NOTIFS_W.unshift({ id, g: 'Today', type: 'payment_in', who: b.client, time: 'now', amount: b.price });
  bump();
}
export function wStart(id: string) {
  const b = bk(id)!;
  b.eta = b.eta0 = 8;
  setState(b, 'onway');
  cancel(timers[b.id]);
  timers[b.id] = every(2500, () => {
    if (b.state !== 'onway') return false;
    b.eta = Math.max(1, b.eta - 1);
  });
  toast(`${P(b.client).name} has been told you’re on the way`);
}
export function wArrive(id: string) {
  const b = bk(id)!;
  cancel(timers[b.id]);
  b.eta = 0;
  setState(b, 'working');
  toast('Job started — good luck!');
}
export function wDone(id: string) {
  const b = bk(id)!;
  setState(b, 'done');
  toast(`${P(b.client).name} has been asked to confirm`);
  timers[b.id] = later(4500, () => {
    setState(b, 'confirmed');
    if (isW()) toast(`✅ ${P(b.client).name} confirmed · ${b.price} paid to you`);
  });
}
export function confirmDone(id: string) {
  const b = bk(id);
  if (!b || b.state !== 'done') return false;
  setState(b, 'confirmed');
  toast(`Payment of ${b.price} sent to ${P(b.worker).name}`);
  return true;
}
export function reportIssue(id: string) {
  const b = bk(id)!;
  setState(b, 'working');
  toast(`We’ve told ${P(b.worker).name} something isn’t right`);
  cancel(timers[b.id]);
  timers[b.id] = later(9000, () => setState(b, 'done'));
}
export function cancelBooking(id: string) {
  const i = db.BOOKINGS.findIndex((x) => x.id === id);
  if (i < 0) return;
  const b = db.BOOKINGS[i];
  cancel(timers[b.id]);
  db.BOOKINGS.splice(i, 1);
  db.hired = db.hired.filter((x) => x !== b.worker);
  toast('Booking cancelled');
  bump();
}
/** Resume simulations after the app restarts. */
export function resumeSims() {
  db.BOOKINGS.filter((b) => b.client === 'me' && b.state !== 'done' && b.state !== 'confirmed').forEach((b) => runSim(b, 4000));
}
export function liveInfo(b: Booking): [string, string, string] {
  const f = fname(P(trOther(b)).name);
  const W = b.worker === 'me';
  return (
    {
      booked: [W ? `Job with ${f} · ${b.when}` : `${f} starts ${b.when}`, b.title, 'sched'],
      onway: [W ? `On your way to ${f}` : `${f} is on the way`, `${b.eta} min away · ${b.title}`, ''],
      working: [W ? 'Job in progress' : `${f} is working`, b.title, ''],
      done: [W ? `Waiting for ${f} to confirm` : `${f} says it’s done — confirm`, b.title, 'done'],
      confirmed: [W ? `${b.price} paid · rate ${f}` : `Rate ${f}`, 'How did it go?', 'done'],
    } as Record<string, [string, string, string]>
  )[b.state];
}
export const pctOf = (b: Booking) => ({ booked: 8, onway: 20 + Math.round(60 * (1 - b.eta / (b.eta0 || 1))), working: 85, done: 95, confirmed: 100 })[b.state];

/* =========================== reviews =========================== */
export function reviewable(id: string): { bid: string; what: string } | null {
  const b = db.BOOKINGS.find((x) => x.state === 'confirmed' && !x.reviewed && ((x.worker === 'me' && x.client === id) || (x.client === 'me' && x.worker === id)));
  if (b) return { bid: b.id, what: b.title };
  for (const bz of db.BIZ.list) {
    const k = bz.contracts.find((c) => c.person === id && c.status === 'ended' && !c.reviewed);
    if (k) return { bid: k.id, what: k.role + ' contract' };
  }
  return null;
}
export function submitReview(target: string, bid: string | null, stars: number, tags: string[], text: string) {
  (db.REVIEWS[target] = db.REVIEWS[target] || []).unshift({ stars, tags, text, name: db.user.name || 'You', photo: db.user.avatar || 'img/me', time: 'Just now' });
  const b = bid ? bk(bid) : null;
  if (b) b.reviewed = 1;
  if (bid && bid[0] === 'k') db.BIZ.list.forEach((bz) => bz.contracts.forEach((c) => c.id === bid && (c.reviewed = 1)));
  toast(`Thanks! Your review of ${first(target)} is live`);
  bump();
}

/* =========================== chat =========================== */
export function pushMsg(m: Msg, id: string) {
  const th = thread(id);
  th.msgs.push(m);
  th.time = nowT();
  bump();
}
export function markChatRead(id: string) {
  const th = THREADS()[id];
  if (th && th.unread) {
    th.unread = 0;
    bump();
  }
}
export function openThread(id: string) {
  const th = thread(id);
  th.unread = 0;
  if (th.typing && th.next) {
    later(1600, () => {
      th.typing = 0;
      th.msgs.push({ f: 'them', t: th.next || 'Okay!', at: nowT() });
      th.next = undefined;
      th.time = nowT();
    });
  }
  bump();
}
export function sendText(id: string, t: string) {
  t = t.trim();
  if (!t) return;
  pushMsg({ f: 'me', t, at: nowT(), st: 'sent' }, id);
  reply(id, t);
}
function settleReply(id: string, fn: () => void, wait = 2200) {
  const th = thread(id);
  later(700, () => {
    th.typing = 1;
  });
  later(wait, () => {
    th.typing = 0;
    th.msgs.forEach((m) => {
      if (m.f === 'me') m.st = 'read';
    });
    fn();
    th.time = nowT();
    if (ui.openChat !== id) th.unread = (th.unread || 0) + 1;
  });
}
/** The other side answers (simulated). */
export function reply(id: string, t: string) {
  const p = P(id);
  if (!p) return;
  const th = thread(id);
  const lo = (t || '').toLowerCase();
  const last = th.msgs.filter((m) => m.f === 'me').pop();
  // a price/hire request from me waiting for an answer
  if (last && last.k === 'offer' && !last.state && !p.group) {
    settleReply(
      id,
      () => {
        last.state = 'acc';
        th.job = `${last.job} · ${last.when}`;
        th.msgs.push({ sys: `Job booked · ${last.job} · ${last.when} · ${last.price}` });
        th.msgs.push({ f: 'them', t: p.client ? 'Perfect, I accept 👍 See you then!' : 'Deal 👍 I accept. See you then!', at: nowT() });
        const iHire = hiringSide(id);
        createBooking(
          iHire
            ? { worker: id, client: 'me', title: last.job!, when: last.when!, price: last.price!, area: myCity(), as: isW() ? 'regular' : 'business' }
            : { worker: 'me', client: id, title: last.job!, when: last.when!, price: last.price!, area: p.area, as: 'regular' },
        );
        if (iHire) add(db.hired, id);
        toast(`🎉 ${p.name} accepted · job booked`);
      },
      2300,
    );
    return;
  }
  if (p.group) {
    const m = db.MENTORSHIPS.find((x) => x.id === p.mentorship);
    const mem = th.members || [];
    const who = /session|when|link|slides/.test(lo) && m ? fname(mOwner(m).name) : P(mem[th.msgs.length % Math.max(1, mem.length)])?.name.split(' ')[0] || 'Member';
    const txt = /when|session/.test(lo) ? 'Thursday at 6pm on Google Meet. I’ll post the link an hour before.' : /slides/.test(lo) ? 'Yes — I’ll share them right after the session 👍' : /thank/.test(lo) ? 'Thank you too! See you next week.' : /hello|hi\b/.test(lo) ? 'Welcome! 😊' : 'Great point 👌';
    settleReply(id, () => th.msgs.push({ f: 'them', t: `${who}: ${txt}`, at: nowT() }), 2000);
    return;
  }
  if (p.client) {
    settleReply(id, () => {
      let r: string;
      if (/quote|price|cost/.test(lo)) r = 'Sounds good — send me a quote and I’ll confirm.';
      else if (/tomorrow|today|come|time|when/.test(lo)) r = 'That time works for me. Call when you reach the gate.';
      else if (/way|🛵/.test(lo)) r = 'Great, I’m home. See you soon!';
      else if (/thank/.test(lo)) r = 'Thank you too! 🙏';
      else if (/interview/.test(lo)) r = 'Thank you! Tomorrow at 10:00 works for me.';
      else r = ['Okay, noted 👍', 'Great, thanks!', 'Please confirm when you’re on the way.'][th.msgs.length % 3];
      th.msgs.push({ f: 'them', t: r, at: nowT() });
    });
    return;
  }
  settleReply(id, () => {
    const svc = (SERVICES[p.role] || SERVICES.Plumber)[0];
    if (/quote|price|cost|how much|charge/.test(lo)) {
      th.msgs.push({ f: 'them', t: `For ${svc[0].toLowerCase()} I usually charge ${svc[1]}. Here’s a quote:`, at: nowT() });
      th.msgs.push({ f: 'them', k: 'offer', job: svc[0], price: svc[1].split(' - ')[0].split(' – ')[0], when: 'Tomorrow, 10:00', dur: 'About 1–2 hours', at: nowT() });
    } else if (/when|come|time|available|today|tomorrow/.test(lo)) th.msgs.push({ f: 'them', t: 'I can come tomorrow at 10:00, or Friday afternoon. Which works better?', at: nowT() });
    else if (/thank|🙏/.test(lo)) th.msgs.push({ f: 'them', t: 'You’re welcome! 😊', at: nowT() });
    else if (/location|📍/.test(lo)) th.msgs.push({ f: 'them', t: 'Got it, I know the area. 👍', at: nowT() });
    else th.msgs.push({ f: 'them', t: ['Sounds good 👍', 'Sure, I can help with that.', 'Okay! Anything else I should know before I come?'][th.msgs.length % 3], at: nowT() });
  });
}
/** Accept or decline a quote/offer the other person sent in chat. */
export function answerOffer(id: string, i: number, st: 'acc' | 'dec') {
  const th = thread(id);
  const m = th.msgs[i];
  const o = P(id);
  m.state = st;
  if (st === 'acc') {
    th.job = `${m.job} · ${m.when}`;
    th.msgs.push({ sys: `Job booked · ${m.job} · ${m.when} · ${m.price}` });
    const iHire = hiringSide(id);
    createBooking(
      iHire
        ? { worker: id, client: 'me', title: m.job!, when: m.when!, price: m.price!, area: myCity(), as: isW() ? 'regular' : 'business' }
        : { worker: 'me', client: id, title: m.job!, when: m.when!, price: m.price!, area: o.area, as: 'regular' },
    );
    if (iHire) add(db.hired, id);
    toast(`Booked · ${m.job} · ${m.when}`);
  } else {
    th.msgs.push({ f: 'me', t: 'Thanks, but I’ll pass for now.', at: nowT(), st: 'sent' });
    toast('Quote declined');
  }
  bump();
}
export function sendQuote(id: string, job: string, price: string, whenKey: string) {
  const when = whenKey === 'This week' ? 'This week' : `${whenKey}, 10:00`;
  pushMsg({ f: 'me', k: 'offer', job: job || 'Job', price: `XAF ${(+price).toLocaleString('en-US')}`, when, dur: hiringSide(id) ? 'Price offered by you' : `${mySkill()} · ${db.user.years} yrs experience`, at: nowT(), st: 'sent' }, id);
  reply(id, 'quote');
}
export const sendLocation = (id: string) => {
  pushMsg({ f: 'me', k: 'loc', t: `📍 ${myCity().split(' · ')[0]} · ${db.PR.area.home}`, at: nowT(), st: 'sent' }, id);
  reply(id, 'location');
};
export const sendPhoto = (id: string, uri: string) => {
  pushMsg({ f: 'me', k: 'img', src: uri, at: nowT(), st: 'sent' }, id);
  reply(id, 'photo');
};
export const sendFile = (id: string, name: string, bytes: number) => {
  const kb = bytes / 1024;
  pushMsg({ f: 'me', k: 'file', name, size: kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(kb)) + ' KB', at: nowT(), st: 'sent' }, id);
  reply(id, 'file');
};
export const sendVoice = (id: string, secs: number) => {
  pushMsg({ f: 'me', k: 'voice', dur: `${Math.floor(secs / 60)}:${String(Math.max(1, secs % 60)).padStart(2, '0')}`, at: nowT(), st: 'sent' }, id);
  reply(id, 'voice');
};
export function logCall(id: string, type: 'video' | 'voice', secs: number) {
  const d = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  thread(id).msgs.push({ sys: `${type === 'video' ? 'Video' : 'Voice'} call · ${secs ? d : 'No answer'}`, call: 1, missed: !secs });
  bump();
}
export function deleteMsg(id: string, i: number, all: boolean) {
  const th = thread(id);
  if (all) th.msgs[i] = { f: 'me', t: '🚫 You deleted this message', at: th.msgs[i].at, st: 'read' };
  else th.msgs.splice(i, 1);
  toast('Message deleted');
  bump();
}
export function forwardMsg(from: string, i: number, to: string) {
  const m: Msg = { ...thread(from).msgs[i], f: 'me', at: nowT(), st: 'sent', fw: 1 };
  delete m.state;
  thread(to).msgs.push(m);
  thread(to).time = nowT();
  toast(`Forwarded to ${P(to).name}`);
  bump();
}
export function shareContact(contact: string, to: string) {
  const p = P(contact);
  thread(to).msgs.push({ f: 'me', t: `👤 ${p.name} · ${p.role} on bolo`, at: nowT(), st: 'sent' });
  thread(to).time = nowT();
  toast(`Shared with ${P(to).name}`);
  bump();
}
export function deleteChat(id: string) {
  const T = THREADS();
  const O = ORDER();
  const keep = T[id];
  const i = O.indexOf(id);
  delete T[id];
  if (i >= 0) O.splice(i, 1);
  bump();
  undoBar('Chat deleted', () => {
    T[id] = keep;
    O.splice(i, 0, id);
    bump();
  });
}
export const msgPreview = (m: Msg) => (m.k === 'voice' ? '🎤 Voice message' : m.k === 'img' ? '📷 Photo' : m.k === 'file' ? '📄 ' + m.name : m.k === 'offer' ? '💼 Quote · ' + m.job : m.k === 'loc' ? '📍 Location' : m.t || '');
export function preview(th: { msgs: Msg[]; typing?: number }, inChat: boolean): [string, string, string] {
  if (th.typing && !inChat) return ['typing', 'typing…', ''];
  let m: Msg | null = null;
  for (let i = th.msgs.length - 1; i >= 0; i--)
    if (!th.msgs[i].d) {
      m = th.msgs[i];
      break;
    }
  if (!m) return ['', 'Say hello 👋', ''];
  const me = m.f === 'me' ? 'You: ' : '';
  if (m.sys) return ['', m.sys, 'check'];
  if (m.k === 'voice') return ['', me + 'Voice message · ' + m.dur, 'mic'];
  if (m.k === 'file') return ['', me + m.name, 'file'];
  if (m.k === 'img') return ['', me + 'Photo', 'image'];
  if (m.k === 'loc') return ['', me + 'Location', 'pin'];
  if (m.k === 'offer') return ['', `${me}Quote: ${m.job} · ${m.price}`, 'money'];
  return ['', me + m.t, ''];
}

/* =========================== notifications =========================== */
export function readNotif(id: string) {
  const n = NOTIFS().find((x) => x.id === id);
  if (n && !n.read) {
    n.read = 1;
    bump();
  }
}
export function answerQuoteNotif(nid: string, st: 'acc' | 'dec') {
  const n = NOTIFS().find((x) => x.id === nid)!;
  n.state = st;
  n.read = 1;
  const who = n.who as string;
  const th = thread(who);
  const o = th.msgs.find((m) => m.k === 'offer' && !m.state);
  if (st === 'acc') {
    add(db.hired, who);
    if (o) o.state = 'acc';
    th.msgs.push({ sys: `Job booked · ${n.job} · ${n.when}` });
    th.job = `${n.job} · ${n.when}`;
    createBooking({ worker: who, client: 'me', title: n.job!, when: n.when!, price: n.price!, area: myCity(), as: isW() ? 'regular' : 'business' });
    toast(`Booked ${P(who).name} for ${n.when}`);
  } else {
    if (o) o.state = 'dec';
    toast('Quote declined');
  }
  bump();
}
export function markAllRead() {
  NOTIFS().forEach((n) => (n.read = 1));
  toast('All notifications marked as read');
  bump();
}
export function removeNotif(id: string) {
  const L = NOTIFS();
  const i = L.findIndex((n) => n.id === id);
  if (i < 0) return;
  const n = L.splice(i, 1)[0];
  bump();
  undoBar('Notification removed', () => {
    L.splice(i, 0, n);
    bump();
  });
}
export function deleteNotifs(ids: string[]) {
  const L = NOTIFS();
  for (let i = L.length - 1; i >= 0; i--) if (ids.includes(L[i].id)) L.splice(i, 1);
  toast(`${ids.length} notification${ids.length > 1 ? 's' : ''} deleted`);
  bump();
}
export const NT_TABS: Record<string, (n: Notif) => boolean> = {
  All: () => true,
  Jobs: (n) => ['quote', 'accept', 'reminder', 'offers', 'payment', 'newjob', 'payment_in', 'newoffer', 'onway', 'arrived', 'jobdone'].includes(n.type),
  Mentions: (n) => ['mention', 'review'].includes(n.type),
};
export { xaf, budgetNum };
