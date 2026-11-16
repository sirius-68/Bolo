/* Live signals in chats.
   - Typing: while I write, the other person's app is told every couple of seconds (nothing is stored). Each
     account listens on its own small channel; a typing signal names the chat it is about.
   - Online / last seen: the app says "I'm here" about once a minute while it is open; chats show "online" or
     "last seen …" for the other person, unless one of the two switched it off in Privacy.
   - Delivered: when this phone has received new messages, the senders see two ticks.
   All three need the newer server. On an older one they simply stay quiet. */
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';
import { db, Thread } from '../data/db';
import { bump } from './live';
import { ME, convRow, membersOf } from './server';

/** "that function is not on this server" (an older server) */
const missing = (e: any) => /PGRST202|could not find the function|does not exist|schema cache/i.test(`${e?.code || ''} ${e?.message || ''}`);

const threadOf = (cid: string): Thread | undefined => {
  const c = db.CONV[cid];
  return c ? (c.inbox === 'W' ? db.THREADS_W : db.THREADS_C)[c.key] : undefined;
};

/* ---------------------------------------------------------------- typing */
const SHOW_MS = 5000; // a signal counts for this long; the writer repeats it while typing
const SEND_EVERY = 2500;
/** chat → the people typing in it right now (account id → the timer that clears them) */
const typers: Record<string, Record<string, any>> = {};
let mine: any = null; // my own channel, where signals for me arrive
const out: Record<string, { ch: any; ok: boolean; used: number }> = {}; // account id → their channel
const sentAt: Record<string, number> = {};

function setTyping(cid: string, on: boolean, uid: string) {
  const th = threadOf(cid);
  if (!th) return;
  const T = (typers[cid] = typers[cid] || {});
  clearTimeout(T[uid]);
  if (on) T[uid] = setTimeout(() => setTyping(cid, false, uid), SHOW_MS);
  else delete T[uid];
  const n = Object.keys(T).length;
  if ((th.typing || 0) === n) return;
  th.typing = n;
  bump();
}
/** Who is typing in this chat right now (their account ids); empty when nobody is. */
export const typingIn = (cid?: string): string[] => (cid && threadOf(cid)?.typing ? Object.keys(typers[cid] || {}) : []);

function listen() {
  const me = ME();
  if (!me) return;
  if (mine) {
    // still connected (or connecting): nothing to do; a dropped line is opened again
    if (['joined', 'joining'].includes(mine.state)) return;
    void supabase.removeChannel(mine);
    mine = null;
  }
  mine = supabase.channel('ping-' + me, { config: { broadcast: { self: false } } });
  mine
    .on('broadcast', { event: 'typing' }, (e: any) => {
      const p = e?.payload || {};
      const cid = String(p.c || '');
      // only for a chat I am in, from someone who is in it too
      const members = membersOf(cid);
      if (!cid || !members.some((m: any) => m.user_id === me)) return;
      const from = typeof p.u === 'string' && members.some((m: any) => m.user_id === p.u && p.u !== me) ? p.u : members.find((m: any) => m.user_id !== me)?.user_id;
      if (!from) return;
      setTyping(cid, p.on !== false, from);
    })
    .subscribe();
}
function channelTo(uid: string) {
  let o = out[uid];
  if (!o) {
    const ch = supabase.channel('ping-' + uid, { config: { broadcast: { self: false, ack: false } } });
    o = out[uid] = { ch, ok: false, used: Date.now() };
    ch.subscribe((s: string) => {
      const cur = out[uid];
      if (cur && cur.ch === ch) cur.ok = s === 'SUBSCRIBED';
    });
  }
  o.used = Date.now();
  return o;
}
function signal(cid: string, on: boolean) {
  const me = ME();
  const others = membersOf(cid).filter((m: any) => m.user_id !== me);
  // a big group would mean a lot of signals for little use
  if (!me || !others.length || others.length > 8) return;
  const group = convRow(cid)?.kind === 'group';
  for (const m of others) {
    const o = channelTo(m.user_id);
    // not connected yet: this signal is skipped, the next one (a moment later) goes through
    if (o.ok) void o.ch.send({ type: 'broadcast', event: 'typing', payload: { c: cid, on, ...(group ? { u: me } : {}) } }).catch?.(() => {});
  }
}
/** Call on every change of the message box. Sends at most one signal every couple of seconds. */
export function iAmTyping(cid: string | undefined, text: string) {
  if (!cid || !ME()) return;
  if (!text.trim()) return stoppedTyping(cid);
  // open the line first, so the next signal can go
  if (!sentAt[cid]) membersOf(cid).forEach((m: any) => m.user_id !== ME() && channelTo(m.user_id));
  const now = Date.now();
  if (now - (sentAt[cid] || 0) < SEND_EVERY) return;
  sentAt[cid] = now;
  signal(cid, true);
}
/** The message was sent, or the box was emptied, or the chat was left. */
export function stoppedTyping(cid?: string) {
  if (!cid || !sentAt[cid]) return;
  delete sentAt[cid];
  signal(cid, false);
}
/** Leaving a chat: close the lines that were opened to write in it (a little later, in case of a quick return). */
export function leftChat(cid?: string) {
  stoppedTyping(cid);
  setTimeout(() => {
    for (const uid of Object.keys(out))
      if (Date.now() - out[uid].used > 25000) {
        void supabase.removeChannel(out[uid].ch);
        delete out[uid];
      }
  }, 30000);
}

/* ---------------------------------------------------------------- online and last seen */
let seenOff = false; // the server doesn't have it (older server)
const seen: Record<string, number> = {}; // account id → last time their app said "I'm here"
let hereTimer: any = null;
const ONLINE_MS = 100000;

async function here() {
  if (seenOff || !ME() || AppState.currentState !== 'active') return;
  const { error } = await supabase.rpc('seen_now');
  if (error && missing(error)) seenOff = true;
}
/** Ask when these people were last here (the people in my chats). Marks direct chats "online". */
export async function loadSeen(uids?: string[]) {
  if (seenOff || !ME()) return;
  const me = ME();
  const ids = [...new Set(uids || Object.keys(db.CONV).flatMap((cid) => (convRow(cid)?.kind === 'group' ? [] : membersOf(cid).map((m: any) => m.user_id))))].filter((u) => u && u !== me).slice(0, 200);
  if (!ids.length) return;
  const { data, error } = await supabase.rpc('seen_of', { p_users: ids });
  if (error) {
    if (missing(error)) seenOff = true;
    return;
  }
  ids.forEach((u) => delete seen[u]);
  (data || []).forEach((r: any) => (seen[r.id] = +new Date(r.last_seen_at)));
  markOnline();
  bump();
}
function markOnline() {
  const me = ME();
  for (const cid of Object.keys(db.CONV)) {
    const th = threadOf(cid);
    if (!th || convRow(cid)?.kind === 'group') continue;
    const other = membersOf(cid).find((m: any) => m.user_id !== me)?.user_id;
    th.on = other && isOnline(other) ? 1 : 0;
  }
}
export const isOnline = (uid?: string) => !!uid && !!seen[uid] && Date.now() - seen[uid] < ONLINE_MS;
/** "online", "last seen 5 min ago", "last seen today at 14:05"… or '' when it isn't shared. */
export function seenLabel(uid?: string): string {
  const t = uid ? seen[uid] : 0;
  if (!t) return '';
  const ago = Date.now() - t;
  if (ago < ONLINE_MS) return 'online';
  const d = new Date(t);
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (ago < 3600000) return `last seen ${Math.max(1, Math.round(ago / 60000))} min ago`;
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(new Date()) - day(d)) / 86400000);
  if (days === 0) return `last seen today at ${hm}`;
  if (days === 1) return `last seen yesterday at ${hm}`;
  if (days < 7) return `last seen ${d.toLocaleDateString('en-GB', { weekday: 'long' })} at ${hm}`;
  return `last seen ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}
/** Privacy → "Show when I'm online". Saved on its own (older servers don't have it). */
export async function setShowSeen(on: boolean): Promise<boolean> {
  const was = db.PREF.showSeen;
  db.PREF.showSeen = on;
  bump();
  const { error } = await supabase.from('profiles').update({ show_seen: on }).eq('id', ME());
  if (error) {
    db.PREF.showSeen = was;
    bump();
    return false;
  }
  if (on) void loadSeen();
  else {
    Object.keys(seen).forEach((k) => delete seen[k]);
    markOnline();
    bump();
  }
  return true;
}

/* ---------------------------------------------------------------- delivered */
let deliveredOff = false;
let deliverTimer: any = null;
/** This phone has the new messages: let their senders see two ticks. Safe to call often.
    With a chat and a sender: their message has arrived, so they are no longer "typing". */
export function gotMessages(cid?: string, from?: string) {
  if (cid && from) setTyping(cid, false, from);
  if (deliveredOff || !ME() || deliverTimer) return;
  deliverTimer = setTimeout(async () => {
    deliverTimer = null;
    const { error } = await supabase.rpc('mark_delivered');
    if (error && missing(error)) deliveredOff = true;
  }, 800);
}

/* ---------------------------------------------------------------- start and stop */
let appSub: any = null;
export function startSignals() {
  if (!ME()) return;
  listen();
  gotMessages();
  void here().then(() => loadSeen());
  if (!hereTimer)
    hereTimer = setInterval(() => {
      void here();
      // while a chat list or a chat is on screen, "online" stays fresh
      if (AppState.currentState === 'active') void loadSeen();
    }, 60000);
  if (!appSub)
    appSub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        void here().then(() => loadSeen());
        gotMessages();
      }
    });
}
export function stopSignals() {
  if (mine) void supabase.removeChannel(mine);
  mine = null;
  for (const uid of Object.keys(out)) {
    void supabase.removeChannel(out[uid].ch);
    delete out[uid];
  }
  clearInterval(hereTimer);
  hereTimer = null;
  appSub?.remove?.();
  appSub = null;
  Object.keys(seen).forEach((k) => delete seen[k]);
  seenOff = false;
  deliveredOff = false;
}
