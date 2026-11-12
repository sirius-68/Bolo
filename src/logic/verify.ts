/* Identity and document checks. Photos go to the private "verifications" folder (only the owner and bolo's
   reviewers can open them) and a request is filed for a reviewer. Nothing is approved on the phone. */
import { db, ui } from '../data/db';
import { supabase } from '../lib/supabase';
import { bump } from './live';
import { friendly } from './remote';
import { uuid } from './server';

/** Photos taken in the sign-up ID steps, kept only until they're sent. */
export const idShots: { doc: string; files: string[] } = { doc: 'id', files: [] };

/** Upload the photos and ask bolo to check them. Returns an error message, or null when sent. */
export async function submitDocs(files: string[], kind: 'id' | 'business' | 'expert' = 'id', businessId?: string | null): Promise<string | null> {
  try {
    if (!db.uid) return 'Sign in first';
    const { File } = require('expo-file-system');
    const paths: string[] = [];
    for (const f of files.filter(Boolean)) {
      const local = f.startsWith('uri:') ? f.slice(4) : f;
      const bytes = await new File(local).bytes();
      const path = `${db.uid}/${uuid()}.jpg`;
      const { error } = await supabase.storage.from('verifications').upload(path, bytes, { contentType: 'image/jpeg' });
      if (error) throw error;
      paths.push(path);
    }
    const { error } = await supabase.from('verifications').insert({ kind, files: paths, business_id: businessId || null });
    // one open request at a time: a second one while the first is being checked is fine
    if (error && !/verifications_one_pending|duplicate/i.test(error.message)) throw error;
    if (kind === 'id') db.PR.docs.id = 'review';
    bump();
    return null;
  } catch (e) {
    return friendly(e);
  }
}

/** Where my latest checks stand (badges come from the server once a reviewer approves). */
export async function refreshVerification() {
  if (!db.uid) return;
  const { data } = await supabase.from('verifications').select('kind,status,note,created_at').eq('user_id', db.uid).order('created_at', { ascending: false }).limit(10);
  const id = (data || []).find((v: any) => v.kind === 'id');
  if (id) db.PR.docs.id = id.status === 'approved' ? 'verified' : id.status === 'pending' ? 'review' : null;
  const { data: p } = await supabase.from('profiles').select('verified').eq('id', db.uid).maybeSingle();
  if (p) db.user.verified = !!p.verified;
  ui.verifyReturn = ui.verifyReturn || '';
  bump();
}
