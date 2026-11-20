/* Phone pop-ups (push notifications through Firebase).
   - After sign-in the phone asks once for permission and registers itself (register_push_token).
   - The server sends a pop-up for each new notification (supabase/functions/push).
   - Tapping a pop-up opens what it is about: the chat, job, booking… or the incoming call.
   - While getit is open, pop-ups for the chat on screen and for calls are not shown (the app already shows them). */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../data/db';
import { supabase } from '../lib/supabase';
import { convRow, goFrom, myBizOf, notifBusiness, refreshChats, refreshNotifs, setNotifRead } from './server';
import { isW } from './core';

/** The native module (missing in Expo Go and on the web): push is simply off without it. */
const N: any = (() => {
  if (Platform.OS !== 'android') return null;
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
})();

const BUILD = Number(process.env.EXPO_PUBLIC_BUILD || 0);
let myToken: string | null = null;
let viewing: string | undefined; // the chat on screen (conversation id)
let wired = false;

/** What the server put in the pop-up, wherever this version of the library keeps it. */
type Payload = { id?: string; type?: string; call?: string; target?: any; biz?: string };
function payload(n: any): Payload {
  const c = n?.request?.content || {};
  const d: any = { ...(n?.request?.trigger?.remoteMessage?.data || {}), ...(c.data || {}) };
  for (const s of [c.dataString, typeof d.body === 'string' && d.body.startsWith('{') ? d.body : null])
    if (typeof s === 'string')
      try {
        Object.assign(d, JSON.parse(s));
      } catch {}
  let t = d.target;
  if (typeof t === 'string')
    try {
      t = JSON.parse(t);
    } catch {
      t = null;
    }
  return { id: d.id, type: d.type, call: d.call, target: t, biz: typeof d.biz === 'string' ? d.biz : undefined };
}

/** The chat screen tells us which chat is open, so its pop-ups stay quiet and old ones are cleared. */
export function setViewing(cid?: string) {
  viewing = cid;
  if (cid) void clearFor(cid);
}
async function clearFor(cid: string) {
  if (!N) return;
  try {
    const shown = await N.getPresentedNotificationsAsync();
    for (const n of shown) if (payload(n).target?.id === cid) await N.dismissNotificationAsync(n.request.identifier);
  } catch {}
}

/** The call screen is taking over: remove the ringing pop-up (and its ringtone) so the two don't ring together.
    Covers the three kinds there can be: the phone's own full-screen ring (it carries type "call"), a pop-up the
    app showed itself, and one Android showed for an older server ("Incoming … call" under the calls tag). */
export async function clearCallPopups() {
  if (!N) return;
  try {
    const shown = await N.getPresentedNotificationsAsync();
    for (const n of shown) {
      const c = n?.request?.content || {};
      const id = String(n?.request?.identifier || '');
      const ringing = payload(n).type === 'call' || (/tag=calls(%3A|:)/i.test(id) && /^incoming /i.test(String(c.body || '')));
      if (ringing) await N.dismissNotificationAsync(n.request.identifier);
    }
  } catch {}
}
/** This phone is registered for pop-ups, so a call that comes while getit is in the background rings through them. */
export const pushReady = () => !!myToken;

async function channels() {
  await N.setNotificationChannelAsync('messages', {
    name: 'Messages and updates',
    importance: N.AndroidImportance.HIGH,
    vibrationPattern: [0, 200, 120, 200],
    lightColor: '#f6ee5c',
    lockscreenVisibility: N.AndroidNotificationVisibility?.PRIVATE,
  });
  await N.setNotificationChannelAsync('calls', {
    name: 'Calls',
    importance: N.AndroidImportance.MAX,
    sound: 'default',
    vibrationPattern: [0, 700, 500, 700, 500, 700],
    lightColor: '#f6ee5c',
    lockscreenVisibility: N.AndroidNotificationVisibility?.PUBLIC,
    bypassDnd: false,
  });
  // Incoming calls while getit is closed: a real ringtone (30 seconds) and a long vibration, on the lock screen too.
  // A channel keeps the sound it was created with, so this is a new one next to the older "Calls".
  await N.setNotificationChannelAsync('ring', {
    name: 'Incoming calls',
    description: 'Rings when someone calls you and getit is closed',
    importance: N.AndroidImportance.MAX,
    sound: 'bolo_ring.mp3',
    audioAttributes: { usage: N.AndroidAudioUsage?.NOTIFICATION_RINGTONE, contentType: N.AndroidAudioContentType?.SONIFICATION },
    vibrationPattern: [0, 900, 600, 900, 600, 900, 600, 900, 600, 900],
    enableVibrate: true,
    lightColor: '#f6ee5c',
    lockscreenVisibility: N.AndroidNotificationVisibility?.PUBLIC,
    bypassDnd: false,
  });
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(ok: () => boolean, ms: number) {
  for (let t = 0; t < ms && !ok(); t += 250) await sleep(250);
}

const opened = new Set<string>();
/** Tapped pop-up → open what it is about (waits for sign-in and the first load on a cold start). */
async function openFrom(n: any) {
  const d = payload(n);
  const key = d.id || d.call;
  if (!key || opened.has(key)) return;
  opened.add(key);
  await until(() => !!db.uid && !!db.loggedIn, 15000);
  if (!db.uid) return;
  if (d.type === 'call' && d.call) {
    // still ringing → the call screen opens by itself (applyCallChange); otherwise show the chat
    const { loadCall } = require('./calls');
    const c = await loadCall(d.call);
    if (c?.status === 'ringing') return;
  }
  await until(() => !!db.syncedAt, 15000);
  if (d.id) void setNotifRead([d.id]).then(refreshNotifs);
  if (d.target?.k === 'chat' && !db.CONV[d.target.id]) await refreshChats();
  let go = goFrom(d.target);
  // a message from the getit team opens itself, to be read in full
  if (go?.k === 'notifs' && d.id) go = { k: 'notifs', id: d.id };
  // first to the profile it is for (a business page of mine, or the Regular profile), then to the thing itself
  const switched = await toProfileOf(d);
  const { goTo } = require('../sheets/goto');
  setTimeout(() => goTo(go || { k: 'notifs' }), switched ? 800 : 0);
}

/** A pop-up for a business page while I am on my Regular profile (or the other way round, or for another of my
    business pages): switch there first, the way the account switcher does. Returns true when it switched. */
async function toProfileOf(d: Payload): Promise<boolean> {
  let biz: string | null | undefined;
  const cid = d.target?.k === 'chat' ? String(d.target.id || '') : '';
  if (cid && db.CONV[cid]) biz = db.CONV[cid].inbox === 'C' ? convRow(cid)?.business_id || null : null;
  else if (d.biz !== undefined) biz = d.biz || null;
  else if (d.id) {
    biz = notifBusiness(d.id);
    if (biz === undefined) {
      const { data } = await supabase.from('notifications').select('business_id').eq('id', d.id).maybeSingle();
      biz = data ? data.business_id || null : undefined;
    }
  }
  if (biz === undefined) return false;
  const { useBiz, setRole } = require('./account');
  const { resetTo } = require('./nav');
  if (biz) {
    const mine = myBizOf(biz);
    if (!mine || (!isW() && db.BIZ.active === mine.id)) return false;
    useBiz(mine.id);
    resetTo('/find');
    return true;
  }
  if (isW() || db.user.bizOnly) return false;
  if (setRole('worker') !== 'ok') return false;
  resetTo('/find');
  return true;
}

function wire() {
  if (wired || !N) return;
  wired = true;
  N.setNotificationHandler({
    handleNotification: async (n: any) => {
      const d = payload(n);
      const quiet = d.type === 'call' || (d.target?.k === 'chat' && d.target.id === viewing);
      return { shouldShowBanner: !quiet, shouldShowList: !quiet, shouldPlaySound: !quiet, shouldSetBadge: false, shouldShowAlert: !quiet };
    },
  });
  // a call pop-up while getit is open: make sure the call screen rings even if live updates were asleep
  N.addNotificationReceivedListener((n: any) => {
    const d = payload(n);
    if (d.type === 'call' && d.call && db.uid) require('./calls').loadCall(d.call);
  });
  N.addNotificationResponseReceivedListener((r: any) => void openFrom(r.notification));
  N.addPushTokenListener?.((t: any) => {
    if (t?.data && db.uid) void save(String(t.data));
  });
}

async function save(token: string) {
  myToken = token;
  // what this phone can do with a call, for the server: "r1" it has the ringing channel, "r2" it rings by itself
  // (full screen on the lock screen) when the call comes as data
  const version = `${Constants.expoConfig?.version || '1.0.0'}${BUILD ? ' (' + BUILD + ')' : ''} r1 r2`;
  const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: 'android', p_version: version });
  if (error) console.warn('getit: push register failed', error.message);
}

/** At app start: listen for taps, and open the pop-up that started the app, if any. */
export function initPush() {
  if (!N) return;
  wire();
  void (async () => {
    try {
      const last = N.getLastNotificationResponse?.() ?? (await N.getLastNotificationResponseAsync?.());
      if (last) {
        await openFrom(last.notification);
        N.clearLastNotificationResponseAsync?.();
      }
    } catch {}
  })();
}

/** After sign-in: ask once for permission, then register this phone with the account. */
export async function registerPush() {
  if (!N || !db.uid) return;
  wire();
  try {
    await channels();
    let { status, canAskAgain } = await N.getPermissionsAsync();
    // ask once on this phone; after that it's the person's choice in Android settings
    if (status !== 'granted' && canAskAgain && !(await AsyncStorage.getItem('bolo.pushAsked'))) {
      await AsyncStorage.setItem('bolo.pushAsked', '1');
      ({ status } = await N.requestPermissionsAsync());
    }
    if (status !== 'granted') return;
    const t = await N.getDevicePushTokenAsync();
    if (t?.data) await save(String(t.data));
  } catch (e) {
    console.warn('getit: push unavailable', e);
  }
}

/** Before sign-out: this phone stops getting the account's pop-ups. */
export async function unregisterPush() {
  if (!N) return;
  try {
    const token = myToken || (await N.getDevicePushTokenAsync())?.data;
    if (token) await supabase.from('push_tokens').delete().eq('token', String(token));
    await N.dismissAllNotificationsAsync?.();
  } catch {}
  myToken = null;
}
