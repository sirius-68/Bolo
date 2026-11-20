/* "What's new" stories, shown once after an update. Add a slide here with every release. */
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, ui } from '../data/db';
import { showStories, Story } from '../components/Stories';

export const WHATS_NEW_ID = '2026-11-20-getit';

/** Slides added in the latest update. */
const LATEST = ['getit', 'sayit', 'threetabs', 'onenumber', 'offerskill'];

/* The slides from before the redesign described screens that are hidden for now (the feed, courses, mentors,
   experts): they are in this file's history and come back with those screens. */
export const WHATS_NEW: Story[] = [
  { key: 'getit', colors: ['#ff3b1f', '#a8240f'], icon: 'sparkle', chip: 'New name, new look', title: 'bolo is now getit', text: 'One big button. Tap it, say what you need in your own words, and see good workers near you. Call or message one, or ask several for a price.' },
  { key: 'sayit', colors: ['#2b2926', '#171615'], icon: 'mic', chip: 'New', title: 'Just say it', text: 'Tap the big button and speak: “my tap is leaking”, in English, French or Pidgin. getit works out who you need. You can always type instead.' },
  { key: 'threetabs', colors: ['#2b2926', '#171615'], icon: 'chat', chip: 'Simpler', title: 'Find, Jobs, Inbox', text: 'Three tabs and nothing else to learn. Jobs follows each job from booked to done. Inbox keeps your chats and your updates. Your account, your area and dark or light mode are behind the person button at the top.', cta: 'Open Inbox', onCta: () => router.push('/inbox' as any) },
  { key: 'onenumber', colors: ['#2b2926', '#171615'], icon: 'phone', chip: 'Simpler', title: 'No password to remember', text: 'Looking is free and needs no account. When you call, message or book, enter your number or email once and type the code we send you.' },
  { key: 'offerskill', colors: ['#ff3b1f', '#a8240f'], icon: 'wrench', chip: 'For workers', title: 'Offer a skill', text: 'Tap the person button, then “Get work on getit”. Two short steps: your main skill, and how you work. Go available with one tap and pause when you are busy.' },
];

const SEEN_KEY = 'bolo.seenNew';
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
