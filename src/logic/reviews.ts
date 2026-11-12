/* Course ratings: 1–5 stars and an optional review from bolo members who took the course, one each
   (editing replaces it). Stored on the server (listing_reviews); the course owner can't rate their own. */
import { db, Course } from '../data/db';
import { bump } from './live';
import { toast } from '../ui/overlay';
import { isW } from './core';
import { supabase } from '../lib/supabase';
import { friendly } from './remote';
import { L, ago, ensurePeople } from './server';

export type CReview = { id: string; by: string; stars: number; text: string; at: string; edited?: number };

const store = () => (((db as any).CREVIEWS = (db as any).CREVIEWS || {}) as Record<string, CReview[]>);
const loading: Record<string, boolean> = {};

export function reviewsOf(c: Course): CReview[] {
  const S = store();
  if (!S[c.id] && !loading[c.id]) void loadReviews(c.id);
  return S[c.id] || [];
}
export async function loadReviews(id: string) {
  loading[id] = true;
  try {
    const { data } = await supabase.from('listing_reviews').select('user_id,stars,body,created_at,updated_at').eq('listing_id', id).order('updated_at', { ascending: false }).limit(200);
    await ensurePeople((data || []).map((r: any) => r.user_id));
    store()[id] = (data || []).map((r: any) => ({ id: r.user_id, by: L(r.user_id), stars: r.stars, text: r.body || '', at: ago(r.updated_at), edited: r.updated_at !== r.created_at ? 1 : undefined }));
    bump();
  } finally {
    loading[id] = false;
  }
}
/** Average (1 decimal) and number of ratings. */
export function ratingOf(c: Course) {
  const list = reviewsOf(c);
  const n = list.length;
  return { avg: n ? Math.round((list.reduce((a, r) => a + r.stars, 0) / n) * 10) / 10 : 0, n, dist: [5, 4, 3, 2, 1].map((s) => list.filter((r) => r.stars === s).length) };
}
export const myReview = (c: Course) => reviewsOf(c).find((r) => r.by === 'me');
/** People who took the course can rate it (not its creator). */
export const canReview = (c: Course) => isW() && !c.mine && (db.myLearning.includes(c.id) || (!!c.url && tookCourse(c.id)));
/** You opened a linked course and said you took it. */
export const tookCourse = (id: string) => ((((db as any).TOOK = (db as any).TOOK || []) as string[]).includes(id));
export function markTook(id: string) {
  const list = ((db as any).TOOK = (db as any).TOOK || []) as string[];
  if (!list.includes(id)) list.push(id);
  bump();
}

export function submitReview(c: Course, stars: number, text: string): string | null {
  if (!canReview(c)) return 'Only people who took this course can rate it.';
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) return 'Choose 1 to 5 stars.';
  const t = text.trim().slice(0, 600);
  const list = (store()[c.id] = store()[c.id] || []);
  const mine = list.find((r) => r.by === 'me');
  if (mine) {
    mine.stars = stars;
    mine.text = t;
    mine.at = 'now';
    mine.edited = 1;
  } else list.unshift({ id: db.uid || 'me', by: 'me', stars, text: t, at: 'now' });
  bump();
  supabase
    .from('listing_reviews')
    .upsert({ listing_id: c.id, user_id: db.uid, stars, body: t })
    .then(({ error }) => {
      if (error) {
        toast(friendly(error));
        void loadReviews(c.id);
      } else toast(mine ? 'Your review was updated' : 'Thanks for rating this course');
    });
  return null;
}
export function deleteReview(c: Course) {
  const list = store()[c.id] || [];
  const i = list.findIndex((r) => r.by === 'me');
  if (i >= 0) list.splice(i, 1);
  toast('Review removed');
  bump();
  supabase.from('listing_reviews').delete().eq('listing_id', c.id).eq('user_id', db.uid!).then(({ error }) => error && toast(friendly(error)));
}
