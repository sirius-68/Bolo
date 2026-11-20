/* Going to the screens of the two journeys. */
import { router } from 'expo-router';
import { db } from '../data/db';
import { P } from '../logic/core';
import { openThread } from '../logic/work';
import { withAccount } from './signin';
import { fname } from '../logic/core';

/** The chat with someone (made on the spot when it is the first message). Needs an account. */
export function openChat(id: string) {
  const go = () => {
    openThread(id);
    router.push(`/chat/${id}` as any);
  };
  if (db.loggedIn) go();
  else withAccount(`message ${fname(P(id)?.name || 'them')}`, go);
}
/** A booked job, step by step. */
export const openJob = (bookingId: string) => router.push(`/track/${bookingId}` as any);
/** A worker's profile, as a client sees it. */
export const openWorker = (id: string) => router.push(`/profile/${id}` as any);
/** A request: mine opens its live status (or its offers), someone else's opens the job as a worker sees it. */
export function openRequestOf(postId: string) {
  const po = db.POSTS.find((p) => p.id === postId || (p as any).tmp === postId);
  if (!po) return;
  if (po.mine) router.push(((po.offerList || []).length > 1 ? `/offers/${po.id}` : `/asked/${po.id}`) as any);
  else router.push(`/wrequest/${po.id}` as any);
}
