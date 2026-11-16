/* Comments on posts, on the server: comments, replies (one thread under each comment) and likes.
   A post's comment count comes from the server and moves with each comment added or deleted here.
   Comments load when a post's comments are opened.
   Replies and likes need the newer server; on an older one comments still work as before. */
import { db } from '../data/db';
import { bump } from './live';
import { toast } from '../ui/overlay';
import { P, fname, postById } from './core';
import { supabase } from '../lib/supabase';
import { friendly } from './remote';
import { L, R, ago, ensurePeople, uuid } from './server';

export type Cmt = {
  id: string;
  by: string;
  t: string;
  at: string;
  /** the comment this one is a reply under */
  parent?: string;
  /** who the reply answers */
  to?: string;
  likes?: number;
  liked?: boolean;
};

/** Does the server know replies and likes? (null until the first load) */
let threads: boolean | null = null;
export const canThread = () => threads !== false;

const loading: Record<string, boolean> = {};
/** Comments for a post (loads them the first time; the screen refreshes when they arrive). */
export function commentsOf(id: string): Cmt[] {
  if (!db.CMTS[id] && !loading[id]) void loadComments(id);
  return db.CMTS[id] || [];
}
export const commentsLoading = (id: string) => !!loading[id] && !db.CMTS[id];
export async function loadComments(id: string) {
  loading[id] = true;
  try {
    let rows: any[] | null = null;
    if (threads !== false) {
      const r = await supabase.from('comment_feed').select('id,author_id,body,created_at,parent_id,reply_to,likes,liked').eq('post_id', id).order('created_at').limit(500);
      if (r.error) {
        // a server from before replies and likes: fall back, and don't offer them
        if (/comment_feed|relation|schema cache|not find/i.test(r.error.message || '')) threads = false;
      } else {
        threads = true;
        rows = r.data;
      }
    }
    if (!rows) {
      const r = await supabase.from('comments').select('id,author_id,body,created_at').eq('post_id', id).order('created_at').limit(300);
      rows = r.data || [];
    }
    await ensurePeople(rows.flatMap((c: any) => [c.author_id, c.reply_to]).filter(Boolean));
    db.CMTS[id] = rows.map((c: any) => ({ id: c.id, by: L(c.author_id), t: c.body, at: ago(c.created_at), parent: c.parent_id || undefined, to: c.reply_to ? L(c.reply_to) : undefined, likes: c.likes || 0, liked: !!c.liked }));
    bump();
  } finally {
    loading[id] = false;
  }
}
export const commentCount = (id: string) => (db.CMTS[id] ? db.CMTS[id].length : postById(id)?.comments || 0);

/** Top comments, oldest first, each with its replies. */
export function threadsOf(id: string): { c: Cmt; replies: Cmt[] }[] {
  const all = commentsOf(id);
  const tops = all.filter((c) => !c.parent || !all.some((x) => x.id === c.parent));
  return tops.map((c) => ({ c, replies: all.filter((x) => x.parent === c.id) }));
}

/** Add a comment, or a reply when `replyTo` is the comment being answered. */
export function addComment(id: string, t: string, replyTo?: Cmt) {
  const text = t.trim().slice(0, 500);
  if (!text) return;
  const parent = replyTo && canThread() ? replyTo.parent || replyTo.id : undefined;
  const c: Cmt = { id: uuid(), by: 'me', t: text, at: 'now', parent, to: parent ? replyTo!.by : undefined, likes: 0 };
  (db.CMTS[id] = db.CMTS[id] || []).push(c);
  const po = postById(id);
  if (po) po.comments = (po.comments || 0) + 1;
  bump();
  supabase
    .from('comments')
    .insert({ id: c.id, post_id: id, body: text, ...(parent ? { parent_id: parent, reply_to: R(replyTo!.by) || null } : {}) })
    .then(({ error }) => {
      if (!error) return;
      db.CMTS[id] = (db.CMTS[id] || []).filter((x) => x !== c);
      if (po) po.comments = Math.max(0, (po.comments || 1) - 1);
      bump();
      toast(friendly(error));
    });
}
/** Like or unlike a comment. */
export function likeComment(id: string, cid: string) {
  const c = (db.CMTS[id] || []).find((x) => x.id === cid);
  if (!c || !canThread()) return;
  const on = !c.liked;
  const set = (v: boolean) => {
    c.liked = v;
    c.likes = Math.max(0, (c.likes || 0) + (v ? 1 : -1));
    bump();
  };
  set(on);
  const q = on ? supabase.from('comment_likes').insert({ comment_id: cid }) : supabase.from('comment_likes').delete().eq('comment_id', cid).eq('user_id', db.uid!);
  q.then(({ error }) => {
    // "already liked" is fine: the heart is right
    if (!error || /duplicate/i.test(error.message || '')) return;
    set(!on);
    toast(friendly(error));
  });
}
/** Can I delete this comment? Mine, or any comment under my own post. */
export const canDeleteComment = (id: string, c: Cmt) => c.by === 'me' || (!!postById(id)?.mine && canThread());
export function deleteComment(id: string, cid: string) {
  const list = db.CMTS[id] || [];
  const c = list.find((x) => x.id === cid);
  if (!c || !canDeleteComment(id, c)) return;
  // its replies go with it
  const gone = list.filter((x) => x.id === cid || x.parent === cid);
  db.CMTS[id] = list.filter((x) => !gone.includes(x));
  const po = postById(id);
  if (po) po.comments = Math.max(0, (po.comments || gone.length) - gone.length);
  toast('Comment deleted');
  bump();
  supabase
    .from('comments')
    .delete()
    .eq('id', cid)
    .then(({ error }) => {
      if (!error) return;
      db.CMTS[id] = list;
      if (po) po.comments = (po.comments || 0) + gone.length;
      bump();
      toast(friendly(error));
    });
}
export const cmtName = (c: { by: string }) => (c.by === 'me' ? 'You' : fname(P(c.by)?.name || '') + (P(c.by)?.name?.includes(' ') ? ' ' + P(c.by)!.name.split(' ').slice(-1)[0][0] + '.' : ''));
