/* "What's new" stories, shown once after an update. Add a slide here with every release. */
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, ui } from '../data/db';
import { showStories, Story } from '../g/Stories';

export const WHATS_NEW_ID = '2026-11-20-getit-1';

/** Slides added in the latest update. */
const LATEST = ['getit', 'sayit', 'prices', 'follow', 'offerskill'];

export const WHATS_NEW: Story[] = [
  { key: 'getit', colors: ['#ff3b1f', '#a8240f'], icon: 'spark', chip: 'New', title: 'Welcome to getit', text: 'One big button. Tap it, say what you need in your own words, and see good workers near you. Call or message one, or ask several for a price.' },
  { key: 'sayit', colors: ['#2b2926', '#171615'], icon: 'mic', chip: 'New', title: 'Just say it', text: 'Tap the big button and speak: “my tap is leaking”, in English, French or Pidgin. getit works out who you need. You can always type instead.' },
  { key: 'prices', colors: ['#ff3b1f', '#a8240f'], icon: 'bell', chip: 'New', title: 'Get prices, pick one', text: 'Ask several workers at once. Each offer comes to you as it arrives, with the price and when they can come. Book the one you like.' },
  { key: 'follow', colors: ['#2b2926', '#171615'], icon: 'jobs', chip: 'New', title: 'Follow the job', text: 'Booked, on the way, working, done. You see each step, pay the worker directly at the end, and rate how it went.' },
  { key: 'offerskill', colors: ['#ff3b1f', '#a8240f'], icon: 'check', chip: 'For workers', title: 'Offer a skill', text: 'Tap the person button, then “Get work on getit”. Two short steps: your main skill, and how you work. Jobs near you come to your phone.' },
];

const SEEN_KEY = 'getit.seenNew';
let checking = false;
/** Show this update's "What's new" once per phone. The mark is kept on the phone itself (not in the account's
    data), so logging out and back in never shows it again; only a newer update does. */
export async function maybeShowWhatsNew() {
  if (checking) return;
  checking = true;
  try {
    // on a slow start the app opens before it knows whether this phone is new: wait for that answer (up to 20 s)
    for (let i = 0; i < 40 && !ui.bootDone; i++) await new Promise((r) => setTimeout(r, 500));
    // older versions kept the mark with the account data: carry it over
    const seen = (await AsyncStorage.getItem(SEEN_KEY)) || ((db.PREF as any).seenNew as string | undefined) || '';
    if (seen === WHATS_NEW_ID) return;
    await AsyncStorage.setItem(SEEN_KEY, WHATS_NEW_ID);
    // A fresh install (or a first log-in on this phone) has nothing "new" to compare with.
    if (!seen && !ui.returning) return;
    const slides = WHATS_NEW.filter((x) => LATEST.includes(x.key));
    if (slides.length) showStories(slides, { label: 'What’s new on getit' });
  } catch {
    // storage unavailable: better to skip than to show it on every start
  } finally {
    checking = false;
  }
}
export const openWhatsNew = () => showStories(WHATS_NEW, { label: 'What’s new on getit' });
