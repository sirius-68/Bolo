import { router } from 'expo-router';

/** The screen on top right now (kept by the root layout). */
let here = '';
export const setHere = (path: string) => (here = path);
export function resetTo(path: string) {
  try {
    if (router.canDismiss()) router.dismissAll();
  } catch {}
  router.replace(path as any);
}
