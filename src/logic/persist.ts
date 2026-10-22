import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, makeDb, setDb, DB } from '../data/db';
import { subscribe } from './live';

const KEY = 'bolo.db.v3';
let timer: ReturnType<typeof setTimeout> | null = null;
let enabled = false;

/** Load the saved model (if any). Called once before the first screen renders. */
export async function restore(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw) as DB;
    const fresh = makeDb();
    if (!saved || saved.v !== fresh.v) return false;
    // fill in any fields added since this copy was saved
    setDb({ ...fresh, ...saved, user: { ...fresh.user, ...saved.user }, PR: { ...fresh.PR, ...saved.PR }, PREF: { ...fresh.PREF, ...saved.PREF } });
    return true;
  } catch {
    return false;
  }
}

/** Save shortly after changes (debounced, off the interaction path). */
export function startAutosave() {
  if (enabled) return;
  enabled = true;
  subscribe(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(save, 800);
  });
}
export async function save() {
  try {
    if (!db.loggedIn) return;
    await AsyncStorage.setItem(KEY, JSON.stringify(db));
  } catch {}
}
export async function clearSaved() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
