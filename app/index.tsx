import { Redirect } from 'expo-router';
import { db } from '../src/data/db';

/** Entry: signed-in users go straight to the app, everyone else sees the splash. */
export default function Index() {
  if (!db.loggedIn) return <Redirect href="/splash" />;
  return <Redirect href={db.user.role === 'client' ? '/home' : '/feed'} />;
}
