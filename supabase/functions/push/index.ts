// push: sends a phone pop-up (Firebase Cloud Messaging) for a new notification.
// Called by the database (notification_push trigger, through pg_net) with {id}, and once at deploy with
// {setup: true} so the database learns this function's address and secret.
// Both calls must carry the x-push-secret header. The Firebase service account and the secret live only
// in this function's secrets (FCM_SERVICE_ACCOUNT_B64, PUSH_SECRET), set by the deploy workflow.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type ServiceAccount = { project_id: string; client_email: string; private_key: string };
function serviceAccount(): ServiceAccount | null {
  try {
    const b64 = Deno.env.get('FCM_SERVICE_ACCOUNT_B64');
    const raw = b64 ? new TextDecoder().decode(Uint8Array.from(atob(b64.trim()), (c) => c.charCodeAt(0))) : Deno.env.get('FCM_SERVICE_ACCOUNT');
    if (!raw) return null;
    const sa = JSON.parse(raw);
    return sa.project_id && sa.client_email && sa.private_key ? sa : null;
  } catch {
    return null;
  }
}

const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlText = (s: string) => b64url(new TextEncoder().encode(s));

/** Google OAuth access token for FCM, made from the service account (cached for most of its hour). */
let cached: { token: string; until: number } | null = null;
async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cached && cached.until > Date.now()) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const head = b64urlText(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64urlText(
    JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }),
  );
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claims}`)));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claims}.${b64url(sig)}` }),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out.access_token) throw new Error(`google token: ${res.status} ${out.error || ''}`);
  cached = { token: out.access_token, until: Date.now() + (Math.min(out.expires_in || 3600, 3600) - 300) * 1000 };
  return cached.token;
}

const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);
  const secret = Deno.env.get('PUSH_SECRET');
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret || !url || !serviceKey) return json({ error: 'Server is not configured' }, 500);
  if (req.headers.get('x-push-secret') !== secret) return json({ error: 'Not allowed' }, 401);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const body = await req.json().catch(() => ({}));

  // deploy: tell the database where to send new notifications
  if (body.setup) {
    const { error } = await admin.rpc('set_push_config', { p_url: `${url}/functions/v1/push`, p_secret: secret });
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, firebase: !!serviceAccount() });
  }

  const sa = serviceAccount();
  if (!sa) return json({ error: 'Firebase is not configured' }, 500);
  if (typeof body.id !== 'string') return json({ error: 'id required' }, 400);

  const { data: n } = await admin.from('notifications').select('id, recipient_id, actor_id, type, category, body, target, event_key, read_at').eq('id', body.id).maybeSingle();
  if (!n || n.read_at) return json({ ok: true, skipped: 'read or gone' });

  const { data: tokens } = await admin.from('push_tokens').select('token').eq('user_id', n.recipient_id);
  if (!tokens?.length) return json({ ok: true, skipped: 'no phones' });

  let name = 'bolo';
  if (n.actor_id) {
    const { data: p } = await admin.from('profiles').select('name').eq('id', n.actor_id).maybeSingle();
    if (p?.name) name = p.name;
  }

  // calls: ring only while the call is still ringing
  const isCall = n.type === 'call' && String(n.event_key).startsWith('call:');
  const callId = String(n.event_key).startsWith('call:') ? String(n.event_key).slice(5) : '';
  let kind = 'voice';
  if (isCall) {
    const { data: c } = await admin.from('calls').select('status, kind').eq('id', callId).maybeSingle();
    if (!c || c.status !== 'ringing') return json({ ok: true, skipped: 'call over' });
    kind = c.kind;
  }

  const title = n.actor_id ? name : 'bolo';
  const text = isCall
    ? `Incoming ${kind} call`
    : n.type === 'message' || n.type === 'missed' || !n.actor_id
      ? String(n.body || '')
      : String(n.body || '').charAt(0).toUpperCase() + String(n.body || '').slice(1);
  const channel = isCall ? 'calls' : 'messages';
  const data: Record<string, string> = {
    id: n.id,
    type: n.type,
    target: JSON.stringify(n.target || {}),
    ...(callId ? { call: callId } : {}),
  };

  const token = await accessToken(sa);
  const endpoint = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  let sent = 0;
  const gone: string[] = [];
  await Promise.all(
    tokens.map(async ({ token: to }) => {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: to,
            notification: { title: cut(title, 80), body: cut(text, 240) },
            data,
            android: {
              priority: 'HIGH',
              ttl: isCall ? '40s' : '86400s',
              collapse_key: n.event_key,
              notification: {
                channel_id: channel,
                tag: n.event_key,
                color: '#f6ee5c',
                icon: 'notification_icon',
                default_sound: true,
                notification_priority: isCall ? 'PRIORITY_MAX' : 'PRIORITY_HIGH',
                visibility: 'PRIVATE',
              },
            },
          },
        }),
      });
      if (res.ok) return void sent++;
      const err = await res.json().catch(() => ({}));
      const code = err?.error?.details?.find?.((d: any) => d.errorCode)?.errorCode || err?.error?.status;
      if (res.status === 404 || code === 'UNREGISTERED' || (code === 'INVALID_ARGUMENT' && /token/i.test(err?.error?.message || ''))) gone.push(to);
      else console.warn('push failed', res.status, code);
    }),
  );
  if (gone.length) await admin.from('push_tokens').delete().in('token', gone);
  return json({ ok: true, sent, removed: gone.length });
});
