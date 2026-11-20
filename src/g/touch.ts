/* Small things every screen uses: the tap feel, and going back safely. */
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

/** The light tick under a finger. */
export const tap = () => {
  Haptics.selectionAsync().catch(() => {});
};
/** Back one screen; when there is nothing behind (opened from a notification), home. */
export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/find' as any);
}
/** Go home and forget the screens on top of it. */
export function goHome() {
  try {
    if (router.canDismiss()) router.dismissAll();
  } catch {}
  router.replace('/find' as any);
}
