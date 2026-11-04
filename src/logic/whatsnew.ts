/* "What's new" stories, shown once after an update. Add a slide here with every release. */
import { router } from 'expo-router';
import { db, ui } from '../data/db';
import { bump } from './live';
import { showStories, Story } from '../components/Stories';
import { openPayments } from '../sheets/account';

export const WHATS_NEW_ID = '2026-11-04';

/** Slides added in the latest update. */
const LATEST = ['experts', 'courselinks', 'listcourse'];

export const WHATS_NEW: Story[] = [
  { key: 'experts', colors: ['#3d5af1', '#1b2a9b'], icon: 'verified', chip: 'Career', title: 'Book a career expert', text: 'CV reviews, mock interviews and career plans with checked, rated experts. Pick a service, pay safely with your wallet and agree the time in chat.', cta: 'Find an expert', onCta: () => router.push('/experts' as any) },
  { key: 'courselinks', colors: ['#a9b6ff', '#5b6bd6'], icon: 'globe', chip: 'Courses', title: 'Courses open on the school’s site', text: 'Tap any course to open its own website right inside bolo, and sign up there. Save the ones you like with the bookmark.', cta: 'Explore courses', onCta: () => router.push('/courses' as any) },
  { key: 'listcourse', colors: ['#7c5cff', '#3b1fa8'], icon: 'cap', chip: 'For trainers', title: 'List your course in a minute', text: 'Add the link to your course page, a title and price, and we send you learners. Running a school? bolo on the web has the full toolkit.', cta: 'List a course', onCta: () => router.push('/teach' as any) },
  { key: 'cvpro', colors: ['#6d4cff', '#14206e'], icon: 'file', chip: 'Pro', title: 'New CV designs', text: 'Five professional CV templates, Classic and Modern. Preview any of them with your own details; save as PDF with Pro.' },
  { key: 'rate', colors: ['#f6ee5c', '#e3c400'], icon: 'star', chip: 'Courses', title: 'Rate courses you took', text: 'Took a course? Open it, tap More → About this course and give it 1 to 5 stars. Ratings help everyone choose.', dark: true },
  { key: 'jobshare', colors: ['#2fbf7a', '#0f6e45'], icon: 'share', chip: 'Jobs', title: 'Share jobs, find them faster', text: 'Share any job with friends in one tap. New filters for jobs and people, and a clearer notifications page.' },
  { key: 'feed', colors: ['#3d5af1', '#1b2a9b'], icon: 'feed', chip: 'New tab', title: 'Your work feed', text: 'Home → Feed shows only the work people share, people you follow first, with Work in action videos along the way.' },
  { key: 'wallet', colors: ['#2fbf7a', '#0f6e45'], icon: 'shield', chip: 'Safe payments', title: 'Your bolo wallet', text: 'Add money from mobile money, card or bank. When you hire, the price waits in escrow and is released only when you confirm the job is done.', cta: 'Open my wallet', onCta: () => router.push('/wallet' as any) },
  { key: 'adjob', colors: ['#3d5af1', '#1b2a9b'], icon: 'job', chip: 'Jobs', title: 'Ads lead to the job', text: 'Tap Apply or See job on any ad and you land on the job itself, ready to apply.' },
  { key: 'group', colors: ['#3d5af1', '#1b2a9b'], icon: 'follow', chip: 'Messages', title: 'Group pages', text: 'Tap a group’s name in a chat to see its members, photos, files, links and invite link. Mute or leave in one tap.', cta: 'Open messages', onCta: () => router.push('/inbox') },
  { key: 'pay', colors: ['#ff8a3d', '#c2410c'], icon: 'coins', chip: 'Payments', title: 'Pay your way', text: 'MTN MoMo, Orange Money, Airtel, M-Pesa, Wave, cards, PayPal, Google Pay and bank transfer. Set your favourite as default.', cta: 'Add a payment method', onCta: () => openPayments() },
  { key: 'world', colors: ['#7c5cff', '#3b1fa8'], icon: 'globe', chip: 'Everywhere', title: 'Every country, every city', text: 'Pick your country and city anywhere in the world. The map, distances and phone numbers follow you.' },
  { key: 'ads', colors: ['#f6ee5c', '#e3c400'], icon: 'rocket', chip: 'For businesses', title: 'Full-screen story ads', text: 'Businesses can now run ads like this one and choose how many seconds people watch before they can close it.', dark: true },
];

/** Show the latest "What's new" once. */
export function maybeShowWhatsNew() {
  const seen = (db.PREF as any).seenNew;
  if (seen === WHATS_NEW_ID) return;
  (db.PREF as any).seenNew = WHATS_NEW_ID;
  bump();
  // Only for people updating the app; a fresh install has nothing "new" to compare with.
  if (!ui.returning) return;
  // Saw the previous update's stories already → only this update's slides.
  showStories(seen ? WHATS_NEW.filter((x) => LATEST.includes(x.key)) : WHATS_NEW, { label: 'What’s new on bolo' });
}
export const openWhatsNew = () => showStories(WHATS_NEW, { label: 'What’s new on bolo' });
