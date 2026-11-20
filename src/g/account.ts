/* Contacting someone needs an account; looking doesn't. */
import { router } from 'expo-router';
import { db } from '../data/db';
import { toast } from '../ui/overlay';

/** True (and on the way to sign-up) when there is no account yet. `what` finishes "Create your free account to …". */
export function needAccount(what: string) {
  if (db.loggedIn) return false;
  db.user.intents = ['hire'];
  db.user.bizOnly = false;
  toast(`Create your free account to ${what}`);
  router.push('/signup');
  return true;
}
