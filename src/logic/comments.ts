/* Comments on posts, on the server. A post's comment count comes from the server and moves with each
   comment added or deleted here. Comments load when a post's comments are opened. */
import { db } from '../data/db';
import { bump } from './live';
import { toast } from '../ui/overlay';
import { P, fname, postById } from './core';
import { supabase } from '../lib/supabase';
import { friendly } from './remote';
import { L, ago, ensurePeople, uuid } from './server';

export type Cmt = { id: string; by: string; t: string; at: string };

const loading: Record<string, boolean> = {};
/** Comments for a post (loads them the first time; the screen refreshes when they arrive). */
export function commentsOf(id: string): Cmt[] {
  if (!db.CMTS[id] && !loading[id]) void loadComments(id);
  return db.CMTS[id] || [];
}
export async function loadComments(id: string) {
  loading[id] = true;
  try {
    const { data } = await supabase.from('comments').select('id,author_id,body,created_at').eq('post_id', id).order('created_at').limit(300);
    await ensurePeople((data || []).map((c: any) => c.author_id));
    db.CMTS[id] = (data || []).map((c: any) => ({ id: c.id, by: L(c.author_id), t: c.body, at: ago(c.created_at) }));
    bump();
  } finally {
    loading[id] = false;
  }
}
export const commentCount = (id: string) => (db.CMTS[id] ? db.CMTS[id].length : postById(id)?.comments || 0);

export function addComment(id: string, t: string) {
  const text = t.trim().slice(0, 500);
  if (!text) return;
  const c: Cmt = { id: uuid(), by: 'me', t: text, at: 'now' };
  (db.CMTS[id] = db.CMTS[id] || []).push(c);
  const po = postById(id);
  if (po) po.comments = (po.comments || 0) + 1;
  bump();
  supabase
    .from('comments')
    .insert({ id: c.id, post_id: id, body: text })
    .then(({ error }) => {
      if (!error) return;
      db.CMTS[id] = (db.CMTS[id] || []).filter((x) => x !== c);
      if (po) po.comments = Math.max(0, (po.comments || 1) - 1);
      bump();
      toast(friendly(error));
    });
}
export function deleteComment(id: string, cid: string) {
  const list = db.CMTS[id] || [];
  const i = list.findIndex((c) => c.id === cid && c.by === 'me');
  if (i < 0) return;
  const [c] = list.splice(i, 1);
  const po = postById(id);
  if (po) po.comments = Math.max(0, (po.comments || 1) - 1);
  toast('Comment deleted');
  bump();
  supabase
    .from('comments')
    .delete()
    .eq('id', cid)
    .then(({ error }) => {
      if (!error) return;
      list.splice(i, 0, c);
      if (po) po.comments = (po.comments || 0) + 1;
      bump();
      toast(friendly(error));
    });
}
export const cmtName = (c: Cmt) => (c.by === 'me' ? 'You' : fname(P(c.by)?.name || '') + (P(c.by)?.name?.includes(' ') ? ' ' + P(c.by)!.name.split(' ').slice(-1)[0][0] + '.' : ''));
