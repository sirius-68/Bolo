/* "What's new" stories, shown once after an update. Add a slide here with every release. */
import { router } from 'expo-router';
import { db, ui } from '../data/db';
import { bump } from './live';
import { showStories, Story } from '../components/Stories';
import { openPayments } from '../sheets/account';

export const WHATS_NEW_ID = '2026-10-31e';

/** Slides added in the latest update. */
const LATEST = ['feed', 'teach'];

export const WHATS_NEW: Story[] = [
  { key: 'feed', colors: ['#3d5af1', '#1b2a9b'], icon: 'feed', chip: 'New tab', title: 'Your work feed', text: 'Home → Feed shows only the work people share, people you follow first, with Work in action videos along the way.' },
  { key: 'teach', colors: ['#7c5cff', '#3b1fa8'], icon: 'cap', chip: 'For everyone', title: 'Teach a course', text: 'Tailor, plumber, developer, baker: anyone can now run a course with live classes and get paid to their wallet.', cta: 'Start teaching', onCta: () => router.push('/teach' as any) },
  { key: 'wallet', colors: ['#2fbf7a', '#0f6e45'], icon: 'shield', chip: 'Safe payments', title: 'Your bolo wallet', text: 'Add money from mobile money, card or bank. When you hire, the price waits in escrow and is released only when you confirm the job is done.', cta: 'Open my wallet', onCta: () => router.push('/wallet' as any) },
  { key: 'learn', colors: ['#7c5cff', '#3b1fa8'], icon: 'cap', chip: 'New for you', title: 'My learning', text: 'All your courses in one place, with your progress, the next live class and one tap to continue your lesson.', cta: 'Open My learning', onCta: () => router.push('/courses?tab=mine' as any) },
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
