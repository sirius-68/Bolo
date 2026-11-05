/* Crash and error reporting (Sentry). Off unless the build sets EXPO_PUBLIC_SENTRY_DSN.
   No personal data is sent: no names, emails, phone numbers or IP addresses. */
import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';
export const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || 'production';

let on = false;
export function startMonitoring() {
  if (!DSN || on) return;
  on = true;
  Sentry.init({
    dsn: DSN,
    environment: APP_ENV,
    release: `bolo@${Constants.expoConfig?.version || '1.0.0'}`,
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    beforeSend(e) {
      if (e.user) e.user = { id: e.user.id };
      return e;
    },
  });
}

/** Tie reports to the account id only (never name, email or phone). */
export function setMonitorUser(id: string | null) {
  if (on) Sentry.setUser(id ? { id } : null);
}

export function report(err: unknown, where?: string) {
  if (on) Sentry.captureException(err, where ? { tags: { where } } : undefined);
}
