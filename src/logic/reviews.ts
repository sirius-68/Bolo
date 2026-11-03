/* Course ratings and reviews: 1–5 stars and an optional review, one per enrolled student per course
   (editing replaces it). The same rules are enforced by the database (supabase/migrations/0002_activity.sql):
   a row is accepted only from a student enrolled in that course, unique per (course, student). */
import { db, uid, Course } from '../data/db';
import { bump, later } from './live';
import { toast } from '../ui/overlay';
import { P, WORKERS, isW } from './core';
import { notify } from './notify';

export type CReview = { id: string; by: string; stars: number; text: string; at: string; edited?: number };

const TEXTS: [number, string][] = [
  [5, 'Very practical. I used it at work the same week.'],
  [5, 'The trainer explains slowly and answers every question in the group.'],
  [4, 'Good course. I wish the live classes were a bit longer.'],
  [5, 'Clear lessons and the recordings helped a lot.'],
  [4, 'Useful, especially the final project.'],
  [3, 'Okay for beginners, a bit slow if you already know the basics.'],
];
const store = () => (((db as any).CREVIEWS = (db as any).CREVIEWS || {}) as Record<string, CReview[]>);
const hash = (s: string) => [...s].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5);

export function reviewsOf(c: Course): CReview[] {
  const S = store();
  if (!S[c.id]) {
    const n = c.mine || c.quick ? 0 : 2 + (hash(c.id) % 5);
    const pool = WORKERS();
    S[c.id] = Array.from({ length: n }, (_, i) => {
      const [stars, text] = TEXTS[(hash(c.id) + i * 2) % TEXTS.length];
      return { id: `${c.id}-v${i}`, by: pool[(hash(c.id) + i * 3) % pool.length], stars, text: i % 3 === 2 ? '' : text, at: ['2 days ago', '1 week ago', '2 weeks ago', '1 month ago'][i % 4] };
    });
  }
  return S[c.id];
}
/** Average (1 decimal) and number of ratings. */
export function ratingOf(c: Course) {
  const L = reviewsOf(c);
  const n = L.length;
  return { avg: n ? Math.round((L.reduce((a, r) => a + r.stars, 0) / n) * 10) / 10 : 0, n, dist: [5, 4, 3, 2, 1].map((s) => L.filter((r) => r.stars === s).length) };
}
export const myReview = (c: Course) => reviewsOf(c).find((r) => r.by === 'me');
/** Only students enrolled in the course can rate it (not its creator). */
export const canReview = (c: Course) => isW() && !c.mine && db.myLearning.includes(c.id);

export function submitReview(c: Course, stars: number, text: string): string | null {
  if (!canReview(c)) return 'Only students enrolled in this course can rate it.';
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return 'Choose 1 to 5 stars.';
  const t = text.trim().slice(0, 600);
  const L = reviewsOf(c);
  const mine = L.find((r) => r.by === 'me');
  if (mine) {
    mine.stars = stars;
    mine.text = t;
    mine.at = 'Just now';
    mine.edited = 1;
    toast('Your review was updated');
  } else {
    L.unshift({ id: uid('rv'), by: 'me', stars, text: t, at: 'Just now' });
    toast('Thanks for rating this course');
  }
  bump();
  return null;
}
export function deleteReview(c: Course) {
  const L = reviewsOf(c);
  const i = L.findIndex((r) => r.by === 'me');
  if (i >= 0) L.splice(i, 1);
  toast('Review removed');
  bump();
}
/** A student of your course leaves a rating (simulated until real students can, through the backend). */
export function expectReview(c: Course, pid: string) {
  later(15000, () => {
    const L = reviewsOf(c);
    if (L.some((r) => r.by === pid) || !P(pid)) return;
    L.unshift({ id: uid('rv'), by: pid, stars: 5, text: 'Great start, the first lesson was very clear!', at: 'Just now' });
    notify({ type: 'rating', cat: 'learning', who: pid, inbox: c.biz ? 'C' : 'W', key: `rv:${c.id}:${pid}`, text: `rated your course “${c.title}” 5★`, snip: 'Great start, the first lesson was very clear!', go: { k: 'course', id: c.id } });
    bump();
  });
}
