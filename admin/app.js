// bolo admin panel. A static page: it signs in like any bolo account and talks to the database with the
// public key. The database itself decides what an account may see: every admin_* function checks that the
// signed-in account is in admin_users, so this file holds no secrets and grants nothing by itself.
import { createClient } from './lib/supabase.js';

const CFG = window.BOLO || {};
const root = document.getElementById('app');

/* ------------------------------------------------------------------ tiny DOM helpers (text only, never HTML) */
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}
const fmtDate = (s) => (s ? new Date(s).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
function ago(s) {
  if (!s) return '—';
  const m = Math.round((Date.now() - new Date(s).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  if (m < 43200) return `${Math.round(m / 1440)} d ago`;
  return new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
const pill = (text, kind) => h('span', { class: 'pill' + (kind ? ' ' + kind : '') }, text);
const kv = (pairs) => h('dl', { class: 'kv' }, pairs.filter((p) => p && p[1] != null && p[1] !== '').map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
const empty = (title, text) => h('div', { class: 'empty' }, h('b', {}, title), text || '');
const spinner = () => h('div', { class: 'spin', role: 'status', 'aria-label': 'Loading' });
const avatar = (name, url) => h('div', { class: 'avatar', 'aria-hidden': 'true' }, url ? h('img', { src: url, alt: '', referrerpolicy: 'no-referrer' }) : initials(name));
const mail = (email, subject) => (email ? h('a', { href: `mailto:${email}${subject ? '?subject=' + encodeURIComponent(subject) : ''}` }, email) : '—');

let toastTimer;
function toast(msg, bad) {
  document.querySelector('.toast')?.remove();
  const t = h('div', { class: 'toast' + (bad ? ' bad' : ''), role: 'status' }, msg);
  document.body.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), bad ? 5000 : 2600);
}
const say = (e) => toast(e?.message || String(e), true);
/** Replace an element's content, skipping the empty slots that conditions leave behind. */
const put = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));

/** A dialog. `build(close)` returns the content. Escape and the backdrop close it. */
function dialog(build, wide) {
  const veil = h('div', { class: 'veil' });
  const close = () => {
    veil.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e) => e.key === 'Escape' && close();
  const box = h('div', { class: 'dialog' + (wide ? ' wide' : ''), role: 'dialog', 'aria-modal': 'true' }, build(close));
  veil.append(box);
  veil.addEventListener('mousedown', (e) => e.target === veil && close());
  document.addEventListener('keydown', onKey);
  document.body.append(veil);
  box.querySelector('textarea, input, button')?.focus();
  return close;
}
/** Ask for a decision with an optional note; runs `run(note)` and reports any error. */
function decide({ title, text, ok, danger, note, required, run }) {
  dialog((close) => {
    const ta = note ? h('textarea', { class: 'input', placeholder: note, maxlength: '400' }) : null;
    const err = h('p', { class: 'err' });
    const go = h('button', { class: 'btn ' + (danger ? 'danger' : 'y') }, ok);
    go.addEventListener('click', async () => {
      const v = ta ? ta.value.trim() : '';
      if (required && !v) return (err.textContent = 'Write a short reason: the person will see it.');
      go.disabled = true;
      try {
        await run(v || null);
        close();
      } catch (e) {
        err.textContent = e?.message || String(e);
        go.disabled = false;
      }
    });
    return [h('h2', {}, title), text ? h('p', { class: 'muted' }, text) : null, ta, err, h('div', { class: 'row between' }, h('button', { class: 'btn', onclick: close }, 'Cancel'), go)];
  });
}

/* ------------------------------------------------------------------ data */
if (!CFG.url || !CFG.key) {
  root.append(h('div', { class: 'login' }, h('div', { class: 'card login-card col' }, h('h2', {}, 'Not set up yet'), h('p', { class: 'muted' }, 'This copy of the panel has no database address. It is filled in when the site is published.'))));
  throw new Error('bolo admin: missing config');
}
// The session lives in this browser tab only: closing the tab signs out.
const sb = createClient(CFG.url, CFG.key, { auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
async function rpc(fn, args) {
  const { data, error } = await sb.rpc(fn, args || {});
  if (error) throw new Error(error.message || 'Something went wrong');
  return data;
}
async function signed(paths, seconds = 300) {
  if (!paths?.length) return [];
  const { data, error } = await sb.storage.from('verifications').createSignedUrls(paths, seconds);
  if (error) throw new Error(error.message);
  return (data || []).map((x) => x.signedUrl).filter(Boolean);
}

const state = { me: null, view: 'overview', overview: null };
const VIEWS = [
  ['overview', 'Overview'],
  ['ids', 'ID checks', 'id_checks'],
  ['businesses', 'Businesses', 'business_checks'],
  ['reports', 'Reports', 'reports'],
  ['feedback', 'Feedback', 'feedback'],
  ['experts', 'Experts', 'experts'],
  ['people', 'People'],
  ['settings', 'Settings'],
  ['activity', 'Activity'],
];

/* ------------------------------------------------------------------ sign in */
function loginScreen(message) {
  const email = h('input', { class: 'input', type: 'email', autocomplete: 'username', placeholder: 'you@example.com', id: 'email' });
  const pwd = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Your bolo password', id: 'pwd' });
  const err = h('p', { class: 'err' }, message || '');
  const btn = h('button', { class: 'btn y wide', type: 'submit' }, 'Sign in');
  const form = h(
    'form',
    { class: 'card login-card col' },
    h('div', { class: 'brand' }, h('b', {}, 'b'), 'bolo', h('span', {}, 'admin')),
    h('p', { class: 'muted small' }, 'Sign in with your own bolo account. Only accounts that the owner added as admins get in.'),
    h('div', { class: 'field' }, h('label', { for: 'email' }, 'Email'), email),
    h('div', { class: 'field' }, h('label', { for: 'pwd' }, 'Password'), pwd),
    err,
    btn,
    CFG.env && CFG.env !== 'production' ? h('p', { class: 'tiny faint' }, 'Connected to the ' + CFG.env + ' database.') : null,
  );
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({ email: email.value.trim().toLowerCase(), password: pwd.value });
    if (error) {
      btn.disabled = false;
      err.textContent = /invalid/i.test(error.message) ? 'Wrong email or password.' : error.message;
      return;
    }
    await start();
  });
  root.replaceChildren(h('div', { class: 'login' }, form));
  email.focus();
}
async function signOut() {
  await sb.auth.signOut().catch(() => {});
  state.me = null;
  loginScreen();
}
async function start() {
  root.replaceChildren(spinner());
  const { data } = await sb.auth.getSession();
  if (!data.session) return loginScreen();
  try {
    state.me = await rpc('admin_me');
  } catch (e) {
    return loginScreen(e.message);
  }
  if (!state.me) {
    await sb.auth.signOut().catch(() => {});
    return loginScreen('This account is not a bolo admin. Ask the owner to add you under Settings → Admins.');
  }
  const wanted = location.hash.slice(1);
  if (VIEWS.some((v) => v[0] === wanted)) state.view = wanted;
  await show(state.view);
}

/* ------------------------------------------------------------------ shell */
async function refreshCounts() {
  try {
    state.overview = await rpc('admin_overview');
  } catch {
    /* keep the last counts */
  }
  drawNav();
}
function drawNav() {
  const side = document.querySelector('.side');
  if (!side) return;
  const q = state.overview?.queue || {};
  side.replaceChildren(
    h('div', { class: 'brand' }, h('b', {}, 'b'), 'bolo', h('span', {}, 'admin')),
    ...VIEWS.map(([id, label, key]) => h('button', { class: 'nav', 'aria-current': state.view === id ? 'page' : null, onclick: () => show(id) }, label, key && q[key] ? h('span', { class: 'count num' }, q[key]) : null)),
    h(
      'div',
      { class: 'me col' },
      h('div', { class: 'who' }, h('div', { class: 'small clip' }, state.me.name), h('div', { class: 'tiny faint clip' }, state.me.role)),
      h('button', { class: 'btn sm', onclick: signOut }, 'Sign out'),
    ),
  );
}
async function show(view) {
  state.view = view;
  history.replaceState(null, '', '#' + view);
  if (!document.querySelector('.shell')) root.replaceChildren(h('div', { class: 'shell' }, h('nav', { class: 'side', 'aria-label': 'Sections' }), h('main', { class: 'main' })));
  drawNav();
  const main = document.querySelector('.main');
  main.replaceChildren(spinner());
  try {
    const content = await PAGES[view]();
    if (state.view === view) put(main, content);
  } catch (e) {
    if (/JWT|session|not authenticated/i.test(e.message)) return signOut();
    main.replaceChildren(empty('Couldn’t load this', e.message), h('p', {}, h('button', { class: 'btn', onclick: () => show(view) }, 'Try again')));
  }
  void refreshCounts();
}
const head = (title, sub, right) =>
  h('div', { class: 'head' }, h('div', { class: 'col' }, h('div', { class: 'row' }, h('h1', {}, title), CFG.env && CFG.env !== 'production' ? h('span', { class: 'env' }, CFG.env.toUpperCase()) : null), sub ? h('p', { class: 'muted' }, sub) : null), right || null);
/** Filter chips that reload the page section. */
function tabs(options, current, pick) {
  return h('div', { class: 'chips', role: 'group' }, options.map(([id, label]) => h('button', { class: 'chip', 'aria-pressed': String(id === current), onclick: () => pick(id) }, label)));
}

/* ------------------------------------------------------------------ pages */
const PAGES = {};
const filters = { ids: 'pending', businesses: 'review', reports: 'open', feedback: 'open', experts: 'pending', people: 'all', q: '' };

PAGES.overview = async () => {
  const o = (state.overview = await rpc('admin_overview'));
  const q = o.queue;
  const todo = [
    ['ids', 'ID checks waiting', q.id_checks],
    ['businesses', 'Businesses to verify', q.business_checks],
    ['reports', 'Open reports', q.reports],
    ['feedback', 'Unread feedback', q.feedback],
    ['experts', 'Expert applications', q.experts],
  ];
  const waiting = todo.filter((t) => t[2] > 0);
  const max = Math.max(1, ...o.signups.map((d) => d.n));
  const bars = h('div', { class: 'bars', role: 'img', 'aria-label': 'New accounts per day, last 14 days: ' + o.signups.map((d) => d.n).join(', ') });
  o.signups.forEach((d) => {
    const b = h('div', { title: `${new Date(d.day).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}: ${d.n}` });
    b.style.height = Math.max(3, Math.round((d.n / max) * 90)) + 'px';
    bars.append(b);
  });
  const stat = (label, n, sub) => h('div', { class: 'card stat' }, h('span', { class: 'muted small' }, label), h('b', {}, Number(n).toLocaleString()), sub ? h('span', { class: 'tiny faint' }, sub) : null);
  return [
    head('Overview', `Signed in as ${state.me.name}`),
    h('h2', {}, 'Needs you'),
    waiting.length
      ? h('div', { class: 'cards', style: null }, waiting.map(([id, label, n]) => h('button', { class: 'card stat todo', onclick: () => show(id) }, h('span', { class: 'muted small' }, label), h('b', {}, n))))
      : empty('Nothing is waiting', 'New ID checks, reports and feedback show up here.'),
    h('h2', {}, 'bolo today'),
    h(
      'div',
      { class: 'cards' },
      stat('People', o.people, `${o.people_today} today · ${o.people_7d} this week`),
      stat('Businesses', o.businesses),
      stat('Open jobs', o.jobs_open, `${Number(o.posts).toLocaleString()} posts in all`),
      stat('Bookings', o.bookings, `${o.bookings_done} confirmed done`),
      stat('Messages', o.messages_7d, 'last 7 days'),
      stat('Calls', o.calls_7d, 'last 7 days'),
      stat('Suspended', o.suspended),
    ),
    h('div', { class: 'card col' }, h('h3', {}, 'New accounts, last 14 days'), bars, h('div', { class: 'row between tiny faint' }, h('span', {}, '14 days ago'), h('span', {}, 'today'))),
  ].map((x, i) => (i > 0 ? withGap(x) : x));
};
function withGap(el) {
  el.style.marginTop = '18px';
  return el;
}

PAGES.ids = async () => {
  const rows = await rpc('admin_verifications', { p_status: filters.ids });
  const list = h('div', { class: 'list' });
  for (const v of rows) {
    const docs = h('div', { class: 'docs' }, h('span', { class: 'faint small' }, 'Loading documents…'));
    signed(v.files)
      .then((urls) => docs.replaceChildren(...(urls.length ? urls.map((u, i) => h('a', { href: u, target: '_blank', rel: 'noopener noreferrer', title: 'Open full size' }, h('img', { src: u, alt: `Document ${i + 1} from ${v.name}` }))) : [h('span', { class: 'faint small' }, 'No documents attached')])))
      .catch((e) => docs.replaceChildren(h('span', { class: 'err' }, e.message)));
    const item = h(
      'div',
      { class: 'item' },
      h('div', { class: 'row' }, avatar(v.name, v.avatar_url), h('div', { class: 'grow' }, h('h3', { class: 'clip' }, v.name || 'No name'), h('div', { class: 'small muted clip' }, [v.kind === 'id' ? 'Identity' : v.kind === 'business' ? 'Business documents · ' + (v.business || '') : 'Expert documents', ' · sent ', ago(v.created_at)])), v.status === 'pending' ? pill('Waiting', 'y') : pill(v.status, v.status === 'approved' ? 'g' : 'r')),
      docs,
      kv([['Email', mail(v.email)], ['Phone', v.phone], ['City', v.city], ['Joined', ago(v.joined_at)], v.note ? ['Note', v.note] : null]),
      v.status === 'pending'
        ? h(
            'div',
            { class: 'row wrap' },
            h('button', { class: 'btn y', onclick: () => decide({ title: `Approve ${v.name}?`, text: 'They get the verified badge and a notification.', ok: 'Approve', run: async () => (await rpc('admin_review_verification', { p_id: v.id, p_approve: true, p_note: null }), toast('Approved'), show('ids')) }) }, 'Approve'),
            h('button', { class: 'btn danger', onclick: () => decide({ title: `Reject ${v.name}’s documents?`, text: 'They are told why and can send new ones.', note: 'Reason, for example: the photo is blurred', required: true, danger: true, ok: 'Reject', run: async (n) => (await rpc('admin_review_verification', { p_id: v.id, p_approve: false, p_note: n }), toast('Rejected'), show('ids')) }) }, 'Reject'),
            h('button', { class: 'btn', onclick: () => person(v.user_id) }, 'See account'),
          )
        : null,
    );
    list.append(item);
  }
  return [
    head('ID checks', 'Compare the ID with the selfie. Approve only when the face matches and the document is readable.'),
    tabs([['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Rejected']], filters.ids, (s) => ((filters.ids = s), show('ids'))),
    withGap(rows.length ? list : empty(filters.ids === 'pending' ? 'No ID checks waiting' : 'Nothing here')),
  ];
};

PAGES.businesses = async () => {
  const rows = await rpc('admin_businesses', { p_status: filters.businesses });
  const list = h('div', { class: 'list' });
  for (const b of rows) {
    const st = b.verified === 'verified' ? pill('Verified', 'g') : b.verified === 'review' ? pill('Waiting', 'y') : pill('Not verified');
    list.append(
      h(
        'div',
        { class: 'item' },
        h('div', { class: 'row' }, avatar(b.name, b.logo_url), h('div', { class: 'grow' }, h('h3', { class: 'clip' }, b.name || 'No name'), h('div', { class: 'small muted clip' }, [b.sector, b.city].filter(Boolean).join(' · '))), st),
        kv([['RCCM', b.rccm], ['NIU', b.niu], ['Address', [b.address, b.area, b.city].filter(Boolean).join(', ')], ['Phone', b.phone], ['Email', b.email ? mail(b.email) : null], ['Website', b.web], ['About', b.about], ['Owner', [b.owner, b.owner_verified ? ' (ID verified)' : ' (ID not verified)']], ['Owner email', mail(b.owner_email)], ['Created', ago(b.created_at)]]),
        h(
          'div',
          { class: 'row wrap' },
          b.verified !== 'verified' ? h('button', { class: 'btn y', onclick: () => decide({ title: `Verify ${b.name}?`, text: 'Check the RCCM and NIU against the official registry first. The business gets the verified badge.', ok: 'Verify', run: async () => (await rpc('admin_review_business', { p_business: b.id, p_approve: true, p_note: null }), toast('Verified'), show('businesses')) }) }, 'Verify') : null,
          b.verified !== 'none' ? h('button', { class: 'btn danger', onclick: () => decide({ title: b.verified === 'verified' ? `Remove ${b.name}’s badge?` : `Reject ${b.name}?`, text: 'The owner is told why.', note: 'Reason, for example: the RCCM number does not match the name', required: true, danger: true, ok: b.verified === 'verified' ? 'Remove badge' : 'Reject', run: async (n) => (await rpc('admin_review_business', { p_business: b.id, p_approve: false, p_note: n }), toast('Done'), show('businesses')) }) }, b.verified === 'verified' ? 'Remove badge' : 'Reject') : null,
          h('button', { class: 'btn', onclick: () => person(b.owner_id) }, 'See owner'),
        ),
      ),
    );
  }
  return [
    head('Businesses', 'A business asks to be verified after adding its RCCM and NIU.'),
    tabs([['review', 'Waiting'], ['verified', 'Verified'], ['none', 'Not verified'], ['all', 'All']], filters.businesses, (s) => ((filters.businesses = s), show('businesses'))),
    withGap(rows.length ? list : empty(filters.businesses === 'review' ? 'No business is waiting' : 'Nothing here')),
  ];
};

const REASONS = { spam: 'Spam', scam: 'Scam or fraud', harassment: 'Harassment', inappropriate: 'Inappropriate', fake: 'Fake', wrong_link: 'Wrong link', other: 'Other' };
PAGES.reports = async () => {
  const rows = await rpc('admin_reports', { p_status: filters.reports });
  const list = h('div', { class: 'list' });
  for (const r of rows) {
    const t = r.target;
    const open = r.status === 'open' || r.status === 'reviewing';
    const removable = t && ['post', 'job', 'comment', 'course'].includes(r.target_type);
    const close = (status, label) => async () => (await rpc('admin_resolve_report', { p_id: r.id, p_status: status, p_note: null }), toast(label), show('reports'));
    list.append(
      h(
        'div',
        { class: 'item' + (open ? '' : ' done') },
        h('div', { class: 'row wrap' }, pill(REASONS[r.reason] || r.reason, 'o'), pill(r.target_type), r.times > 1 ? pill(`Reported ${r.times} times`, 'r') : null, h('span', { class: 'grow' }), h('span', { class: 'small faint' }, ago(r.created_at)), open ? null : pill(r.status, r.status === 'actioned' ? 'g' : '')),
        t
          ? h('div', { class: 'quote col' }, h('div', { class: 'row' }, h('b', { class: 'grow clip' }, t.title || ''), t.suspended ? pill('Suspended', 'r') : null), t.text ? h('p', { class: 'pre small' }, t.text) : null, h('p', { class: 'tiny faint' }, 'By ' + (t.owner || 'unknown')))
          : h('div', { class: 'quote faint small' }, 'What was reported is no longer there (deleted).'),
        kv([['Reported by', r.reporter || 'Deleted account'], r.details ? ['They wrote', r.details] : null]),
        open
          ? h(
              'div',
              { class: 'row wrap' },
              removable ? h('button', { class: 'btn danger', onclick: () => decide({ title: 'Remove this ' + (r.target_type === 'comment' ? 'comment' : r.target_type === 'course' ? 'listing' : 'post') + '?', text: 'It is deleted for everyone and its author is told why. This cannot be undone.', note: 'Reason shown to the author', required: true, danger: true, ok: 'Remove', run: async (n) => (await rpc('admin_remove_content', { p_type: r.target_type, p_id: r.target_id, p_note: n }), toast('Removed'), show('reports')) }) }, 'Remove it') : null,
              t?.owner_id && !t.suspended ? h('button', { class: 'btn danger', onclick: () => suspend(t.owner_id, t.owner, () => show('reports')) }, 'Suspend ' + (t.owner || 'account')) : null,
              h('button', { class: 'btn', onclick: () => decide({ title: 'Mark as handled?', text: 'Use this when you acted on it (warned, removed, suspended).', ok: 'Handled', run: close('actioned', 'Marked handled') }) }, 'Handled'),
              h('button', { class: 'btn', onclick: () => decide({ title: 'Dismiss this report?', text: 'Use this when nothing is wrong with what was reported.', ok: 'Dismiss', run: close('dismissed', 'Dismissed') }) }, 'Nothing wrong'),
              t?.owner_id ? h('button', { class: 'btn', onclick: () => person(t.owner_id) }, 'See account') : null,
            )
          : null,
      ),
    );
  }
  return [
    head('Reports', 'What people flagged from the ⋯ menus in the app. Message contents are only shown when a message itself was reported.'),
    tabs([['open', 'Open'], ['actioned', 'Handled'], ['dismissed', 'Dismissed'], ['all', 'All']], filters.reports, (s) => ((filters.reports = s), show('reports'))),
    withGap(rows.length ? list : empty(filters.reports === 'open' ? 'No open reports' : 'Nothing here')),
  ];
};

const TOPICS = { problem: 'Something isn’t working', idea: 'Idea', account: 'Account', safety: 'Safety', other: 'Other' };
PAGES.feedback = async () => {
  const rows = await rpc('admin_feedback', { p_status: filters.feedback });
  const list = h('div', { class: 'list' });
  for (const f of rows) {
    const set = (status, label) => () =>
      decide({ title: label + '?', note: 'Note for the team (optional, not shown to the person)', ok: label, run: async (n) => (await rpc('admin_set_feedback', { p_id: f.id, p_status: status, p_note: n }), toast('Saved'), show('feedback')) });
    list.append(
      h(
        'div',
        { class: 'item' + (f.status === 'open' ? '' : ' done') },
        h('div', { class: 'row wrap' }, pill(TOPICS[f.topic] || f.topic, f.topic === 'safety' ? 'r' : 'o'), f.suspended ? pill('Suspended account', 'r') : null, h('span', { class: 'grow' }), h('span', { class: 'small faint' }, ago(f.created_at)), f.status === 'open' ? null : pill(f.status, 'g')),
        h('p', { class: 'pre' }, f.body),
        kv([['From', f.name || 'No name'], ['Email', mail(f.email, 'Your message to bolo')], ['Phone', f.phone], ['App build', f.app_version], f.admin_note ? ['Team note', f.admin_note] : null]),
        h(
          'div',
          { class: 'row wrap' },
          f.email ? h('a', { class: 'btn y', href: `mailto:${f.email}?subject=${encodeURIComponent('Your message to bolo')}` }, 'Reply by email') : null,
          f.status !== 'answered' ? h('button', { class: 'btn', onclick: set('answered', 'Mark answered') }, 'Mark answered') : null,
          f.status !== 'closed' ? h('button', { class: 'btn', onclick: set('closed', 'Close') }, 'Close') : null,
          f.status !== 'open' ? h('button', { class: 'btn', onclick: set('open', 'Reopen') }, 'Reopen') : null,
          h('button', { class: 'btn', onclick: () => person(f.user_id) }, 'See account'),
        ),
      ),
    );
  }
  return [
    head('Feedback', 'Messages people sent from Settings → Help → Write to bolo. Replies go by email from your own mailbox.'),
    tabs([['open', 'New'], ['answered', 'Answered'], ['closed', 'Closed'], ['all', 'All']], filters.feedback, (s) => ((filters.feedback = s), show('feedback'))),
    withGap(rows.length ? list : empty(filters.feedback === 'open' ? 'No new messages' : 'Nothing here')),
  ];
};

const EX_NEXT = { submitted: ['review', 'Start review'], review: ['interview', 'Invite to interview'], interview: ['approved', 'Approve'] };
PAGES.experts = async () => {
  const rows = await rpc('admin_experts', { p_status: filters.experts });
  const list = h('div', { class: 'list' });
  for (const e of rows) {
    const d = e.data || {};
    const move = (status, title, opts = {}) => () =>
      decide({ title, text: opts.text || 'They get a notification.', note: opts.note, required: opts.required, danger: opts.danger, ok: opts.ok || 'Confirm', run: async (n) => (await rpc('admin_review_expert', { p_user: e.user_id, p_status: status, p_note: n }), toast('Saved'), show('experts')) });
    const next = EX_NEXT[e.status];
    const answers = Object.entries(d).filter(([k, v]) => v != null && v !== '' && !['headline', 'step'].includes(k) && (typeof v !== 'object' || (Array.isArray(v) ? v.length : Object.keys(v).length)));
    list.append(
      h(
        'div',
        { class: 'item' },
        h('div', { class: 'row' }, avatar(e.name), h('div', { class: 'grow' }, h('h3', { class: 'clip' }, e.name || 'No name'), h('div', { class: 'small muted clip' }, e.headline || d.headline || 'No headline')), pill(e.status, e.status === 'approved' ? 'g' : e.status === 'declined' ? 'r' : 'y')),
        kv([['Email', mail(e.email, 'Your bolo expert application')], ['City', e.city], ['ID', e.verified ? 'Verified' : 'Not verified'], ['Experience', e.years ? e.years + ' years' : null], ['Skills', (e.skills || []).join(', ')], ['Updated', ago(e.updated_at)], e.note ? ['Note', e.note] : null]),
        answers.length
          ? h('details', {}, h('summary', { class: 'small muted' }, 'Application answers'), withGap(kv(answers.map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)]))))
          : null,
        h(
          'div',
          { class: 'row wrap' },
          next ? h('button', { class: 'btn y', onclick: move(next[0], next[1] + ' · ' + (e.name || ''), { ok: next[1] }) }, next[1]) : null,
          e.status !== 'declined' && e.status !== 'approved' ? h('button', { class: 'btn danger', onclick: move('declined', 'Decline ' + (e.name || '') + '?', { note: 'Reason shown to the applicant', required: true, danger: true, ok: 'Decline' }) }, 'Decline') : null,
          e.status === 'approved' ? h('button', { class: 'btn danger', onclick: move('declined', 'Remove ' + (e.name || '') + ' as an expert?', { note: 'Reason shown to them', required: true, danger: true, ok: 'Remove' }) }, 'Remove as expert') : null,
          h('button', { class: 'btn', onclick: () => person(e.user_id) }, 'See account'),
        ),
      ),
    );
  }
  return [
    head('Experts', 'Applications to become a Career Expert: review, interview, then approve.'),
    tabs([['pending', 'In progress'], ['approved', 'Approved'], ['declined', 'Declined'], ['all', 'All']], filters.experts, (s) => ((filters.experts = s), show('experts'))),
    withGap(rows.length ? list : empty(filters.experts === 'pending' ? 'No applications in progress' : 'Nothing here')),
  ];
};

PAGES.people = async () => {
  const rows = await rpc('admin_people', { p_query: filters.q || null, p_filter: filters.people, p_limit: 100, p_offset: 0 });
  const search = h('input', { class: 'input', type: 'search', placeholder: 'Name, email, phone or city', value: filters.q, 'aria-label': 'Search people' });
  const form = h('form', { class: 'row' }, h('div', { class: 'grow' }, search), h('button', { class: 'btn y', type: 'submit' }, 'Search'));
  form.addEventListener('submit', (e) => (e.preventDefault(), (filters.q = search.value.trim()), show('people')));
  const table = h(
    'table',
    { class: 'table' },
    h('thead', {}, h('tr', {}, ['Name', 'Email', 'City', 'Joined', 'Last seen', 'Posts', ''].map((c) => h('th', { scope: 'col' }, c)))),
    h(
      'tbody',
      {},
      rows.map((p) =>
        h(
          'tr',
          { class: 'click', tabindex: '0', onclick: () => person(p.id), onkeydown: (e) => e.key === 'Enter' && person(p.id) },
          h('td', {}, h('div', { class: 'row' }, h('b', { class: 'clip' }, p.name || 'No name'), p.verified ? pill('ID ✓', 'g') : null)),
          h('td', { class: 'small' }, p.email || p.phone || '—', p.confirmed ? null : h('span', { class: 'faint' }, ' (not confirmed)')),
          h('td', { class: 'small' }, p.city || '—'),
          h('td', { class: 'small num' }, ago(p.created_at)),
          h('td', { class: 'small num' }, ago(p.last_sign_in_at)),
          h('td', { class: 'num' }, p.posts),
          h('td', {}, h('div', { class: 'row' }, p.suspended_at ? pill('Suspended', 'r') : null, p.deleted_at ? pill('Deleted') : null, p.reports > 0 ? pill(p.reports + ' report' + (p.reports > 1 ? 's' : ''), 'o') : null)),
        ),
      ),
    ),
  );
  return [
    head('People', 'Search an account to see its details, or to suspend or restore it.'),
    form,
    withGap(tabs([['all', 'Everyone'], ['reported', 'Reported'], ['suspended', 'Suspended'], ['verified', 'ID verified'], ['deleted', 'Deleted']], filters.people, (s) => ((filters.people = s), show('people')))),
    withGap(rows.length ? h('div', { class: 'card scroll-x' }, table) : empty('Nobody matches', 'Try another name, email or city.')),
    rows.length === 100 ? h('p', { class: 'small faint' }, 'Showing the 100 newest. Search to narrow it down.') : null,
  ];
};

function suspend(id, name, after) {
  decide({
    title: `Suspend ${name || 'this account'}?`,
    text: 'They disappear from the lists and can no longer post, comment, message, call or apply. They can still read, write to bolo and delete their account. You can restore them later.',
    note: 'Reason shown to them, for example: asking for payment before the job',
    required: true,
    danger: true,
    ok: 'Suspend',
    run: async (n) => {
      await rpc('admin_suspend', { p_user: id, p_on: true, p_note: n });
      toast('Suspended');
      after?.();
    },
  });
}
/** Everything about one account, in a dialog. */
async function person(id) {
  let close;
  const body = h('div', { class: 'col' }, spinner());
  close = dialog(() => body, true);
  const load = async () => {
    try {
      const d = await rpc('admin_person', { p_user: id });
      if (!d) return body.replaceChildren(empty('This account is gone'), h('button', { class: 'btn', onclick: () => close() }, 'Close'));
      const p = d.profile;
      const c = d.counts;
      put(
        body,
        h('div', { class: 'row' }, avatar(p.name, p.avatar_url), h('div', { class: 'grow' }, h('h2', { class: 'clip' }, p.name || 'No name'), h('div', { class: 'small muted' }, [p.city, (p.skills || []).slice(0, 3).join(', ')].filter(Boolean).join(' · ') || 'No skills listed')), h('button', { class: 'btn sm', onclick: () => close() }, 'Close')),
        h('div', { class: 'row wrap' }, p.verified ? pill('ID verified', 'g') : pill('ID not verified'), d.confirmed ? pill('Contact confirmed', 'g') : pill('Contact not confirmed', 'o'), p.suspended_at ? pill('Suspended', 'r') : null, p.deleted_at ? pill('Deleted') : null, p.visible === false ? pill('Hidden from search') : null, p.biz_only ? pill('Business account') : null),
        p.suspended_at ? h('div', { class: 'quote small' }, 'Suspended ' + ago(p.suspended_at) + (p.suspended_note ? ': ' + p.suspended_note : '')) : null,
        kv([['Email', mail(d.email)], ['Phone', d.phone], ['Joined', fmtDate(p.created_at)], ['Last sign-in', fmtDate(d.last_sign_in_at)], ['About', p.bio], ['Account id', h('span', { class: 'tiny faint' }, p.id)]]),
        h('div', { class: 'cards' }, [['Posts', c.posts], ['Offers sent', c.offers], ['Bookings', c.bookings], ['Messages sent', c.messages], ['Reviews', c.reviews], ['Blocked by', c.blocked_by]].map(([l, n]) => h('div', { class: 'card stat' }, h('span', { class: 'muted tiny' }, l), h('b', {}, n)))),
        d.businesses.length ? h('div', { class: 'col' }, h('h3', {}, 'Business pages'), d.businesses.map((b) => h('div', { class: 'row small' }, h('span', { class: 'grow clip' }, b.name), pill(b.verified === 'verified' ? 'Verified' : b.verified === 'review' ? 'Waiting' : 'Not verified', b.verified === 'verified' ? 'g' : '')))) : null,
        d.reports.length ? h('div', { class: 'col' }, h('h3', {}, 'Reports about them'), d.reports.map((r) => h('div', { class: 'row small wrap' }, pill(REASONS[r.reason] || r.reason, 'o'), h('span', { class: 'grow' }, r.details || r.target_type), h('span', { class: 'faint' }, ago(r.created_at)), pill(r.status)))) : null,
        d.posts.length ? h('div', { class: 'col' }, h('h3', {}, 'Latest posts'), d.posts.map((x) => h('div', { class: 'quote small' }, h('b', {}, x.title || x.kind), x.body ? h('p', { class: 'pre' }, x.body) : null, h('p', { class: 'tiny faint' }, ago(x.created_at) + ' · ' + x.status)))) : null,
        d.history.length ? h('div', { class: 'col' }, h('h3', {}, 'Admin history'), d.history.map((x) => h('div', { class: 'row small' }, h('span', { class: 'grow' }, x.action + (x.data?.note ? ': ' + x.data.note : '')), h('span', { class: 'faint' }, ago(x.created_at))))) : null,
        p.deleted_at
          ? null
          : h(
              'div',
              { class: 'row wrap' },
              p.suspended_at
                ? h('button', { class: 'btn y', onclick: () => decide({ title: `Restore ${p.name || 'this account'}?`, text: 'They can use bolo normally again and are told so.', ok: 'Restore', run: async () => (await rpc('admin_suspend', { p_user: id, p_on: false, p_note: null }), toast('Restored'), load(), show(state.view)) }) }, 'Restore account')
                : h('button', { class: 'btn danger', onclick: () => suspend(id, p.name, () => (load(), show(state.view))) }, 'Suspend account'),
            ),
      );
    } catch (e) {
      body.replaceChildren(empty('Couldn’t load this account', e.message), h('button', { class: 'btn', onclick: () => close() }, 'Close'));
    }
  };
  await load();
}

PAGES.settings = async () => {
  const [cfg, admins] = await Promise.all([sb.from('app_config').select('key,value').then(({ data, error }) => (error ? Promise.reject(new Error(error.message)) : data)), rpc('admin_admins')]);
  const get = (k) => cfg.find((x) => x.key === k)?.value || {};
  const mv = get('min_version');
  const mt = get('maintenance');
  const owner = state.me.role === 'owner';

  const minA = h('input', { class: 'input num', type: 'number', min: '0', step: '1', value: mv.android ?? 1, id: 'minA' });
  const minMsg = h('textarea', { class: 'input', maxlength: '240', id: 'minMsg' }, mv.message || '');
  const saveMin = h('button', { class: 'btn y' }, 'Save');
  saveMin.addEventListener('click', async () => {
    try {
      await rpc('admin_set_config', { p_key: 'min_version', p_value: { ...mv, android: Math.max(0, Math.floor(Number(minA.value) || 0)), message: minMsg.value.trim() } });
      toast('Saved');
    } catch (e) {
      say(e);
    }
  });
  const on = h('input', { type: 'checkbox', id: 'mtOn' });
  on.checked = !!mt.on;
  const mtMsg = h('textarea', { class: 'input', maxlength: '400', id: 'mtMsg', placeholder: 'For example: bolo will be offline on Sunday from 2 to 4 am for maintenance.' }, mt.message || '');
  const saveMt = h('button', { class: 'btn y' }, 'Save');
  saveMt.addEventListener('click', async () => {
    if (on.checked && !mtMsg.value.trim()) return toast('Write the notice first', true);
    try {
      await rpc('admin_set_config', { p_key: 'maintenance', p_value: { on: on.checked, message: mtMsg.value.trim() } });
      toast(on.checked ? 'Notice is on' : 'Notice is off');
    } catch (e) {
      say(e);
    }
  });

  const email = h('input', { class: 'input', type: 'email', placeholder: 'Email of their bolo account', 'aria-label': 'Email of the new admin' });
  const role = h('select', { class: 'input', 'aria-label': 'Role' }, [['moderator', 'Moderator'], ['support', 'Support'], ['admin', 'Admin'], ['owner', 'Owner']].map(([v, l]) => h('option', { value: v }, l)));
  const add = h('button', { class: 'btn y', type: 'submit' }, 'Add');
  const addForm = h('form', { class: 'row wrap' }, h('div', { class: 'grow' }, email), h('div', {}, role), add);
  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await rpc('admin_grant', { p_email: email.value.trim(), p_role: role.value });
      toast('Added');
      show('settings');
    } catch (err) {
      say(err);
    }
  });

  return [
    head('Settings'),
    h(
      'div',
      { class: 'card col' },
      h('h2', {}, 'Ask older versions to update'),
      h('p', { class: 'muted small' }, 'People whose app build number is lower than this see “Update bolo” when they open the app. The build number is the one in the release name, for example 144.'),
      h('div', { class: 'field' }, h('label', { for: 'minA' }, 'Lowest Android build that is fine'), minA),
      h('div', { class: 'field' }, h('label', { for: 'minMsg' }, 'Message they see'), minMsg),
      h('div', {}, saveMin),
    ),
    withGap(
      h(
        'div',
        { class: 'card col' },
        h('h2', {}, 'Service notice'),
        h('p', { class: 'muted small' }, 'A short note everyone sees each time they open the app, for example before planned maintenance. Switch it off as soon as it no longer applies.'),
        h('label', { class: 'row', for: 'mtOn' }, on, 'Show the notice'),
        h('div', { class: 'field' }, h('label', { for: 'mtMsg' }, 'Notice'), mtMsg),
        h('div', {}, saveMt),
      ),
    ),
    withGap(
      h(
        'div',
        { class: 'card col' },
        h('h2', {}, 'Admins'),
        h('p', { class: 'muted small' }, 'Everyone here can work the queues. Only owners can add or remove admins. A new admin needs a bolo account first (they sign up in the app).'),
        admins.map((a) =>
          h(
            'div',
            { class: 'row' },
            avatar(a.name),
            h('div', { class: 'grow' }, h('div', { class: 'clip' }, a.name), h('div', { class: 'tiny faint clip' }, [a.email, ' · last sign-in ', ago(a.last_sign_in_at)])),
            pill(a.role, a.role === 'owner' ? 'y' : ''),
            owner && a.email !== state.me.email ? h('button', { class: 'btn sm danger', onclick: () => decide({ title: `Remove ${a.name} as an admin?`, ok: 'Remove', danger: true, run: async () => (await rpc('admin_revoke', { p_user: a.user_id }), toast('Removed'), show('settings')) }) }, 'Remove') : null,
          ),
        ),
        owner ? addForm : null,
      ),
    ),
  ];
};

const ACTIONS = {
  'verification.approve': 'approved an ID check',
  'verification.reject': 'rejected an ID check',
  'business.approve': 'verified a business',
  'business.reject': 'rejected a business',
  'report.actioned': 'handled a report',
  'report.dismissed': 'dismissed a report',
  'report.reviewing': 'started on a report',
  'content.remove': 'removed content',
  'account.suspend': 'suspended an account',
  'account.restore': 'restored an account',
  'account.delete_requested': 'deleted their own account',
  'feedback.answered': 'answered feedback',
  'feedback.closed': 'closed feedback',
  'feedback.open': 'reopened feedback',
  'config.set': 'changed a setting',
  'admin.grant': 'added an admin',
  'admin.revoke': 'removed an admin',
  'pro.set': 'changed a plan',
};
PAGES.activity = async () => {
  const rows = await rpc('admin_audit', { p_limit: 200 });
  const table = h(
    'table',
    { class: 'table' },
    h('thead', {}, h('tr', {}, ['When', 'Who', 'What', 'Details'].map((c) => h('th', { scope: 'col' }, c)))),
    h(
      'tbody',
      {},
      rows.map((l) => {
        const d = l.data || {};
        const detail = [d.name, d.label, d.note, d.role, l.target_table === 'app_config' ? l.target_id : null].filter(Boolean).join(' · ');
        return h('tr', {}, h('td', { class: 'small num' }, fmtDate(l.created_at)), h('td', {}, l.actor), h('td', {}, ACTIONS[l.action] || (l.action.startsWith('expert.') ? 'moved an expert application to ' + l.action.slice(7) : l.action)), h('td', { class: 'small muted' }, detail || '—'));
      }),
    ),
  );
  return [head('Activity', 'Every change made from this panel, newest first. This record cannot be edited or deleted.'), rows.length ? h('div', { class: 'card scroll-x' }, table) : empty('No activity yet')];
};

window.addEventListener('hashchange', () => {
  const v = location.hash.slice(1);
  if (state.me && v !== state.view && PAGES[v]) show(v);
});
start();
