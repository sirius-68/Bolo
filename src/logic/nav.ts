import { router } from 'expo-router';
import { ui } from '../data/db';

/** Thin wrappers over expo-router so screens read like the prototype (go / back / reset). */
export const go = (path: string) => router.push(path as any);
export const replace = (path: string) => router.replace(path as any);
export const back = () => (router.canGoBack() ? router.back() : router.replace('/feed' as any));
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
export function openCourses(cat?: string | null) {
  router.push((cat ? `/courses?cat=${encodeURIComponent(cat)}` : '/courses') as any);
}
export function openMe(tab?: string) {
  if (tab) ui.meTab = tab;
  resetTo('/me');
}
