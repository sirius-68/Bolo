/* Voice and video calls (Agora). The server keeps the call (who calls whom, ringing → accepted → ended)
   and hands out the Agora pass; this module starts calls, answers them, and opens the call screen when
   someone rings while bolo is open. */
import { router } from 'expo-router';
import { Vibration } from 'react-native';
import { db } from '../data/db';
import { supabase } from '../lib/supabase';
import { toast } from '../ui/overlay';
import { bump } from './live';
import { friendly } from './remote';
import { L, convFor, ensurePeople } from './server';
import { isW } from './core';

export type Call = { id: string; conversation_id: string; caller_id: string; callee_id: string; kind: 'voice' | 'video'; status: 'ringing' | 'accepted' | 'declined' | 'missed' | 'ended' | 'busy'; created_at: string; answered_at?: string | null; ended_at?: string | null };

/** Calls this phone knows about, kept live by realtime (see watchCalls). */
export const CALLS: Record<string, Call> = {};
const listeners = new Set<(c: Call) => void>();
export function onCall(fn: (c: Call) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
/** The other person in a call, as an app id. */
export const otherOf = (c: Call) => L(c.caller_id === db.uid ? c.callee_id : c.caller_id);

/** The Agora native module (missing in Expo Go): calls are unavailable without it. */
export const agora: any = (() => {
  try {
    return require('react-native-agora');
  } catch {
    return null;
  }
})();
export const callsAvailable = () => !!agora;

/** Call someone from a 1-to-1 chat (key = the chat's app id). */
export async function startCall(key: string, kind: 'voice' | 'video') {
  if (!agora) return toast('Calls need the latest version of bolo');
  if (key.startsWith('g_')) return toast('Calls are for 1-to-1 chats');
  try {
    const cid = await convFor(key, isW() ? 'W' : 'C');
    const { data, error } = await supabase.rpc('start_call', { p_conversation: cid, p_kind: kind });
    if (error) throw error;
    const id = data as string;
    const { data: row } = await supabase.from('calls').select('*').eq('id', id).maybeSingle();
    if (row) CALLS[id] = row as Call;
    if (row?.status === 'busy') return toast('They’re on another call. Try again in a moment');
    router.push(`/call?id=${id}` as any);
  } catch (e) {
    toast(friendly(e));
  }
}
export async function answerCall(id: string, accept: boolean) {
  Vibration.cancel();
  const { error } = await supabase.rpc('answer_call', { p_call: id, p_accept: accept });
  if (error) toast(friendly(error));
  return !error;
}
export async function endCall(id: string) {
  Vibration.cancel();
  await supabase.rpc('end_call', { p_call: id });
}
/** A pass to join the call's Agora channel. */
export async function callPass(id: string): Promise<{ appId: string; token: string; channel: string; uid: number } | { error: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('agora-token', { method: 'POST', body: { call: id } });
    if (error) {
      const body = await (error as any).context?.json?.().catch(() => null);
      return { error: body?.error || friendly(error) };
    }
    return data;
  } catch (e) {
    return { error: friendly(e) };
  }
}

let ringing: string | null = null;
function incoming(c: Call) {
  if (c.callee_id !== db.uid || c.status !== 'ringing' || ringing === c.id) return;
  // ignore old rings (e.g. a missed call from when the app was closed)
  if (Date.now() - +new Date(c.created_at) > 45_000) return;
  ringing = c.id;
  Vibration.vibrate([0, 700, 500, 700, 500, 700, 500, 700, 500, 700], false);
  void ensurePeople([c.caller_id]).then(() => {
    bump();
    router.push(`/call?id=${c.id}&incoming=1` as any);
  });
}
/** Live updates on my calls (subscribed with the rest of realtime). */
export function applyCallChange(row: any) {
  if (!row?.id) return;
  const c = row as Call;
  CALLS[c.id] = { ...(CALLS[c.id] || {}), ...c };
  if (c.status !== 'ringing' && ringing === c.id) {
    Vibration.cancel();
    ringing = null;
  }
  incoming(CALLS[c.id]);
  listeners.forEach((fn) => fn(CALLS[c.id]));
}
export async function loadCall(id: string) {
  const { data } = await supabase.from('calls').select('*').eq('id', id).maybeSingle();
  if (data) applyCallChange(data);
  return data as Call | null;
}
