/* "What's new" stories, shown once after an update. Add a slide here with every release. */
import { router } from 'expo-router';
import { db, ui } from '../data/db';
import { bump } from './live';
import { showStories, Story } from '../components/Stories';
import { openPayments } from '../sheets/account';

export const WHATS_NEW_ID = '2026-10-31';

export const WHATS_NEW: Story[] = [
  { key: 'course', colors: ['#2fbf7a', '#0f6e45'], icon: 'cap', chip: 'New for you', title: 'Your courses have a home', text: 'Each course you join now has its own page: lessons, a countdown to the next class, and a class group to chat with your trainer.', cta: 'See my courses', onCta: () => router.navigate('/(tabs)/career') },
  { key: 'group', colors: ['#3d5af1', '#1b2a9b'], icon: 'follow', chip: 'Messages', title: 'Group pages', text: 'Tap a group’s name in a chat to see its members, photos, files, links and invite link. Mute or leave in one tap.', cta: 'Open messages', onCta: () => router.push('/inbox') },
  { key: 'pay', colors: ['#ff8a3d', '#c2410c'], icon: 'coins', chip: 'Payments', title: 'Pay your way', text: 'MTN MoMo, Orange Money, Airtel, M-Pesa, Wave, cards, PayPal, Google Pay and bank transfer. Set your favourite as default.', cta: 'Add a payment method', onCta: () => openPayments() },
  { key: 'world', colors: ['#7c5cff', '#3b1fa8'], icon: 'globe', chip: 'Everywhere', title: 'Every country, every city', text: 'Pick your country and city anywhere in the world. The map, distances and phone numbers follow you.' },
  { key: 'ads', colors: ['#f6ee5c', '#e3c400'], icon: 'rocket', chip: 'For businesses', title: 'Full-screen story ads', text: 'Businesses can now run ads like this one and choose how many seconds people watch before they can close it.', dark: true },
];

/** Show the latest "What's new" once. */
export function maybeShowWhatsNew() {
  if ((db.PREF as any).seenNew === WHATS_NEW_ID) return;
  (db.PREF as any).seenNew = WHATS_NEW_ID;
  bump();
  // Only for people updating the app; a fresh install has nothing "new" to compare with.
  if (!ui.returning) return;
  showStories(WHATS_NEW, { label: 'What’s new on bolo' });
}
export const openWhatsNew = () => showStories(WHATS_NEW, { label: 'What’s new on bolo' });
