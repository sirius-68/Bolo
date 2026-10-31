/* Statuses: 24-hour updates from people and companies you follow (and your own).
   Others' statuses are made from what they actually have on bolo: recent work, availability, open jobs. */
import { db, uid } from '../data/db';
import type { Story } from '../components/Stories';
import { P, fname, has, isW, listPeople, myPhoto, openJobs } from './core';
import { bump } from './live';
import { toast } from '../ui/overlay';

export type MyStatus = { id: string; pic?: string; text: string; colors: [string, string]; at: number };
const DAY = 24 * 3600_000;

export const GRADS: [string, string][] = [
  ['#3d5af1', '#1b2a9b'],
  ['#7c5cff', '#3b1fa8'],
  ['#2fbf7a', '#0f6e45'],
  ['#ff8a3d', '#c2410c'],
  ['#f6ee5c', '#e3c400'],
];
const isLight = (c: [string, string]) => c[0] === '#f6ee5c';

/** Your live statuses (last 24 hours), newest last so they play in order. */
export const myStatuses = () => ((db as any).MYSTATUS as MyStatus[] | undefined || []).filter((s) => Date.now() - s.at < DAY).slice().reverse();
export function addStatus(s: Omit<MyStatus, 'id' | 'at'>) {
  const d = db as any;
  d.MYSTATUS = [{ ...s, id: uid('st'), at: Date.now() }, ...((d.MYSTATUS as MyStatus[]) || []).filter((x) => Date.now() - x.at < DAY)];
  toast('Status shared with your followers');
  bump();
}
export function deleteStatus(id: string) {
  const d = db as any;
  d.MYSTATUS = ((d.MYSTATUS as MyStatus[]) || []).filter((x) => x.id !== id);
  bump();
}
const ago = (t: number) => {
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  return m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
};
/** Simulated views until the backend counts real ones. */
const views = (t: number) => Math.min(48, 2 + Math.round((Date.now() - t) / 90000));

export function myStories(onAdd: () => void): Story[] {
  return myStatuses().map((s) => ({
    key: s.id,
    colors: s.colors,
    pic: s.pic,
    icon: s.pic ? undefined : 'sparkle',
    title: s.text,
    text: '',
    chip: `👁 ${views(s.at)} views`,
    sponsor: { name: 'Your status', pic: myPhoto(), sub: ago(s.at), round: true },
    cta: 'Add another',
    onCta: onAdd,
    dark: !s.pic && isLight(s.colors),
  }));
}

/** Who appears in the status row: people and companies you follow first, then a few active nearby. */
export function statusPeople(): { id: string; follow: boolean }[] {
  const fol = db.followed.filter((id) => P(id));
  const more = [...listPeople().slice(0, 6), ...Object.keys(db.BIZ_SAMPLE).filter((b) => openJobs().some((p) => p.client === b)).slice(0, 3)].filter((id) => !has(fol, id) && P(id));
  return [...fol.map((id) => ({ id, follow: true })), ...more.slice(0, Math.max(0, 9 - fol.length)).map((id) => ({ id, follow: false }))];
}

/** A person's or company's statuses, made from their real activity. Actions are passed in to keep this file UI-free. */
export function storiesOf(id: string, act: { job: (id: string) => void; chat: (id: string) => void; profile: (id: string) => void }): Story[] {
  const p = P(id);
  if (!p) return [];
  const head = { name: p.name, pic: p.photo, round: !p.biz };
  const out: Story[] = [];
  if (p.biz) {
    openJobs()
      .filter((po) => po.client === id)
      .slice(0, 2)
      .forEach((po, i) =>
        out.push({ key: `${id}-j${i}`, colors: GRADS[i % 2 ? 1 : 0], icon: 'job', chip: 'We’re hiring', title: po.title || 'Open role', text: [po.budget, po.area, po.type].filter(Boolean).join(' · '), cta: 'See job', onCta: () => act.job(po.id), sponsor: { ...head, sub: po.time } }),
      );
    if (!out.length) out.push({ key: `${id}-a`, colors: GRADS[1], icon: 'storefront', chip: 'Company', title: `Inside ${p.name}`, text: p.about || 'Follow to see their jobs and updates.', cta: 'See page', onCta: () => act.profile(id), sponsor: { ...head, sub: 'Today' } });
    return out;
  }
  const posts = db.POSTS.filter((po) => po.by === id && po.kind !== 'request');
  posts.slice(0, 3).forEach((po, i) => {
    if (po.kind === 'avail')
      out.push({ key: po.id, colors: GRADS[2], icon: 'clock', chip: 'Available today', title: (po.slots || []).join(' · ') || 'Free slots today', text: po.text || '', cta: `Book ${fname(p.name)}`, onCta: () => act.profile(id), sponsor: { ...head, sub: po.time } });
    else
      out.push({
        key: po.id,
        colors: GRADS[(i + 3) % GRADS.length],
        pic: po.img || po.src,
        icon: po.img || po.src ? undefined : 'wrench',
        chip: po.job || 'New work',
        title: po.job || (po.text || '').split(/[.!]/)[0].slice(0, 48),
        text: po.text || '',
        cta: 'Message',
        onCta: () => act.chat(id),
        sponsor: { ...head, sub: po.time },
        dark: !(po.img || po.src) && isLight(GRADS[(i + 3) % GRADS.length]),
      });
  });
  if (!out.length) out.push({ key: `${id}-r`, colors: GRADS[0], icon: 'wrench', chip: p.role, title: `${p.role} in ${p.area}`, text: `${fname(p.name)} is taking bookings this week.`, cta: 'See profile', onCta: () => act.profile(id), sponsor: { ...head, sub: 'Today' } });
  return out;
}

const seenList = () => ((db.PREF as any).seenSt as string[] | undefined) || [];
export const seen = (id: string) => seenList().includes(id);
export function markSeen(id: string) {
  if (seen(id)) return;
  (db.PREF as any).seenSt = [...seenList(), id];
  bump();
}
/** Quick captions people can tap instead of typing. */
export const STATUS_IDEAS = () =>
  isW() ? ['Available today 👋', 'Just finished a job ✅', 'Taking bookings this week', 'New skill unlocked 🎓', 'Looking for work in my area'] : ['We’re hiring 🚀', 'Behind the scenes at work', 'New internship open', 'Thank you, customers 🙏'];
