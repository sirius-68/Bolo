/* Comments on posts and reels, saved with the rest of the data (so they survive restarts).
   The number shown on a post is always the length of its list: adding or deleting updates it everywhere.
   Before: comments lived in a module variable (lost on restart), every post showed the same three samples,
   and the card showed a fixed number from the sample data that never changed. */
import { db, uid } from '../data/db';
import { bump, later } from './live';
import { toast } from '../ui/overlay';
import { P, fname } from './core';
import { notify } from './notify';

export type Cmt = { id: string; by: string; t: string; at: string };

const POOL: [string, string][] = [
  ['c_ama', 'Great work, booking you next week!'],
  ['c_marie', 'How long did it take?'],
  ['c_paul', 'Clean job 👏'],
  ['c_tabe', 'Do you also work on weekends?'],
  ['c_ngo', 'Saved this. I need the same thing done at my place.'],
];
const AGO = ['2m', '10m', '1h', '3h'];
const store = () => ((db as any).COMMENTS = (db as any).COMMENTS || {}) as Record<string, Cmt[]>;
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Comments for a post or reel (ids like "p3" or "r2"). Your own new posts start empty. */
export function commentsOf(id: string): Cmt[] {
  const S = store();
  if (!S[id]) {
    const mine = db.POSTS.find((p) => p.id === id)?.by === 'me';
    const n = mine ? 0 : 1 + (hash(id) % 4);
    S[id] = Array.from({ length: n }, (_, i) => {
      const [by, t] = POOL[(hash(id) + i) % POOL.length];
      return { id: `${id}-s${i}`, by, t, at: AGO[i % AGO.length] };
    }).filter((c) => P(c.by));
  }
  return S[id];
}
export const commentCount = (id: string) => commentsOf(id).length;

export function addComment(id: string, t: string, by = 'me') {
  const text = t.trim();
  if (!text) return;
  commentsOf(id).push({ id: uid('cm'), by, t: text.slice(0, 500), at: 'now' });
  bump();
}
export function deleteComment(id: string, cid: string) {
  const L = commentsOf(id);
  const i = L.findIndex((c) => c.id === cid && c.by === 'me');
  if (i < 0) return;
  L.splice(i, 1);
  toast('Comment deleted');
  bump();
}
/** Someone reacts to a post you just shared (until real people can, through the backend). */
export function expectCommentOn(postId: string) {
  later(7000, () => {
    if (!db.POSTS.some((p) => p.id === postId)) return;
    addComment(postId, 'Nice work! 👏 Are you free next week?', 'c_marie');
    notify({ type: 'comment', cat: 'social', who: 'c_marie', key: `cmt:${postId}:first`, text: 'commented on your post', snip: 'Nice work! 👏 Are you free next week?', go: { k: 'post', id: postId } });
  });
}
export const cmtName = (c: Cmt) => (c.by === 'me' ? 'You' : fname(P(c.by)?.name || '') + (P(c.by)?.name?.includes(' ') ? ' ' + P(c.by)!.name.split(' ').slice(-1)[0][0] + '.' : ''));
