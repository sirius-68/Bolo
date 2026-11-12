// agora-token: a short-lived Agora pass for one call.
// Only the two people in a call that is ringing or in progress get one. The App Certificate stays here
// (Supabase function secret AGORA_APP_CERTIFICATE); the app only ever receives the App ID and the pass.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import agora from 'npm:agora-token@2.0.5';

const { RtcTokenBuilder, RtcRole } = agora as any;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/** A stable Agora user number (1 … 2^31) for an account. */
function agoraUid(userId: string) {
  let h = 2166136261;
  for (const ch of userId.replace(/-/g, '')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return (h % 2147483646) + 1;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const appId = Deno.env.get('AGORA_APP_ID');
  const cert = Deno.env.get('AGORA_APP_CERTIFICATE');
  if (!url || !anonKey) return json({ error: 'Server is not configured' }, 500);
  if (!appId || !cert) return json({ error: 'Calls aren’t switched on yet' }, 503);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Sign in first' }, 401);
  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: who } = await asUser.auth.getUser(authHeader.slice(7));
  const user = who?.user;
  if (!user) return json({ error: 'Sign in first' }, 401);

  let callId = '';
  try {
    callId = String((await req.json())?.call || '');
  } catch {
    return json({ error: 'Which call?' }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(callId)) return json({ error: 'Which call?' }, 400);

  // row rules: a person only sees calls they're part of
  const { data: call } = await asUser.from('calls').select('id,status,caller_id,callee_id,kind').eq('id', callId).maybeSingle();
  if (!call) return json({ error: 'Call not found' }, 404);
  if (call.status !== 'ringing' && call.status !== 'accepted') return json({ error: 'This call has ended' }, 410);

  const uid = agoraUid(user.id);
  const ttl = 60 * 60 * 2; // two hours is plenty for one call
  const token = RtcTokenBuilder.buildTokenWithUid(appId, cert, call.id, uid, RtcRole.PUBLISHER, ttl, ttl);
  return json({ appId, token, channel: call.id, uid, kind: call.kind, expiresIn: ttl });
});
