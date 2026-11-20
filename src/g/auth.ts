/* What the server can do for sign-in. Text messages only work once they are set up there; email works everywhere. */
import { SUPABASE_KEY, SUPABASE_URL } from '../lib/supabase';
import { bump } from '../logic/live';

export const authCaps = { phone: false };
export async function loadAuthCaps() {
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_KEY } });
    const j = await r.json();
    const phone = !!j?.external?.phone;
    if (phone !== authCaps.phone) {
      authCaps.phone = phone;
      bump();
    }
  } catch {}
}
