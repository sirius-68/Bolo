/* One place that creates notifications. Every event in the app (a job application, an enrolment, a mentorship
   request, a message, a comment…) calls notify(); nothing adds notifications by hand.
   - delivered to the right inbox: the Regular profile (NOTIFS_W) or the business page (NOTIFS_C)
   - respects Settings → Notifications (one switch per category)
   - no duplicates: an event with a `key` is only notified once; `upsert` updates the existing one instead
   - carries `go`, so tapping it opens the right screen
   When the backend phase lands, the same events are written by database triggers
   (supabase/migrations/0002_activity.sql) and this file only reads them. */
import { db, uid, Notif } from '../data/db';
import { bump } from './live';

export type NCat = 'jobs' | 'messages' | 'reminders' | 'applicants' | 'news' | 'learning' | 'mentorship' | 'social' | 'account';
export type Go =
  | { k: 'job' | 'opp' | 'course' | 'coursePage' | 'mentor' | 'chat' | 'profile' | 'track' | 'post' | 'watch' | 'live'; id: string; t?: number }
  | { k: 'wallet' | 'cv' | 'teach' | 'me' | 'courses' | 'notifs'; id?: string };

/** Index of each category's switch in db.PREF.notif (Settings → Notifications). */
export const NCAT_PREF: Record<NCat, number> = { jobs: 0, messages: 1, reminders: 2, applicants: 3, news: 4, learning: 5, mentorship: 6, social: 7, account: 8 };

export type NotifyIn = {
  type: string;
  cat: NCat;
  text: string;
  who?: string;
  go?: Go;
  /** same key = same event: never notified twice */
  key?: string;
  /** with a key: replace the existing notification (e.g. several messages in one chat) instead of skipping */
  upsert?: boolean;
  /** which profile receives it; default = the profile the event belongs to (W = Regular, C = business) */
  inbox?: 'W' | 'C';
  snip?: string;
  job?: string;
  booking?: string;
  amount?: string;
};

export const prefOn = (cat: NCat) => (db.PREF.notif as number[])[NCAT_PREF[cat]] !== 0;

export function notify(o: NotifyIn): Notif | null {
  if (!prefOn(o.cat)) return null;
  const N = (o.inbox || 'W') === 'W' ? db.NOTIFS_W : db.NOTIFS_C;
  if (o.key) {
    const i = N.findIndex((n) => (n as any).key === o.key);
    if (i >= 0) {
      if (!o.upsert) return null;
      const old = N.splice(i, 1)[0];
      const n = { ...old, text: o.text, snip: o.snip, time: 'now', g: 'Today', read: 0 } as Notif;
      N.unshift(n);
      bump();
      return n;
    }
  }
  const n = { id: uid('nt'), g: 'Today', time: 'now', type: o.type, who: o.who, text: o.text, snip: o.snip, job: o.job, booking: o.booking, amount: o.amount, go: o.go, key: o.key, cat: o.cat } as Notif;
  N.unshift(n);
  bump();
  return n;
}
/** Marks the notification for an event as read (e.g. you opened the chat it was about). */
export function readKey(key: string) {
  [db.NOTIFS_W, db.NOTIFS_C].forEach((N) => N.forEach((n) => (n as any).key === key && (n.read = 1)));
}
