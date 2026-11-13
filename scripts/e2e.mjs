// End-to-end check of the backend through the same public API the app uses (no admin keys).
// Two fresh accounts sign up and go through the main flows: profile, a job, an offer, a booking with
// live location, chat with live delivery, calls, likes/comments/follows, report/block, data export, and
// account deletion (which also cleans up). Run by the Backend workflow against staging after each deploy.
//   SUPABASE_URL=… SUPABASE_KEY=<publishable key> node scripts/e2e.mjs
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_KEY;
if (!URL || !KEY) {
  console.log('SUPABASE_URL / SUPABASE_KEY not set: nothing to test');
  process.exit(0);
}

const results = [];
let failed = 0;
async function step(name, fn, { optional = false } = {}) {
  try {
    const note = await fn();
    results.push(`ok    ${name}${note ? ' · ' + note : ''}`);
  } catch (e) {
    const msg = e?.message || JSON.stringify(e);
    if (optional) results.push(`skip  ${name} · ${msg}`);
    else {
      failed++;
      results.push(`FAIL  ${name} · ${msg}`);
    }
  }
}
const must = (r, what = '') => {
  if (r.error) throw new Error(`${what} ${r.error.message || JSON.stringify(r.error)}`.trim());
  return r.data;
};
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function eventually(fn, ms = 12000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) return null;
    await sleep(500);
  }
}

const run = randomUUID().slice(0, 8);
const client = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const A = { sb: client(), email: `e2e-${run}-ana@bolo-qa.com`, name: 'E2E Ana', pwd: 'T3st-' + randomUUID() };
const B = { sb: client(), email: `e2e-${run}-ben@bolo-qa.com`, name: 'E2E Ben', pwd: 'T3st-' + randomUUID() };

let ready = true;
for (const u of [A, B]) {
  await step(`sign up ${u.name}`, async () => {
    const { data, error } = await u.sb.auth.signUp({ email: u.email, password: u.pwd, options: { data: { name: u.name } } });
    if (error) throw error;
    if (!data.session) throw new Error('no session after sign-up: this project asks to confirm the email first (the test needs auto-confirm, staging only)');
    u.id = data.user.id;
  });
  if (!u.id) ready = false;
}

if (ready) {
  let postId, appId, bookingId, cid, callId;

  await step('profile is created at sign-up and can be edited', async () => {
    const p = must(await A.sb.from('profiles').select('*').eq('id', A.id).maybeSingle());
    expect(p, 'no profile row');
    must(await A.sb.from('profiles').update({ city: 'Douala' }).eq('id', A.id));
    must(await B.sb.from('profiles').update({ city: 'Douala' }).eq('id', B.id));
    const card = must(await B.sb.from('profile_cards').select('id,name,city').eq('id', A.id).maybeSingle());
    expect(card?.name === A.name, `Ben sees Ana as "${card?.name}"`);
  });
  await step('own profile cannot be marked verified or Pro from the app', async () => {
    const r = await A.sb.from('profiles').update({ verified: true }).eq('id', A.id);
    expect(r.error, 'verified was accepted');
  });
  await step('location is saved', async () => must(await A.sb.rpc('set_my_location', { lat: 4.05, lng: 9.7 })));

  await step('Ana posts a job', async () => {
    const d = must(
      await A.sb
        .from('posts')
        .insert({ author_id: A.id, business_id: null, kind: 'request', title: 'E2E fix a tap', body: 'Kitchen tap leaks', cat: 'Plumber', area: 'Douala', urgent: false, budget_num: 8000, photos: [], data: { budget: 'XAF 8,000', when: 'Flexible', type: 'One-time', openings: 1 }, location: 'POINT(9.7 4.05)' })
        .select('id')
        .single(),
    );
    postId = d.id;
  });
  await step('Ben sees the job in the feed', async () => {
    const d = must(await B.sb.from('post_feed').select('id,title,author_id,status').eq('id', postId).maybeSingle());
    expect(d?.title === 'E2E fix a tap', 'job not in feed');
  });
  await step('Ben likes, saves and comments; Ana is notified', async () => {
    must(await B.sb.from('post_likes').insert({ post_id: postId }));
    must(await B.sb.from('saves').insert({ kind: 'job', target_id: postId }));
    must(await B.sb.from('comments').insert({ id: randomUUID(), post_id: postId, body: 'I can do this today' }));
    must(await B.sb.from('follows').insert({ followee_id: A.id }));
    const n = await eventually(async () => {
      const d = must(await A.sb.from('notifications').select('type').eq('recipient_id', A.id));
      return d.length >= 2 ? d : null;
    });
    expect(n, 'Ana got no notifications');
    return n.map((x) => x.type).join(', ');
  });
  await step('Ben sends an offer', async () => {
    const d = must(await B.sb.from('applications').insert({ post_id: postId, price: 'XAF 7,500', when_text: 'Today', msg: 'Hello, I am free now', cv: null }).select('id').single());
    appId = d.id;
  });
  await step('Ana accepts the offer: the job is booked', async () => {
    const apps = must(await A.sb.from('applications').select('id,applicant_id,stage').eq('post_id', postId));
    expect(apps.some((a) => a.id === appId), 'Ana cannot see the offer');
    bookingId = must(await A.sb.rpc('accept_application', { p_application: appId }));
    expect(bookingId, 'no booking id');
    const b = must(await B.sb.from('booking_cards').select('id,state,worker_id,client_id,conversation_id').eq('id', bookingId).maybeSingle());
    expect(b?.state === 'booked' && b.worker_id === B.id, 'Ben does not see the booking');
    cid = b.conversation_id;
  });

  // ---- chat, with live delivery
  await step('chat opens for both', async () => {
    const got = must(await A.sb.rpc('start_direct', { p_other: B.id, p_business: null }));
    cid = cid || got;
    expect(got === cid, 'accepting the offer and opening the chat gave two different chats');
    const convs = must(await B.sb.from('conversations').select('id').eq('id', cid));
    expect(convs.length === 1, 'Ben cannot see the chat');
  });
  let live = null;
  await step('live updates connect', async () => {
    await B.sb.realtime.setAuth((await B.sb.auth.getSession()).data.session.access_token);
    live = { got: [], status: '', system: [] };
    live.ch = B.sb
      .channel('e2e-' + run)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (p) => live.got.push(p.new))
      .on('system', {}, (p) => live.system.push(`${p.status}: ${p.message}`))
      .subscribe((s) => (live.status = s));
    const ok = await eventually(() => live.status === 'SUBSCRIBED', 15000);
    expect(ok, 'realtime did not connect: ' + live.status);
    // the database stream is ready a moment after the channel joins
    await eventually(() => live.system.length > 0, 10000);
    return live.system.join(' | ');
  });
  const msgId = randomUUID();
  await step('Ana sends a message (the same way the app does)', async () => {
    must(await A.sb.from('messages').insert({ id: msgId, conversation_id: cid, kind: 'text', body: 'Hello Ben, are you coming?', data: {} }));
  });
  await step('Ben receives messages live', async () => {
    if (await eventually(() => live?.got.some((m) => m.id === msgId), 8000)) return 'first message';
    for (let i = 2; i <= 4; i++) {
      const id = randomUUID();
      must(await A.sb.from('messages').insert({ id, conversation_id: cid, kind: 'text', body: 'ping ' + i, data: {} }));
      if (await eventually(() => live?.got.some((m) => m.id === id), 8000)) return `from message ${i} (the stream needed a moment to start)`;
    }
    throw new Error('no message arrived over realtime · ' + (live.system.join(' | ') || 'no system message'));
  });
  await step('Ben reads it, is notified, and replies', async () => {
    const msgs = must(await B.sb.from('messages').select('id,sender_id,kind,body').eq('conversation_id', cid).order('created_at'));
    expect(msgs.some((m) => m.id === msgId && m.sender_id === A.id), 'message not stored');
    const n = must(await B.sb.from('notifications').select('type,body,event_key').eq('recipient_id', B.id).eq('event_key', 'msg:' + cid));
    expect(n.length === 1, 'no message notification for Ben');
    must(await B.sb.from('messages').insert({ id: randomUUID(), conversation_id: cid, kind: 'text', body: 'On my way', data: {} }));
    must(await B.sb.from('conversation_members').update({ last_read_at: new Date().toISOString() }).eq('conversation_id', cid).eq('user_id', B.id));
    must(await B.sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('recipient_id', B.id).eq('event_key', 'msg:' + cid).is('read_at', null));
  });
  await step('photo upload into the chat, private to its members', async () => {
    const path = `${cid}/${randomUUID()}.txt`;
    must(await A.sb.storage.from('chat').upload(path, new Blob(['hello']), { contentType: 'text/plain', upsert: false }), 'upload');
    must(await A.sb.from('messages').insert({ id: randomUUID(), conversation_id: cid, kind: 'file', body: '', data: { path, name: 'note.txt', size: 5 } }));
    const s = must(await B.sb.storage.from('chat').createSignedUrl(path, 60), 'signed link');
    expect(s?.signedUrl, 'no signed link');
  });
  await step('a quote sent in chat can be declined by the other person only', async () => {
    const qid = randomUUID();
    must(await B.sb.from('messages').insert({ id: qid, conversation_id: cid, kind: 'offer', body: '', data: { job: 'Extra pipe', price: 'XAF 3,000', when: 'Tomorrow', worker: 'sender' } }));
    const own = await B.sb.rpc('answer_offer', { p_message: qid, p_accept: true });
    expect(own.error, 'Ben answered his own quote');
    must(await A.sb.rpc('answer_offer', { p_message: qid, p_accept: false }));
  });
  await step('a sender can delete their message', async () => {
    must(await A.sb.from('messages').update({ kind: 'deleted' }).eq('id', msgId));
    const m = must(await B.sb.from('messages').select('kind,body').eq('id', msgId).maybeSingle());
    expect(m?.kind === 'deleted' && m.body === '', 'message not cleared');
  });
  await step('phone registers for push notifications', async () => {
    must(await B.sb.rpc('register_push_token', { p_token: 'e2e-fake-token-' + run, p_platform: 'android', p_version: 'e2e' }));
    must(await A.sb.from('messages').insert({ id: randomUUID(), conversation_id: cid, kind: 'text', body: 'push check', data: {} }), 'message with push on');
  });
  await step('push function is deployed and locked', async () => {
    const r = await fetch(`${URL}/functions/v1/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    expect(r.status === 401 || r.status === 500, 'unexpected status ' + r.status);
    return r.status === 401 ? 'configured' : 'deployed, Firebase secret not set yet';
  });

  // ---- booking steps and live location
  await step('worker sets off, shares location, arrives, finishes; client confirms', async () => {
    const early = await A.sb.rpc('booking_step', { p_booking: bookingId, p_state: 'onway', p_eta: 10 });
    expect(early.error, 'the client could start the trip');
    must(await B.sb.rpc('booking_step', { p_booking: bookingId, p_state: 'onway', p_eta: 12 }), 'onway');
    must(await B.sb.from('booking_locations').upsert({ booking_id: bookingId, lat: 4.051, lng: 9.701, heading: null, accuracy: 10, eta_min: 11 }), 'share location');
    const loc = must(await A.sb.from('booking_locations').select('lat,lng,eta_min').eq('booking_id', bookingId).maybeSingle());
    expect(loc?.eta_min === 11, 'client cannot see the worker’s position');
    const spoof = await A.sb.from('booking_locations').upsert({ booking_id: bookingId, lat: 0, lng: 0 });
    expect(spoof.error, 'the client could move the worker’s position');
    must(await B.sb.rpc('booking_step', { p_booking: bookingId, p_state: 'working', p_eta: null }), 'arrived');
    must(await B.sb.rpc('booking_step', { p_booking: bookingId, p_state: 'done', p_eta: null }), 'done');
    must(await A.sb.rpc('booking_step', { p_booking: bookingId, p_state: 'confirmed', p_eta: null }), 'confirmed');
    const b = must(await A.sb.from('booking_cards').select('state').eq('id', bookingId).maybeSingle());
    expect(b?.state === 'confirmed', 'state is ' + b?.state);
  });
  await step('review after the confirmed job', async () => {
    must(await A.sb.from('reviews').insert({ booking_id: bookingId, reviewee_id: B.id, stars: 5, tags: ['On time'], body: 'Great work', what: 'E2E fix a tap' }));
    const st = must(await A.sb.from('profile_stats').select('*').eq('id', B.id).maybeSingle());
    expect(st, 'no stats row for Ben');
  });

  // ---- calls
  await step('several taps on call are one call; missed calls are one notification that counts up', async () => {
    const [a, b, c] = await Promise.all([1, 2, 3].map(() => A.sb.rpc('start_call', { p_conversation: cid, p_kind: 'voice' })));
    const first = must(a);
    expect(must(b) === first && must(c) === first, 'three taps started more than one call');
    must(await A.sb.rpc('end_call', { p_call: first }));
    const second = must(await A.sb.rpc('start_call', { p_conversation: cid, p_kind: 'voice' }));
    expect(second !== first, 'a new call after hanging up reused the old one');
    must(await A.sb.rpc('end_call', { p_call: second }));
    const n = must(await B.sb.from('notifications').select('body,type').in('type', ['missed', 'call']));
    expect(n.length === 1 && n[0].body === '2 missed calls', `expected one "2 missed calls" notification, got ${JSON.stringify(n)}`);
  });
  await step('voice call: ring, answer, hang up', async () => {
    callId = must(await A.sb.rpc('start_call', { p_conversation: cid, p_kind: 'voice' }));
    const c = must(await B.sb.from('calls').select('status').eq('id', callId).maybeSingle());
    expect(c?.status === 'ringing', 'Ben does not see the call ringing');
    must(await B.sb.rpc('answer_call', { p_call: callId, p_accept: true }));
  });
  await step('call pass from the server (Agora)', async () => {
    const { data, error } = await A.sb.functions.invoke('agora-token', { method: 'POST', body: { call: callId } });
    if (error) {
      const body = await error.context?.json?.().catch(() => null);
      throw new Error(body?.error || error.message);
    }
    expect(data?.token && data?.channel, 'no pass');
  }, { optional: true });
  await step('hang up', async () => must(await A.sb.rpc('end_call', { p_call: callId })));

  // ---- safety
  await step('report, then block: a blocked person cannot message', async () => {
    must(await A.sb.from('reports').insert({ target_type: 'profile', target_id: B.id, reason: 'spam', details: 'e2e test' }), 'report');
    must(await A.sb.from('blocks').insert({ blocked_id: B.id }), 'block');
    const r = await B.sb.from('messages').insert({ id: randomUUID(), conversation_id: cid, kind: 'text', body: 'still there?', data: {} });
    expect(r.error, 'a blocked person could still message');
    must(await A.sb.from('blocks').delete().eq('blocker_id', A.id).eq('blocked_id', B.id), 'unblock');
  });
  await step('notification switches and data export', async () => {
    must(await A.sb.from('notification_prefs').upsert({ user_id: A.id, category: 'social', enabled: false }));
    const d = must(await A.sb.rpc('export_my_data'));
    expect(d && typeof d === 'object', 'empty export');
  });
  await step('hiding a profile takes it out of the people list (it can still be opened)', async () => {
    must(await A.sb.from('profiles').update({ visible: false }).eq('id', A.id));
    const list = must(await B.sb.from('profile_cards').select('id').eq('visible', true).eq('id', A.id));
    expect(list.length === 0, 'a hidden profile is still listed');
    const direct = must(await B.sb.from('profile_cards').select('id,lng,lat').eq('id', A.id).maybeSingle());
    expect(direct && direct.lng === null, 'a hidden profile still shares a position');
    must(await A.sb.from('profiles').update({ visible: true }).eq('id', A.id));
  });
  await step('feedback reaches the team and stays private', async () => {
    must(await A.sb.from('feedback').insert({ topic: 'idea', body: 'e2e: feedback works', app_version: 'e2e' }));
    const seen = must(await B.sb.from('feedback').select('id'));
    expect(seen.length === 0, 'someone else can read feedback');
  });
  await step('app config is readable', async () => void must(await A.sb.from('app_config').select('key,value')));
  await step('career lists load', async () => {
    const c = must(await A.sb.from('course_listings').select('id').limit(50));
    must(await A.sb.from('opportunities').select('id').limit(5));
    must(await A.sb.from('mentorships').select('id').limit(5));
    must(await A.sb.from('experts').select('user_id').limit(5));
    return `${c.length} courses`;
  });

  // ---- admin panel (the same calls the web panel makes)
  await step('someone who is not an admin gets nothing from the admin panel', async () => {
    const me = await A.sb.rpc('admin_me');
    expect(!me.error && me.data === null, 'a normal account looks like an admin');
    for (const fn of ['admin_overview', 'admin_people', 'admin_reports', 'admin_feedback', 'admin_audit']) {
      const r = await A.sb.rpc(fn);
      expect(r.error, `${fn} answered a normal account`);
    }
    const s = await A.sb.rpc('admin_suspend', { p_user: B.id, p_on: true, p_note: 'no' });
    expect(s.error, 'a normal account could suspend someone');
  });
  const TOKEN = process.env.SUPABASE_ACCESS_TOKEN, REF = process.env.REF;
  const sql = async (query) => {
    const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
      method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }),
    });
    if (!r.ok) throw new Error(`database query failed (HTTP ${r.status})`);
    return r.json();
  };
  let isAdmin = false;
  await step('Ana is made an admin (test database only)', async () => {
    if (!TOKEN || !REF) throw new Error('no access to the test database settings in this run');
    if (!/^[0-9a-f-]{36}$/.test(A.id)) throw new Error('unexpected account id');
    await sql(`insert into public.admin_users (user_id, role) values ('${A.id}', 'owner') on conflict (user_id) do update set role = 'owner'`);
    const me = must(await A.sb.rpc('admin_me'));
    expect(me?.role === 'owner', 'Ana is not an owner');
    isAdmin = true;
  }, { optional: true });
  if (isAdmin) {
    await step('admin: overview, people search and a person page', async () => {
      const o = must(await A.sb.rpc('admin_overview'));
      expect(o.people >= 2 && o.queue && o.queue.reports >= 1, 'overview numbers look wrong');
      const list = must(await A.sb.rpc('admin_people', { p_query: 'E2E Ben', p_filter: 'all', p_limit: 20, p_offset: 0 }));
      const rows = list.rows || list;
      expect(rows.some((x) => x.id === B.id), 'search did not find Ben');
      const one = must(await A.sb.rpc('admin_person', { p_user: B.id }));
      expect(one?.profile?.id === B.id, 'person page is empty');
      return `${o.people} people, ${o.queue.reports} open report(s)`;
    });
    await step('admin: the report and the feedback from this run are in the queues, and can be closed', async () => {
      const reports = must(await A.sb.rpc('admin_reports', { p_status: 'open' }));
      const rep = reports.find((x) => x.reporter_id === A.id && x.target_id === B.id);
      expect(rep, 'the report is not in the queue');
      must(await A.sb.rpc('admin_resolve_report', { p_id: rep.id, p_status: 'dismissed', p_note: 'e2e' }));
      const fb = must(await A.sb.rpc('admin_feedback', { p_status: 'open' }));
      const mine = fb.find((x) => x.user_id === A.id);
      expect(mine, 'the feedback is not in the queue');
      must(await A.sb.rpc('admin_set_feedback', { p_id: mine.id, p_status: 'closed', p_note: 'e2e' }));
    });
    await step('admin: a suspended person cannot post or message, and can again once restored', async () => {
      must(await A.sb.rpc('admin_suspend', { p_user: B.id, p_on: true, p_note: 'e2e test' }));
      const blocked = await B.sb.from('messages').insert({ id: randomUUID(), conversation_id: cid, kind: 'text', body: 'while suspended', data: {} });
      expect(blocked.error, 'a suspended person could still message');
      const hidden = must(await A.sb.from('profile_cards').select('id').eq('visible', true).eq('id', B.id));
      expect(hidden.length === 0, 'a suspended person is still listed');
      must(await A.sb.rpc('admin_suspend', { p_user: B.id, p_on: false }));
      must(await B.sb.from('messages').insert({ id: randomUUID(), conversation_id: cid, kind: 'text', body: 'back again', data: {} }), 'message after restore');
    });
    await step('admin: the app notice can be set and cleared, and every action is in the activity list', async () => {
      const before = must(await A.sb.from('app_config').select('value').eq('key', 'maintenance').maybeSingle());
      must(await A.sb.rpc('admin_set_config', { p_key: 'maintenance', p_value: { on: true, message: 'e2e notice' } }));
      const seen = must(await B.sb.from('app_config').select('value').eq('key', 'maintenance').maybeSingle());
      expect(JSON.stringify(seen?.value || '').includes('e2e notice'), 'the app cannot read the notice');
      must(await A.sb.rpc('admin_set_config', { p_key: 'maintenance', p_value: before?.value ?? { on: false, message: '' } }));
      const log = must(await A.sb.rpc('admin_audit', { p_limit: 50 }));
      expect(log.some((x) => String(x.action).includes('suspend')), 'the suspension is not in the activity list');
    });
  }

  if (live?.ch) await B.sb.removeChannel(live.ch);
}

// ---- clean up: delete both accounts (also checks account deletion)
for (const u of [A, B]) {
  if (!u.id) continue;
  await step(`delete account ${u.name}`, async () => {
    const { error } = await u.sb.functions.invoke('delete-account', { method: 'POST' });
    if (error) {
      const body = await error.context?.json?.().catch(() => null);
      throw new Error(body?.error || error.message);
    }
    const again = await client().auth.signInWithPassword({ email: u.email, password: u.pwd });
    expect(again.error, 'the deleted account can still sign in');
  });
}

console.log(results.join('\n'));
console.log(failed ? `\n${failed} step(s) FAILED` : '\nall steps passed');
process.exit(failed ? 1 : 0);
