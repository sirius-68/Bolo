/* Real accounts: Supabase auth + syncing the profile and business pages.
   The rest of the app keeps reading/writing the local model (db); this module mirrors
   the parts that live on the server and pulls them back on log-in. Nothing here runs in demo mode. */
import { AppState } from 'react-native';
import { File, Paths } from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { setMonitorUser } from '../lib/monitor';
import { checkRealtime, loadAll, startRealtime, stopRealtime } from './server';
import { db, MyBiz } from '../data/db';
import { bump, subscribe } from './live';
import { fill } from './persist';

export const isReal = () => true;
const digits = (s: string) => (s || '').replace(/\D/g, '');
/** Cameroon numbers in E.164 (+2376XXXXXXXX). */
/** +<country><number>. Numbers saved before international support were local Cameroon numbers. */
export const toE164 = (phone: string) => ((phone || '').trim().startsWith('+') ? '+' + digits(phone) : '+237' + digits(phone).replace(/^237/, ''));
const isEmail = (c: string) => c.includes('@');
const cred = (contact: string) => (isEmail(contact) ? { email: contact.trim().toLowerCase() } : { phone: toE164(contact) });

/** Turn Supabase / network errors into something a person can act on. */
export function friendly(e: any): string {
  // Some failures arrive as a raw HTTP response instead of a message: never show those to people.
  const raw = typeof e === 'string' ? e : typeof e?.message === 'string' ? e.message : '';
  const status = Number(e?.status || e?.context?.status || 0);
  const m = raw.toLowerCase();
  if (m.includes('sending confirmation') || m.includes('sending recovery') || m.includes('sending magic') || m.includes('error sending')) return 'We couldn’t send the code email just now. Please try again in a few minutes.';
  if (m.includes('network') || m.includes('fetch') || m.includes('timeout')) return 'No internet connection. Check your data or Wi‑Fi and try again.';
  if (m.includes('invalid login')) return 'Wrong phone/email or password.';
  if (m.includes('already registered') || m.includes('already been registered') || m.includes('already exists')) return 'An account with this phone or email already exists. Log in instead.';
  if (m.includes('sms') || m.includes('phone provider') || m.includes('phone signups are disabled') || m.includes('unsupported phone')) return 'Phone codes aren’t switched on yet. Please use your email for now.';
  if (m.includes('expired') || (m.includes('invalid') && m.includes('otp')) || m.includes('token has expired or is invalid')) return 'That code is wrong or has expired. Try again or send a new one.';
  if (status === 429 || m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return 'Too many attempts. Wait a minute and try again.';
  if (m.includes('email not confirmed')) return 'Confirm your email first. We sent you a code.';
  if (m.includes('password') && m.includes('6')) return 'Use a longer password (at least 8 characters).';
  if (status >= 500 || !raw || raw.trim().startsWith('{') || raw.length > 160) return 'Something went wrong on our side. Please try again in a few minutes.';
  return raw;
}

/* ---------------------------------------------------------------- auth */
/** Returns needsCode=true when the account must be confirmed with a code (email/SMS). */
export async function signUp(contact: string, password: string, meta: { name: string; biz_only?: boolean }): Promise<{ needsCode: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signUp({ ...(cred(contact) as any), password, options: { data: meta } });
    if (error) return { needsCode: false, error: friendly(error) };
    // Supabase returns a user with no identities when the email is already taken (to avoid leaking accounts).
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { needsCode: false, error: friendly('already registered') };
    if (data.session) {
      await afterAuth();
      return { needsCode: false };
    }
    return { needsCode: true };
  } catch (e) {
    return { needsCode: false, error: friendly(e) };
  }
}
export async function verifyCode(contact: string, token: string, purpose: 'signup' | 'recovery'): Promise<string | null> {
  try {
    const email = isEmail(contact);
    const type = email ? (purpose === 'recovery' ? 'recovery' : 'email') : 'sms';
    const { error } = await supabase.auth.verifyOtp({ ...(cred(contact) as any), token: token.trim(), type } as any);
    if (error) return friendly(error);
    await afterAuth();
    return null;
  } catch (e) {
    return friendly(e);
  }
}
export async function resendCode(contact: string, purpose: 'signup' | 'recovery'): Promise<string | null> {
  try {
    if (purpose === 'recovery') return sendReset(contact);
    const { error } = isEmail(contact) ? await supabase.auth.resend({ type: 'signup', email: contact.trim().toLowerCase() }) : await supabase.auth.resend({ type: 'sms', phone: toE164(contact) });
    return error ? friendly(error) : null;
  } catch (e) {
    return friendly(e);
  }
}
export async function signIn(contact: string, password: string): Promise<string | null> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ ...(cred(contact) as any), password });
    if (error) return friendly(error);
    await afterAuth();
    return null;
  } catch (e) {
    return friendly(e);
  }
}
/** Sends a code to reset the password (email recovery code, or an SMS log-in code for phones). */
export async function sendReset(contact: string): Promise<string | null> {
  try {
    const { error } = isEmail(contact) ? await supabase.auth.resetPasswordForEmail(contact.trim().toLowerCase()) : await supabase.auth.signInWithOtp({ phone: toE164(contact), options: { shouldCreateUser: false } });
    return error ? friendly(error) : null;
  } catch (e) {
    return friendly(e);
  }
}
export async function updatePassword(password: string): Promise<string | null> {
  try {
    const { error } = await supabase.auth.updateUser({ password });
    return error ? friendly(error) : null;
  } catch (e) {
    return friendly(e);
  }
}
export async function signOut() {
  try {
    await require('./push').unregisterPush();
  } catch {}
  try {
    await supabase.auth.signOut();
  } catch {}
  lastSent = {};
  stopRealtime();
  setMonitorUser(null);
}
/** After any successful sign-in: remember the user and load their saved profile. */
async function afterAuth() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const fresh = db.uid !== data.user.id;
  db.uid = data.user.id;
  setMonitorUser(db.uid);
  if (fresh) lastSent = {};
  await pull();
  startServer();
}
/** Load everything from the server and keep it live (after sign-in and at app start). */
export function startServer() {
  if (!db.uid) return;
  startRealtime();
  void require('./push').registerPush();
  void loadAll().then(() => {
    const { resumeSims } = require('./work');
    resumeSims();
  });
}
/** App opened with a saved session but no saved copy of the app's data (first start after an update). */
export async function resumeSession(): Promise<boolean> {
  try {
    // the saved session is enough to know who this is (works offline too)
    const { data } = await supabase.auth.getSession();
    const u = data.session?.user;
    if (!u) return false;
    db.uid = u.id;
    db.user.contact = u.email || u.phone || db.user.contact;
    db.loggedIn = true;
    // profile from the server, without holding the start screen for long on a slow network
    await Promise.race([pull().catch(() => {}), new Promise((r) => setTimeout(r, 6000))]);
    return true;
  } catch {
    return false;
  }
}
/** At app start: is there a saved Supabase session? */
export async function hasSession() {
  try {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- pull: server → app */
const city = (c?: string | null) => c || db.user.city;
const pic = (url?: string | null) => (url ? 'uri:' + url : null);
const plainObj = (x: any) => !!x && typeof x === 'object' && !Array.isArray(x);

export async function pull() {
  if (!db.uid) return;
  try {
    const [p, pv, bz] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', db.uid).maybeSingle(),
      supabase.from('profiles_private').select('*').eq('id', db.uid).maybeSingle(),
      supabase.from('businesses').select('*, business_private(rccm, niu)').eq('owner_id', db.uid).order('created_at'),
    ]);
    const r = p.data;
    if (r) {
      const u = db.user;
      // a brand-new server profile (just signed up) keeps what the person typed during onboarding
      const empty = !r.skills?.length && !r.bio && !r.avatar_url;
      if (r.name) u.name = r.name;
      if (r.avatar_url) u.avatar = pic(r.avatar_url);
      if (!empty) u.city = city(r.city);
      if (r.bio) u.bio = r.bio;
      if (!empty) u.role = r.role === 'client' ? 'client' : 'worker';
      u.bizOnly = !!r.biz_only || u.bizOnly;
      if (r.intents?.length) u.intents = r.intents;
      if (r.skills?.length) u.skills = r.skills;
      if (plainObj(r.skill_list)) u.skillList = r.skill_list;
      if (r.level) u.level = r.level;
      if (r.years) u.years = r.years;
      u.pro = { regular: !!r.pro_regular, business: !!r.pro_business };
      db.PR.wst = r.work_status || db.PR.wst;
      db.PR.cst = r.hire_status || db.PR.cst;
      // saved by any version of the app: missing or odd parts fall back to what this version expects
      if (plainObj(r.area)) db.PR.area = fill(db.PR.area, r.area);
      if (Array.isArray(r.experience) && r.experience.length) db.PR.exp = r.experience;
      if (plainObj(r.education)) db.PR.edu = fill(db.PR.edu, r.education);
      if (Array.isArray(r.languages) && r.languages.length) db.PR.langs = r.languages;
      if (Array.isArray(r.services)) db.PR.services = r.services.filter(plainObj);
      db.PR.docs.id = r.verified ? 'verified' : db.PR.docs.id === 'review' ? 'review' : null;
      u.verified = !!r.verified;
    }
    const q = pv.data;
    if (q) {
      db.PR.ct = fill(db.PR.ct, { ...db.PR.ct, ...(plainObj(q.contacts) ? q.contacts : {}) });
      if (q.phone && !db.PR.ct.phone) db.PR.ct.phone = '+' + digits(q.phone);
      if (q.email && !db.PR.ct.email) db.PR.ct.email = q.email;
      db.user.contact = db.user.contact || q.email || (q.phone ? '+' + digits(q.phone) : '');
      if (plainObj(q.cv)) {
        db.user.cv = q.cv;
        db.user.cvDone = true;
      }
    }
    if (bz.data) {
      const local = new Map(db.BIZ.list.map((b) => [b.id, b]));
      db.BIZ.list = bz.data.map((x: any) => {
        const old = local.get(x.client_id);
        const docs = Array.isArray(x.business_private) ? x.business_private[0] : x.business_private;
        const b: MyBiz = {
          id: x.client_id,
          remoteId: x.id,
          name: x.name || '',
          sector: x.sector || '',
          size: x.size || '',
          city: x.city || '',
          area: x.area || '',
          address: x.address || '',
          phone: x.phone || '',
          email: x.email || '',
          web: x.web || '',
          about: x.about || '',
          rccm: docs?.rccm || old?.rccm || '',
          niu: docs?.niu || old?.niu || '',
          logo: pic(x.logo_url) || (old?.logo?.startsWith('uri:') ? old.logo : null),
          color: x.color,
          verified: x.verified,
          recruiters: Array.isArray(x.recruiters) ? x.recruiters : [],
          hires: Array.isArray(x.hire_areas) ? x.hire_areas : [],
          hireTypes: Array.isArray(x.hire_types) ? x.hire_types : [],
          team: old?.team || [],
          contracts: old?.contracts || [],
          events: old?.events || [],
          ads: old?.ads || [],
        };
        const f = [b.name, b.sector, b.size, b.city, b.address, b.phone, b.email, b.about, b.rccm, b.niu, b.logo || b.color];
        b.draft = f.filter(Boolean).length < f.length;
        return b;
      });
      // keep pages created offline that haven't reached the server yet
      local.forEach((b) => {
        if (!b.remoteId && !db.BIZ.list.some((x) => x.id === b.id)) db.BIZ.list.push(b);
      });
      if (!db.BIZ.list.some((b) => b.id === db.BIZ.active)) db.BIZ.active = db.BIZ.list[0]?.id || null;
      if (db.user.role === 'client' && !db.BIZ.active) db.user.role = 'worker';
    }
    lastSent.profile = JSON.stringify(profilePayload());
    bump();
  } catch {}
}

/* ---------------------------------------------------------------- push: app → server */
let lastSent: Record<string, string> = {};
let busy = false;
let again = false;
let timer: any = null;

function profilePayload() {
  const u = db.user;
  return {
    name: u.name,
    avatar_url: u.avatar?.startsWith('uri:http') ? u.avatar.slice(4) : null,
    city: (u.city || '').replace(/ CM$/, ''),
    bio: u.bio,
    role: u.role,
    intents: u.intents,
    skills: u.intents.includes('find') || !u.intents.length ? u.skills : [],
    skill_list: u.intents.includes('find') || !u.intents.length ? u.skillList : null,
    level: u.level,
    years: u.years,
    work_status: db.PR.wst,
    hire_status: db.PR.cst,
    area: db.PR.area,
    experience: db.PR.exp,
    education: db.PR.edu,
    languages: db.PR.langs,
    services: db.PR.services,
  };
}
function privatePayload() {
  return { id: db.uid, contacts: db.PR.ct, cv: db.user.cv, prefs: { visible: db.PREF.visible, phoneAfterHire: db.PREF.phoneAfterHire, notif: db.PREF.notif, lang: db.PREF.lang } };
}
function bizPayload(b: MyBiz) {
  return {
    name: b.name,
    sector: b.sector,
    size: b.size,
    city: b.city,
    area: b.area,
    address: b.address,
    phone: b.phone,
    email: b.email,
    web: b.web,
    about: b.about,
    logo_url: b.logo?.startsWith('uri:http') ? b.logo.slice(4) : null,
    color: b.color,
    hire_areas: b.hires || [],
    hire_types: b.hireTypes || [],
    recruiters: b.recruiters || [],
  };
}

/** Upload a photo picked on the phone; returns a public 'uri:https://…' picture string. */
async function upload(local: string, name: string): Promise<string | null> {
  try {
    const uri = local.slice(4);
    const bytes = await new File(uri).bytes();
    const path = `${db.uid}/${name}-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('avatars').upload(path, bytes, { contentType: 'image/jpeg', upsert: true });
    if (error) return null;
    return 'uri:' + supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  } catch {
    return null;
  }
}
const isLocalPic = (p?: string | null) => !!p && p.startsWith('uri:') && !p.startsWith('uri:http');

export async function push() {
  if (!isReal() || !db.uid || !db.loggedIn) return;
  if (busy) {
    again = true;
    return;
  }
  busy = true;
  try {
    if (isLocalPic(db.user.avatar)) {
      const url = await upload(db.user.avatar!, 'avatar');
      if (url) db.user.avatar = url;
    }
    const pp = profilePayload();
    const pj = JSON.stringify(pp);
    if (pj !== lastSent.profile) {
      const { error } = await supabase.from('profiles').update(pp).eq('id', db.uid);
      if (!error) lastSent.profile = pj;
    }
    const pv = privatePayload();
    const vj = JSON.stringify(pv);
    if (vj !== lastSent.private) {
      const { error } = await supabase.from('profiles_private').upsert(pv);
      if (!error) lastSent.private = vj;
    }
    for (const b of db.BIZ.list) {
      if (!b.name.trim()) continue;
      if (isLocalPic(b.logo)) {
        const url = await upload(b.logo!, 'logo-' + b.id);
        if (url) b.logo = url;
      }
      const bp = bizPayload(b);
      const key = 'biz:' + b.id;
      const bj = JSON.stringify([bp, b.rccm, b.niu]);
      if (bj === lastSent[key]) continue;
      if (!b.remoteId) {
        const found = await supabase.from('businesses').select('id').eq('owner_id', db.uid).eq('client_id', b.id).maybeSingle();
        if (found.data) b.remoteId = found.data.id;
      }
      if (b.remoteId) {
        const { error } = await supabase.from('businesses').update(bp).eq('id', b.remoteId);
        if (error) continue;
      } else {
        const { data, error } = await supabase.from('businesses').insert({ ...bp, owner_id: db.uid, client_id: b.id }).select('id').single();
        if (error || !data) continue;
        b.remoteId = data.id;
      }
      if (b.rccm || b.niu) {
        await supabase.from('business_private').upsert({ business_id: b.remoteId, rccm: b.rccm, niu: b.niu });
        if (b.rccm && b.niu && b.verified !== 'verified') {
          const { data } = await supabase.rpc('request_business_verification', { bid: b.remoteId });
          if (data === 'review' || data === 'verified') b.verified = data;
        }
      }
      lastSent[key] = bj;
    }
  } catch {
  } finally {
    busy = false;
    if (again) {
      again = false;
      schedule();
    }
  }
}
function schedule() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(push, 1500);
}
let started = false;
/** Mirror local changes to the server (debounced) and refresh from it when the app comes back. */
export function startSync() {
  if (started) return;
  started = true;
  subscribe(() => {
    if (isReal() && db.uid && db.loggedIn) schedule();
  });
  AppState.addEventListener('change', (s) => {
    if (s === 'active' && db.uid && db.loggedIn) {
      pull();
      checkRealtime();
      void loadAll();
    }
  });
}

/* ---------------------------------------------------------------- your data (Settings) */
/** Everything bolo stores about this account, as a JSON file the person can save or share. */
export async function exportMyData(): Promise<{ uri?: string; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('export_my_data');
    if (error) return { error: friendly(error) };
    const f = new File(Paths.cache, `bolo-my-data-${new Date().toISOString().slice(0, 10)}.json`);
    if (f.exists) f.delete();
    f.create();
    f.write(JSON.stringify(data, null, 2));
    return { uri: f.uri };
  } catch (e) {
    return { error: friendly(e) };
  }
}

/** Permanently delete this account on the server (profile, business pages, posts, files). */
export async function deleteAccount(): Promise<string | null> {
  try {
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) {
      const body = await (error as any).context?.json?.().catch(() => null);
      return friendly(body?.error || error);
    }
    lastSent = {};
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {}
    return null;
  } catch (e) {
    return friendly(e);
  }
}

/* ---------------------------------------------------------------- app config */
/** The server can require a newer app (old versions miss security fixes). Returns the message to show, or null. */
export async function updateRequired(platform: 'android' | 'ios', build: number): Promise<string | null> {
  try {
    const { data } = await supabase.from('app_config').select('value').eq('key', 'min_version').maybeSingle();
    const v = data?.value as { android?: number; ios?: number; message?: string } | undefined;
    const min = Number(v?.[platform] || 0);
    return build && min > build ? v?.message || 'A new version of bolo is ready. Update to keep using the app.' : null;
  } catch {
    return null;
  }
}
