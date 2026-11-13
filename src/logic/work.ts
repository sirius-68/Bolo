/* Jobs, offers, bookings, chats and notifications, on real accounts.
   Each action writes to the server; the local model is updated at once and then corrected by what the server
   sends back (see server.ts). Nothing here pretends to be the other person. */
import { db, ui, Booking, Msg, Post, Notif, CvFile } from '../data/db';
import { STAGES } from '../data/catalog';
import { toast, undoBar } from '../ui/overlay';
import { supabase } from '../lib/supabase';
import { bump } from './live';
import { notify } from './notify';
import { P, isW, thread, nowT, fname, first, xaf, budgetNum, mySkill, cityLabel, THREADS, ORDER, NOTIFS, curBiz, postById, add, toggle, has, dayText } from './core';
import { friendly } from './remote';
import {
  R, L, SAVE_KIND, convFor, deleteNotifRows, markRead, markReviewed, refreshBooking, refreshBookings, refreshChats, refreshMine, refreshPosts, sendMessage, setNotifRead, uploadChatFile, uuid, convOfKey, rawMessage, membersOf, retryMessage } from './server';
import { startSharing, stopSharing } from './tracking';

const fail = (e: any) => toast(friendly(e));
const inboxNow = (): 'W' | 'C' => (isW() ? 'W' : 'C');

/* =========================== saves & follows =========================== */
type SaveList = 'savedJobs' | 'saved' | 'savedPosts' | 'savedOpps' | 'savedCourses' | 'savedCos' | 'savedMentors';
async function saveRemote(list: SaveList, id: string, on: boolean) {
  const target = list === 'saved' ? R(id) : id;
  if (!target) return;
  const kind = SAVE_KIND[list];
  const q = on ? supabase.from('saves').insert({ kind, target_id: target }) : supabase.from('saves').delete().eq('user_id', db.uid!).eq('kind', kind).eq('target_id', target);
  const { error } = await q;
  if (error && !/duplicate/i.test(error.message)) {
    toggle(db[list] as string[], id);
    bump();
    fail(error);
  }
}
export function toggleSave(id: string) {
  const on = toggle(db.saved, id);
  toast(on ? `${P(id).name} saved` : 'Removed from saved');
  bump();
  void saveRemote('saved', id, on);
}
export function saveToggle(list: SaveList, id: string, label: string) {
  const on = toggle(db[list] as string[], id);
  toast(on ? `${label} saved` : 'Removed from saved');
  bump();
  void saveRemote(list, id, on);
}
export const isSaved = (list: SaveList, id: string) => has(db[list] as string[], id);
export function follow(id: string) {
  const on = toggle(db.followed, id);
  toast(on ? `Following ${P(id).name}` : `Unfollowed ${P(id).name}`);
  const p = db.P[id];
  if (p) p.followers = Math.max(0, (p.followers || 0) + (on ? 1 : -1));
  bump();
  (async () => {
    // a business page is followed by saving it; a person with a real follow
    if (id.startsWith('b_')) {
      toggle(db.savedCos, id);
      return saveRemote('savedCos', id, on);
    }
    const uid = R(id);
    const { error } = on ? await supabase.from('follows').insert({ followee_id: uid }) : await supabase.from('follows').delete().eq('follower_id', db.uid!).eq('followee_id', uid);
    if (error && !/duplicate/i.test(error.message)) {
      toggle(db.followed, id);
      bump();
      fail(error);
    }
  })();
}
export function likePost(id: string) {
  const on = toggle(db.liked, id);
  const po = postById(id);
  if (po) po.likes = Math.max(0, (po.likes || 0) + (on ? 1 : -1));
  bump();
  (async () => {
    const { error } = on ? await supabase.from('post_likes').insert({ post_id: id }) : await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', db.uid!);
    if (error && !/duplicate/i.test(error.message)) {
      toggle(db.liked, id);
      if (po) po.likes = Math.max(0, (po.likes || 0) + (on ? -1 : 1));
      bump();
      fail(error);
    }
  })();
}
export function likeReel(i: number) {
  toggle(db.reelLiked, i);
  bump();
}

/* =========================== hiring a person directly =========================== */
/** My position to send with a hire request, so the worker can find the place. */
const myPlace = () => (db.user.coord ? { lng: db.user.coord[0], lat: db.user.coord[1] } : {});
/** Sends a priced job request to a person in chat; when they accept, the job is booked. */
export function sendHireRequest(id: string, job: string, price: string, whenKey: string) {
  const when = dayText(whenKey);
  add(db.hired, id); // shows as "Requested" until they answer
  bump();
  sendMessage(id, inboxNow(), 'offer', '', { job, price, when, dur: 'Hire request', worker: 'recipient', area: [db.PR.area.home, cityLabel()].filter(Boolean).join(', '), ...myPlace() })
    .then(() => toast(`Request sent to ${P(id).name}`))
    .catch((e) => {
      db.hired = db.hired.filter((x) => x !== id);
      bump();
      fail(e);
    });
}
export const hireState = (id: string): 'none' | 'requested' | 'booked' => {
  if (db.BOOKINGS.some((b) => b.worker === id && b.client === 'me' && b.state !== 'confirmed')) return 'booked';
  const th = THREADS()[id];
  return th?.msgs.some((m) => m.k === 'offer' && m.f === 'me' && !m.state && m.wk === 'them') ? 'requested' : 'none';
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
/** Upload photos picked on the phone to the public post-photo folder; returns 'uri:https://…' pictures. */
export async function uploadPostPhotos(photos: string[]): Promise<string[]> {
  const { File } = require('expo-file-system');
  const out: string[] = [];
  for (const ph of photos) {
    if (!ph.startsWith('uri:') || ph.startsWith('uri:http')) {
      out.push(ph);
      continue;
    }
    try {
      const bytes = await new File(ph.slice(4)).bytes();
      const path = `${db.uid}/${uuid()}.jpg`;
      const { error } = await supabase.storage.from('job-photos').upload(path, bytes, { contentType: 'image/jpeg' });
      if (error) throw error;
      out.push('uri:' + supabase.storage.from('job-photos').getPublicUrl(path).data.publicUrl);
    } catch {
      toast('A photo couldn’t be uploaded and was left out');
    }
  }
  return out;
}
export function postJob(f: JobForm): Post {
  const w = isW();
  const b = f.budget.replace(/[^\d]/g, '');
  const biz = w ? null : curBiz();
  const job: Post = {
    id: 'tmp_' + uuid(),
    kind: 'request',
    client: 'me',
    mine: 1,
    cat: f.cat,
    title: f.title.trim(),
    text: f.text.trim(),
    budget: b ? `XAF ${(+b).toLocaleString('en-US')}${f.neg ? ' · negotiable' : ''}${!w ? ' / month' : ''}` : w ? 'Open to offers' : 'Salary negotiable',
    when: f.when === 'Flexible' ? 'Flexible' : dayText(f.when, f.time),
    area: f.area,
    type: f.type,
    as: w ? 'regular' : 'business',
    biz: w ? null : db.BIZ.active,
    openings: w ? 1 : f.openings || 1,
    time: 'now',
    at: Date.now(),
    photos: [...f.photos],
    urgent: f.urgent,
    offerList: [],
    status: 'open',
  };
  db.POSTS.unshift(job);
  if (!w) bizLog('job', `Posted vacancy <b>${job.title}</b>`);
  bump();
  (async () => {
    try {
      if (!w && !biz?.remoteId) throw new Error('Your business page is still saving. Try again in a moment.');
      const photos = await uploadPostPhotos(job.photos || []);
      const { data, error } = await supabase
        .from('posts')
        .insert({
          author_id: db.uid,
          business_id: biz?.remoteId || null,
          kind: 'request',
          title: job.title,
          body: job.text,
          cat: job.cat,
          area: job.area,
          urgent: !!job.urgent,
          budget_num: +b || 0,
          photos: photos.map((p) => p.replace(/^uri:/, '')),
          data: { budget: job.budget, when: job.when, type: job.type, openings: job.openings },
          location: db.user.coord ? `POINT(${db.user.coord[0]} ${db.user.coord[1]})` : null,
        })
        .select('id')
        .single();
      if (error) throw error;
      (job as any).tmp = job.id;
      job.id = data.id;
      job.photos = photos;
      bump();
    } catch (e) {
      db.POSTS = db.POSTS.filter((p) => p !== job);
      bump();
      fail(e);
    }
  })();
  return job;
}
/** Share a work post, an update or my free slots. Shown at once; photos upload in the background. */
export function createPost(p: { kind: 'photo' | 'text' | 'avail'; text: string; src?: string; tags?: string[]; job?: string; slots?: string[] }) {
  const w = isW();
  const biz = w ? null : curBiz();
  const po: Post = { id: 'tmp_' + uuid(), by: 'me', kind: p.kind, text: p.text, src: p.src, photos: p.src ? [p.src] : [], tags: p.tags, job: p.job, slots: p.slots, time: 'now', at: Date.now(), likes: 0, comments: 0, mine: 1, as: w ? 'regular' : 'business', biz: w ? null : db.BIZ.active };
  db.POSTS.unshift(po);
  bump();
  (async () => {
    try {
      if (biz && !biz.remoteId) throw new Error('Your business page is still saving. Try again in a moment.');
      const photos = p.src ? await uploadPostPhotos([p.src]) : [];
      const { data, error } = await supabase
        .from('posts')
        .insert({ author_id: db.uid, business_id: biz?.remoteId || null, kind: p.kind, body: p.text, photos: photos.map((x) => x.replace(/^uri:/, '')), cat: w ? mySkill() : null, area: cityLabel(), data: { tags: p.tags || [], job: p.job, slots: p.slots } })
        .select('id')
        .single();
      if (error) throw error;
      (po as any).tmp = po.id;
      po.id = data.id;
      if (photos[0]) po.src = photos[0];
      bump();
    } catch (e) {
      db.POSTS = db.POSTS.filter((x) => x !== po);
      bump();
      fail(e);
    }
  })();
  return po;
}
export function deletePost(id: string) {
  const i = db.POSTS.findIndex((p) => p.id === id && p.mine);
  if (i < 0) return;
  const [po] = db.POSTS.splice(i, 1);
  toast('Post deleted');
  bump();
  supabase
    .from('posts')
    .delete()
    .eq('id', id)
    .then(({ error }) => {
      if (!error) return;
      db.POSTS.splice(i, 0, po);
      bump();
      fail(error);
    });
}
export function closeJob(id: string) {
  const i = db.POSTS.findIndex((p) => p.id === id);
  if (i < 0) return;
  const po = db.POSTS.splice(i, 1)[0];
  toast('Job closed');
  bump();
  supabase
    .from('posts')
    .update({ status: 'closed' })
    .eq('id', id)
    .then(({ error }) => {
      if (error) {
        db.POSTS.splice(i, 0, po);
        bump();
        fail(error);
      }
    });
}

/** What the server keeps about an attached CV (never the phone's own file path). */
const cvStored = (cv: CvFile | null) => (cv ? { name: cv.name, kb: cv.kb, src: cv.src || 'file' } : null);

/* =========================== offers (Regular finds work) =========================== */
export function sendOffer(id: string, price: string, whenKey: string, msg: string, cv: CvFile | null) {
  const po = postById(id)!;
  const p = `XAF ${(+price).toLocaleString('en-US')}`;
  const when = dayText(whenKey);
  db.myOffers[id] = { price: p, when, state: 'sent', cv };
  bump();
  (async () => {
    const { data, error } = await supabase.from('applications').insert({ post_id: id, price: p, when_text: when, msg: msg.trim(), cv: cvStored(cv) }).select('id').single();
    if (error) {
      delete db.myOffers[id];
      bump();
      return fail(error);
    }
    db.myOffers[id].id = data.id;
    toast(`Offer sent to ${P(po.client!).name}`);
    // the conversation about this job, with the offer in it, so you can talk it through
    try {
      await sendMessage(po.client!, 'W', 'text', `Hi! I sent an offer on “${po.title}”: ${p}, ${when}.${msg.trim() ? ' ' + msg.trim() : ''}`);
      if (cv?.uri) await sendFile(po.client!, cv.name, cv.kb * 1024, cv.uri, cv.mime);
    } catch {}
  })();
}
export function withdrawOffer(id: string) {
  const o = db.myOffers[id];
  delete db.myOffers[id];
  toast('Offer withdrawn');
  bump();
  if (o?.id) supabase.from('applications').update({ stage: 'withdrawn' }).eq('id', o.id).then(({ error }) => error && fail(error));
}
/** Regular user hires someone who made an offer on their job. */
export function acceptOffer(jobId: string, i: number) {
  const po = postById(jobId)!;
  const o = po.offerList![i];
  if (!o.id) return toast('Please wait a moment and try again');
  po.booked = o.by;
  add(db.hired, o.by);
  bump();
  (async () => {
    const { data, error } = await supabase.rpc('accept_application', { p_application: o.id });
    if (error) {
      po.booked = undefined;
      db.hired = db.hired.filter((x) => x !== o.by);
      bump();
      return fail(error);
    }
    toast(`You hired ${P(o.by).name} for ${o.when}`);
    await Promise.all([refreshBooking(data as string), refreshChats(), refreshPosts()]);
  })();
}

/* =========================== applications (vacancies) =========================== */
export function applyVac(id: string, msg: string, cv: CvFile | null) {
  const po = postById(id)!;
  db.myOffers[id] = { price: po.budget!, when: po.type!, state: 'sent', app: 1, stage: 'Application sent' + (db.user.pro.regular ? ' · priority' : ''), cv };
  bump();
  (async () => {
    const { data, error } = await supabase.from('applications').insert({ post_id: id, price: po.budget || '', when_text: po.type || '', msg: msg.trim(), cv: cvStored(cv) }).select('id').single();
    if (error) {
      delete db.myOffers[id];
      bump();
      return fail(error);
    }
    db.myOffers[id].id = data.id;
    toast(`Application sent to ${P(po.client!).name}`);
    try {
      if (msg.trim()) await sendMessage(po.client!, 'W', 'text', msg.trim());
      // a CV file picked on the phone travels as a file in the chat with the employer
      if (cv?.uri) await sendFile(po.client!, cv.name, cv.kb * 1024, cv.uri, cv.mime);
    } catch {}
  })();
}
export function withdrawApplication(id: string) {
  withdrawOffer(id);
}
async function setStageRemote(appId: string | undefined, stage: string) {
  if (!appId) return;
  const { error } = await supabase.from('applications').update({ stage }).eq('id', appId);
  if (error) fail(error);
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
    sendMessage(o.by, inboxNow(), 'text', `Hello ${first(o.by)}, we’d like to invite you to an interview for “${po.title}”. When are you free?`).catch(fail);
    bizLog('calcheck', `Interview invite sent to <b>${P(o.by).name}</b> for <b>${po.title}</b>`);
  }
  bump();
  void setStageRemote(o.id, st);
}
export function declineApp(jobId: string, i: number) {
  const po = postById(jobId)!;
  const o = po.offerList!.splice(i, 1)[0];
  toast(`${P(o.by).name} declined. We’ll let them know kindly`);
  bump();
  void setStageRemote(o.id, 'declined');
}
export const stageLabel = (k: string) => STAGES.find((s) => s[0] === k)?.[1] || 'Applied';

/* =========================== company contracts =========================== */
export type ContractDraft = { pid: string; i: number; person: string; role: string; pay: string; start: string; dur: string; prob: string; hours: string; terms: string };
/** Sends the job offer (contract terms) to the candidate in chat. They answer there; you mark them hired when they accept. */
export function sendContract(c: ContractDraft) {
  const b = curBiz()!;
  const po = postById(c.pid)!;
  const o = po.offerList![c.i];
  const id = uuid();
  const start = (() => {
    const d = new Date(c.start);
    return isNaN(+d) ? c.start : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  })();
  b.contracts.unshift({ id, person: c.person, role: c.role, pay: c.pay, start, dur: c.dur, prob: c.prob, hours: c.hours, terms: c.terms, status: 'sent', vac: po.id });
  o.stage = 'offer';
  bizLog('file', `Job offer sent to <b>${P(c.person).name}</b> · ${c.role}`);
  toast(`Job offer sent to ${P(c.person).name}`);
  bump();
  void setStageRemote(o.id, 'offer');
  const lines = [`📄 Job offer from ${b.name}: ${c.role}`, `Pay: ${c.pay}`, `Start: ${start}`, c.dur ? `Length: ${c.dur}` : '', c.prob ? `Probation: ${c.prob}` : '', c.hours ? `Hours: ${c.hours}` : '', c.terms ? `Terms: ${c.terms}` : '', 'Please reply here to accept.'].filter(Boolean);
  sendMessage(c.person, 'C', 'text', lines.join('\n')).catch(fail);
}
/** The candidate accepted the offer (in chat): they join the team. */
export function markSigned(id: string) {
  const b = curBiz()!;
  const k = b.contracts.find((x) => x.id === id);
  if (!k) return;
  k.status = 'active';
  add(b.team, k.person);
  const po = postById(k.vac);
  const o = po?.offerList?.find((x) => x.by === k.person);
  if (o) {
    o.stage = 'hired';
    void setStageRemote(o.id, 'hired');
  }
  b.events.unshift({ icon: 'checkc', text: `<b>${P(k.person).name}</b> accepted the offer and joined your team`, at: nowT() });
  toast(`${P(k.person).name} is on your team`);
  bump();
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
async function step(b: Booking, state: Booking['state'] | 'cancelled', eta?: number) {
  const before = { state: b.state, log: { ...b.log } };
  if (state !== 'cancelled') {
    b.state = state;
    b.log[state] = nowT();
  }
  bump();
  const { error } = await supabase.rpc('booking_step', { p_booking: b.id, p_state: state, p_eta: eta ?? null });
  if (error) {
    b.state = before.state;
    b.log = before.log;
    bump();
    fail(error);
    return false;
  }
  return true;
}
/** Worker: I'm leaving now. Shares my position with the client until I arrive. */
export async function wStart(id: string) {
  const b = bk(id)!;
  const eta = await startSharing(b);
  if (eta === false) return;
  b.eta = b.eta0 = eta ?? 0;
  if (await step(b, 'onway', eta ?? undefined)) toast(`${fname(P(b.client).name)} can follow you on the map`);
  else stopSharing();
}
export async function wArrive(id: string) {
  const b = bk(id)!;
  stopSharing();
  b.eta = 0;
  if (await step(b, 'working')) toast('Job started, good luck!');
}
export async function wDone(id: string) {
  const b = bk(id)!;
  if (await step(b, 'done')) toast(`${fname(P(b.client).name)} has been asked to confirm`);
}
export function confirmDone(id: string) {
  const b = bk(id);
  if (!b || b.state !== 'done') return false;
  step(b, 'confirmed').then((ok) => ok && toast(`Thanks! ${fname(P(b.worker).name)} has been told`));
  return true;
}
export function reportIssue(id: string) {
  const b = bk(id)!;
  step(b, 'working').then((ok) => ok && toast(`We’ve told ${fname(P(b.worker).name)} something isn’t right`));
}
export async function cancelBooking(id: string) {
  const b = bk(id);
  if (!b) return;
  if (b.worker === 'me') stopSharing();
  if (await step(b, 'cancelled')) {
    db.BOOKINGS = db.BOOKINGS.filter((x) => x.id !== id);
    db.hired = db.hired.filter((x) => x !== b.worker);
    toast('Booking cancelled');
    bump();
  }
}
/** No simulations any more: after a restart, keep sharing my position if I'm on the way. */
export function resumeSims() {
  const b = db.BOOKINGS.find((x) => x.worker === 'me' && x.state === 'onway');
  if (b) void startSharing(b, true);
}
export function liveInfo(b: Booking): [string, string, string] {
  const f = fname(P(trOther(b)).name);
  const W = b.worker === 'me';
  return (
    {
      booked: [W ? `Job with ${f} · ${b.when}` : `${f} starts ${b.when}`, b.title, 'sched'],
      onway: [W ? `On your way to ${f}` : `${f} is on the way`, `${b.eta ? b.eta + ' min away · ' : ''}${b.title}`, ''],
      working: [W ? 'Job in progress' : `${f} is working`, b.title, ''],
      done: [W ? `Waiting for ${f} to confirm` : `${f} says it’s done, confirm`, b.title, 'done'],
      confirmed: [W ? `Job done · rate ${f}` : `Rate ${f}`, 'How did it go?', 'done'],
    } as Record<string, [string, string, string]>
  )[b.state];
}
export const pctOf = (b: Booking) => ({ booked: 8, onway: 20 + Math.round(60 * (b.eta0 ? 1 - b.eta / b.eta0 : 0)), working: 85, done: 95, confirmed: 100 })[b.state];

/* =========================== reviews =========================== */
export function reviewable(id: string): { bid: string; what: string } | null {
  const b = db.BOOKINGS.find((x) => x.state === 'confirmed' && !x.reviewed && ((x.worker === 'me' && x.client === id) || (x.client === 'me' && x.worker === id)));
  if (b) return { bid: b.id, what: b.title };
  return null;
}
export function submitReview(target: string, bid: string | null, stars: number, tags: string[], text: string) {
  const b = bid ? bk(bid) : null;
  if (!b) return toast('You can review someone after a job with them is confirmed');
  (db.REVIEWS[target] = db.REVIEWS[target] || []).unshift({ stars, tags, text, name: db.user.name || 'You', photo: db.user.avatar || 'img/me', time: 'now' });
  b.reviewed = 1;
  markReviewed(b.id);
  bump();
  (async () => {
    const { error } = await supabase.from('reviews').insert({ booking_id: b.id, reviewee_id: R(target), stars, tags, body: text.trim(), what: b.title });
    if (error) {
      b.reviewed = undefined;
      db.REVIEWS[target] = (db.REVIEWS[target] || []).slice(1);
      bump();
      return fail(error);
    }
    toast(`Thanks! Your review of ${first(target)} is live`);
  })();
}

/* =========================== chat =========================== */
export function markChatRead(id: string) {
  const th = THREADS()[id];
  if (!th) return;
  readChatNotif(id);
  if (th.cid) markRead(th.cid);
  if (th.unread) {
    th.unread = 0;
    bump();
  }
}
export function openThread(id: string) {
  thread(id);
  markChatRead(id);
  bump();
}
/** Sends a text. Resolves to false only when it could not even be put in the chat (so the caller can give the text back). */
export async function sendText(id: string, t: string): Promise<boolean> {
  t = t.trim();
  if (!t) return true;
  try {
    await sendMessage(id, inboxNow(), 'text', t);
    return true;
  } catch (e: any) {
    if (e?.kept) toast('Not sent. Tap the message to try again');
    else fail(e);
    return !!e?.kept;
  }
}
export function retryText(id: string, mid: string) {
  const cid = THREADS()[id]?.cid;
  if (cid) retryMessage(cid, mid).catch(() => toast('Still not sent. Check your connection and try again'));
}
/** Opening a chat clears its message notification. */
export function readChatNotif(id: string) {
  const cid = THREADS()[id]?.cid;
  if (!cid) return;
  const key = 'msg:' + cid;
  [db.NOTIFS_W, db.NOTIFS_C].forEach((N) => N.forEach((n) => n.key === key && (n.read = 1)));
}
/** Accept or decline a quote/offer the other person sent in chat. */
export function answerOffer(id: string, i: number, st: 'acc' | 'dec') {
  const th = thread(id);
  const m = th.msgs[i];
  if (!m?.id) return;
  m.state = st;
  bump();
  (async () => {
    const { data, error } = await supabase.rpc('answer_offer', { p_message: m.id, p_accept: st === 'acc' });
    if (error) {
      m.state = undefined;
      bump();
      return fail(error);
    }
    if (st === 'acc') {
      if (m.wk === 'them') add(db.hired, id);
      toast(`Booked · ${m.job} · ${m.when}`);
      if (data) await refreshBooking(data as string);
    } else toast('Declined');
    bump();
  })();
}
export function sendQuote(id: string, job: string, price: string, whenKey: string, as?: 'worker' | 'client') {
  const when = dayText(whenKey);
  const hiring = as ? as === 'client' : hiringIn(id);
  sendMessage(id, inboxNow(), 'offer', '', {
    job: job || 'Job',
    price: `XAF ${(+price).toLocaleString('en-US')}`,
    when,
    dur: hiring ? 'Price offered by you' : `${mySkill()} · ${db.user.years} yrs experience`,
    worker: hiring ? 'recipient' : 'sender',
    area: [db.PR.area.home, cityLabel()].filter(Boolean).join(', '),
    ...(hiring ? myPlace() : {}),
  }).catch(fail);
}
/** In this chat, am I the one hiring? Decided from what we did: their job I offered on, my job they offered on, an open booking. */
export function hiringIn(id: string) {
  if (!isW()) return true;
  const p = P(id);
  if (p?.biz) return false;
  const b = db.BOOKINGS.find((x) => x.state !== 'confirmed' && (x.worker === id || x.client === id));
  if (b) return b.client === 'me';
  if (db.POSTS.some((po) => po.client === id && db.myOffers[po.id])) return false;
  if (db.POSTS.some((po) => po.mine && (po.offerList || []).some((o) => o.by === id))) return true;
  if (p?.client) return false;
  return true;
}
export async function sendLocation(id: string) {
  const { locate } = require('./here');
  const c = (await locate(true)) as [number, number] | null;
  const label = [db.PR.area.home, cityLabel()].filter(Boolean).join(' · ') || 'My location';
  sendMessage(id, inboxNow(), 'loc', `📍 ${label}`, c ? { lng: c[0], lat: c[1] } : {}).catch(fail);
}
export async function sendPhoto(id: string, uri: string) {
  try {
    const cid = await convFor(id, inboxNow());
    const local = uri.startsWith('uri:') ? uri.slice(4) : uri;
    const { path, url } = await uploadChatFile(cid, local, 'jpg', 'image/jpeg');
    await sendMessage(id, inboxNow(), 'img', '', { path, url });
  } catch (e) {
    fail(e);
  }
}
export async function sendFile(id: string, name: string, bytes: number, uri?: string, mime?: string) {
  const kb = bytes / 1024;
  const size = kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(kb)) + ' KB';
  try {
    if (!uri) throw new Error('Pick the file again');
    if (bytes > 20 * 1024 * 1024) throw new Error('Files up to 20 MB can be sent');
    const cid = await convFor(id, inboxNow());
    const ext = (name.split('.').pop() || 'bin').slice(0, 5).toLowerCase();
    const { path, url } = await uploadChatFile(cid, uri, ext, mime || 'application/octet-stream');
    await sendMessage(id, inboxNow(), 'file', '', { path, url, name, size });
  } catch (e) {
    fail(e);
  }
}
export function deleteMsg(id: string, i: number, all: boolean) {
  const th = thread(id);
  const m = th.msgs[i];
  if (all && m?.id) {
    th.msgs[i] = { ...m, t: '🚫 You deleted this message', k: undefined };
    supabase.from('messages').update({ kind: 'deleted' }).eq('id', m.id).then(({ error }) => error && fail(error));
  } else th.msgs.splice(i, 1);
  toast('Message deleted');
  bump();
}
export function forwardMsg(from: string, i: number, to: string) {
  const m = thread(from).msgs[i];
  if (!m) return;
  const cid = THREADS()[from]?.cid;
  const raw = cid && m.id ? rawMessage(cid, m.id) : null;
  const kind = raw && ['text', 'img', 'file', 'loc'].includes(raw.kind) ? raw.kind : 'text';
  const body = kind === 'text' ? (raw?.body ?? m.t ?? '') : raw?.body || '';
  const data = { ...(raw?.data || {}), fw: 1 };
  delete (data as any).url;
  sendMessage(to, inboxNow(), kind, body, data)
    .then(() => toast(`Forwarded to ${P(to).name}`))
    .catch(fail);
}
export function shareContact(contact: string, to: string) {
  const p = P(contact);
  sendMessage(to, inboxNow(), 'text', `👤 ${p.name} · ${p.role} on bolo`)
    .then(() => toast(`Shared with ${P(to).name}`))
    .catch(fail);
}
/** Hides the chat on this phone; it comes back if a new message arrives. */
export function deleteChat(id: string) {
  const T = THREADS();
  const O = ORDER();
  const keep = T[id];
  const i = O.indexOf(id);
  const cid = keep?.cid;
  delete T[id];
  if (i >= 0) O.splice(i, 1);
  if (cid) db.HIDDEN[cid] = Date.now();
  bump();
  undoBar('Chat deleted', () => {
    T[id] = keep;
    O.splice(i, 0, id);
    if (cid) delete db.HIDDEN[cid];
    bump();
  });
}
export function muteChat(id: string, on: boolean) {
  const th = THREADS()[id];
  if (!th) return;
  th.muted = on ? 1 : undefined;
  bump();
  if (th.cid) supabase.from('conversation_members').update({ muted: on }).eq('conversation_id', th.cid).eq('user_id', db.uid!).then(({ error }) => error && fail(error));
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
/** Read receipts for a chat: who has read up to when. */
export const readersOf = (id: string) => {
  const cid = THREADS()[id]?.cid;
  return cid ? membersOf(cid).filter((m: any) => m.user_id !== db.uid) : [];
};

/* =========================== safety: report and block =========================== */
export const REPORT_REASONS: [string, string][] = [
  ['scam', 'Scam or fraud'],
  ['spam', 'Spam'],
  ['fake', 'Fake profile or listing'],
  ['harassment', 'Harassment or hate'],
  ['inappropriate', 'Inappropriate content'],
  ['other', 'Something else'],
];
/** Send a report to bolo's moderators (once per item). */
export async function report(targetType: string, targetId: string, reason: string, details = '') {
  const id = targetType === 'profile' ? R(targetId) || targetId : targetId;
  const { error } = await supabase.from('reports').insert({ target_type: targetType, target_id: id, reason, details: details.trim() || null });
  if (error && /duplicate|unique/i.test(error.message)) return toast('You already reported this. Our team is on it');
  if (error) return fail(error);
  toast('Thanks. Our team will check it');
}
/** Block someone: their posts disappear and they can't message you or comment on your posts. */
export function blockPerson(id: string) {
  const uid = R(id);
  if (!uid) return;
  const { setBlocked } = require('./server');
  setBlocked(id, true);
  db.POSTS = db.POSTS.filter((p) => p.by !== id && p.client !== id);
  db.followed = db.followed.filter((x) => x !== id);
  toast(`${P(id)?.name || 'They'} won’t be able to contact you`);
  bump();
  (async () => {
    const { error } = await supabase.from('blocks').insert({ blocked_id: uid });
    if (error && !/duplicate/i.test(error.message)) return fail(error);
    await supabase.from('follows').delete().eq('follower_id', db.uid!).eq('followee_id', uid);
  })();
}
export function unblockPerson(id: string) {
  const uid = R(id);
  const { setBlocked } = require('./server');
  setBlocked(id, false);
  bump();
  supabase.from('blocks').delete().eq('blocker_id', db.uid!).eq('blocked_id', uid).then(({ error }) => (error ? fail(error) : (toast('Unblocked'), refreshPosts())));
}

/* =========================== notifications =========================== */
export function readNotif(id: string) {
  const n = NOTIFS().find((x) => x.id === id);
  if (n && !n.read) {
    n.read = 1;
    bump();
    void setNotifRead([id]);
  }
}
/** Old quote notifications: answering opens the chat, where the quote is. */
export function answerQuoteNotif(nid: string, _st: 'acc' | 'dec') {
  const n = NOTIFS().find((x) => x.id === nid);
  if (n) readNotif(nid);
}
export function markAllRead() {
  const ids = NOTIFS()
    .filter((n) => !n.read)
    .map((n) => n.id);
  NOTIFS().forEach((n) => (n.read = 1));
  toast('All notifications marked as read');
  bump();
  void setNotifRead(ids);
}
export function removeNotif(id: string) {
  const L0 = NOTIFS();
  const i = L0.findIndex((n) => n.id === id);
  if (i < 0) return;
  const n = L0.splice(i, 1)[0];
  bump();
  let undone = false;
  undoBar('Notification removed', () => {
    undone = true;
    L0.splice(i, 0, n);
    bump();
  });
  setTimeout(() => !undone && deleteNotifRows([id]), 5000);
}
export function deleteNotifs(ids: string[]) {
  const L0 = NOTIFS();
  for (let i = L0.length - 1; i >= 0; i--) if (ids.includes(L0[i].id)) L0.splice(i, 1);
  toast(`${ids.length} notification${ids.length > 1 ? 's' : ''} deleted`);
  bump();
  void deleteNotifRows(ids);
}
export const NT_TABS: Record<string, (n: Notif) => boolean> = {
  All: () => true,
  Jobs: (n) => ['quote', 'accept', 'reminder', 'offers', 'payment', 'newjob', 'payment_in', 'newoffer', 'onway', 'arrived', 'jobdone'].includes(n.type),
  Learning: (n) => ['enrol', 'course', 'newcourse', 'material', 'live', 'mentor', 'rating'].includes(n.type) || n.cat === 'learning' || n.cat === 'mentorship',
  Mentions: (n) => ['mention', 'review', 'comment'].includes(n.type),
};
export { xaf, budgetNum, notify, ui, refreshBookings, refreshMine, L };
