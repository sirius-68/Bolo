import { router } from 'expo-router';
import { ui } from '../data/db';

/** Thin wrappers over expo-router so screens read like the prototype (go / back / reset). */
export const go = (path: string) => router.push(path as any);

/** The screen on top right now (kept by the root layout). */
let here = '';
export const setHere = (path: string) => (here = path);
/** Open a screen, unless it is already the one on top: a second tap, or a pop-up about the screen you are on,
    must not stack a copy of it (Back would then only lead to the copy). */
export function openScreen(path: string) {
  if (here && here === path.split('?')[0]) return;
  router.push(path as any);
}
export const back = () => (router.canGoBack() ? router.back() : router.replace('/find' as any));
/** Clear the stack and land on a tab. */
export function resetTo(path: string) {
  try {
    if (router.canDismiss()) router.dismissAll();
  } catch {}
  router.replace(path as any);
}
export function openProfile(id: string) {
  if (id === 'me') {
    resetTo('/me');
    return;
  }
  router.push(`/profile/${id}` as any);
}
export function openTrack(id: string) {
  router.push(`/track/${id}` as any);
}
export function openBrowse(mode: 'people' | 'jobs' | 'companies') {
  router.push(`/browse?mode=${mode}` as any);
}
export function openCourses(cat?: string | null, tab?: 'mine' | 'explore') {
  const q = [cat ? `cat=${encodeURIComponent(cat)}` : '', tab ? `tab=${tab}` : ''].filter(Boolean).join('&');
  router.push(('/courses' + (q ? '?' + q : '')) as any);
}
export function openMe(tab?: string) {
  if (tab) ui.meTab = tab;
  resetTo('/me');
}
