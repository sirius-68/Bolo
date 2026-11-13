import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, InteractionManager } from 'react-native';
import { db, makeDb, setDb, DB } from '../data/db';
import { subscribe } from './live';

const KEY = 'bolo.db.v3';
let timer: ReturnType<typeof setTimeout> | null = null;
let enabled = false;

const plain = (x: any) => !!x && typeof x === 'object' && !Array.isArray(x);
/** The saved copy laid over a fresh model: anything missing, or of the wrong kind, takes the fresh value.
    This is what lets a copy saved by an older version open safely in a newer one. */
export function fill(fresh: any, saved: any): any {
  if (saved === undefined) return fresh;
  if (Array.isArray(fresh)) return Array.isArray(saved) ? saved : fresh;
  if (plain(fresh)) {
    if (!plain(saved)) return fresh;
    const out: any = { ...saved };
    for (const k of Object.keys(fresh)) out[k] = fill(fresh[k], saved[k]);
    return out;
  }
  if (fresh !== null && saved !== null && typeof fresh !== typeof saved) return fresh;
  return saved;
}

/** Start-up guard: if the last two starts never got as far as "running fine", the saved copy is the likely
    cause (for example after an update), so this start skips it and loads everything fresh from the server. */
const BOOT = 'bolo.boot';
export async function bootGuard(): Promise<boolean> {
  try {
    const n = Number((await AsyncStorage.getItem(BOOT)) || 0);
    await AsyncStorage.setItem(BOOT, String(n + 1));
    // "survived" = still running after 12 seconds, or put in the background by the person (a crash does neither)
    setTimeout(bootOk, 12000);
    AppState.addEventListener('change', (st) => st !== 'active' && bootOk());
    if (n >= 2) {
      await AsyncStorage.removeItem(KEY);
      await AsyncStorage.setItem(BOOT, '0');
      return true;
    }
  } catch {}
  return false;
}
/** The app is running fine. */
export function bootOk() {
  void AsyncStorage.setItem(BOOT, '0').catch(() => {});
}

/** Load the saved model (if any). Called once before the first screen renders. */
export async function restore(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw) as DB;
    const fresh = makeDb();
    if (!plain(saved) || saved.v !== fresh.v) return false;
    setDb(fill(fresh, saved));
    return true;
  } catch {
    // a damaged copy: drop it, the server has the real data
    await clearSaved();
    return false;
  }
}

/** Save shortly after changes (debounced, off the interaction path). */
export function startAutosave() {
  if (enabled) return;
  enabled = true;
  subscribe(() => {
    if (timer) clearTimeout(timer);
    // writing the whole saved copy takes a moment: wait for a pause, and never do it in the middle of a scroll or an animation
    timer = setTimeout(() => InteractionManager.runAfterInteractions(() => void save()), 2500);
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
