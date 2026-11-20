// send-email: Supabase Auth calls this (the "Send Email" hook) whenever somebody needs a sign-in email.
// It sends a 6-digit code (never a link) through Brevo. Without this function Supabase sends its own
// email, which on the free plan is always a link and can't be changed.
// Only Supabase Auth can call it: the request is signed with SEND_EMAIL_HOOK_SECRET.
// Secrets (set by the deploy workflow): BREVO_API_KEY, SEND_EMAIL_HOOK_SECRET, MAIL_FROM. Optional: MAIL_FROM_NAME.
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const fail = (status: number, message: string) => json({ error: { http_code: status, message } }, status);

// Addresses of automatic tests: Brevo checks the request and then drops it, so nothing is really sent.
const TEST = /@(bolo-qa\.com|getit\.test|example\.(com|org|net))$/i;

type Kind = 'signup' | 'magiclink' | 'recovery' | 'invite' | 'email_change' | 'reauthentication' | string;
const WORDS: Record<string, [title: string, line: string]> = {
  signup: ['Your getit code', 'Type this code in the getit app to finish signing in.'],
  magiclink: ['Your getit code', 'Type this code in the getit app to sign in.'],
  invite: ['Your getit code', 'Type this code in the getit app to join.'],
  recovery: ['Your getit code', 'Type this code in the getit app to get back into your account.'],
  email_change: ['Confirm your email', 'Type this code in the getit app to confirm this email address.'],
  reauthentication: ['Confirm it’s you', 'Type this code in the getit app to continue.'],
};

function letter(kind: Kind, code: string) {
  const [title, line] = WORDS[kind] || WORDS.magiclink;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
  <div style="font-size:26px;font-weight:800;letter-spacing:-0.5px">getit</div>
  <h2 style="font-size:20px;margin:24px 0 8px">${title}</h2>
  <p style="font-size:15px;line-height:22px;color:#444;margin:0 0 20px">${line}</p>
  <div style="font-size:34px;font-weight:800;letter-spacing:8px;background:#f6ee5c;color:#000;border-radius:14px;padding:18px 0;text-align:center">${code}</div>
  <p style="font-size:13px;line-height:19px;color:#777;margin:20px 0 0">The code works for 1 hour. If you didn’t ask for it, you can ignore this email: nobody can use your account without the code.</p>
</div>`;
  const text = `${title}\n\n${line}\n\n${code}\n\nThe code works for 1 hour. If you didn’t ask for it, you can ignore this email: nobody can use your account without the code.`;
  return { subject: `${code} is your getit code`, html, text };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail(405, 'Use POST');
  const secret = Deno.env.get('SEND_EMAIL_HOOK_SECRET');
  const key = Deno.env.get('BREVO_API_KEY');
  const from = Deno.env.get('MAIL_FROM');
  if (!secret || !key || !from) return fail(500, 'Error sending the code email: email is not set up yet.');

  let data: { user?: { email?: string; new_email?: string }; email_data?: { token?: string; token_new?: string; email_action_type?: string } };
  try {
    const payload = await req.text();
    data = new Webhook(secret.replace('v1,whsec_', '')).verify(payload, Object.fromEntries(req.headers)) as typeof data;
  } catch {
    return fail(401, 'Not allowed');
  }
  const kind = String(data.email_data?.email_action_type || 'magiclink');
  const email = String(data.user?.email || '').trim();
  const next = String(data.user?.new_email || '').trim();
  const code = String(data.email_data?.token || '');
  const codeNew = String(data.email_data?.token_new || '');

  // Who gets which code. Changing the email: the new address always gets one; when Supabase also sends
  // a second code, the first goes to the address the account has now.
  const mails: [to: string, code: string][] = [];
  if (kind === 'email_change') {
    if (codeNew) mails.push([email, code], [next, codeNew]);
    else mails.push([next || email, code]);
  } else mails.push([email, code]);

  for (const [to, c] of mails) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || !/^\d{4,10}$/.test(c)) return fail(400, 'Bad request');
    const m = letter(kind, c);
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': key, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: Deno.env.get('MAIL_FROM_NAME') || 'getit', email: from },
        to: [{ email: to }],
        subject: m.subject,
        htmlContent: m.html,
        textContent: m.text,
        tags: ['code'],
        ...(TEST.test(to) ? { headers: { 'X-Sib-Sandbox': 'drop' } } : {}),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      // never log the address or the code
      console.warn('brevo email failed', res.status, err?.code, err?.message);
      return fail(502, 'Error sending the code email. Try again in a minute.');
    }
  }
  return json({});
});
