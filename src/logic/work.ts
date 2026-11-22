/* Jobs, offers, bookings, chats and notifications, on real accounts.
   Each action writes to the server; the local model is updated at once and then corrected by what the server
   sends back (see server.ts). Nothing here pretends to be the other person. */
import { db, Booking, Msg, Post, Notif, CvFile } from '../data/db';
import { STAGES } from '../data/catalog';
import { toast, undoBar } from '../g/notice';
import { supabase } from '../lib/supabase';
import { bump } from './live';
import { P, isW, thread, nowT, fname, first, mySkill, cityLabel, THREADS, ORDER, NOTIFS, curBiz, postById, add, toggle, dayText } from './core';
import { friendly } from './remote';
import { R, SAVE_KIND, convFor, deleteNotifRows, markRead, markReviewed, refreshBooking, refreshChats, refreshPosts, sendMessage, setNotifRead, uploadChatFile, uuid, rawMessage, retryMessage } from './server';
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
  /** where the job is [lng, lat] when a city was chosen; null = no place (remote); undefined = where I am */
  at?: [number, number] | null;
};
/** The map position saved with a job. */
const jobPoint = (f: JobForm) => {
  const c = f.at === undefined ? (/remote|online/i.test(f.area) ? null : db.user.coord) : f.at;
  return c ? `POINT(${c[0]} ${c[1]})` : null;
};
/** Upload photos picked on the phone to the public post-photo folder; returns 'uri:https://…' pictures. */
/** Things I removed in this session: a list reloaded a moment later must not bring them back. */
export const GONE = new Set<string>();
/** Remove something I posted (a work photo, a request). Gone at once; put back, with a word, if the server refuses. */
export async function removePost(id: string): Promise<boolean> {
  const po = db.POSTS.find((p) => p.id === id);
  GONE.add(id);
  if (po && (po as any).tmp) GONE.add((po as any).tmp);
  db.POSTS = db.POSTS.filter((p) => p.id !== id);
  bump();
  if (id.startsWith('tmp_')) return true; // still on its way up: createPost sees it is gone and stops
  try {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) throw error;
    // the picture file too, when it is mine (best effort)
    const url = String(po?.src || po?.photos?.[0] || '').replace(/^uri:/, '');
    const m = url.match(/\/job-photos\/(.+)$/);
    if (m && m[1].startsWith(db.uid + '/')) void supabase.storage.from('job-photos').remove([decodeURIComponent(m[1].split('?')[0])]);
    return true;
  } catch (e) {
    GONE.delete(id);
    if (po && !db.POSTS.includes(po)) db.POSTS.unshift(po);
    bump();
    fail(e);
    return false;
  }
}
export async function uploadPostPhotos(photos: string[], quiet = false): Promise<string[]> {
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
      if (!quiet) toast('A photo couldn’t be uploaded and was left out');
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
    coord: f.at === undefined ? (/remote|online/i.test(f.area) ? undefined : db.user.coord || undefined) : f.at || undefined,
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
          location: jobPoint(f),
        })
        .select('id')
        .single();
      if (error) throw error;
      (job as any).tmp = job.id;
      job.id = data.id;
      job.photos = photos;
      // the list may have been reloaded meanwhile: this request stays in it, once
      db.POSTS = [job, ...db.POSTS.filter((p) => p !== job && p.id !== data.id)].sort((a, b) => (b.at || 0) - (a.at || 0));
      bump();
    } catch (e) {
      db.POSTS = db.POSTS.filter((p) => p !== job);
      bump();
      fail(e);
    }
  })();
  return job;
}
/** Change a job or vacancy I posted. Shown at once; saved in the background (and put back if the server refuses).
    `keepWhen`: leave the date as it was (the form shows it as "keep"). */
export function updateJob(id: string, f: JobForm, keepWhen = false) {
  const po = db.POSTS.find((p) => p.id === id && p.mine && p.kind === 'request');
  if (!po) return toast('This job can no longer be edited');
  const before = { ...po };
  const w = po.as !== 'business';
  const b = f.budget.replace(/[^\d]/g, '');
  Object.assign(po, {
    cat: f.cat,
    title: f.title.trim(),
    text: f.text.trim(),
    budget: b ? `XAF ${(+b).toLocaleString('en-US')}${f.neg ? ' · negotiable' : ''}${!w ? ' / month' : ''}` : w ? 'Open to offers' : 'Salary negotiable',
    area: f.area,
    type: f.type,
    openings: w ? 1 : f.openings || 1,
    photos: [...f.photos],
    urgent: f.urgent,
    edited: 1,
  });
  // the place only changes when another city was chosen in the form
  if (f.at !== undefined) po.coord = f.at || undefined;
  if (!keepWhen) po.when = f.when === 'Flexible' ? 'Flexible' : dayText(f.when, f.time);
  bump();
  (async () => {
    try {
      // edited seconds after posting: wait until the server has given the job its id
      for (let i = 0; i < 40 && po.id.startsWith('tmp_'); i++) await new Promise((r) => setTimeout(r, 500));
      if (po.id.startsWith('tmp_')) throw new Error('This job is still being posted. Try again in a moment.');
      const photos = await uploadPostPhotos(po.photos || []);
      const { error } = await supabase
        .from('posts')
        .update({ title: po.title, body: po.text, cat: po.cat, area: po.area, urgent: !!po.urgent, budget_num: +b || 0, photos: photos.map((x) => x.replace(/^uri:/, '')), data: { budget: po.budget, when: po.when, type: po.type, openings: po.openings, edited: 1 }, ...(f.at !== undefined ? { location: jobPoint(f) } : {}) })
        .eq('id', po.id);
      if (error) throw error;
      po.photos = photos;
      bump();
    } catch (e) {
      Object.assign(po, before);
      bump();
      fail(e);
    }
  })();
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
      const photos = p.src ? await uploadPostPhotos([p.src], true) : [];
      // a photo that didn't go up is not saved as an empty tile
      if (p.src && !photos.length) throw new Error('That photo couldn’t be uploaded. Check your connection and try again.');
      // removed again while it was still going up: nothing to save
      if (GONE.has(po.id)) return;
      const { data, error } = await supabase
        .from('posts')
        .insert({ author_id: db.uid, business_id: biz?.remoteId || null, kind: p.kind, body: p.text, photos: photos.map((x) => x.replace(/^uri:/, '')), cat: w ? mySkill() : null, area: cityLabel(), data: { tags: p.tags || [], job: p.job, slots: p.slots } })
        .select('id')
        .single();
      if (error) throw error;
      if (GONE.has(po.id)) {
        // removed while it was being saved: take it off the server too, so it never comes back
        GONE.add(data.id);
        await supabase.from('posts').delete().eq('id', data.id);
        return;
      }
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
/** Requests I closed in this session (a list reloaded a moment later must not show them open again). */
export const CLOSED = new Set<string>();
export function closeJob(id: string) {
  const i = db.POSTS.findIndex((p) => p.id === id);
  if (i < 0) return;
  CLOSED.add(id);
  const po = db.POSTS.splice(i, 1)[0];
  toast('Job closed');
  bump();
  supabase
    .from('posts')
    .update({ status: 'closed' })
    .eq('id', id)
    .then(({ error }) => {
      if (error) {
        CLOSED.delete(id);
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
  delete db.HIDE['o:' + id]; // a new price for a request I had taken off my list shows again
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
async function setStageRemote(appId: string | undefined, stage: string) {
  if (!appId) return;
  const { error } = await supabase.from('applications').update({ stage }).eq('id', appId);
  if (error) fail(error);
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
/** After a restart: keep sharing my position if I'm on the way to a job. */
export function resumeSharing() {
  const b = db.BOOKINGS.find((x) => x.worker === 'me' && x.state === 'onway');
  if (b) void startSharing(b, true);
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
  if (th.unread || th.marked) {
    th.unread = 0;
    th.marked = undefined;
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
    dur: hiring ? 'Price offered by you' : [mySkill(), `${db.user.years} yrs experience`].filter(Boolean).join(' · '),
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
/** Several chats at once (Inbox, hold to select). One "Undo" brings them all back. */
export function deleteChats(ids: string[]) {
  const T = THREADS();
  const O = ORDER();
  const kept = ids.map((id) => ({ id, th: T[id], i: O.indexOf(id) })).filter((x) => x.th);
  if (!kept.length) return;
  // from the bottom of the list up, so the places stay right for "Undo"
  [...kept].sort((a, b) => b.i - a.i).forEach(({ id, th, i }) => {
    delete T[id];
    if (i >= 0) O.splice(i, 1);
    if (th.cid) db.HIDDEN[th.cid] = Date.now();
  });
  bump();
  undoBar(kept.length === 1 ? 'Chat deleted' : `${kept.length} chats deleted`, () => {
    [...kept].sort((a, b) => a.i - b.i).forEach(({ id, th, i }) => {
      T[id] = th;
      if (!O.includes(id)) O.splice(i < 0 ? O.length : Math.min(i, O.length), 0, id);
      if (th.cid) delete db.HIDDEN[th.cid];
    });
    bump();
  });
}
/** Show a chat as not read yet (to come back to it). A mark of my own, on this phone: the other person's
    "seen" ticks don't change, because I did read it. Opening the chat clears it. */
export function markChatUnread(id: string) {
  const th = THREADS()[id];
  if (!th || th.unread || th.marked) return;
  th.marked = 1;
  bump();
}
/** Updates (Inbox, hold to select): mark as read or not read, or delete. */
export function markNotifs(ids: string[], read: boolean) {
  const hit = NOTIFS().filter((n) => ids.includes(n.id) && !!n.read !== read);
  if (!hit.length) return;
  hit.forEach((n) => (n.read = read ? 1 : 0));
  bump();
  void setNotifRead(hit.map((n) => n.id), read);
}
export function deleteNotifs(ids: string[]) {
  const N = NOTIFS();
  const hit = N.filter((n) => ids.includes(n.id));
  if (!hit.length) return;
  hit.forEach((n) => N.splice(N.indexOf(n), 1));
  bump();
  toast(hit.length === 1 ? 'Update deleted' : `${hit.length} updates deleted`);
  void deleteNotifRows(hit.map((n) => n.id));
}
/** Take finished jobs and answered offers off my own lists (see db.HIDE). */
export function hideFromJobs(keys: string[]) {
  keys.forEach((k) => (db.HIDE[k] = Date.now()));
  bump();
}
export function muteChat(id: string, on: boolean) {
  const th = THREADS()[id];
  if (!th) return;
  th.muted = on ? 1 : undefined;
  bump();
  if (th.cid) supabase.from('conversation_members').update({ muted: on }).eq('conversation_id', th.cid).eq('user_id', db.uid!).then(({ error }) => error && fail(error));
}
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

/* =========================== safety: report and block =========================== */
export const REPORT_REASONS: [string, string][] = [
  ['scam', 'Scam or fraud'],
  ['spam', 'Spam'],
  ['fake', 'Fake profile or listing'],
  ['harassment', 'Harassment or hate'],
  ['inappropriate', 'Inappropriate content'],
  ['other', 'Something else'],
];
/** Send a report to getit's moderators (once per item). */
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
export function readNotif(id: string) {
  const n = NOTIFS().find((x) => x.id === id);
  if (n && !n.read) {
    n.read = 1;
    bump();
    void setNotifRead([id]);
  }
}
