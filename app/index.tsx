import { Redirect } from 'expo-router';
import { db } from '../src/data/db';
import { hasStarted } from '../src/g/data';

/** Entry: straight to the app for anyone who has been here before; the opening screen only the first time. */
export default function Index() {
  if (db.loggedIn) return <Redirect href="/find" />;
  // signed out by an expired session: sign in again
  if (db.uid) return <Redirect href="/login" />;
  return <Redirect href={hasStarted() ? '/find' : '/splash'} />;
}
