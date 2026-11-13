/* "What's new" stories, shown once after an update. Add a slide here with every release. */
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, ui } from '../data/db';
import { showStories, Story } from '../components/Stories';
import { openNotifSettings, openPayments } from '../sheets/account';

export const WHATS_NEW_ID = '2026-11-15';

/** Slides added in the latest update. */
const LATEST = ['callslist', 'yours', 'photos'];

export const WHATS_NEW: Story[] = [
  { key: 'callslist', colors: ['#7c5cff', '#3b1fa8'], icon: 'phone', chip: 'Calls', title: 'All your calls in one place', text: 'Open Messages and tap the phone button to see every call: made, received and missed. Several missed calls from one person show as one line with a count. Tap a call to open the chat, or call back in one tap.', cta: 'Open calls', onCta: () => router.push('/calls' as any) },
  { key: 'yours', colors: ['#2fbf7a', '#0f6e45'], icon: 'pin', chip: 'Your details', title: 'Your city and your CV, as you set them', text: 'Type your city and tap Save: it now stays, on every phone you log in on. The date of birth adds its own slashes, and your CV shows your own profession and skills.' },
  { key: 'photos', colors: ['#f6ee5c', '#e3c400'], icon: 'image', chip: 'Faster', title: 'Photos that load', text: 'Photos are made lighter before they are sent, so posts and jobs with pictures appear quickly. In a group, pull down to see its picture large. Mentorships and programs can now run for any length you choose.', dark: true },
  { key: 'ring', colors: ['#7c5cff', '#3b1fa8'], icon: 'phone', chip: 'Calls', title: 'Calls that ring', text: 'You now hear a tone while the other phone rings, and a ringtone when someone calls you. One tap starts one call, and missed calls from the same person show as a single notification.' },
  { key: 'tidy', colors: ['#f6ee5c', '#e3c400'], icon: 'sparkle', chip: 'Smoother', title: 'Faster to open, easier to trust', text: 'Home shows its layout while it loads. The notifications page, the message box and your service list are fixed, and your profile only counts what is really yours.', dark: true },
  { key: 'steady', colors: ['#3d5af1', '#1b2a9b'], icon: 'shield', chip: 'Reliability', title: 'Steadier everywhere', text: 'Pull down to refresh. If your connection drops, bolo keeps what you had on screen and messages wait with “Tap to retry”. Sign-up, log-in and password reset are smoother too.' },
  { key: 'honest', colors: ['#2fbf7a', '#0f6e45'], icon: 'eyeoff', chip: 'Privacy', title: 'You choose who finds you', text: 'Hide your profile from search in Settings → Privacy & security, review the people you blocked, and write to the bolo team from Help.', cta: 'Open settings', onCta: () => router.push('/settings' as any) },
  { key: 'push', colors: ['#f6ee5c', '#e3c400'], icon: 'bell', chip: 'Notifications', title: 'Never miss a message', text: 'New messages, offers, booking updates and calls now pop up on your phone, even when bolo is closed. Tap one to go straight there. Choose what you get in Settings → Notifications.', cta: 'Notification settings', onCta: () => openNotifSettings(), dark: true },
  { key: 'live', colors: ['#f6ee5c', '#e3c400'], icon: 'sparkle', chip: 'bolo is live', title: 'Real people, real jobs', text: 'Everything you see is now from real bolo members: jobs, people, posts and courses. Post a job or share your work and people near you see it right away.', dark: true },
  { key: 'chatlive', colors: ['#3d5af1', '#1b2a9b'], icon: 'chat', chip: 'Messages', title: 'Chat in real time', text: 'Messages arrive instantly, with read ticks. Send photos, documents and your location, or a quote that books the job when it’s accepted.', cta: 'Open messages', onCta: () => router.push('/inbox') },
  { key: 'calls', colors: ['#7c5cff', '#3b1fa8'], icon: 'video', chip: 'Calls', title: 'Voice and video calls', text: 'Call anyone you’re chatting with, or the worker on your booking, from the phone and camera buttons. Missed calls show in the chat.' },
  { key: 'tracklive', colors: ['#2fbf7a', '#0f6e45'], icon: 'nav', chip: 'Bookings', title: 'Follow the worker live', text: 'When a worker taps Start trip, you see them move on the map with an arrival time, until they arrive. Pay them directly as agreed: payments in bolo are coming soon.' },
  { key: 'safety', colors: ['#ff8a3d', '#c2410c'], icon: 'shield', chip: 'Safety', title: 'Report and block', text: 'Tap ⋯ on a post or the chat menu to report something to our team or block someone. Real ID checks are done by a bolo reviewer.' },
  { key: 'yourdata', colors: ['#2fbf7a', '#0f6e45'], icon: 'shield', chip: 'Privacy', title: 'Your data, your call', text: 'Download everything bolo stores about you, or delete your account for good, from Settings → Privacy & safety.', cta: 'Open settings', onCta: () => router.push('/settings' as any) },
  { key: 'experts', colors: ['#3d5af1', '#1b2a9b'], icon: 'verified', chip: 'Career', title: 'Book a career expert', text: 'CV reviews, mock interviews and career plans with checked, rated experts. Pick a service and agree the time in chat.', cta: 'Find an expert', onCta: () => router.push('/experts' as any) },
  { key: 'courselinks', colors: ['#a9b6ff', '#5b6bd6'], icon: 'globe', chip: 'Courses', title: 'Courses open on the school’s site', text: 'Tap any course to open its own website right inside bolo, and sign up there. Save the ones you like with the bookmark.', cta: 'Explore courses', onCta: () => router.push('/courses' as any) },
  { key: 'listcourse', colors: ['#7c5cff', '#3b1fa8'], icon: 'cap', chip: 'For trainers', title: 'List your course in a minute', text: 'Add the link to your course page, a title and price, and we send you learners.', cta: 'List a course', onCta: () => router.push('/teach' as any) },
  { key: 'cvpro', colors: ['#6d4cff', '#14206e'], icon: 'file', chip: 'Pro', title: 'New CV designs', text: 'Five professional CV templates, Classic and Modern. Preview any of them with your own details.' },
  { key: 'rate', colors: ['#f6ee5c', '#e3c400'], icon: 'star', chip: 'Courses', title: 'Rate courses you took', text: 'Took a course? Open it, tap More → About this course and give it 1 to 5 stars. Ratings help everyone choose.', dark: true },
  { key: 'jobshare', colors: ['#2fbf7a', '#0f6e45'], icon: 'share', chip: 'Jobs', title: 'Share jobs, find them faster', text: 'Share any job with friends in one tap. New filters for jobs and people, and a clearer notifications page.' },
  { key: 'feed', colors: ['#3d5af1', '#1b2a9b'], icon: 'feed', chip: 'New tab', title: 'Your work feed', text: 'Home → Feed shows only the work people share, people you follow first, with Work in action videos along the way.' },
  { key: 'group', colors: ['#3d5af1', '#1b2a9b'], icon: 'follow', chip: 'Messages', title: 'Group pages', text: 'Tap a group’s name in a chat to see its members, photos, files, links and invite link. Mute or leave in one tap.', cta: 'Open messages', onCta: () => router.push('/inbox') },
  { key: 'world', colors: ['#7c5cff', '#3b1fa8'], icon: 'globe', chip: 'Everywhere', title: 'Every country, every city', text: 'Pick your country and city anywhere in the world. The map, distances and phone numbers follow you.' },
];

const SEEN_KEY = 'bolo.seenNew';
let checking = false;
/** Show this update's "What's new" once per phone. The mark is kept on the phone itself (not in the account's
    data), so logging out and back in never shows it again; only a newer update does. */
export async function maybeShowWhatsNew() {
  if (checking) return;
  checking = true;
  try {
    // older versions kept the mark with the account data: carry it over
    const seen = (await AsyncStorage.getItem(SEEN_KEY)) || ((db.PREF as any).seenNew as string | undefined) || '';
    if (seen === WHATS_NEW_ID) return;
    await AsyncStorage.setItem(SEEN_KEY, WHATS_NEW_ID);
    // A fresh install (or a first log-in on this phone) has nothing "new" to compare with.
    if (!seen && !ui.returning) return;
    const slides = WHATS_NEW.filter((x) => LATEST.includes(x.key));
    if (slides.length) showStories(slides, { label: 'What’s new on bolo' });
  } catch {
    // storage unavailable: better to skip than to show it on every start
  } finally {
    checking = false;
  }
}
export const openWhatsNew = () => showStories(WHATS_NEW, { label: 'What’s new on bolo' });
