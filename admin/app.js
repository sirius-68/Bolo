// getit admin panel. A static page: it signs in like any getit account and talks to the database with the
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
const SVGNS = 'http://www.w3.org/2000/svg';
/** The same for SVG (charts and icons). */
function s(tag, attrs, ...kids) {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v != null && v !== false) el.setAttribute(k, String(v));
  for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}
const fmtDate = (d) => (d ? new Date(d).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDay = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
function ago(d) {
  if (!d) return '—';
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  if (m < 43200) return `${Math.round(m / 1440)} d ago`;
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
const num = (n) => Number(n || 0).toLocaleString();
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
const pill = (text, kind) => h('span', { class: 'pill' + (kind ? ' ' + kind : '') }, text);
const kv = (pairs) => h('dl', { class: 'kv' }, pairs.filter((p) => p && p[1] != null && p[1] !== '').map(([k, v]) => [h('dt', {}, k), h('dd', {}, v)]));
const empty = (title, text) => h('div', { class: 'empty' }, h('b', {}, title), text || '');
const spinner = () => h('div', { class: 'spin', role: 'status', 'aria-label': 'Loading' });
const avatar = (name, url, size) => h('div', { class: 'avatar' + (size ? ' ' + size : ''), 'aria-hidden': 'true' }, url ? h('img', { src: url, alt: '', referrerpolicy: 'no-referrer' }) : initials(name));
const mail = (email, subject) => (email ? h('a', { href: `mailto:${email}${subject ? '?subject=' + encodeURIComponent(subject) : ''}` }, email) : '—');

/* Icons drawn after Lucide (lucide.dev, ISC licence): 24×24, stroked. */
const ICONS = {
  overview: [['rect', { x: 3, y: 3, width: 7, height: 9, rx: 1.5 }], ['rect', { x: 14, y: 3, width: 7, height: 5, rx: 1.5 }], ['rect', { x: 14, y: 12, width: 7, height: 9, rx: 1.5 }], ['rect', { x: 3, y: 16, width: 7, height: 5, rx: 1.5 }]],
  ids: [['rect', { x: 3, y: 4, width: 18, height: 16, rx: 2 }], ['circle', { cx: 9, cy: 10, r: 2 }], ['path', { d: 'M15 8h2M15 12h2M7 16h10' }]],
  businesses: [['path', { d: 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z' }], ['path', { d: 'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4' }]],
  reports: [['path', { d: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z' }], ['path', { d: 'M4 22v-7' }]],
  feedback: [['path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' }]],
  experts: [['circle', { cx: 12, cy: 8, r: 6 }], ['path', { d: 'M15.5 12.9 17 22l-5-3-5 3 1.5-9.1' }]],
  people: [['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }], ['circle', { cx: 9, cy: 7, r: 4 }], ['path', { d: 'M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' }]],
  content: [['path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }], ['path', { d: 'M14 2v6h6M16 13H8M16 17H8M10 9H8' }]],
  announce: [['path', { d: 'm3 11 18-5v12L3 14v-3z' }], ['path', { d: 'M11.6 16.8a3 3 0 1 1-5.8-1.6' }]],
  settings: [['path', { d: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6' }]],
  activity: [['path', { d: 'M22 12h-4l-3 9L9 3l-3 9H2' }]],
  search: [['circle', { cx: 11, cy: 11, r: 7 }], ['path', { d: 'm21 21-4.3-4.3' }]],
  bell: [['path', { d: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9' }], ['path', { d: 'M10.3 21a1.94 1.94 0 0 0 3.4 0' }]],
  logout: [['path', { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' }], ['path', { d: 'm16 17 5-5-5-5M21 12H9' }]],
  download: [['path', { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' }], ['path', { d: 'm7 10 5 5 5-5M12 15V3' }]],
  up: [['path', { d: 'm22 7-8.5 8.5-5-5L2 17' }], ['path', { d: 'M16 7h6v6' }]],
  down: [['path', { d: 'm22 17-8.5-8.5-5 5L2 7' }], ['path', { d: 'M16 17h6v-6' }]],
  userplus: [['path', { d: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' }], ['circle', { cx: 9, cy: 7, r: 4 }], ['path', { d: 'M19 8v6M22 11h-6' }]],
  zap: [['path', { d: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z' }]],
  briefcase: [['rect', { x: 2, y: 7, width: 20, height: 14, rx: 2 }], ['path', { d: 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16' }]],
  calendar: [['rect', { x: 3, y: 4, width: 18, height: 18, rx: 2 }], ['path', { d: 'M16 2v4M8 2v4M3 10h18m-12 6 2 2 4-4' }]],
  shield: [['path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' }]],
  check: [['path', { d: 'M20 6 9 17l-5-5' }]],
  x: [['path', { d: 'M18 6 6 18M6 6l12 12' }]],
  chevdown: [['path', { d: 'm6 9 6 6 6-6' }]],
  chevup: [['path', { d: 'm18 15-6-6-6 6' }]],
  chevleft: [['path', { d: 'm15 18-6-6 6-6' }]],
  chevright: [['path', { d: 'm9 18 6-6-6-6' }]],
  pin: [['path', { d: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' }], ['circle', { cx: 12, cy: 10, r: 3 }]],
  clock: [['circle', { cx: 12, cy: 12, r: 10 }], ['path', { d: 'M12 6v6l4 2' }]],
  sort: [['path', { d: 'm7 15 5 5 5-5M7 9l5-5 5 5' }]],
};
function icon(name, size = 18) {
  return s('svg', { class: 'ic', width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' }, (ICONS[name] || []).map(([t, a]) => s(t, a)));
}

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
function withGap(el) {
  if (el) el.classList.add('gap');
  return el;
}

/** A dialog. `build(close)` returns the content. Escape and the backdrop close it. */
const openDialogs = [];
function dialog(build, wide) {
  const veil = h('div', { class: 'veil' });
  const close = () => {
    veil.remove();
    document.removeEventListener('keydown', onKey);
    const i = openDialogs.indexOf(veil);
    if (i >= 0) openDialogs.splice(i, 1);
  };
  // Escape closes only the dialog on top (one dialog can open another)
  const onKey = (e) => e.key === 'Escape' && openDialogs[openDialogs.length - 1] === veil && close();
  openDialogs.push(veil);
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

/** Save rows as a CSV file (opens in Excel or Google Sheets). `cols` = [[header, row => value], …]. */
function downloadCSV(name, cols, rows) {
  const cell = (v) => {
    const t = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
    // a leading = + - @ would be run as a formula by spreadsheets
    const safe = /^[=+\-@]/.test(t) ? "'" + t : t;
    return /[",\n;]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe;
  };
  const text = [cols.map((c) => cell(c[0])).join(','), ...rows.map((r) => cols.map((c) => cell(c[1](r))).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }));
  const a = h('a', { href: url, download: `getit-${name}-${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`Saved ${rows.length} row${rows.length === 1 ? '' : 's'}`);
}
const exportBtn = (onclick, label = 'Export CSV') => h('button', { class: 'btn sm', onclick }, icon('download', 16), label);

/* ------------------------------------------------------------------ data */
if (!CFG.url || !CFG.key) {
  root.append(h('div', { class: 'login' }, h('div', { class: 'card login-card col' }, h('h2', {}, 'Not set up yet'), h('p', { class: 'muted' }, 'This copy of the panel has no database address. It is filled in when the site is published.'))));
  throw new Error('getit admin: missing config');
}
// The session lives in this browser tab only: closing the tab signs out.
const sb = createClient(CFG.url, CFG.key, { auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });
async function rpc(fn, args) {
  const { data, error } = await sb.rpc(fn, args || {});
  if (error) {
    if (error.code === 'PGRST202' || /could not find the function/i.test(error.message || '')) throw new Error('The database does not have this yet. Approve the waiting production deploy in GitHub (Actions → Backend), then try again.');
    throw new Error(error.message || 'Something went wrong');
  }
  return data;
}
async function signed(paths, seconds = 300) {
  if (!paths?.length) return [];
  const { data, error } = await sb.storage.from('verifications').createSignedUrls(paths, seconds);
  if (error) throw new Error(error.message);
  return (data || []).map((x) => x.signedUrl).filter(Boolean);
}
const store = {
  get: (k, d) => {
    try {
      const v = localStorage.getItem('bolo-admin.' + k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set: (k, v) => {
    try {
      localStorage.setItem('bolo-admin.' + k, JSON.stringify(v));
    } catch {
      /* private window: not kept */
    }
  },
};

const state = { me: null, view: 'overview', overview: null };
/** The sections, in groups. [id, label, queue key] */
const GROUPS = [
  ['', [['overview', 'Dashboard']]],
  ['Review', [['ids', 'ID checks', 'id_checks'], ['businesses', 'Businesses', 'business_checks'], ['reports', 'Reports', 'reports'], ['feedback', 'Feedback', 'feedback'], ['experts', 'Experts', 'experts']]],
  ['Manage', [['people', 'People'], ['content', 'Content'], ['announce', 'Announcements']]],
  ['System', [['settings', 'Settings'], ['activity', 'Activity']]],
];
const VIEWS = GROUPS.flatMap((g) => g[1]);
const QUEUE = [
  ['ids', 'ID checks waiting', 'id_checks', 'ids'],
  ['businesses', 'Businesses to verify', 'business_checks', 'businesses'],
  ['reports', 'Open reports', 'reports', 'reports'],
  ['feedback', 'Unread feedback', 'feedback', 'feedback'],
  ['experts', 'Expert applications', 'experts', 'experts'],
];
/* What each role may do (the server decides; this only keeps buttons that would be refused out of the way). */
const canModerate = () => ['owner', 'admin', 'moderator'].includes(state.me.role);
const isSenior = () => ['owner', 'admin'].includes(state.me.role);
const ROLE_NOTE = {
  support: 'Your role is Support: you can read everything, answer feedback and message people. Removing, suspending and reviewing are for moderators.',
  moderator: 'Your role is Moderator: you can review, remove and suspend. Announcements, Pro and the switches are for admins; the admin team for owners.',
};

/* ------------------------------------------------------------------ sign in */
function loginScreen(message) {
  const email = h('input', { class: 'input', type: 'email', autocomplete: 'username', placeholder: 'you@example.com', id: 'email' });
  const pwd = h('input', { class: 'input', type: 'password', autocomplete: 'current-password', placeholder: 'Your getit password', id: 'pwd' });
  const err = h('p', { class: 'err' }, message || '');
  const btn = h('button', { class: 'btn y wide', type: 'submit' }, 'Sign in');
  const form = h(
    'form',
    { class: 'card login-card col' },
    h('div', { class: 'brand' }, h('b', {}, 'g'), 'getit', h('span', {}, 'admin')),
    h('p', { class: 'muted small' }, 'Sign in with your own getit account. Only accounts that the owner added as admins get in.'),
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
async function signOut(message) {
  await sb.auth.signOut().catch(() => {});
  state.me = null;
  loginScreen(typeof message === 'string' ? message : '');
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
    return loginScreen('This account is not a getit admin. Ask the owner to add you under Settings → Admins.');
  }
  const wanted = location.hash.slice(1);
  if (VIEWS.some((v) => v[0] === wanted)) state.view = wanted;
  watchIdle();
  await show(state.view);
}

/* Signed out after a while without activity (Settings → Security), like any admin console. */
let lastMove = Date.now();
let idleTimer = null;
function watchIdle() {
  if (idleTimer) return;
  for (const ev of ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']) window.addEventListener(ev, () => (lastMove = Date.now()), { passive: true });
  idleTimer = setInterval(() => {
    const mins = Number(store.get('idle', 30));
    if (!state.me || !mins) return;
    if (Date.now() - lastMove > mins * 60000) signOut(`Signed out after ${mins} minutes without activity.`);
  }, 30000);
}

/* ------------------------------------------------------------------ shell */
async function refreshCounts() {
  try {
    state.overview = await rpc('admin_overview');
  } catch {
    /* keep the last counts */
  }
  drawNav();
  drawBell();
}
const queueTotal = () => QUEUE.reduce((a, q) => a + (state.overview?.queue?.[q[2]] || 0), 0);
function drawNav() {
  const side = document.querySelector('.side');
  if (!side) return;
  const q = state.overview?.queue || {};
  const role = state.me.role;
  put(
    side,
    h('div', { class: 'brand' }, h('b', {}, 'g'), 'getit', h('span', {}, 'admin'), CFG.env && CFG.env !== 'production' ? h('span', { class: 'env' }, CFG.env.toUpperCase()) : null),
    h('div', { class: 'me-card' }, avatar(state.me.name, null, 'sm'), h('div', { class: 'grow' }, h('div', { class: 'small clip strong' }, state.me.name), h('div', { class: 'tiny faint clip cap' }, role + ' account'))),
    GROUPS.map(([label, items]) => [
      label ? h('div', { class: 'nav-group' }, label) : null,
      items.map(([id, text, key]) => h('button', { class: 'nav', 'aria-current': state.view === id ? 'page' : null, onclick: () => show(id) }, icon(id), h('span', { class: 'grow' }, text), key && q[key] ? h('span', { class: 'count num' }, q[key]) : null)),
    ]),
    h('div', { class: 'grow' }),
    h('div', { class: 'help-card' }, h('b', {}, 'Keyboard'), h('span', {}, h('kbd', {}, '/'), ' or ', h('kbd', {}, 'Ctrl'), ' ', h('kbd', {}, 'K'), ' search everything')),
    h('button', { class: 'nav', onclick: signOut }, icon('logout'), h('span', { class: 'grow' }, 'Sign out')),
  );
}
function drawBell() {
  const b = document.querySelector('.bell');
  if (!b) return;
  const n = queueTotal();
  put(b, icon('bell', 20), n ? h('span', { class: 'dot num' }, n > 99 ? '99+' : n) : null);
  b.setAttribute('aria-label', n ? `${n} things need you` : 'Nothing needs you');
}
function openBell(anchor) {
  const q = state.overview?.queue || {};
  const items = QUEUE.filter((x) => q[x[2]] > 0);
  popover(anchor, () => [
    h('div', { class: 'pop-head' }, 'Needs you'),
    items.length
      ? items.map(([view, label, key, ic]) => h('button', { class: 'pop-item', onclick: () => (closePopover(), show(view)) }, h('span', { class: 'pop-ic' }, icon(ic, 16)), h('span', { class: 'grow' }, label), h('b', { class: 'num' }, q[key])))
      : h('p', { class: 'muted small pop-empty' }, 'Nothing is waiting. New ID checks, reports and feedback show up here.'),
  ]);
}
let popEl = null;
function closePopover() {
  popEl?.remove();
  popEl = null;
}
function popover(anchor, build) {
  closePopover();
  popEl = h('div', { class: 'popover', role: 'dialog' }, build());
  const r = anchor.getBoundingClientRect();
  popEl.style.top = r.bottom + 8 + 'px';
  popEl.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
  document.body.append(popEl);
  setTimeout(() => document.addEventListener('mousedown', outside), 0);
  function outside(e) {
    if (popEl && !popEl.contains(e.target) && !anchor.contains(e.target)) {
      closePopover();
      document.removeEventListener('mousedown', outside);
    }
  }
}

/* ------------------------------------------------------------------ search everything (people, businesses, posts and jobs) */
let searchSeq = 0;
function searchBox() {
  const input = h('input', { class: 'search-input', type: 'search', placeholder: 'Search people, businesses, posts…', 'aria-label': 'Search everything', id: 'globalSearch', autocomplete: 'off' });
  const box = h('div', { class: 'search' }, icon('search', 18), input, h('kbd', { class: 'search-kbd' }, 'Ctrl K'));
  const results = h('div', { class: 'search-pop', role: 'listbox' });
  let t;
  const close = () => results.remove();
  input.addEventListener('input', () => {
    clearTimeout(t);
    const q = input.value.trim();
    if (q.length < 2) return close();
    t = setTimeout(() => runSearch(q), 280);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') (input.value = ''), close(), input.blur();
    if (e.key === 'Enter' && input.value.trim()) (filters.q = input.value.trim()), close(), show('people');
    if (e.key === 'ArrowDown') results.querySelector('button')?.focus();
  });
  results.addEventListener('keydown', (e) => {
    const all = [...results.querySelectorAll('button')];
    const i = all.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') (all[i + 1] || all[0])?.focus(), e.preventDefault();
    if (e.key === 'ArrowUp') (i <= 0 ? input : all[i - 1]).focus(), e.preventDefault();
    if (e.key === 'Escape') close(), input.focus();
  });
  document.addEventListener('mousedown', (e) => !box.contains(e.target) && !results.contains(e.target) && close());
  async function runSearch(q) {
    const seq = ++searchSeq;
    put(results, h('div', { class: 'pop-empty muted small' }, 'Searching…'));
    box.append(results);
    const [people, biz, posts] = await Promise.all([
      rpc('admin_people', { p_query: q, p_filter: 'all', p_limit: 5, p_offset: 0 }).catch(() => []),
      rpc('admin_businesses', { p_status: 'all', p_query: q }).catch(() => []),
      rpc('admin_latest_content', { p_kind: 'posts', p_query: q, p_limit: 4 }).catch(() => []),
    ]);
    if (seq !== searchSeq) return;
    const sec = (title, list) => (list.length ? [h('div', { class: 'pop-head' }, title), list] : null);
    const go = (fn) => () => (close(), (input.value = ''), fn());
    const rowsP = (Array.isArray(people) ? people : people.rows || []).slice(0, 5).map((p) => h('button', { class: 'pop-item', role: 'option', onclick: go(() => person(p.id)) }, avatar(p.name, null, 'xs'), h('span', { class: 'grow clip' }, p.name || 'No name', h('span', { class: 'faint' }, p.city ? ' · ' + p.city : '')), h('span', { class: 'tiny faint clip' }, p.email || '')));
    const rowsB = (biz || []).slice(0, 4).map((b) => h('button', { class: 'pop-item', role: 'option', onclick: go(() => ((filters.bq = b.name), (filters.businesses = 'all'), show('businesses'))) }, avatar(b.name, b.logo_url, 'xs'), h('span', { class: 'grow clip' }, b.name, h('span', { class: 'faint' }, b.city ? ' · ' + b.city : '')), b.verified === 'verified' ? pill('Verified', 'g') : null));
    const rowsC = (posts || []).slice(0, 4).map((c) => h('button', { class: 'pop-item', role: 'option', onclick: go(() => ((filters.cq = q), (filters.content = 'posts'), show('content'))) }, h('span', { class: 'pop-ic' }, icon('content', 15)), h('span', { class: 'grow clip' }, (c.body || '').slice(0, 80)), h('span', { class: 'tiny faint' }, c.author || '')));
    const any = rowsP.length || rowsB.length || rowsC.length;
    put(results, any ? [sec('People', rowsP), sec('Businesses', rowsB), sec('Posts', rowsC), h('button', { class: 'pop-more', onclick: go(() => ((filters.q = q), show('people'))) }, `See all people matching “${q}”`)] : h('div', { class: 'pop-empty muted small' }, `Nothing matches “${q}”.`));
  }
  return box;
}
document.addEventListener('keydown', (e) => {
  const typing = /input|textarea|select/i.test(document.activeElement?.tagName || '');
  if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing && !openDialogs.length)) {
    const el = document.getElementById('globalSearch');
    if (el) e.preventDefault(), el.focus(), el.select();
  }
});

async function show(view) {
  state.view = view;
  history.replaceState(null, '', '#' + view);
  closePopover();
  if (!document.querySelector('.shell')) {
    const bell = h('button', { class: 'icon-btn bell', 'aria-label': 'Needs you', onclick: (e) => openBell(e.currentTarget) });
    root.replaceChildren(
      h(
        'div',
        { class: 'shell' },
        h('nav', { class: 'side', 'aria-label': 'Sections' }),
        h('div', { class: 'body' }, h('header', { class: 'topbar' }, h('div', { class: 'top-title grow' }), searchBox(), bell, h('div', { class: 'top-me', title: state.me.name }, avatar(state.me.name, null, 'sm'))), h('main', { class: 'main' })),
      ),
    );
  }
  drawNav();
  drawBell();
  const main = document.querySelector('.main');
  const title = document.querySelector('.top-title');
  main.replaceChildren(spinner());
  try {
    const content = [await PAGES[view]()].flat(Infinity).filter((x) => x != null && x !== false);
    if (state.view !== view) return;
    // the page's own title goes in the top bar, next to the search
    if (content[0]?.classList?.contains('head')) put(title, [...content.shift().children]);
    else title.replaceChildren();
    put(main, content);
  } catch (e) {
    if (/JWT|session|not authenticated/i.test(e.message)) return signOut();
    title.replaceChildren();
    main.replaceChildren(empty('Couldn’t load this', e.message), h('p', {}, h('button', { class: 'btn', onclick: () => show(view) }, 'Try again')));
  }
  void refreshCounts();
}
const head = (title, sub) => h('div', { class: 'head' }, h('h1', {}, title), sub ? h('p', { class: 'muted small' }, sub) : null);
/** Filter chips that reload the page section. */
function tabs(options, current, pick) {
  return h('div', { class: 'chips', role: 'group' }, options.map(([id, label]) => h('button', { class: 'chip', 'aria-pressed': String(id === current), onclick: () => pick(id) }, label)));
}
/** A toolbar: search on the left, buttons on the right. */
const toolbar = (...kids) => h('div', { class: 'toolbar' }, kids);
function searchForm(value, placeholder, label, onSearch) {
  const input = h('input', { class: 'input', type: 'search', placeholder, value, 'aria-label': label });
  const form = h('form', { class: 'row grow' }, h('div', { class: 'grow field-ic' }, icon('search', 16), input), h('button', { class: 'btn y', type: 'submit' }, 'Search'));
  form.addEventListener('submit', (e) => (e.preventDefault(), onSearch(input.value.trim())));
  return form;
}

/* ------------------------------------------------------------------ charts (plain SVG, drawn to the size of their box) */
const COLORS = { yellow: '#f6ee5c', lav: '#a9b6ff', mint: '#7be0a7', peach: '#ffb37a', pink: '#f6a4b4', blue: '#3d5af1' };
let gradSeq = 0;
/** Draw `draw(width)` into `box` now and whenever the box changes width. */
function responsive(box, draw) {
  let w = 0;
  const ro = new ResizeObserver(() => {
    const nw = Math.floor(box.clientWidth);
    if (nw && nw !== w) (w = nw), draw(nw);
  });
  ro.observe(box);
  return box;
}
function niceMax(v) {
  if (v <= 4) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}
/** A smooth line through the points that never overshoots (monotone cubic). */
function smooth(pts) {
  if (pts.length < 2) return pts.length ? `M${pts[0][0]},${pts[0][1]}` : '';
  const n = pts.length;
  const dx = [], dy = [], m = [], t = [];
  for (let i = 0; i < n - 1; i++) (dx[i] = pts[i + 1][0] - pts[i][0]), (dy[i] = pts[i + 1][1] - pts[i][1]), (m[i] = dy[i] / dx[i]);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i][0] + dx[i] / 3, c1y = pts[i][1] + (t[i] * dx[i]) / 3;
    const c2x = pts[i + 1][0] - dx[i] / 3, c2y = pts[i + 1][1] - (t[i + 1] * dx[i]) / 3;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}
/** Lines over days, with a guide and a tooltip on hover. series: [{ name, color, values }] */
function lineChart({ labels, series, height = 240, label }) {
  const box = h('div', { class: 'chart', role: 'img', 'aria-label': label });
  const tip = h('div', { class: 'tip' });
  return responsive(box, (W) => {
    const H = height, L = 36, R = 12, T = 14, B = 26;
    const max = niceMax(Math.max(1, ...series.flatMap((x) => x.values)));
    const x = (i) => L + (labels.length < 2 ? 0 : (i * (W - L - R)) / (labels.length - 1));
    const y = (v) => T + (H - T - B) * (1 - v / max);
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    const defs = s('defs');
    svg.append(defs);
    for (let k = 0; k <= 4; k++) {
      const v = (max * k) / 4;
      svg.append(s('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' }), s('text', { x: L - 8, y: y(v) + 4, class: 'axis', 'text-anchor': 'end' }, v >= 1000 ? Math.round(v / 100) / 10 + 'k' : Math.round(v)));
    }
    const step = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor((W - L) / 84))));
    labels.forEach((d, i) => (i % step === 0 || i === labels.length - 1) && (i === labels.length - 1 || labels.length - 1 - i >= step * 0.85) && svg.append(s('text', { x: x(i), y: H - 6, class: 'axis', 'text-anchor': i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle' }, fmtDay(d))));
    for (const sr of series) {
      const id = 'g' + ++gradSeq;
      defs.append(s('linearGradient', { id, x1: 0, x2: 0, y1: 0, y2: 1 }, s('stop', { offset: '0%', 'stop-color': sr.color, 'stop-opacity': 0.28 }), s('stop', { offset: '100%', 'stop-color': sr.color, 'stop-opacity': 0 })));
      const pts = sr.values.map((v, i) => [x(i), y(v)]);
      const line = smooth(pts);
      if (sr.fill !== false) svg.append(s('path', { d: `${line} L${x(pts.length - 1)},${y(0)} L${x(0)},${y(0)} Z`, fill: `url(#${id})` }));
      svg.append(s('path', { d: line, fill: 'none', stroke: sr.color, 'stroke-width': 2.5, 'stroke-linecap': 'round' }));
    }
    const guide = s('line', { y1: T, y2: H - B, class: 'guide', visibility: 'hidden' });
    const dots = series.map((sr) => s('circle', { r: 4.5, fill: '#0b0b0d', stroke: sr.color, 'stroke-width': 2.5, visibility: 'hidden' }));
    const hit = s('rect', { x: L, y: T, width: Math.max(1, W - L - R), height: H - T - B, fill: 'transparent' });
    svg.append(guide, ...dots, hit);
    const move = (e) => {
      const r = svg.getBoundingClientRect();
      const i = Math.max(0, Math.min(labels.length - 1, Math.round(((e.clientX - r.left - L) / (W - L - R)) * (labels.length - 1))));
      guide.setAttribute('x1', x(i));
      guide.setAttribute('x2', x(i));
      guide.setAttribute('visibility', 'visible');
      dots.forEach((d, k) => (d.setAttribute('cx', x(i)), d.setAttribute('cy', y(series[k].values[i])), d.setAttribute('visibility', 'visible')));
      put(tip, h('b', {}, fmtDay(labels[i])), series.map((sr) => h('div', { class: 'tip-row' }, h('i', { class: 'sw', 'data-c': sr.color }), sr.name, h('b', { class: 'num' }, num(sr.values[i])))));
      tip.querySelectorAll('.sw').forEach((el) => (el.style.background = el.getAttribute('data-c')));
      tip.classList.add('on');
      const left = Math.min(Math.max(x(i) + 12, 0), W - tip.offsetWidth - 4);
      tip.style.left = (x(i) + 12 + tip.offsetWidth > W ? x(i) - tip.offsetWidth - 12 : left) + 'px';
      tip.style.top = '8px';
    };
    hit.addEventListener('mousemove', move);
    hit.addEventListener('mouseleave', () => (guide.setAttribute('visibility', 'hidden'), dots.forEach((d) => d.setAttribute('visibility', 'hidden')), tip.classList.remove('on')));
    box.replaceChildren(svg, tip);
  });
}
/** Stacked bars per day; the last (today) is lit. series: [{ name, color, values }] */
function barChart({ labels, series, height = 200, label }) {
  const box = h('div', { class: 'chart', role: 'img', 'aria-label': label });
  const tip = h('div', { class: 'tip' });
  return responsive(box, (W) => {
    const H = height, L = 30, R = 8, T = 10, B = 24;
    const totals = labels.map((_, i) => series.reduce((a, sr) => a + (sr.values[i] || 0), 0));
    const max = niceMax(Math.max(1, ...totals));
    const n = labels.length;
    const slot = (W - L - R) / n;
    const bw = Math.max(3, Math.min(26, slot * 0.62));
    const y = (v) => T + (H - T - B) * (1 - v / max);
    const svg = s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}` });
    for (let k = 0; k <= 4; k++) svg.append(s('line', { x1: L, x2: W - R, y1: y((max * k) / 4), y2: y((max * k) / 4), class: 'grid' }), s('text', { x: L - 6, y: y((max * k) / 4) + 4, class: 'axis', 'text-anchor': 'end' }, Math.round((max * k) / 4)));
    const step = Math.max(1, Math.ceil(n / Math.max(2, Math.floor((W - L) / 80))));
    labels.forEach((d, i) => {
      const cx = L + slot * i + slot / 2;
      let base = 0;
      const g = s('g', { class: 'bar' + (i === n - 1 ? ' today' : '') });
      series.forEach((sr) => {
        const v = sr.values[i] || 0;
        if (v > 0) g.append(s('rect', { x: cx - bw / 2, y: y(base + v), width: bw, height: Math.max(1, y(base) - y(base + v)), rx: Math.min(4, bw / 3), fill: sr.color }));
        base += v;
      });
      if (!base) g.append(s('rect', { x: cx - bw / 2, y: y(0) - 2, width: bw, height: 2, rx: 1, class: 'zero' }));
      g.append(s('rect', { x: L + slot * i, y: T, width: slot, height: H - T - B, fill: 'transparent' }));
      g.addEventListener('mouseenter', () => {
        put(tip, h('b', {}, fmtDay(d)), series.map((sr) => h('div', { class: 'tip-row' }, h('i', { class: 'sw', 'data-c': sr.color }), sr.name, h('b', { class: 'num' }, num(sr.values[i])))));
        tip.querySelectorAll('.sw').forEach((el) => (el.style.background = el.getAttribute('data-c')));
        tip.classList.add('on');
        tip.style.left = Math.min(Math.max(cx - tip.offsetWidth / 2, 0), W - tip.offsetWidth) + 'px';
        tip.style.top = '4px';
      });
      g.addEventListener('mouseleave', () => tip.classList.remove('on'));
      svg.append(g);
      if (i % step === 0 || i === n - 1) if (i === n - 1 || n - 1 - i >= step * 0.85) svg.append(s('text', { x: cx, y: H - 6, class: 'axis', 'text-anchor': 'middle' }, fmtDay(d)));
    });
    box.replaceChildren(svg, tip);
  });
}
/** A ring with the total in the middle and a legend. items: [{ label, value, color }] */
function donut({ items, center, label }) {
  const total = items.reduce((a, x) => a + x.value, 0);
  const R = 62, C = 2 * Math.PI * R;
  const svg = s('svg', { width: 160, height: 160, viewBox: '0 0 160 160', class: 'donut', role: 'img', 'aria-label': label });
  svg.append(s('circle', { cx: 80, cy: 80, r: R, fill: 'none', class: 'track', 'stroke-width': 18 }));
  let off = 0;
  for (const it of items) {
    const len = total ? (it.value / total) * C : 0;
    if (len > 0) svg.append(s('circle', { cx: 80, cy: 80, r: R, fill: 'none', stroke: it.color, 'stroke-width': 18, 'stroke-dasharray': `${Math.max(0, len - 3)} ${C}`, 'stroke-dashoffset': -off, transform: 'rotate(-90 80 80)', 'stroke-linecap': 'butt' }));
    off += len;
  }
  svg.append(s('text', { x: 80, y: 78, 'text-anchor': 'middle', class: 'donut-num' }, num(total)), s('text', { x: 80, y: 98, 'text-anchor': 'middle', class: 'donut-sub' }, center));
  const legend = h('div', { class: 'legend' }, items.map((it) => {
    const sw = h('i', { class: 'sw' });
    sw.style.background = it.color;
    return h('div', { class: 'legend-row' }, sw, h('span', { class: 'grow' }, it.label), h('b', { class: 'num' }, num(it.value)), h('span', { class: 'faint num pct' }, total ? Math.round((it.value / total) * 100) + '%' : '–'));
  }));
  return h('div', { class: 'donut-wrap' }, svg, legend);
}
/** A tiny line for the coloured cards. */
function sparkline(values) {
  const W = 120, H = 36;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i * W) / Math.max(1, values.length - 1), H - 3 - (v / max) * (H - 6)]);
  return s('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: 'spark', 'aria-hidden': 'true' }, s('path', { d: smooth(pts), fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' }));
}
/** "+12%" against the period before (or "new" when there was nothing before). */
function trend(now, prev) {
  if (!prev && !now) return h('span', { class: 'trend flat' }, '–');
  if (!prev) return h('span', { class: 'trend up' }, icon('up', 14), 'new');
  const p = Math.round(((now - prev) / prev) * 100);
  return h('span', { class: 'trend ' + (p > 0 ? 'up' : p < 0 ? 'down' : 'flat') }, p ? icon(p > 0 ? 'up' : 'down', 14) : null, (p > 0 ? '+' : '') + p + '%');
}

/* ------------------------------------------------------------------ pages */
const PAGES = {};
const filters = { ids: 'pending', businesses: 'review', reports: 'open', feedback: 'open', experts: 'pending', people: 'all', q: '', bq: '', content: 'posts', cq: '', days: store.get('days', 30), page: 0, sort: ['created_at', -1], act: 'all', actWho: '', actQ: '' };

PAGES.overview = async () => {
  const days = filters.days;
  const [o, st, audit, admins] = await Promise.all([
    rpc('admin_overview'),
    rpc('admin_stats', { p_days: days }).catch((e) => ({ error: e.message })),
    rpc('admin_audit', { p_limit: 8 }).catch(() => []),
    rpc('admin_admins').catch(() => []),
  ]);
  state.overview = o;
  const q = o.queue || {};
  const first = String(state.me.name || '').split(/\s+/)[0] || 'there';
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  const period = h('div', { class: 'row between wrap' }, h('div', {}, h('h2', {}, 'getit at a glance'), h('p', { class: 'muted small' }, `The last ${days} days, compared with the ${days} days before`)), tabs([[7, '7 days'], [30, '30 days'], [90, '90 days']], days, (d) => ((filters.days = d), store.set('days', d), show('overview'))));

  // coloured cards: the period's numbers, the trend, and a little line
  const S = st.error ? null : st;
  const series = (k) => (S ? S.series.map((r) => r[k]) : []);
  const card = (color, ic, label, k, sub) =>
    h('div', { class: 'kpi ' + color }, h('div', { class: 'row between' }, h('span', { class: 'kpi-ic' }, icon(ic, 18)), S ? trend(S.now[k], S.prev[k]) : null), h('div', { class: 'kpi-label' }, label), h('div', { class: 'row between end' }, h('b', { class: 'kpi-num num' }, S ? num(S.now[k]) : '–'), S ? sparkline(series(k)) : null), h('div', { class: 'kpi-sub' }, sub));
  const kpis = h(
    'div',
    { class: 'kpis' },
    card('yellow', 'userplus', 'New accounts', 'signups', `${num(o.people)} people in all`),
    card('lav', 'zap', 'Active people', 'active', 'posted, wrote, offered or booked'),
    card('mint', 'briefcase', 'Jobs posted', 'jobs', `${num(o.jobs_open)} open right now`),
    card('peach', 'calendar', 'Bookings', 'bookings', `${num(o.bookings_done)} confirmed done in all`),
  );
  const tile = (label, n, sub) => h('div', { class: 'tile' }, h('span', { class: 'muted tiny' }, label), h('b', { class: 'num' }, num(n)), sub ? h('span', { class: 'tiny faint' }, sub) : null);
  const tiles = h('div', { class: 'tiles' }, tile('Businesses', o.businesses), tile('Posts in all', o.posts), tile('Messages', S ? S.now.messages : o.messages_7d, S ? `last ${days} days` : 'last 7 days'), tile('Calls', S ? S.now.calls : o.calls_7d, S ? `last ${days} days` : 'last 7 days'), tile('Reports', S ? S.now.reports : q.reports, S ? `last ${days} days` : 'open'), tile('Suspended', o.suspended));

  let charts = null;
  if (S) {
    const labels = S.series.map((r) => r.day);
    const legend = (items) => h('div', { class: 'row wrap legend-inline' }, items.map(([n, c]) => {
      const sw = h('i', { class: 'sw' });
      sw.style.background = c;
      return h('span', { class: 'row tiny muted' }, sw, n);
    }));
    const t = S.types;
    const f = S.funnel;
    const steps = [['Signed up', f.signed_up], ['Filled in their profile', f.profile], ['Verified their ID', f.verified], ['Posted, wrote or offered', f.acted], ['Got or made a booking', f.booked]];
    const top = Math.max(1, f.signed_up);
    const funnel = h('div', { class: 'funnel' }, steps.map(([l, n], i) => {
      const bar = h('div', { class: 'fbar' });
      bar.style.width = Math.max(2, (n / top) * 100) + '%';
      return h('div', { class: 'frow' }, h('div', { class: 'row between tiny' }, h('span', {}, l), h('span', { class: 'num' }, h('b', {}, num(n)), i ? h('span', { class: 'faint' }, ' · ' + (top ? Math.round((n / top) * 100) : 0) + '%') : null)), h('div', { class: 'ftrack' }, bar));
    }));
    const cmax = Math.max(1, ...S.cities.map((c) => c.n));
    const cities = S.cities.length
      ? h('div', { class: 'col tight' }, S.cities.map((c) => {
          const bar = h('div', { class: 'cbar' });
          bar.style.width = (c.n / cmax) * 100 + '%';
          return h('div', { class: 'crow' }, h('span', { class: 'row small' }, icon('pin', 14), c.city), h('div', { class: 'ctrack' }, bar), h('b', { class: 'num small' }, num(c.n)));
        }))
      : empty('No cities yet');
    const bs = S.bookings_by_state || {};
    const STATES = [['booked', 'Booked', COLORS.lav], ['onway', 'On the way', COLORS.blue], ['working', 'Working', COLORS.peach], ['done', 'Done, to confirm', COLORS.yellow], ['confirmed', 'Confirmed', COLORS.mint], ['cancelled', 'Cancelled', COLORS.pink]];
    charts = [
      h(
        'div',
        { class: 'grid-2-1 gap' },
        h('section', { class: 'panel' }, h('div', { class: 'panel-head' }, h('div', {}, h('h3', {}, 'Growth and activity'), h('p', { class: 'tiny faint' }, 'Per day')), legend([['New accounts', COLORS.yellow], ['Active people', COLORS.lav]])), lineChart({ labels, series: [{ name: 'New accounts', color: COLORS.yellow, values: series('signups') }, { name: 'Active people', color: COLORS.lav, values: series('active') }], label: 'New accounts and active people per day' })),
        h('section', { class: 'panel' }, h('div', { class: 'panel-head' }, h('h3', {}, 'Accounts')), donut({ items: [{ label: 'Offer work', value: t.workers, color: COLORS.yellow }, { label: 'Hire', value: t.hirers, color: COLORS.lav }, { label: 'Business accounts', value: t.business_accounts, color: COLORS.mint }], center: 'people', label: 'Kinds of accounts' }), h('p', { class: 'tiny faint' }, `${num(t.businesses)} business pages, including those of Regular accounts`)),
      ),
      h(
        'div',
        { class: 'grid-2-1 gap' },
        h('section', { class: 'panel' }, h('div', { class: 'panel-head' }, h('div', {}, h('h3', {}, 'Marketplace'), h('p', { class: 'tiny faint' }, 'Jobs, posts and bookings per day')), legend([['Jobs', COLORS.mint], ['Posts', COLORS.lav], ['Bookings', COLORS.peach]])), barChart({ labels, series: [{ name: 'Jobs', color: COLORS.mint, values: series('jobs') }, { name: 'Posts', color: COLORS.lav, values: series('posts') }, { name: 'Bookings', color: COLORS.peach, values: series('bookings') }], label: 'Jobs, posts and bookings per day' })),
        h('section', { class: 'panel' }, h('div', { class: 'panel-head' }, h('div', {}, h('h3', {}, 'New accounts: how far they got'), h('p', { class: 'tiny faint' }, `Accounts made in the last ${days} days`))), funnel),
      ),
      h(
        'div',
        { class: 'grid-2 gap' },
        h('section', { class: 'panel' }, h('div', { class: 'panel-head' }, h('h3', {}, 'Top cities')), cities),
        h('section', { class: 'panel' }, h('div', { class: 'panel-head' }, h('h3', {}, 'Bookings by stage'), h('span', { class: 'tiny faint' }, 'all time')), h('div', { class: 'stages' }, STATES.map(([k, l, c]) => {
          const sw = h('i', { class: 'sw' });
          sw.style.background = c;
          return h('div', { class: 'stage' }, h('span', { class: 'row tiny muted' }, sw, l), h('b', { class: 'num' }, num(bs[k] || 0)));
        }))),
      ),
    ];
  } else {
    charts = withGap(h('div', { class: 'panel' }, empty('Charts need the latest server update', st.error)));
  }

  // the right-hand column: what needs you, the latest actions, the team
  const needs = QUEUE.filter((x) => q[x[2]] > 0);
  const rail = h(
    'aside',
    { class: 'rail' },
    h('section', { class: 'panel' }, h('div', { class: 'panel-head' }, h('h3', {}, 'Needs you'), needs.length ? pill(String(needs.reduce((a, x) => a + q[x[2]], 0)), 'y') : null), needs.length ? h('div', { class: 'col tight' }, needs.map(([view, label, key, ic]) => h('button', { class: 'rail-item', onclick: () => show(view) }, h('span', { class: 'rail-ic' }, icon(ic, 16)), h('span', { class: 'grow' }, label), h('b', { class: 'num' }, q[key]), icon('chevright', 16)))) : h('p', { class: 'muted small' }, 'Nothing is waiting. ✓')),
    h('section', { class: 'panel' }, h('div', { class: 'panel-head' }, h('h3', {}, 'Latest actions'), h('button', { class: 'link', onclick: () => show('activity') }, 'See all')), audit.length ? h('ol', { class: 'timeline' }, audit.slice(0, 7).map((l) => h('li', {}, h('div', { class: 'small' }, h('b', {}, l.actor), ' ', ACTIONS[l.action] || l.action), h('div', { class: 'tiny faint' }, ago(l.created_at) + (l.data?.note ? ' · ' + String(l.data.note).slice(0, 60) : ''))))) : h('p', { class: 'muted small' }, 'No actions yet.')),
    h('section', { class: 'panel' }, h('div', { class: 'panel-head' }, h('h3', {}, 'Admin team'), h('button', { class: 'link', onclick: () => show('settings') }, 'Manage')), h('div', { class: 'col tight' }, admins.slice(0, 6).map((a) => h('div', { class: 'row' }, avatar(a.name, null, 'xs'), h('div', { class: 'grow' }, h('div', { class: 'small clip' }, a.name), h('div', { class: 'tiny faint' }, 'last sign-in ' + ago(a.last_sign_in_at))), pill(a.role, a.role === 'owner' ? 'y' : ''))))),
  );
  return [head(`Hello, ${first} 👋`, `${today} · here is what is happening on getit`), h('div', { class: 'dash' }, h('div', { class: 'dash-main' }, period, withGap(kpis), withGap(tiles), charts), rail)];
};

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
      v.status === 'pending' && canModerate()
        ? h(
            'div',
            { class: 'row wrap' },
            h('button', { class: 'btn y', onclick: () => decide({ title: `Approve ${v.name}?`, text: 'They get the verified badge and a notification.', ok: 'Approve', run: async () => (await rpc('admin_review_verification', { p_id: v.id, p_approve: true, p_note: null }), toast('Approved'), show('ids')) }) }, icon('check', 16), 'Approve'),
            h('button', { class: 'btn danger', onclick: () => decide({ title: `Reject ${v.name}’s documents?`, text: 'They are told why and can send new ones.', note: 'Reason, for example: the photo is blurred', required: true, danger: true, ok: 'Reject', run: async (n) => (await rpc('admin_review_verification', { p_id: v.id, p_approve: false, p_note: n }), toast('Rejected'), show('ids')) }) }, 'Reject'),
            h('button', { class: 'btn', onclick: () => person(v.user_id) }, 'See account'),
          )
        : h('div', { class: 'row wrap' }, h('button', { class: 'btn', onclick: () => person(v.user_id) }, 'See account')),
    );
    list.append(item);
  }
  return [
    head('ID checks', 'Compare the ID with the selfie. Approve only when the face matches and the document is readable.'),
    toolbar(tabs([['pending', 'Waiting'], ['approved', 'Approved'], ['rejected', 'Rejected']], filters.ids, (x) => ((filters.ids = x), show('ids')))),
    withGap(rows.length ? list : empty(filters.ids === 'pending' ? 'No ID checks waiting' : 'Nothing here')),
  ];
};

PAGES.businesses = async () => {
  // the search is only sent when something is typed, so the page also works before the database update
  const rows = await rpc('admin_businesses', filters.bq ? { p_status: filters.businesses, p_query: filters.bq } : { p_status: filters.businesses });
  const list = h('div', { class: 'list' });
  for (const b of rows) {
    const st = [b.verified === 'verified' ? pill('Verified', 'g') : b.verified === 'review' ? pill('Waiting', 'y') : pill('Not verified'), b.suspended_at ? pill('Suspended', 'r') : null];
    const mod = canModerate();
    list.append(
      h(
        'div',
        { class: 'item' },
        h('div', { class: 'row' }, avatar(b.name, b.logo_url), h('div', { class: 'grow' }, h('h3', { class: 'clip' }, b.name || 'No name'), h('div', { class: 'small muted clip' }, [b.sector, b.city].filter(Boolean).join(' · '))), st),
        b.suspended_at ? h('div', { class: 'quote small' }, 'Suspended ' + ago(b.suspended_at) + (b.suspended_note ? ': ' + b.suspended_note : '')) : null,
        kv([['Vacancies and posts', b.posts], ['RCCM', b.rccm], ['NIU', b.niu], ['Address', [b.address, b.area, b.city].filter(Boolean).join(', ')], ['Phone', b.phone], ['Email', b.email ? mail(b.email) : null], ['Website', b.web], ['About', b.about], ['Owner', [b.owner, b.owner_verified ? ' (ID verified)' : ' (ID not verified)']], ['Owner email', mail(b.owner_email)], ['Created', ago(b.created_at)]]),
        h(
          'div',
          { class: 'row wrap' },
          mod && b.verified !== 'verified' ? h('button', { class: 'btn y', onclick: () => decide({ title: `Verify ${b.name}?`, text: 'Check the RCCM and NIU against the official registry first. The business gets the verified badge.', ok: 'Verify', run: async () => (await rpc('admin_review_business', { p_business: b.id, p_approve: true, p_note: null }), toast('Verified'), show('businesses')) }) }, icon('check', 16), 'Verify') : null,
          mod && b.verified !== 'none' ? h('button', { class: 'btn danger', onclick: () => decide({ title: b.verified === 'verified' ? `Remove ${b.name}’s badge?` : `Reject ${b.name}?`, text: 'The owner is told why.', note: 'Reason, for example: the RCCM number does not match the name', required: true, danger: true, ok: b.verified === 'verified' ? 'Remove badge' : 'Reject', run: async (n) => (await rpc('admin_review_business', { p_business: b.id, p_approve: false, p_note: n }), toast('Done'), show('businesses')) }) }, b.verified === 'verified' ? 'Remove badge' : 'Reject') : null,
          mod && b.verified === 'none' ? h('button', { class: 'btn', onclick: () => askVerify({ business: b.id, name: b.name, after: () => show('businesses') }) }, 'Ask to verify') : null,
          h('button', { class: 'btn', onclick: () => writeTo(b.owner_id, b.name, b.id) }, 'Message'),
          mod
            ? b.suspended_at
              ? h('button', { class: 'btn y', onclick: () => decide({ title: `Restore ${b.name}?`, text: 'Its vacancies show again and it can publish. The owner is told.', ok: 'Restore', run: async () => (await rpc('admin_suspend_business', { p_business: b.id, p_on: false, p_note: null }), toast('Restored'), show('businesses')) }) }, 'Restore page')
              : h('button', { class: 'btn danger', onclick: () => decide({ title: `Suspend ${b.name}?`, text: 'Its vacancies and posts leave the lists and it can publish nothing new. The owner’s personal account keeps working. The owner is told why.', note: 'Reason shown to the owner, for example: vacancies that ask for money', required: true, danger: true, ok: 'Suspend page', run: async (n) => (await rpc('admin_suspend_business', { p_business: b.id, p_on: true, p_note: n }), toast('Suspended'), show('businesses')) }) }, 'Suspend page')
            : null,
          h('button', { class: 'btn', onclick: () => person(b.owner_id) }, 'See owner'),
        ),
      ),
    );
  }
  const exp = () => downloadCSV('businesses', [['Name', (b) => b.name], ['Sector', (b) => b.sector], ['City', (b) => b.city], ['Verified', (b) => b.verified], ['Suspended', (b) => (b.suspended_at ? 'yes' : '')], ['RCCM', (b) => b.rccm], ['NIU', (b) => b.niu], ['Phone', (b) => b.phone], ['Email', (b) => b.email], ['Owner', (b) => b.owner], ['Owner email', (b) => b.owner_email], ['Posts', (b) => b.posts], ['Created', (b) => b.created_at]], rows);
  return [
    head('Businesses', 'A business asks to be verified after adding its RCCM and NIU. You can also ask one to verify, write to it, or suspend its page.'),
    toolbar(searchForm(filters.bq, 'Business name, city, owner or owner email', 'Search businesses', (v) => ((filters.bq = v), (filters.businesses = v ? 'all' : filters.businesses), show('businesses'))), rows.length ? exportBtn(exp) : null),
    withGap(tabs([['review', 'Waiting'], ['verified', 'Verified'], ['none', 'Not verified'], ['suspended', 'Suspended'], ['all', 'All']], filters.businesses, (x) => ((filters.businesses = x), show('businesses')))),
    withGap(rows.length ? list : empty(filters.businesses === 'review' && !filters.bq ? 'No business is waiting' : 'Nothing here')),
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
        open && canModerate()
          ? h(
              'div',
              { class: 'row wrap' },
              removable ? h('button', { class: 'btn danger', onclick: () => decide({ title: 'Remove this ' + (r.target_type === 'comment' ? 'comment' : r.target_type === 'course' ? 'listing' : 'post') + '?', text: 'It is deleted for everyone and its author is told why. This cannot be undone.', note: 'Reason shown to the author', required: true, danger: true, ok: 'Remove', run: async (n) => (await rpc('admin_remove_content', { p_type: r.target_type, p_id: r.target_id, p_note: n }), toast('Removed'), show('reports')) }) }, 'Remove it') : null,
              t?.owner_id && !t.suspended ? h('button', { class: 'btn danger', onclick: () => suspend(t.owner_id, t.owner, () => show('reports')) }, 'Suspend ' + (t.owner || 'account')) : null,
              h('button', { class: 'btn', onclick: () => decide({ title: 'Mark as handled?', text: 'Use this when you acted on it (warned, removed, suspended).', ok: 'Handled', run: close('actioned', 'Marked handled') }) }, 'Handled'),
              h('button', { class: 'btn', onclick: () => decide({ title: 'Dismiss this report?', text: 'Use this when nothing is wrong with what was reported.', ok: 'Dismiss', run: close('dismissed', 'Dismissed') }) }, 'Nothing wrong'),
              t?.owner_id ? h('button', { class: 'btn', onclick: () => person(t.owner_id) }, 'See account') : null,
            )
          : t?.owner_id
            ? h('div', { class: 'row wrap' }, h('button', { class: 'btn', onclick: () => person(t.owner_id) }, 'See account'))
            : null,
      ),
    );
  }
  const exp = () => downloadCSV('reports', [['When', (r) => r.created_at], ['Reason', (r) => REASONS[r.reason] || r.reason], ['What', (r) => r.target_type], ['Times', (r) => r.times], ['Status', (r) => r.status], ['Owner', (r) => r.target?.owner], ['Text', (r) => r.target?.text], ['Reported by', (r) => r.reporter], ['They wrote', (r) => r.details]], rows);
  return [
    head('Reports', 'What people flagged from the ⋯ menus in the app. Message contents are only shown when a message itself was reported.'),
    toolbar(tabs([['open', 'Open'], ['actioned', 'Handled'], ['dismissed', 'Dismissed'], ['all', 'All']], filters.reports, (x) => ((filters.reports = x), show('reports'))), rows.length ? exportBtn(exp) : null),
    !canModerate() ? withGap(h('p', { class: 'small faint' }, ROLE_NOTE[state.me.role] || '')) : null,
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
        kv([['From', f.name || 'No name'], ['Email', mail(f.email, 'Your message to getit')], ['Phone', f.phone], ['App build', f.app_version], f.admin_note ? ['Team note', f.admin_note] : null]),
        h(
          'div',
          { class: 'row wrap' },
          f.email ? h('a', { class: 'btn y', href: `mailto:${f.email}?subject=${encodeURIComponent('Your message to getit')}` }, 'Reply by email') : null,
          h('button', { class: 'btn', onclick: () => writeTo(f.user_id, f.name) }, 'Reply in the app'),
          f.status !== 'answered' ? h('button', { class: 'btn', onclick: set('answered', 'Mark answered') }, 'Mark answered') : null,
          f.status !== 'closed' ? h('button', { class: 'btn', onclick: set('closed', 'Close') }, 'Close') : null,
          f.status !== 'open' ? h('button', { class: 'btn', onclick: set('open', 'Reopen') }, 'Reopen') : null,
          h('button', { class: 'btn', onclick: () => person(f.user_id) }, 'See account'),
        ),
      ),
    );
  }
  const exp = () => downloadCSV('feedback', [['When', (f) => f.created_at], ['Topic', (f) => TOPICS[f.topic] || f.topic], ['Status', (f) => f.status], ['Message', (f) => f.body], ['From', (f) => f.name], ['Email', (f) => f.email], ['Phone', (f) => f.phone], ['App build', (f) => f.app_version], ['Team note', (f) => f.admin_note]], rows);
  return [
    head('Feedback', 'Messages people sent from Settings → Help → Write to getit. Reply by email, or in the app (it arrives as a message from getit).'),
    toolbar(tabs([['open', 'New'], ['answered', 'Answered'], ['closed', 'Closed'], ['all', 'All']], filters.feedback, (x) => ((filters.feedback = x), show('feedback'))), rows.length ? exportBtn(exp) : null),
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
    const mod = canModerate();
    list.append(
      h(
        'div',
        { class: 'item' },
        h('div', { class: 'row' }, avatar(e.name), h('div', { class: 'grow' }, h('h3', { class: 'clip' }, e.name || 'No name'), h('div', { class: 'small muted clip' }, e.headline || d.headline || 'No headline')), pill(e.status, e.status === 'approved' ? 'g' : e.status === 'declined' ? 'r' : 'y')),
        kv([['Email', mail(e.email, 'Your getit expert application')], ['City', e.city], ['ID', e.verified ? 'Verified' : 'Not verified'], ['Experience', e.years ? e.years + ' years' : null], ['Skills', (e.skills || []).join(', ')], ['Updated', ago(e.updated_at)], e.note ? ['Note', e.note] : null]),
        answers.length ? h('details', {}, h('summary', { class: 'small muted' }, 'Application answers'), withGap(kv(answers.map(([k, v]) => [k, typeof v === 'object' ? JSON.stringify(v) : String(v)])))) : null,
        h(
          'div',
          { class: 'row wrap' },
          mod && next ? h('button', { class: 'btn y', onclick: move(next[0], next[1] + ' · ' + (e.name || ''), { ok: next[1] }) }, next[1]) : null,
          mod && e.status !== 'declined' && e.status !== 'approved' ? h('button', { class: 'btn danger', onclick: move('declined', 'Decline ' + (e.name || '') + '?', { note: 'Reason shown to the applicant', required: true, danger: true, ok: 'Decline' }) }, 'Decline') : null,
          mod && e.status === 'approved' ? h('button', { class: 'btn danger', onclick: move('declined', 'Remove ' + (e.name || '') + ' as an expert?', { note: 'Reason shown to them', required: true, danger: true, ok: 'Remove' }) }, 'Remove as expert') : null,
          h('button', { class: 'btn', onclick: () => person(e.user_id) }, 'See account'),
        ),
      ),
    );
  }
  return [
    head('Experts', 'Applications to become a Career Expert: review, interview, then approve.'),
    toolbar(tabs([['pending', 'In progress'], ['approved', 'Approved'], ['declined', 'Declined'], ['all', 'All']], filters.experts, (x) => ((filters.experts = x), show('experts')))),
    withGap(rows.length ? list : empty(filters.experts === 'pending' ? 'No applications in progress' : 'Nothing here')),
  ];
};

/* People: a table with sorting, selection for bulk actions, pages of 50 and export. */
const PAGE = 50;
PAGES.people = async () => {
  const res = await rpc('admin_people', { p_query: filters.q || null, p_filter: filters.people, p_limit: PAGE + 1, p_offset: filters.page * PAGE });
  const all = Array.isArray(res) ? res : res.rows || [];
  const more = all.length > PAGE;
  const rows = all.slice(0, PAGE);
  const [key, dir] = filters.sort;
  const val = (p) => (key === 'name' ? String(p.name || '').toLowerCase() : key === 'posts' || key === 'reports' ? Number(p[key] || 0) : p[key] ? new Date(p[key]).getTime() : 0);
  rows.sort((a, b) => (val(a) > val(b) ? dir : val(a) < val(b) ? -dir : 0));
  const picked = new Set();
  const bulk = h('div', { class: 'bulk', hidden: true });
  const drawBulk = () => {
    bulk.hidden = !picked.size;
    const sel = rows.filter((p) => picked.has(p.id));
    put(
      bulk,
      h('b', {}, `${picked.size} selected`),
      h('span', { class: 'grow' }),
      h('button', { class: 'btn sm', onclick: () => bulkMessage(sel) }, 'Message'),
      canModerate() ? h('button', { class: 'btn sm danger', onclick: () => bulkSuspend(sel, true) }, 'Suspend') : null,
      canModerate() ? h('button', { class: 'btn sm', onclick: () => bulkSuspend(sel, false) }, 'Restore') : null,
      exportBtn(() => downloadCSV('people', PEOPLE_COLS, sel), 'Export'),
      h('button', { class: 'btn sm', onclick: () => (picked.clear(), table.querySelectorAll('input[type=checkbox]').forEach((c) => (c.checked = false)), drawBulk()) }, 'Clear'),
    );
  };
  const th = (label, k) =>
    h('th', { scope: 'col', 'aria-sort': key === k ? (dir > 0 ? 'ascending' : 'descending') : null }, k ? h('button', { class: 'sort' + (key === k ? ' on' : ''), onclick: () => ((filters.sort = [k, key === k ? -dir : k === 'name' ? 1 : -1]), show('people')) }, label, icon(key === k ? (dir > 0 ? 'chevup' : 'chevdown') : 'sort', 13)) : label);
  const allBox = h('input', { type: 'checkbox', 'aria-label': 'Select all on this page' });
  allBox.addEventListener('change', () => {
    rows.forEach((p) => (allBox.checked ? picked.add(p.id) : picked.delete(p.id)));
    table.querySelectorAll('tbody input[type=checkbox]').forEach((c) => (c.checked = allBox.checked));
    drawBulk();
  });
  const table = h(
    'table',
    { class: 'table' },
    h('thead', {}, h('tr', {}, h('th', { class: 'chk' }, allBox), th('Name', 'name'), th('Contact'), th('City'), th('Joined', 'created_at'), th('Last seen', 'last_sign_in_at'), th('Posts', 'posts'), th('Status'))),
    h(
      'tbody',
      {},
      rows.map((p) => {
        const box = h('input', { type: 'checkbox', 'aria-label': 'Select ' + (p.name || 'account') });
        box.addEventListener('click', (e) => e.stopPropagation());
        box.addEventListener('change', () => (box.checked ? picked.add(p.id) : picked.delete(p.id), drawBulk()));
        return h(
          'tr',
          { class: 'click', tabindex: '0', onclick: () => person(p.id), onkeydown: (e) => e.key === 'Enter' && person(p.id) },
          h('td', { class: 'chk' }, box),
          h('td', {}, h('div', { class: 'row' }, avatar(p.name, null, 'xs'), h('b', { class: 'clip' }, p.name || 'No name'), p.verified ? pill('ID ✓', 'g') : null)),
          h('td', { class: 'small' }, p.email || p.phone || '—', p.confirmed ? null : h('span', { class: 'faint' }, ' (not confirmed)')),
          h('td', { class: 'small' }, p.city || '—'),
          h('td', { class: 'small num' }, ago(p.created_at)),
          h('td', { class: 'small num' }, ago(p.last_sign_in_at)),
          h('td', { class: 'num' }, p.posts),
          h('td', {}, h('div', { class: 'row' }, p.suspended_at ? pill('Suspended', 'r') : p.deleted_at ? pill('Deleted') : pill('Active', 'g'), p.reports > 0 ? pill(p.reports + ' report' + (p.reports > 1 ? 's' : ''), 'o') : null)),
        );
      }),
    ),
  );
  const pager = h(
    'div',
    { class: 'pager' },
    h('span', { class: 'small muted' }, rows.length ? `Showing ${filters.page * PAGE + 1}–${filters.page * PAGE + rows.length}` : ''),
    h('span', { class: 'grow' }),
    h('button', { class: 'btn sm', disabled: filters.page === 0, onclick: () => (filters.page--, show('people')) }, icon('chevleft', 16), 'Previous'),
    h('button', { class: 'btn sm', disabled: !more, onclick: () => (filters.page++, show('people')) }, 'Next', icon('chevright', 16)),
  );
  return [
    head('People', 'Search, sort and select accounts. Open one to see everything about it.'),
    toolbar(searchForm(filters.q, 'Name, email, phone or city', 'Search people', (v) => ((filters.q = v), (filters.page = 0), show('people'))), rows.length ? exportBtn(() => downloadCSV('people', PEOPLE_COLS, rows)) : null),
    withGap(tabs([['all', 'Everyone'], ['reported', 'Reported'], ['suspended', 'Suspended'], ['verified', 'ID verified'], ['deleted', 'Deleted']], filters.people, (x) => ((filters.people = x), (filters.page = 0), show('people')))),
    withGap(bulk),
    withGap(rows.length ? h('div', { class: 'panel flush' }, h('div', { class: 'scroll-x' }, table), pager) : empty('Nobody matches', 'Try another name, email or city.')),
  ];
};
const PEOPLE_COLS = [['Name', (p) => p.name], ['Email', (p) => p.email], ['Phone', (p) => p.phone], ['City', (p) => p.city], ['ID verified', (p) => (p.verified ? 'yes' : '')], ['Joined', (p) => p.created_at], ['Last sign-in', (p) => p.last_sign_in_at], ['Posts', (p) => p.posts], ['Reports', (p) => p.reports], ['Suspended', (p) => (p.suspended_at ? 'yes' : '')], ['Account id', (p) => p.id]];
/** Write the same message to several accounts (each gets it from getit; each is recorded). */
function bulkMessage(list) {
  decide({
    title: `Write to ${list.length} account${list.length === 1 ? '' : 's'}`,
    text: 'Each gets it in their Notifications, from “getit”, with a pop-up on the phone.',
    note: 'Your message (at least 5 characters)',
    required: true,
    ok: 'Send to all',
    run: async (n) => {
      let ok = 0;
      for (const p of list) await rpc('admin_message', { p_user: p.id, p_text: n }).then(() => ok++, () => {});
      toast(`Sent to ${ok} of ${list.length}`);
    },
  });
}
function bulkSuspend(list, on) {
  const todo = list.filter((p) => !p.deleted_at && !!p.suspended_at !== on);
  if (!todo.length) return toast(on ? 'They are all suspended already' : 'None of them is suspended', true);
  decide({
    title: `${on ? 'Suspend' : 'Restore'} ${todo.length} account${todo.length === 1 ? '' : 's'}?`,
    text: on ? 'They leave the lists and can no longer post, comment, message, call or apply. Each is told why.' : 'They can use getit normally again and are told so.',
    note: on ? 'Reason shown to them' : undefined,
    required: on,
    danger: on,
    ok: on ? 'Suspend all' : 'Restore all',
    run: async (n) => {
      let ok = 0;
      for (const p of todo) await rpc('admin_suspend', { p_user: p.id, p_on: on, p_note: n }).then(() => ok++, () => {});
      toast(`${on ? 'Suspended' : 'Restored'} ${ok} of ${todo.length}`);
      show('people');
    },
  });
}

/** The newest posts, jobs and comments of everyone, each with its author and a way to remove it. */
PAGES.content = async () => {
  let rows;
  try {
    rows = await rpc('admin_latest_content', { p_kind: filters.content, p_query: filters.cq || null, p_limit: 80 });
  } catch (e) {
    // a server that doesn't have this page yet
    if (/admin_latest_content|schema cache|does not exist|does not have this/i.test(e.message)) return [head('Content', 'The newest posts, jobs and comments.'), empty('Not available yet', 'This page needs the latest server update.')];
    throw e;
  }
  const list = rows.map((r) =>
    h(
      'div',
      { class: 'item' },
      h(
        'div',
        { class: 'row wrap' },
        pill(KIND_LABEL[r.type] || r.type),
        h('b', { class: 'grow clip' }, r.title || ''),
        r.reports > 0 ? pill(r.reports + ' report' + (r.reports > 1 ? 's' : ''), 'o') : null,
        r.status && r.status !== 'open' ? pill(r.status) : null,
        h('span', { class: 'tiny faint num' }, ago(r.created_at)),
      ),
      r.body ? h('p', { class: 'pre small' }, r.body) : null,
      h('p', { class: 'tiny faint' }, ['By ' + (r.author || 'a deleted account'), r.business ? 'as ' + r.business : null, r.photos ? r.photos + ' photo' + (r.photos > 1 ? 's' : '') : null].filter(Boolean).join(' · ')),
      h(
        'div',
        { class: 'row wrap' },
        r.author_id ? h('button', { class: 'btn sm', onclick: () => person(r.author_id) }, 'See account') : null,
        canModerate()
          ? h('button', { class: 'btn sm danger', onclick: () => decide({ title: `Remove this ${(KIND_LABEL[r.type] || 'item').toLowerCase()}?`, text: 'It is deleted for everyone and its author is told why. This cannot be undone.', note: 'Reason shown to the author', required: true, danger: true, ok: 'Remove', run: async (n) => (await rpc('admin_remove_content', { p_type: r.type, p_id: String(r.id), p_note: n }), toast('Removed'), show('content')) }) }, 'Remove')
          : null,
      ),
    ),
  );
  const exp = () => downloadCSV('content-' + filters.content, [['When', (r) => r.created_at], ['Kind', (r) => KIND_LABEL[r.type] || r.type], ['Title', (r) => r.title], ['Text', (r) => r.body], ['Author', (r) => r.author], ['Business', (r) => r.business], ['Status', (r) => r.status], ['Reports', (r) => r.reports], ['Id', (r) => r.id]], rows);
  return [
    head('Content', 'The newest posts, jobs and comments from everyone. Remove what breaks the rules; the author is told why.'),
    toolbar(searchForm(filters.cq, 'A word in the text', 'Search content', (v) => ((filters.cq = v), show('content'))), rows.length ? exportBtn(exp) : null),
    withGap(tabs([['posts', 'Posts'], ['jobs', 'Jobs and vacancies'], ['comments', 'Comments']], filters.content, (x) => ((filters.content = x), show('content')))),
    ROLE_NOTE[state.me.role] && !canModerate() ? withGap(h('p', { class: 'small faint' }, ROLE_NOTE[state.me.role])) : null,
    withGap(rows.length ? h('div', { class: 'list' }, list) : empty('Nothing here', filters.cq ? 'No ' + filters.content + ' contain “' + filters.cq + '”.' : 'Nothing has been posted yet.')),
    rows.length === 80 ? withGap(h('p', { class: 'small faint' }, 'Showing the 80 newest. Search to narrow it down.')) : null,
  ];
};

function suspend(id, name, after) {
  decide({
    title: `Suspend ${name || 'this account'}?`,
    text: 'They disappear from the lists and can no longer post, comment, message, call or apply. They can still read, write to getit and delete their account. You can restore them later.',
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
/** Write to one account as the getit team (to its business inbox when `business` is given). */
function writeTo(id, name, business) {
  decide({
    title: `Write to ${name || 'this account'}`,
    text: business ? 'It arrives in the Notifications of this business page in the app, from “getit”, with a pop-up on the phone.' : 'It arrives in their Notifications in the app, from “getit”, with a pop-up on the phone. They can answer with “Reply to getit”, which comes back under Feedback.',
    note: 'Your message (at least 5 characters)',
    required: true,
    ok: 'Send',
    run: async (n) => {
      await rpc('admin_message', business ? { p_user: id, p_text: n, p_business: business } : { p_user: id, p_text: n });
      toast('Sent');
    },
  });
}
/** Ask a person (their ID) or a business (RCCM and NIU) to verify. */
function askVerify({ user, business, name, after }) {
  decide({
    title: `Ask ${name || 'them'} to verify?`,
    text: business ? 'The owner gets a notice in the business inbox that opens the page where the RCCM and NIU are added.' : 'They get a notice that opens the ID check (their ID and a selfie).',
    note: 'Add a line if you want, for example: needed before your first job (optional)',
    ok: 'Send request',
    run: async (n) => {
      await rpc('admin_request_verification', business ? { p_user: null, p_business: business, p_note: n } : { p_user: user, p_business: null, p_note: n });
      toast('Request sent');
      after?.();
    },
  });
}
const KIND_LABEL = { post: 'Post', job: 'Job', comment: 'Comment', course: 'Course listing', opp: 'Internship or program', mentor: 'Mentorship' };
/** Everything one account posted, each with a way to remove it. */
async function contentOf(id, name) {
  const body = h('div', { class: 'col' }, spinner());
  const close = dialog(() => body, true);
  const load = async () => {
    try {
      const d = await rpc('admin_content', { p_user: id });
      const rows = [
        ...d.posts.map((x) => ({ type: x.type, id: x.id, title: x.title || x.kind, text: x.body, at: x.created_at, extra: [x.business, x.status].filter(Boolean).join(' · ') })),
        ...d.comments.map((x) => ({ type: 'comment', id: x.id, title: 'Comment', text: x.body, at: x.created_at })),
        ...d.courses.map((x) => ({ type: 'course', id: x.id, title: x.title, text: x.url, at: x.created_at })),
        ...d.opps.map((x) => ({ type: 'opp', id: x.id, title: x.title, text: x.kind + ' · ' + x.status, at: x.created_at })),
        ...d.mentorships.map((x) => ({ type: 'mentor', id: x.id, title: x.title, text: '', at: x.created_at })),
      ].sort((a, b) => new Date(b.at) - new Date(a.at));
      put(
        body,
        h('div', { class: 'row' }, h('h2', { class: 'grow clip' }, `What ${name || 'this account'} posted`), h('button', { class: 'btn sm', onclick: () => close() }, 'Close')),
        rows.length
          ? rows.map((r) =>
              h(
                'div',
                { class: 'quote col' },
                h('div', { class: 'row' }, pill(KIND_LABEL[r.type] || r.type), h('b', { class: 'grow clip' }, r.title || ''), h('span', { class: 'tiny faint' }, ago(r.at))),
                r.text ? h('p', { class: 'pre small' }, r.text) : null,
                r.extra ? h('p', { class: 'tiny faint' }, r.extra) : null,
                canModerate() ? h('div', {}, h('button', { class: 'btn sm danger', onclick: () => decide({ title: `Remove this ${(KIND_LABEL[r.type] || 'item').toLowerCase()}?`, text: 'It is deleted for everyone and its author is told why. This cannot be undone.', note: 'Reason shown to the author', required: true, danger: true, ok: 'Remove', run: async (n) => (await rpc('admin_remove_content', { p_type: r.type, p_id: String(r.id), p_note: n }), toast('Removed'), load()) }) }, 'Remove')) : null,
              ),
            )
          : empty('Nothing posted', 'No posts, jobs, comments or listings from this account.'),
      );
    } catch (e) {
      body.replaceChildren(empty('Couldn’t load this', e.message), h('button', { class: 'btn', onclick: () => close() }, 'Close'));
    }
  };
  await load();
}
/** Close an account for good (owners only). The name must be typed, so it cannot happen by accident. */
function closeAccount(id, name, after) {
  dialog((close) => {
    const typed = h('input', { class: 'input', placeholder: 'Type the name shown above', 'aria-label': 'Type the account name to confirm' });
    const why = h('textarea', { class: 'input', placeholder: 'Reason (kept in Activity)', maxlength: '400' });
    const err = h('p', { class: 'err' });
    const go = h('button', { class: 'btn danger' }, 'Close account for good');
    go.addEventListener('click', async () => {
      if (typed.value.trim().toLowerCase() !== String(name || '').trim().toLowerCase()) return (err.textContent = 'The name does not match.');
      if (!why.value.trim()) return (err.textContent = 'Write the reason.');
      go.disabled = true;
      try {
        const { data, error } = await sb.functions.invoke('delete-account', { body: { user: id, note: why.value.trim() } });
        if (error) {
          let msg = error.message;
          try {
            msg = (await error.context.json()).error || msg;
          } catch {
            /* keep the message */
          }
          throw new Error(msg);
        }
        if (data?.error) throw new Error(data.error);
        close();
        toast('Account closed');
        after?.();
      } catch (e) {
        err.textContent = e?.message || String(e);
        go.disabled = false;
      }
    });
    return [
      h('h2', {}, `Close ${name || 'this account'} for good?`),
      h('p', { class: 'muted' }, 'The account, its profile, posts, messages, files and business pages are deleted. This cannot be undone. To stop someone for a while, suspend them instead.'),
      h('p', {}, h('b', {}, name || 'No name')),
      typed,
      why,
      err,
      h('div', { class: 'row between' }, h('button', { class: 'btn', onclick: close }, 'Cancel'), go),
    ];
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
      const mod = canModerate();
      put(
        body,
        h('div', { class: 'row' }, avatar(p.name, p.avatar_url), h('div', { class: 'grow' }, h('h2', { class: 'clip' }, p.name || 'No name'), h('div', { class: 'small muted' }, [p.city, (p.skills || []).slice(0, 3).join(', ')].filter(Boolean).join(' · ') || 'No skills listed')), h('button', { class: 'btn sm', onclick: () => close() }, 'Close')),
        h('div', { class: 'row wrap' }, p.verified ? pill('ID verified', 'g') : pill('ID not verified'), d.confirmed ? pill('Contact confirmed', 'g') : pill('Contact not confirmed', 'o'), p.suspended_at ? pill('Suspended', 'r') : null, p.deleted_at ? pill('Deleted') : null, p.visible === false ? pill('Hidden from search') : null, p.biz_only ? pill('Business account') : null),
        p.suspended_at ? h('div', { class: 'quote small' }, 'Suspended ' + ago(p.suspended_at) + (p.suspended_note ? ': ' + p.suspended_note : '')) : null,
        kv([['Email', mail(d.email)], ['Phone', d.phone], ['Joined', fmtDate(p.created_at)], ['Last sign-in', fmtDate(d.last_sign_in_at)], ['About', p.bio], ['Account id', h('span', { class: 'tiny faint' }, p.id)]]),
        h('div', { class: 'tiles small-tiles' }, [['Posts', c.posts], ['Offers sent', c.offers], ['Bookings', c.bookings], ['Messages sent', c.messages], ['Reviews', c.reviews], ['Blocked by', c.blocked_by]].map(([l, n]) => h('div', { class: 'tile' }, h('span', { class: 'muted tiny' }, l), h('b', { class: 'num' }, n)))),
        h('div', { class: 'row wrap' }, p.pro_regular ? pill('Pro', 'y') : pill('No Pro'), p.pro_business ? pill('Business Pro', 'y') : null),
        d.businesses.length
          ? h(
              'div',
              { class: 'col' },
              h('h3', {}, 'Business pages'),
              d.businesses.map((b) =>
                h(
                  'div',
                  { class: 'row small wrap' },
                  h('span', { class: 'grow clip' }, b.name),
                  pill(b.verified === 'verified' ? 'Verified' : b.verified === 'review' ? 'Waiting' : 'Not verified', b.verified === 'verified' ? 'g' : ''),
                  h('button', { class: 'btn sm', onclick: () => writeTo(id, b.name, b.id) }, 'Message'),
                  mod && b.verified === 'none' ? h('button', { class: 'btn sm', onclick: () => askVerify({ business: b.id, name: b.name, after: load }) }, 'Ask to verify') : null,
                ),
              ),
            )
          : null,
        d.reports.length ? h('div', { class: 'col' }, h('h3', {}, 'Reports about them'), d.reports.map((r) => h('div', { class: 'row small wrap' }, pill(REASONS[r.reason] || r.reason, 'o'), h('span', { class: 'grow' }, r.details || r.target_type), h('span', { class: 'faint' }, ago(r.created_at)), pill(r.status)))) : null,
        d.posts.length ? h('div', { class: 'col' }, h('h3', {}, 'Latest posts'), d.posts.map((x) => h('div', { class: 'quote small' }, h('b', {}, x.title || x.kind), x.body ? h('p', { class: 'pre' }, x.body) : null, h('p', { class: 'tiny faint' }, ago(x.created_at) + ' · ' + x.status)))) : null,
        d.history.length ? h('div', { class: 'col' }, h('h3', {}, 'Admin history'), d.history.map((x) => h('div', { class: 'row small' }, h('span', { class: 'grow' }, (ACTIONS[x.action] || x.action) + (x.data?.note ? ': ' + x.data.note : '')), h('span', { class: 'faint' }, ago(x.created_at))))) : null,
        p.deleted_at
          ? null
          : h(
              'div',
              { class: 'row wrap' },
              h('button', { class: 'btn y', onclick: () => writeTo(id, p.name) }, 'Message'),
              h('button', { class: 'btn', onclick: () => contentOf(id, p.name) }, 'What they posted'),
              mod
                ? p.verified
                  ? h('button', { class: 'btn', onclick: () => decide({ title: `Remove ${p.name || 'this account'}’s ID badge?`, text: 'They are told and can verify again.', note: 'Reason shown to them', required: true, danger: true, ok: 'Remove badge', run: async (n) => (await rpc('admin_set_verified', { p_user: id, p_on: false, p_note: n }), toast('Badge removed'), load()) }) }, 'Remove ID badge')
                  : [
                      h('button', { class: 'btn', onclick: () => askVerify({ user: id, name: p.name, after: load }) }, 'Ask to verify ID'),
                      h('button', { class: 'btn', onclick: () => decide({ title: `Give ${p.name || 'this account'} the ID badge?`, text: 'Only when you checked their identity another way. They get the verified badge and a notice.', note: 'How you checked (kept in Activity)', required: true, ok: 'Give badge', run: async (n) => (await rpc('admin_set_verified', { p_user: id, p_on: true, p_note: n }), toast('Badge given'), load()) }) }, 'Give ID badge'),
                    ]
                : null,
              isSenior() ? h('button', { class: 'btn', onclick: () => decide({ title: (p.pro_regular ? 'Remove Pro from ' : 'Give Pro to ') + (p.name || 'this account') + '?', text: 'Until payments are live, Pro is given by hand.', ok: p.pro_regular ? 'Remove Pro' : 'Give Pro', run: async () => (await rpc('admin_set_pro', { p_user: id, p_regular: !p.pro_regular, p_business: !!p.pro_business }), toast('Saved'), load()) }) }, p.pro_regular ? 'Remove Pro' : 'Give Pro') : null,
              isSenior() && (d.businesses.length || p.pro_business)
                ? h('button', { class: 'btn', onclick: () => decide({ title: (p.pro_business ? 'Remove Business Pro from ' : 'Give Business Pro to ') + (p.name || 'this account') + '?', ok: p.pro_business ? 'Remove Business Pro' : 'Give Business Pro', run: async () => (await rpc('admin_set_pro', { p_user: id, p_regular: !!p.pro_regular, p_business: !p.pro_business }), toast('Saved'), load()) }) }, p.pro_business ? 'Remove Business Pro' : 'Give Business Pro')
                : null,
              state.me.role === 'owner' ? h('button', { class: 'btn danger', onclick: () => closeAccount(id, p.name, () => (close(), show(state.view))) }, 'Close account') : null,
              mod
                ? p.suspended_at
                  ? h('button', { class: 'btn y', onclick: () => decide({ title: `Restore ${p.name || 'this account'}?`, text: 'They can use getit normally again and are told so.', ok: 'Restore', run: async () => (await rpc('admin_suspend', { p_user: id, p_on: false, p_note: null }), toast('Restored'), load(), show(state.view)) }) }, 'Restore account')
                  : h('button', { class: 'btn danger', onclick: () => suspend(id, p.name, () => (load(), show(state.view))) }, 'Suspend account')
                : null,
            ),
      );
    } catch (e) {
      body.replaceChildren(empty('Couldn’t load this account', e.message), h('button', { class: 'btn', onclick: () => close() }, 'Close'));
    }
  };
  await load();
}

const AUDIENCES = [['all', 'Everyone'], ['workers', 'People who offer work (have skills)'], ['hirers', 'People who hire (no skills listed)'], ['businesses', 'Business pages (to the business inbox)'], ['verified', 'ID-verified people'], ['unverified', 'People who have not verified their ID']];
PAGES.announce = async () => {
  const senior = isSenior();
  const log = (await rpc('admin_audit', { p_limit: 300 })).filter((l) => l.action === 'announce.send').slice(0, 20);
  const text = h('textarea', { class: 'input', maxlength: '500', id: 'anText', placeholder: 'For example: New on getit: you can now edit a job after posting it. Update the app to get it.' });
  const count = h('span', { class: 'tiny faint num' }, '0 / 500');
  const preview = h('div', { class: 'phone-note' }, h('div', { class: 'row' }, h('b', { class: 'pn-logo' }, 'g'), h('div', { class: 'grow' }, h('div', { class: 'small strong' }, 'getit'), h('div', { class: 'tiny faint' }, 'now'))), h('p', { class: 'small pn-text' }, 'Your message appears here, as people will see it.'));
  text.addEventListener('input', () => ((count.textContent = `${text.value.length} / 500`), (preview.querySelector('.pn-text').textContent = text.value.trim() || 'Your message appears here, as people will see it.')));
  const who = h('select', { class: 'input', id: 'anWho' }, AUDIENCES.map(([v, l]) => h('option', { value: v }, l)));
  const city = h('input', { class: 'input', id: 'anCity', placeholder: 'Leave empty for every city' });
  const send = h('button', { class: 'btn y' }, icon('announce', 16), 'Send announcement');
  send.addEventListener('click', () => {
    const t = text.value.trim();
    if (t.length < 10) return toast('Write at least a sentence', true);
    const label = AUDIENCES.find((a) => a[0] === who.value)[1];
    decide({
      title: 'Send this to ' + label.toLowerCase() + (city.value.trim() ? ' in ' + city.value.trim() : '') + '?',
      text: '“' + t + '”. Everyone in this group gets it in their Notifications, with a pop-up on the phone. It cannot be taken back.',
      ok: 'Send',
      run: async () => {
        const n = await rpc('admin_announce', { p_text: t, p_audience: who.value, p_city: city.value.trim() || null });
        toast(`Sent to ${n} account${n === 1 ? '' : 's'}`);
        show('announce');
      },
    });
  });
  return [
    head('Announcements', 'One message to many people at once, from “getit”. People who switched “News” off in their notification settings do not get it.'),
    senior
      ? h(
          'div',
          { class: 'grid-2-1' },
          h(
            'section',
            { class: 'panel col' },
            h('div', { class: 'field' }, h('label', { for: 'anText' }, 'Message'), text, count),
            h('div', { class: 'field' }, h('label', { for: 'anWho' }, 'Who gets it'), who),
            h('div', { class: 'field' }, h('label', { for: 'anCity' }, 'Only in this city (optional)'), city),
            h('p', { class: 'muted small' }, 'At most 5 announcements a day. To write to one person or one business, open them under People or Businesses and choose Message.'),
            h('div', {}, send),
          ),
          h('section', { class: 'panel col' }, h('h3', {}, 'Preview'), preview, h('p', { class: 'tiny faint' }, 'Tapping it in the app opens the full message, with “Reply to getit”.')),
        )
      : empty('Owners and admins only', 'Your role can write to one account at a time (People → Message), not to everyone.'),
    withGap(h('h2', {}, 'Sent')),
    log.length
      ? withGap(h('div', { class: 'list' }, log.map((l) => h('div', { class: 'item' }, h('div', { class: 'row wrap' }, pill((AUDIENCES.find((a) => a[0] === l.data?.audience) || [0, l.data?.audience || 'Everyone'])[1], 'o'), l.data?.city ? pill(l.data.city) : null, h('span', { class: 'grow' }), h('span', { class: 'small faint' }, `${l.data?.sent ?? '?'} received · ${ago(l.created_at)} · ${l.actor}`)), h('p', { class: 'pre' }, l.data?.note || '')))))
      : withGap(empty('No announcements yet')),
  ];
};

/** An on/off switch (a real checkbox underneath, so keyboards and screen readers work). */
function toggle(id, checked, label, onChange) {
  const box = h('input', { type: 'checkbox', id, class: 'sw-input', role: 'switch' });
  box.checked = !!checked;
  box.addEventListener('change', () => onChange(box.checked, box));
  return h('label', { class: 'switch', for: id }, box, h('span', { class: 'sw-track', 'aria-hidden': 'true' }, h('span', { class: 'sw-knob' })), h('span', { class: 'sr' }, label));
}

PAGES.settings = async () => {
  const [cfg, admins, words] = await Promise.all([
    sb.from('app_config').select('key,value').then(({ data, error }) => (error ? Promise.reject(new Error(error.message)) : data)),
    rpc('admin_admins'),
    rpc('admin_blocked_words').catch(() => null),
  ]);
  const get = (k) => cfg.find((x) => x.key === k)?.value || {};
  const mv = get('min_version');
  const mt = get('maintenance');
  const ft = { signups: true, calls: true, posting: true, ...get('features') };
  const owner = state.me.role === 'owner';
  const senior = isSenior();

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
  const mtMsg = h('textarea', { class: 'input', maxlength: '400', id: 'mtMsg', placeholder: 'For example: getit will be offline on Sunday from 2 to 4 am for maintenance.' }, mt.message || '');
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

  // feature switches: each change is confirmed, because it affects everyone at once
  const SWITCHES = [
    ['signups', 'New sign-ups', 'New people can create accounts. Switch off during an attack or a launch problem; people who already have an account are not affected.'],
    ['calls', 'Voice and video calls', 'Calls between people. Switch off if calls misbehave; chats keep working.'],
    ['posting', 'New posts, jobs and comments', 'Switch off to stop a wave of spam. Everything already posted stays; admins can still post.'],
  ];
  const switches = SWITCHES.map(([k, label, text]) =>
    h(
      'div',
      { class: 'setting-row' },
      h('div', { class: 'grow' }, h('div', { class: 'strong' }, label, ' ', ft[k] ? pill('On', 'g') : pill('Paused', 'r')), h('p', { class: 'small muted' }, text)),
      senior
        ? toggle('ft-' + k, ft[k], label, (v, box) => {
            box.checked = !v; // only changes once confirmed
            decide({
              title: `${v ? 'Switch on' : 'Pause'} ${label.toLowerCase()}?`,
              text: v ? 'Everyone can use it again at once.' : 'It stops at once for everyone, whatever app version they use. People see a short message saying it is paused for a moment.',
              ok: v ? 'Switch on' : 'Pause',
              danger: !v,
              run: async () => {
                await rpc('admin_set_config', { p_key: 'features', p_value: { ...ft, [k]: v } });
                toast(v ? `${label} are on` : `${label} are paused`);
                show('settings');
              },
            });
          })
        : null,
    ),
  );

  // blocked words: chips you can remove, a box to add
  let list = Array.isArray(words) ? [...words] : [];
  const chipsBox = h('div', { class: 'chips' });
  const drawWords = () =>
    put(chipsBox, list.length ? list.map((w) => h('span', { class: 'word' }, w, senior ? h('button', { class: 'word-x', 'aria-label': 'Remove ' + w, onclick: () => ((list = list.filter((x) => x !== w)), drawWords()) }, icon('x', 12)) : null)) : h('span', { class: 'small faint' }, 'No blocked words yet.'));
  drawWords();
  const wordIn = h('input', { class: 'input', placeholder: 'A word or a short phrase, for example: western union', 'aria-label': 'Word to block', maxlength: '40' });
  const addWord = (e) => {
    e.preventDefault();
    const w = wordIn.value.trim().toLowerCase();
    if (w.length < 2) return toast('At least 2 letters', true);
    if (!list.includes(w)) list.push(w);
    list.sort();
    wordIn.value = '';
    drawWords();
  };
  const wordForm = h('form', { class: 'row' }, h('div', { class: 'grow' }, wordIn), h('button', { class: 'btn', type: 'submit' }, 'Add'));
  wordForm.addEventListener('submit', addWord);
  const saveWords = h('button', { class: 'btn y' }, 'Save the list');
  saveWords.addEventListener('click', async () => {
    try {
      list = await rpc('admin_set_blocked_words', { p_words: list });
      drawWords();
      toast(`Saved: ${list.length} blocked word${list.length === 1 ? '' : 's'}`);
    } catch (e) {
      say(e);
    }
  });

  // security: signed out after a while without activity (kept in this browser)
  const idle = h('select', { class: 'input', id: 'idle' }, [[15, '15 minutes'], [30, '30 minutes'], [60, '1 hour'], [0, 'Never (not recommended)']].map(([v, l]) => h('option', { value: v }, l)));
  idle.value = String(store.get('idle', 30));
  idle.addEventListener('change', () => (store.set('idle', Number(idle.value)), toast('Saved for this browser')));

  const email = h('input', { class: 'input', type: 'email', placeholder: 'Email of their getit account', 'aria-label': 'Email of the new admin' });
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

  const section = (title, sub, ...kids) => withGap(h('section', { class: 'panel col' }, h('div', {}, h('h2', {}, title), sub ? h('p', { class: 'muted small' }, sub) : null), kids));
  return [
    head('Settings', 'Switches that affect everyone, the app version, the service notice, blocked words and the admin team.'),
    section('Feature switches', senior ? 'Pause a part of getit for everyone at once, for example during an attack, a spam wave or a broken release.' : 'Owners and admins can change these.', switches),
    words !== null
      ? section('Blocked words', 'Posts and comments that contain one of these (as a whole word, in any case) are refused, with a message asking to change them. The list is private.', chipsBox, senior ? [wordForm, h('div', {}, saveWords)] : null)
      : null,
    section('Ask older versions to update', 'People whose app build number is lower than this see “Update getit” when they open the app. The build number is the one in the release name, for example 172.', h('div', { class: 'field' }, h('label', { for: 'minA' }, 'Lowest Android build that is fine'), minA), h('div', { class: 'field' }, h('label', { for: 'minMsg' }, 'Message they see'), minMsg), h('div', {}, saveMin)),
    section('Service notice', 'A short note everyone sees each time they open the app, for example before planned maintenance. Switch it off as soon as it no longer applies.', h('label', { class: 'row', for: 'mtOn' }, on, 'Show the notice'), h('div', { class: 'field' }, h('label', { for: 'mtMsg' }, 'Notice'), mtMsg), h('div', {}, saveMt)),
    section('Security', 'This panel signs you out after a while without activity, so an open laptop does not stay signed in. Closing the tab always signs you out.', h('div', { class: 'field' }, h('label', { for: 'idle' }, 'Sign out after'), idle)),
    section(
      'Admins',
      'Support reads everything, answers feedback and messages people. Moderators also review, remove and suspend. Admins also send announcements, give Pro and use the switches. Owners also manage the admin team and close accounts.',
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
  'verification.request': 'asked for a verification',
  'verified.set': 'changed an ID badge by hand',
  'message.send': 'wrote to an account',
  'announce.send': 'sent an announcement',
  'business.suspend': 'suspended a business page',
  'business.restore': 'restored a business page',
  'account.close': 'closed an account',
};
/** Kinds of action, for the Activity filter and the colours. */
const ACT_KIND = (a) => (/^(content|report)\./.test(a) ? 'moderation' : /^(account|business)\.(suspend|restore|close)/.test(a) ? 'accounts' : /^(verification|verified|business\.(approve|reject)|expert)/.test(a) ? 'reviews' : /^(message|announce|feedback)\./.test(a) ? 'messages' : /^(config|admin|pro)\./.test(a) ? 'settings' : 'other');
const ACT_TONE = { moderation: 'r', accounts: 'o', reviews: 'g', messages: 'b', settings: 'y', other: '' };
PAGES.activity = async () => {
  const rows = await rpc('admin_audit', { p_limit: 500 });
  const actors = [...new Set(rows.map((l) => l.actor))].sort();
  const what = (l) => ACTIONS[l.action] || (l.action.startsWith('expert.') ? 'moved an expert application to ' + l.action.slice(7) : l.action);
  const detail = (l) => {
    const d = l.data || {};
    return [d.name, d.label, d.note, d.role, d.audience ? `to ${d.audience}${d.city ? ' in ' + d.city : ''} (${d.sent ?? '?'})` : null, l.target_table === 'app_config' ? l.target_id : null].filter(Boolean).join(' · ');
  };
  const qq = filters.actQ.toLowerCase();
  const shown = rows.filter((l) => (filters.act === 'all' || ACT_KIND(l.action) === filters.act) && (!filters.actWho || l.actor === filters.actWho) && (!qq || (what(l) + ' ' + detail(l) + ' ' + l.actor).toLowerCase().includes(qq)));
  const who = h('select', { class: 'input', 'aria-label': 'Who' }, h('option', { value: '' }, 'Everyone'), actors.map((a) => h('option', { value: a }, a)));
  who.value = filters.actWho;
  who.addEventListener('change', () => ((filters.actWho = who.value), show('activity')));
  const table = h(
    'table',
    { class: 'table' },
    h('thead', {}, h('tr', {}, ['When', 'Who', 'What', 'Details'].map((c) => h('th', { scope: 'col' }, c)))),
    h('tbody', {}, shown.map((l) => h('tr', {}, h('td', { class: 'small num nowrap' }, fmtDate(l.created_at)), h('td', {}, h('div', { class: 'row' }, avatar(l.actor, null, 'xs'), l.actor)), h('td', {}, pill(what(l), ACT_TONE[ACT_KIND(l.action)])), h('td', { class: 'small muted' }, detail(l) || '—')))),
  );
  const exp = () => downloadCSV('activity', [['When', (l) => l.created_at], ['Who', (l) => l.actor], ['What', what], ['Action', (l) => l.action], ['Details', detail], ['Target', (l) => l.target_table + ':' + l.target_id]], shown);
  return [
    head('Activity', 'Every change made from this panel, newest first. This record cannot be edited or deleted.'),
    toolbar(searchForm(filters.actQ, 'Search the actions and their notes', 'Search activity', (v) => ((filters.actQ = v), show('activity'))), h('div', {}, who), shown.length ? exportBtn(exp) : null),
    withGap(tabs([['all', 'All'], ['moderation', 'Moderation'], ['accounts', 'Accounts'], ['reviews', 'Reviews'], ['messages', 'Messages'], ['settings', 'Settings']], filters.act, (x) => ((filters.act = x), show('activity')))),
    withGap(shown.length ? h('div', { class: 'panel flush' }, h('div', { class: 'scroll-x' }, table), h('div', { class: 'pager' }, h('span', { class: 'small muted' }, `${shown.length} of the last ${rows.length} actions`))) : empty('Nothing here', rows.length ? 'No action matches these filters.' : 'No activity yet.')),
  ];
};

window.addEventListener('hashchange', () => {
  const v = location.hash.slice(1);
  if (state.me && v !== state.view && PAGES[v]) show(v);
});
start();
