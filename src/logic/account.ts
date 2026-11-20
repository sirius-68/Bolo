/* Accounts: sign-up, roles (Regular / Business), businesses, Pro, profile data. */
import { db, makeDb, setDb, ui, uid, MyBiz, Service } from '../data/db';
import { toast } from '../g/notice';
import { bump, cancelAll } from './live';
import { curBiz, bizName, cityLabel, isW, nowT, madeUpService, ensureSkillList, P } from './core';
import { resumeSharing } from './work';
import { clearSaved } from './persist';
import { signOut } from './remote';

export const wantsWork = () => db.user.intents.includes('find');

/** Fresh account after sign-up / log-in. */
export function startApp(viaLogin = false) {
  db.loggedIn = true;
  db.user.role = db.user.bizOnly && db.BIZ.list.length ? 'client' : 'worker';
  if (db.user.role === 'client' && !db.BIZ.active) db.BIZ.active = db.BIZ.list[0].id;
  ui.feedView = 'all';
  ui.appStarted = true;
  // getit: someone who joined to offer a skill (or already lists one) starts in working mode; everyone else starts hiring
  db.user.mode = (viaLogin ? db.user.skills.length > 0 : wantsWork() && !db.user.intents.includes('hire')) ? 'work' : 'hire';
  resumeSharing();
  toast(viaLogin ? 'Welcome back!' : 'Welcome to getit' + (db.user.name ? ', ' + db.user.name.split(' ')[0] : '') + '!');
  bump();
}

export async function logout() {
  await signOut();
  cancelAll();
  await clearSaved();
  setDb(makeDb());
  ui.appStarted = false;
  ui.meTab = 'Profile';
  ui.feedView = 'all';
  bump();
}


export function services(): Service[] {
  // only what the person added themselves: nothing is listed, and no price is shown, on their behalf
  if (!db.PR.services) db.PR.services = [];
  if (db.PR.services.some(madeUpService)) db.PR.services = db.PR.services.filter((x) => !madeUpService(x));
  return db.PR.services;
}

