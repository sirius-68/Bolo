/* Live classes, their recordings, watch progress, saved videos and timestamped questions.
   Recordings exist for lessons that already had a class, and a new one appears when a teacher
   ends a recorded live class. Progress (where you stopped) is saved per recording. */
import { db, uid, Course } from '../data/db';
import { bump, later } from './live';
import { toast } from '../ui/overlay';
import { P, fname, nowT } from './core';
import { courseGroup, learnerGroup, lessonsOf } from './career';
import { notify } from './notify';

export type Rec = { id: string; cid: string; title: string; lesson: number; dur: number; at: string; src: string; live?: number };
/** A sample lesson video bundled with the app (plays offline) until real class recordings are stored (backend phase). */
const SRC = ['local:lesson', 'local:lesson', 'local:lesson'];
const DUR = [180, 180, 180];
const LESSON = require('../../assets/video/lesson.mp4');
/** What the video player plays: the bundled file or a remote URL. */
export const videoSource = (src: string) => (src.startsWith('local:') ? LESSON : src);

const recs = () => (((db as any).RECS = (db as any).RECS || []) as Rec[]);
const watch = () => (((db as any).WATCH = (db as any).WATCH || {}) as Record<string, { t: number; d: number; at: number }>);
const saved = () => (((db as any).SAVEDV = (db as any).SAVEDV || []) as string[]);

/** Recordings of a course, newest first. Classes already held get their recording. */
export function recordingsOf(c: Course): Rec[] {
  const L = recs();
  const held = Math.max(1, Math.min(c.done || 0, lessonsOf(c).length));
  const lessons = lessonsOf(c);
  for (let i = 0; i < held; i++) {
    if (!L.some((r) => r.cid === c.id && r.lesson === i && !r.live)) {
      const d = new Date(Date.now() - (held - i) * 7 * 864e5);
      L.push({ id: `${c.id}-r${i}`, cid: c.id, title: lessons[i], lesson: i, dur: DUR[i % DUR.length], at: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), src: SRC[i % SRC.length] });
    }
  }
  return L.filter((r) => r.cid === c.id).sort((a, b) => b.lesson - a.lesson || (b.live || 0) - (a.live || 0));
}
export const recById = (id: string) => recs().find((r) => r.id === id);
export const courseOfRec = (r: Rec) => db.COURSES.find((c) => c.id === r.cid);

/** The teacher ended a recorded live class: the recording is added and learners are told. */
export function saveLiveRecording(c: Course, secs: number) {
  const lessons = lessonsOf(c);
  const i = Math.min(c.done || 0, lessons.length - 1);
  const r: Rec = { id: uid('rec'), cid: c.id, title: `Live class · ${lessons[i]}`, lesson: i, dur: Math.max(60, secs), at: 'Today', src: SRC[i % SRC.length], live: 1 };
  recs().push(r);
  const gid = c.mine ? courseGroup(c) : learnerGroup(c);
  const th = db.THREADS_C[gid] || db.THREADS_W[gid];
  th?.msgs.push({ sys: `🎬 Recording of today’s class is ready: ${r.title}` });
  if (!c.mine) notify({ type: 'material', cat: 'learning', key: `rec:${r.id}`, text: `New recording in “${c.title}”: ${r.title}`, go: { k: 'watch', id: r.id } });
  bump();
  return r;
}

/* ---------------- progress & saved ---------------- */
export const progressOf = (id: string) => watch()[id];
export function saveProgress(id: string, t: number, d: number) {
  if (!isFinite(t) || t < 0) return;
  watch()[id] = { t: Math.floor(t), d: Math.floor(d || recById(id)?.dur || 0), at: Date.now() };
}
export const isSavedVideo = (id: string) => saved().includes(id);
export function toggleSavedVideo(id: string) {
  const L = saved();
  const i = L.indexOf(id);
  if (i >= 0) L.splice(i, 1);
  else L.unshift(id);
  toast(i >= 0 ? 'Removed from saved videos' : 'Saved to My learning');
  bump();
}
/** Saved videos and ones you started, most recent first. */
export function myVideos(): { r: Rec; saved: boolean; pct: number }[] {
  const W = watch();
  const ids = [...new Set([...saved(), ...Object.keys(W).sort((a, b) => W[b].at - W[a].at)])];
  return ids
    .map((id) => recById(id))
    .filter((r): r is Rec => !!r && db.myLearning.includes(r.cid))
    .map((r) => ({ r, saved: saved().includes(r.id), pct: W[r.id] && W[r.id].d ? Math.min(100, Math.round((W[r.id].t / W[r.id].d) * 100)) : 0 }));
}

/* ---------------- timestamps ---------------- */
/** 275 → "04:35", 3725 → "1:02:05" */
export function fmtTs(s: number) {
  const t = Math.max(0, Math.floor(s));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const ss = t % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(ss)}` : `${two(m)}:${two(ss)}`;
}
/** Ask in the class group with the exact moment of the video. Others tap the time to jump there. */
export function askAt(r: Rec, ts: number, text: string) {
  const c = courseOfRec(r);
  if (!c) return null;
  const gid = c.mine ? courseGroup(c) : learnerGroup(c);
  const th = db.THREADS_C[gid] || db.THREADS_W[gid];
  if (!th) return null;
  th.msgs.push({ f: 'me', k: 'ts', t: text.trim(), ts: Math.floor(ts), rec: r.id, name: r.title, at: nowT(), st: 'sent' });
  th.time = nowT();
  toast(`Asked in the class group at ${fmtTs(ts)}`);
  bump();
  return gid;
}
/** Students in a live class (the course's learners for a teacher, classmates for a learner). */
export function classPeople(c: Course): string[] {
  if (c.mine) return (c.people || []).filter((id) => P(id));
  const th = db.THREADS_W[learnerGroup(c)];
  return (th?.members || []).filter((id) => P(id) && !P(id).biz).slice(0, 12);
}
export const firstName = (id: string) => fname(P(id)?.name || '');
