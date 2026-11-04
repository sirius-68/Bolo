/* Courses on bolo are listings: the course itself lives on the school's or trainer's own website.
   Tapping a course opens that site inside bolo. Anyone can list a course here with a quick setup;
   the web version of bolo is the better place to manage many courses. */
import { router } from 'expo-router';
import { db, makeDb, uid, Course } from '../data/db';
import { bump } from './live';
import { toast } from '../ui/overlay';
import { bizName, curBiz, isW, myPhoto } from './core';
import { logoPic } from '../ui/kit';

/** Where course creators get the full toolkit. */
export const WEB_TEACH = 'https://bolo.app/teach';

/** "coursera.org/learn/x" → "https://coursera.org/learn/x"; null when it isn't a web address. */
export function normUrl(s: string): string | null {
  let u = s.trim().replace(/\s+/g, '');
  if (!u) return null;
  if (!/^[a-z]+:\/\//i.test(u)) u = 'https://' + u;
  // Pages open over https only (safer, and Android blocks plain http).
  u = u.replace(/^http:\/\//i, 'https://');
  if (!/^https:\/\/([a-z0-9-]+\.)+[a-z]{2,}(:\d{2,5})?([/?#][^\s]*)?$/i.test(u)) return null;
  return u;
}
export const domainOf = (u?: string) =>
  (u || '')
    .replace(/^[a-z]+:\/\//i, '')
    .replace(/^www\./i, '')
    .split(/[/?#:]/)[0]
    .toLowerCase();

/* ---------------- opening & saving ---------------- */
export function openCourseSite(c: Course) {
  if (!c.url) return false;
  c.views = (c.views || 0) + 1;
  const R = recent();
  const i = R.indexOf(c.id);
  if (i >= 0) R.splice(i, 1);
  R.unshift(c.id);
  R.splice(12);
  router.push({ pathname: '/web', params: { url: c.url, title: c.title, cid: c.id } } as any);
  return true;
}
const recent = () => (((db as any).CRECENT = (db as any).CRECENT || []) as string[]);
export const recentCourses = () => recent().map((id) => db.COURSES.find((c) => c.id === id)).filter((c): c is Course => !!c && !!c.url);
export const isSavedCourse = (id: string) => db.savedCourses.includes(id);
export function toggleSaveCourse(id: string) {
  const L = db.savedCourses;
  const i = L.indexOf(id);
  if (i >= 0) L.splice(i, 1);
  else L.unshift(id);
  toast(i >= 0 ? 'Removed from saved courses' : 'Saved. Find it in Courses → Saved');
  bump();
}
export const savedCourses = () => db.savedCourses.map((id) => db.COURSES.find((c) => c.id === id)).filter(Boolean) as Course[];

/* ---------------- listing your course ---------------- */
export type ListingForm = { url: string; title: string; by: string; cat: string; lv: string; fmt: 'Online' | 'Offline'; reg: string; dur: string; free: boolean; price: string; desc: string };
export const myListings = () => db.COURSES.filter((c) => c.mine && (isW() ? !c.biz : c.biz === db.BIZ.active));
export function blankListing(): ListingForm {
  return { url: '', title: '', by: isW() ? db.user.name || '' : bizName(curBiz()), cat: '', lv: 'Beginner', fmt: 'Online', reg: '', dur: '', free: false, price: '', desc: '' };
}
export function formOf(c: Course): ListingForm {
  return { url: c.url || '', title: c.title, by: c.prov.n, cat: c.cat, lv: c.lv, fmt: c.fmt === 'Offline' ? 'Offline' : 'Online', reg: c.reg, dur: c.dur, free: !c.price, price: c.price ? String(c.price) : '', desc: c.desc || '' };
}
/** What's missing before it can be published (empty = ready). */
export function listingErrors(f: ListingForm) {
  const e: Partial<Record<keyof ListingForm, string>> = {};
  if (!normUrl(f.url)) e.url = 'Add the full web address of the course page, e.g. myschool.com/excel';
  if (f.title.trim().length < 4) e.title = 'Give the course a clear title';
  if (!f.by.trim()) e.by = 'Who runs the course?';
  if (!f.cat) e.cat = 'Pick a field';
  if (f.fmt === 'Offline' && !f.reg.trim()) e.reg = 'Which town?';
  if (!f.free && !(+f.price > 0)) e.price = 'Enter the price, or choose Free';
  return e;
}
export function saveListing(f: ListingForm, id?: string): Course {
  const tutor = isW();
  const name = f.by.trim();
  const initials = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase() || 'C';
  const fields = {
    title: f.title.trim(),
    url: normUrl(f.url)!,
    prov: { n: name, logo: tutor ? (name === db.user.name ? myPhoto() : logoPic(initials, '#a9b6ff', '#000')) : curBiz()?.logo || logoPic(initials, '#a9b6ff', '#000') },
    cat: f.cat,
    lv: f.lv,
    dur: f.dur.trim() || 'Self-paced',
    fmt: f.fmt,
    reg: f.fmt === 'Offline' ? f.reg.trim() : '',
    price: f.free ? 0 : Math.round(+f.price),
    old: 0,
    desc: f.desc.trim(),
  };
  let c = id ? db.COURSES.find((x) => x.id === id) : undefined;
  if (c) Object.assign(c, fields);
  else {
    c = { id: uid('c'), type: 'Skill', prof: '', skills: [], mo: 0, mine: 1, biz: tutor ? undefined : db.BIZ.active, views: 0, ...fields } as Course;
    db.COURSES.unshift(c);
  }
  toast(id ? 'Listing updated' : 'Your course is listed in Career → Courses');
  bump();
  return c;
}
export function removeListing(id: string) {
  const i = db.COURSES.findIndex((c) => c.id === id && c.mine);
  if (i >= 0) db.COURSES.splice(i, 1);
  const s = db.savedCourses.indexOf(id);
  if (s >= 0) db.savedCourses.splice(s, 1);
  toast('Listing removed');
  bump();
}

/** Saves from before courses were listings: refresh the sample courses (now with their websites),
    drop the in-app test classes, and keep your own listings. */
export function ensureCourseListings() {
  const fresh = makeDb().COURSES;
  const mine = db.COURSES.filter((c) => c.mine);
  const stale = db.COURSES.some((c) => !c.mine && !c.url);
  if (!stale) return;
  db.COURSES = [...mine, ...fresh];
  // ratings that were simulated for the old sample courses
  const R = (db as any).CREVIEWS as Record<string, { by: string }[]> | undefined;
  if (R) Object.keys(R).forEach((k) => (R[k] = R[k].filter((r) => r.by === 'me')));
  db.savedCourses = db.savedCourses.filter((id) => db.COURSES.some((c) => c.id === id));
  // enrolments were for in-app classes, which are gone
  db.myLearning = [];
}

/** "XAF 25,000", "Free" or the site's own note ("See price on site"). */
export const priceLabel = (c: Course) => (c.price ? 'XAF ' + c.price.toLocaleString('en-US') : c.priceText || 'Free');
export const isFree = (c: Course) => !c.price && !c.priceText;
