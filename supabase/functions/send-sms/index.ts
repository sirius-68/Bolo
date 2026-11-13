// send-sms: Supabase Auth calls this (the "Send SMS" hook) whenever a phone number needs a code:
// sign-up with a phone number, and password reset by phone. It sends the code by SMS through Brevo.
// Only Supabase Auth can call it: the request is signed with SEND_SMS_HOOK_SECRET.
// Secrets (set by the deploy workflow): BREVO_API_KEY, SEND_SMS_HOOK_SECRET. Optional: SMS_SENDER (default "bolo").
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (status: number, message: string) => json({ error: { http_code: status, message } }, status);

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail(405, 'Use POST');
  const secret = Deno.env.get('SEND_SMS_HOOK_SECRET');
  const key = Deno.env.get('BREVO_API_KEY');
  if (!secret || !key) return fail(500, 'Text messages are not set up yet. Use your email instead.');

  let phone = '';
  let otp = '';
  try {
    const payload = await req.text();
    const wh = new Webhook(secret.replace('v1,whsec_', ''));
    const data = wh.verify(payload, Object.fromEntries(req.headers)) as { user?: { phone?: string }; sms?: { otp?: string } };
    phone = String(data.user?.phone || '').replace(/[^\d]/g, '');
    otp = String(data.sms?.otp || '');
  } catch {
    return fail(401, 'Not allowed');
  }
  if (phone.length < 8 || !/^\d{4,10}$/.test(otp)) return fail(400, 'Bad request');

  const body = JSON.stringify({
    sender: (Deno.env.get('SMS_SENDER') || 'bolo').slice(0, 11),
    recipient: phone,
    content: `${otp} is your bolo code. It works for 1 hour. Don't share it with anyone.`,
    type: 'transactional',
  });
  const headers = { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' };
  let res = await fetch('https://api.brevo.com/v3/transactionalSMS/send', { method: 'POST', headers, body });
  if (res.status === 404) res = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', { method: 'POST', headers, body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.warn('brevo sms failed', res.status, err?.code, err?.message);
    return fail(502, 'We couldn’t send the text message. Try again, or use your email instead.');
  }
  return json({});
});
