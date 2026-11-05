// delete-account: permanently removes the signed-in person's account.
// 1. checks who is calling (their own session token)
// 2. hides the profile and writes the audit log (request_account_deletion, as the user)
// 3. removes their files from storage
// 4. deletes the auth user; every table row that belongs to them goes with it (on delete cascade)
// The service key never leaves the server: Supabase injects it into this function.
// Phase 4 (money) adds: refuse while the wallet has a balance or a job is held in escrow.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const BUCKETS = ['avatars', 'job-photos', 'verifications'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json({ error: 'Server is not configured' }, 500);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'Sign in first' }, 401);

  const asUser = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: who, error: whoErr } = await asUser.auth.getUser(authHeader.slice(7));
  const user = who?.user;
  if (whoErr || !user) return json({ error: 'Sign in first' }, 401);

  const step1 = await asUser.rpc('request_account_deletion');
  if (step1.error) return json({ error: step1.error.message }, 400);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  for (const bucket of BUCKETS) {
    for (let round = 0; round < 20; round++) {
      const { data: files, error } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
      if (error || !files?.length) break;
      const { error: rmErr } = await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
      if (rmErr) break;
    }
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) return json({ error: 'Could not delete the account. Try again later.' }, 500);
  return json({ ok: true });
});
