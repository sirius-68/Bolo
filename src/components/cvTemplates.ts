/* CV templates. Each template is one HTML/CSS page (A4, 794×1123 px) used for BOTH the in-app preview
   (WebView) and the PDF (expo-print), so what you see is exactly what you print.
   The five Pro designs follow the user's reference CVs:
     Executive (Classic) — name top-left in capitals, contacts right, rule lines, dates in a left column
     Centered  (Classic) — framed page, big centred name, contact strip between rules, 4-column skills
     Slate     (Modern)  — photo + dark sidebar with name, contact and language bars; content on white
     Aura      (Modern)  — serif name, round photo on soft orange/violet glow, sparkles, timeline
     Accent    (Modern)  — yellow accent slash, thin first name / bold surname, photo with accent cut */
import * as FileSystem from 'expo-file-system/legacy';
import { db } from '../data/db';
import { showPhone } from '../data/countries';
import { ensureSkillList, myCity, myLevel, myPhoto } from '../logic/core';
import { syncContacts } from '../logic/account';
import { lessonsOf } from '../logic/career';
import { exSummary } from './skills';

export type CvKind = 'Classic' | 'Modern';
export type CvTpl = { id: string; name: string; kind: CvKind; pro: boolean; blurb: string; swatch: [string, string, string] };
export const CV_TEMPLATES: CvTpl[] = [
  { id: 'basic', name: 'Basic', kind: 'Classic', pro: false, blurb: 'Simple and clear', swatch: ['#ffffff', '#3d5af1', '#111111'] },
  { id: 'executive', name: 'Executive', kind: 'Classic', pro: true, blurb: 'Timeless, dates in a column', swatch: ['#f4f4f4', '#2b2b2b', '#9a9a9a'] },
  { id: 'centered', name: 'Centered', kind: 'Classic', pro: true, blurb: 'Framed, centred name', swatch: ['#ffffff', '#1f2a44', '#c9ced8'] },
  { id: 'slate', name: 'Slate', kind: 'Modern', pro: true, blurb: 'Photo and dark sidebar', swatch: ['#ffffff', '#2f323a', '#9aa0aa'] },
  { id: 'aura', name: 'Aura', kind: 'Modern', pro: true, blurb: 'Soft glow and timeline', swatch: ['#efeff2', '#f47b3b', '#5b5fd8'] },
  { id: 'accent', name: 'Accent', kind: 'Modern', pro: true, blurb: 'Bold yellow accent', swatch: ['#eef0f3', '#f2c21b', '#1c1c1c'] },
];
export const tplOf = (id?: string) => CV_TEMPLATES.find((t) => t.id === id) || CV_TEMPLATES[0];

export type CvData = {
  first: string;
  last: string;
  title: string;
  phone: string;
  email: string;
  city: string;
  about: string;
  skills: { n: string; pct: number; note: string }[];
  keySkills: string[];
  exp: { role: string; org: string; from: string; to: string; desc: string }[];
  edu: { name: string; org: string; year: string; lv: string }[];
  langs: { n: string; lv: string; pct: number }[];
  certs: { n: string; by: string }[];
  personal: string[];
  photo: string | null;
  initials: string;
};

const LV: Record<string, number> = { Beginner: 40, Junior: 45, Intermediate: 62, Middle: 62, Advanced: 80, Senior: 85, Expert: 95, Native: 100, Fluent: 90, Good: 70, Basic: 40 };
const pctOf = (l?: string) => LV[l || ''] ?? 70;

/** Everything a template shows, taken from the user's profile and CV answers. */
export async function cvData(): Promise<CvData> {
  ensureSkillList();
  syncContacts();
  const u = db.user;
  const nm = (u.name || 'Your Name').trim().split(/\s+/);
  const s = u.skillList || [];
  const certs = db.COURSES.filter((c) => db.myLearning.includes(c.id) && (c.done || 0) >= lessonsOf(c).length).map((c) => ({ n: c.title, by: c.prov.n }));
  const cv = u.cv;
  return {
    first: nm[0],
    last: nm.slice(1).join(' '),
    title: cv?.prof || `${s[0]?.n || 'Professional'} · ${myLevel()}`,
    phone: db.PR.ct.phone ? showPhone(db.PR.ct.phone) : '',
    email: db.PR.ct.email || '',
    city: myCity(),
    about: u.bio || `${s[0]?.n || 'Professional'} with ${u.years} years of experience, based in ${myCity()}. Reliable, careful with details and easy to work with.`,
    skills: s.map((e) => ({ n: e.n, pct: pctOf(e.lv), note: exSummary(e) })),
    keySkills: [...new Set([...(cv?.skills || []), ...s.map((e) => e.n)])].slice(0, 12),
    exp: db.PR.exp.map((e) => ({ role: e.role, org: e.org, from: String(e.from), to: e.to ? String(e.to) : 'Present', desc: e.desc })),
    edu: db.PR.edu.courses.length ? db.PR.edu.courses.map((c) => ({ name: c.name, org: c.org, year: c.year, lv: db.PR.edu.level })) : [{ name: db.PR.edu.level, org: '', year: '', lv: db.PR.edu.level }],
    langs: db.PR.langs.map(([n, lv]) => ({ n, lv, pct: pctOf(lv) })),
    certs,
    personal: cv ? [cv.gender, cv.dob ? 'Born ' + new Date(cv.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '', cv.cit ? 'Citizen of ' + cv.cit : '', cv.permit ? 'Work permit: ' + cv.permit : ''].filter(Boolean) : [],
    photo: await photoData(),
    initials: (nm[0][0] + (nm[1]?.[0] || '')).toUpperCase(),
  };
}
/** The profile photo as a data URI (works in the preview and inside the PDF). Null = show initials. */
async function photoData(): Promise<string | null> {
  const p = myPhoto();
  if (!p || !p.startsWith('uri:')) return null;
  try {
    const b64 = await FileSystem.readAsStringAsync(p.slice(4), { encoding: FileSystem.EncodingType.Base64 });
    return `data:image/jpeg;base64,${b64}`;
  } catch {
    return null;
  }
}

const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const page = (css: string, body: string, fonts = '') =>
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=794">${fonts}<style>@page{size:A4;margin:0}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}html,body{margin:0;padding:0}body{width:794px;min-height:1123px;font-family:Helvetica,Arial,sans-serif;color:#222}${css}</style></head><body>${body}</body></html>`;
const photoOr = (d: CvData, cls: string) => (d.photo ? `<img class="${cls}" src="${d.photo}"/>` : `<div class="${cls} ini">${esc(d.initials)}</div>`);
const ICON = {
  phone: '<svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 4-8 5-8-5V6l8 5 8-5z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>',
};
const contacts = (d: CvData) => ([['phone', d.phone], ['mail', d.email], ['pin', d.city]] as [keyof typeof ICON, string][]).filter(([, v]) => v);

/* ---------------- Basic (free) ---------------- */
function basic(d: CvData) {
  return page(
    `body{padding:56px 64px}h1{margin:0;font-size:32px}.t{color:#3d5af1;font-weight:700;margin-top:4px}.c{color:#666;font-size:13px;margin-top:6px}.h{border-bottom:3px solid #3d5af1;padding-bottom:16px}h4{text-transform:uppercase;letter-spacing:.1em;font-size:12px;color:#3d5af1;margin:24px 0 8px}p,li{font-size:14px;line-height:1.55;margin:4px 0}small{color:#666}`,
    `<div class="h"><h1>${esc(d.first)} ${esc(d.last)}</h1><div class="t">${esc(d.title)}</div><div class="c">${contacts(d).map(([, v]) => esc(v)).join(' · ')}</div></div>
<h4>Profile</h4><p>${esc(d.about)}</p>
<h4>Skills</h4><ul>${d.skills.map((s) => `<li><b>${esc(s.n)}</b>${s.note ? ': ' + esc(s.note) : ''}</li>`).join('')}</ul>
${d.exp.length ? `<h4>Experience</h4>${d.exp.map((e) => `<p><b>${esc(e.role)} · ${esc(e.org)}</b><br><small>${esc(e.from)} – ${esc(e.to)}</small>${e.desc ? '<br>' + esc(e.desc) : ''}</p>`).join('')}` : ''}
<h4>Education</h4>${d.edu.map((e) => `<p><b>${esc(e.name)}</b>${e.org ? ' · ' + esc(e.org) : ''}${e.year ? ' · ' + esc(e.year) : ''}</p>`).join('')}
${d.certs.length ? `<h4>Certificates</h4>${d.certs.map((c) => `<p>${esc(c.n)} · <small>${esc(c.by)}</small></p>`).join('')}` : ''}
<h4>Languages</h4><p>${d.langs.map((l) => `${esc(l.n)} (${esc(l.lv)})`).join(' · ')}</p>`,
  );
}

/* ---------------- Executive (Classic) ---------------- */
function executive(d: CvData) {
  const sec = (t: string) => `<div class="rule"><span></span></div><h3>${t}</h3>`;
  return page(
    `body{background:#f4f4f4;padding:64px 70px;color:#333}
.top{display:flex;justify-content:space-between;align-items:flex-start}
h1{margin:0;font-size:40px;line-height:1.05;letter-spacing:1px;font-weight:700;color:#2b2b2b;text-transform:uppercase}
.role{margin-top:10px;font-size:12px;letter-spacing:2px;color:#555;text-transform:uppercase;font-weight:700}
.ct{font-size:12px;color:#444;line-height:2}.ct div{display:flex;gap:8px;align-items:center}
.rule{height:1px;background:#bdbdbd;margin:26px 0 22px;position:relative}.rule span{position:absolute;left:0;top:-1px;width:26px;height:3px;background:#2b2b2b}
h3{margin:0 0 14px;font-size:13px;letter-spacing:3px;color:#2b2b2b;text-transform:uppercase}
p{font-size:12px;line-height:1.7;color:#555;margin:0}
.row{display:flex;gap:24px;margin-bottom:16px}.d{width:110px;font-size:12px;font-weight:700;color:#2b2b2b}.b{flex:1}
.b b{display:block;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#2b2b2b}.b i{display:block;font-style:normal;font-size:11px;color:#666;margin:2px 0 6px;font-weight:700}
.two{display:flex;gap:46px}.two>div{flex:1}
.bar{display:flex;align-items:center;gap:14px;margin:7px 0;font-size:12px;color:#444}.bar span{width:130px}.bar em{flex:1;height:5px;background:#d6d6d6;position:relative}.bar em i{position:absolute;left:0;top:0;bottom:0;background:#3a3a3a}`,
    `<div class="top"><div><h1>${esc(d.first)}<br>${esc(d.last)}</h1><div class="role">${esc(d.title)}</div></div><div class="ct">${contacts(d).map(([k, v]) => `<div>${ICON[k]}${esc(v)}</div>`).join('')}</div></div>
${sec('About me')}<p>${esc(d.about)}</p>
${d.exp.length ? sec('Experience') + d.exp.map((e) => `<div class="row"><div class="d">${esc(e.from)} – ${esc(e.to)}</div><div class="b"><b>${esc(e.role)}</b><i>${esc(e.org)}</i><p>${esc(e.desc)}</p></div></div>`).join('') : ''}
<div class="rule"><span></span></div>
<div class="two"><div><h3>Education</h3>${d.edu.map((e) => `<div class="row"><div class="d" style="width:70px">${esc(e.year || '')}</div><div class="b"><b>${esc(e.name)}</b><i>${esc(e.org)}</i></div></div>`).join('')}</div>
<div><h3>Expertise</h3>${d.skills.slice(0, 6).map((s) => `<div class="bar"><span>${esc(s.n)}</span><em><i style="width:${s.pct}%"></i></em></div>`).join('')}</div></div>
<div class="rule"><span></span></div>
<div class="two"><div><h3>${d.certs.length ? 'Achievement' : 'Key skills'}</h3>${d.certs.length ? d.certs.map((c) => `<div class="row"><div class="b"><b>${esc(c.n)}</b><i>${esc(c.by)}</i></div></div>`).join('') : `<p>${d.keySkills.map(esc).join(' · ')}</p>`}</div>
<div><h3>Languages</h3>${d.langs.map((l) => `<div class="bar"><span>${esc(l.n)}</span><em><i style="width:${l.pct}%"></i></em></div>`).join('')}</div></div>`,
  );
}

/* ---------------- Centered (Classic) ---------------- */
function centered(d: CvData) {
  return page(
    `body{padding:34px}.frame{border:1.5px solid #1f2a44;min-height:1055px;padding:52px 60px;color:#1f2a44}
h1{margin:0;text-align:center;font-size:46px;letter-spacing:2px;text-transform:uppercase;font-weight:800}
.role{text-align:center;letter-spacing:5px;font-size:15px;text-transform:uppercase;margin-top:6px;color:#3b4560}
.strip{display:flex;justify-content:center;gap:34px;border-top:1.5px solid #1f2a44;border-bottom:1.5px solid #1f2a44;padding:12px 0;margin:26px 0 8px;font-size:13px}.strip div{display:flex;gap:8px;align-items:center}
h3{font-size:20px;letter-spacing:.5px;text-transform:uppercase;margin:24px 0 10px;padding-bottom:6px;border-bottom:1.5px solid #1f2a44}
p{font-size:12px;line-height:1.6;color:#4a5370;margin:0}
.row{display:flex;gap:30px;margin:12px 0}.l{width:160px;font-size:12px}.l b{display:block}.l span{color:#6b7390}.r{flex:1}.r b{font-size:13px}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px 18px;font-size:13px}.grid div:before{content:'•';margin-right:8px}
.refs{display:flex;gap:40px;font-size:12px}.refs b{font-size:14px}`,
    `<div class="frame"><h1>${esc(d.first)} ${esc(d.last)}</h1><div class="role">${esc(d.title)}</div>
<div class="strip">${contacts(d).map(([k, v]) => `<div>${ICON[k]}${esc(v)}</div>`).join('')}</div>
<h3>About me</h3><p>${esc(d.about)}</p>
<h3>Education</h3>${d.edu.map((e) => `<div class="row"><div class="l"><b>${esc(e.year || '—')}</b><span>${esc(e.org)}</span></div><div class="r"><b>${esc(e.name)}</b><p>${esc(e.lv)}</p></div></div>`).join('')}
${d.exp.length ? `<h3>Experience</h3>${d.exp.map((e) => `<div class="row"><div class="l"><b>${esc(e.from)} - ${esc(e.to)}</b><span>${esc(e.org)}</span></div><div class="r"><b>${esc(e.role)}</b><p>${esc(e.desc)}</p></div></div>`).join('')}` : ''}
<h3>Skills</h3><div class="grid">${d.keySkills.map((s) => `<div>${esc(s)}</div>`).join('')}</div>
<h3>${d.certs.length ? 'Certificates' : 'Languages'}</h3><div class="refs">${d.certs.length ? d.certs.map((c) => `<div><b>${esc(c.n)}</b><br>${esc(c.by)}</div>`).join('') : d.langs.map((l) => `<div><b>${esc(l.n)}</b><br>${esc(l.lv)}</div>`).join('')}</div></div>`,
  );
}

/* ---------------- Slate (Modern) ---------------- */
function slate(d: CvData) {
  const H = (t: string) => `<h3>${t}</h3><div class="u"></div>`;
  return page(
    `body{display:flex;min-height:1123px}
.side{width:290px;background:#2f323a;color:#fff;flex-shrink:0}
.ph{width:290px;height:300px;object-fit:cover;filter:grayscale(1);display:block}.ph.ini{display:flex;align-items:center;justify-content:center;font-size:96px;font-weight:800;color:#bfc3cc;background:#4a4e58}
.in{padding:30px 34px}h1{margin:0;font-size:42px;line-height:1;font-weight:800;letter-spacing:-1px}.role{margin-top:12px;font-size:14px;color:#d6d8de}
.side h3{margin:34px 0 0;font-size:22px}.side .u{width:56px;height:2px;background:#fff;margin:10px 0 16px}
.k{font-size:12px;color:#c9ccd3;margin-top:10px}.k b{display:block;color:#fff;font-weight:400;font-size:13px}
.lg{display:flex;align-items:center;gap:12px;margin:8px 0;font-size:13px}.lg span{width:80px}.lg em{flex:1;height:9px;background:#4a4e58}.lg em i{display:block;height:9px;background:#fff}
.main{flex:1;padding:56px 50px}.main h3{margin:30px 0 0;font-size:26px;color:#222}.main h3:first-child{margin-top:0}.main .u{width:46px;height:3px;background:#222;margin:10px 0 18px}
p{font-size:12px;line-height:1.7;color:#555;margin:0}
.row{display:flex;gap:26px;margin-bottom:16px}.row .l{width:150px;font-size:12px;color:#444;line-height:1.6}.row .l b{display:block;color:#222}
.ex{display:grid;grid-template-columns:1fr 1fr;gap:10px 26px}.bar{display:flex;align-items:center;gap:10px;font-size:12px}.bar span{width:96px}.bar em{flex:1;height:8px;background:#dcdde1}.bar em i{display:block;height:8px;background:#3a3d45}`,
    `<div class="side">${photoOr(d, 'ph')}<div class="in"><h1>${esc(d.first)}<br>${esc(d.last)}</h1><div class="role">${esc(d.title)}</div>
${H('Contact')}${contacts(d).map(([k, v]) => `<div class="k"><b>${{ phone: 'Phone', mail: 'Email', pin: 'Address' }[k]}:</b>${esc(v)}</div>`).join('')}
${H('Languages')}${d.langs.map((l) => `<div class="lg"><span>${esc(l.n)}</span><em><i style="width:${l.pct}%"></i></em></div>`).join('')}</div></div>
<div class="main">${H('Profile')}<p>${esc(d.about)}</p>
${d.exp.length ? H('Experience') + d.exp.map((e) => `<div class="row"><div class="l"><b>${esc(e.role)}</b>${esc(e.from)} - ${esc(e.to)}<br>${esc(e.org)}</div><p style="flex:1">${esc(e.desc)}</p></div>`).join('') : ''}
${H('Education')}${d.edu.map((e) => `<div class="row"><div class="l"><b>${esc(e.org || e.lv)}</b>${esc(e.year)}<br>${esc(e.lv)}</div><p style="flex:1">${esc(e.name)}</p></div>`).join('')}
${H('Expertise')}<div class="ex">${d.skills.slice(0, 8).map((s) => `<div class="bar"><span>${esc(s.n)}</span><em><i style="width:${s.pct}%"></i></em></div>`).join('')}</div></div>`,
  );
}

/* ---------------- Aura (Modern) ---------------- */
function aura(d: CvData) {
  const star = (x: number, y: number, s: number) => `<div class="st" style="left:${x}px;top:${y}px;font-size:${s}px">✦</div>`;
  return page(
    `body{background:#efeff2;position:relative;overflow:hidden;padding:64px 66px;color:#222}
.blob{position:absolute;border-radius:50%;filter:blur(46px);opacity:.75}
.st{position:absolute;color:#1c1c1c}
h1{margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:68px;line-height:1.02;letter-spacing:.5px;position:relative}
.ph{position:absolute;right:86px;top:56px;width:190px;height:190px;border-radius:50%;object-fit:cover;z-index:2}.ph.ini{display:flex;align-items:center;justify-content:center;background:#fff;font-family:Georgia,serif;font-size:64px;color:#5b5fd8}
.role{margin-top:12px;font-size:14px;letter-spacing:3px;color:#666;text-transform:uppercase;position:relative}
.two{display:flex;gap:46px;margin-top:70px;position:relative}.two .a{width:290px}.two .b{flex:1}
h3{font-family:Georgia,serif;font-weight:400;font-size:20px;letter-spacing:3px;margin:0 0 16px}
p{font-size:12px;line-height:1.7;color:#555;margin:0}
.ct{display:grid;grid-template-columns:70px 1fr;gap:8px;font-size:12px}.ct span{color:#f47b3b}
.ed{margin-bottom:16px;font-size:12px}.ed b{display:block;font-weight:400;font-size:13px}.ed i{display:block;font-style:normal;color:#999}.ed em{font-style:normal;color:#f47b3b}
.tl{border-left:1px solid #555;padding-left:22px;position:relative}.it{position:relative;margin-bottom:22px}.it:before{content:'✦';position:absolute;left:-30px;top:-3px;font-size:15px;background:#efeff2}
.it .dt{color:#f47b3b;font-size:12px}.it b{display:block;font-weight:400;font-size:15px;margin:4px 0 2px}.it i{display:block;font-style:normal;color:#999;font-size:12px;margin-bottom:6px}
.sk{margin:10px 0;font-size:12px}.sk em{display:block;height:3px;background:#cfcfd4;margin-top:5px;position:relative}.sk em i{position:absolute;left:0;top:0;bottom:0;background:#f47b3b}`,
    `<div class="blob" style="width:330px;height:330px;right:20px;top:20px;background:#f47b3b"></div><div class="blob" style="width:300px;height:300px;right:-60px;top:170px;background:#5b5fd8"></div>
<div class="blob" style="width:300px;height:300px;left:-90px;bottom:120px;background:#f47b3b;opacity:.5"></div><div class="blob" style="width:260px;height:260px;left:60px;bottom:-110px;background:#5b5fd8;opacity:.6"></div>
${star(560, 46, 36)}${star(705, 250, 26)}${star(710, 120, 16)}
${photoOr(d, 'ph')}<h1>${esc(d.first)}<br>${esc(d.last)}</h1><div class="role">${esc(d.title)}</div>
<div class="two"><div class="a"><h3>About me</h3><p>${esc(d.about)}</p></div><div class="b"><h3>Contacts</h3><div class="ct">${contacts(d).map(([k, v]) => `<span>${{ phone: 'phone', mail: 'email', pin: 'address' }[k]}</span><div>${esc(v)}</div>`).join('')}</div></div></div>
<div class="two" style="margin-top:56px"><div class="a"><h3>Education</h3>${d.edu.map((e) => `<div class="ed"><b>${esc(e.name)}</b><i>${esc(e.org)}</i><em>${esc(e.year)}</em></div>`).join('')}
<h3 style="margin-top:34px">Skills</h3>${d.skills.slice(0, 6).map((s) => `<div class="sk">${esc(s.n)}<em><i style="width:${s.pct}%"></i></em></div>`).join('')}</div>
<div class="b"><h3>Work Experience</h3><div class="tl">${(d.exp.length ? d.exp : [{ role: 'Open to work', org: d.city, from: String(new Date().getFullYear()), to: 'Present', desc: d.about }]).map((e) => `<div class="it"><div class="dt">${esc(e.from)} - ${esc(e.to)}</div><b>${esc(e.role)}</b><i>${esc(e.org)}</i><p>${esc(e.desc)}</p></div>`).join('')}</div>
${d.certs.length ? `<h3 style="margin-top:24px">Certificates</h3>${d.certs.map((c) => `<div class="ed"><b>${esc(c.n)}</b><i>${esc(c.by)}</i></div>`).join('')}` : ''}</div></div>`,
  );
}

/* ---------------- Accent (Modern) ---------------- */
function accent(d: CvData) {
  return page(
    `body{background:#eef0f3;padding:60px 64px;color:#333}
.top{display:flex;justify-content:space-between}.slash{width:34px;height:14px;background:#f2c21b;transform:skewX(-35deg);margin:0 0 12px 6px}
.fn{font-size:40px;font-weight:300;letter-spacing:2px;color:#555;text-transform:uppercase;line-height:1}.ln{font-size:44px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#1c1c1c;line-height:1.05}
.role{font-size:11px;letter-spacing:3px;color:#888;text-transform:uppercase;margin-top:8px}
.ct{font-size:12px;line-height:2.1;color:#444;padding-top:18px}.ct div{display:flex;align-items:center;gap:8px}.ct i{display:inline-flex;width:20px;height:20px;border-radius:10px;background:#f2c21b;color:#1c1c1c;align-items:center;justify-content:center}
.cols{display:flex;gap:34px;margin-top:44px}.l{width:210px}.r{flex:1}
.phw{position:relative;width:180px;height:220px;margin-bottom:30px}.ph{width:180px;height:220px;object-fit:cover;filter:grayscale(1);clip-path:polygon(0 0,100% 0,100% 82%,50% 100%,0 82%)}.ph.ini{display:flex;align-items:center;justify-content:center;background:#c9ccd3;font-size:70px;font-weight:800;color:#fff}
.cut{position:absolute;right:-14px;bottom:20px;width:40px;height:90px;background:#f2c21b;transform:skewY(-35deg)}
h3{font-size:14px;letter-spacing:2px;text-transform:uppercase;color:#1c1c1c;margin:0 0 12px}
.l .it{font-size:11px;margin-bottom:12px;color:#555}.l .it b{display:block;color:#1c1c1c;text-transform:uppercase;font-size:11px}
.l ul{padding-left:16px;margin:0;font-size:12px;line-height:1.9;color:#444}
p{font-size:12px;line-height:1.7;color:#555;margin:0}.hr{height:1px;background:#c9ccd3;margin:24px 0}
.e{margin-bottom:22px}.e b{display:block;font-size:12px;text-transform:uppercase;color:#1c1c1c}.e i{display:block;font-style:normal;font-size:11px;color:#777;margin:2px 0 8px}`,
    `<div class="top"><div><div class="slash"></div><div class="fn">${esc(d.first)}</div><div class="ln">${esc(d.last || d.first)}</div><div class="role">${esc(d.title)}</div></div>
<div class="ct">${contacts(d).map(([k, v]) => `<div><i>${ICON[k]}</i>${esc(v)}</div>`).join('')}</div></div>
<div class="cols"><div class="l"><div class="phw">${photoOr(d, 'ph')}<div class="cut"></div></div>
<h3>Education</h3>${d.edu.map((e) => `<div class="it"><b>${esc(e.name)}</b>${esc(e.org)}${e.year ? ' | ' + esc(e.year) : ''}</div>`).join('')}
<h3 style="margin-top:24px">Skills</h3><ul>${d.keySkills.slice(0, 9).map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
<h3 style="margin-top:24px">Languages</h3><ul>${d.langs.map((l) => `<li>${esc(l.n)} · ${esc(l.lv)}</li>`).join('')}</ul></div>
<div class="r"><h3>About me</h3><p>${esc(d.about)}</p><div class="hr"></div>
<h3>Experiences</h3>${d.exp.length ? d.exp.map((e) => `<div class="e"><b>${esc(e.role)} | ${esc(e.from)} - ${esc(e.to)}</b><i>${esc(e.org)}</i><p>${esc(e.desc)}</p></div>`).join('') : `<p>Ready to start: ${d.skills.map((s) => esc(s.n)).join(', ')}.</p>`}
${d.certs.length ? `<div class="hr"></div><h3>Certificates</h3>${d.certs.map((c) => `<div class="e"><b>${esc(c.n)}</b><i>${esc(c.by)}</i></div>`).join('')}` : ''}</div></div>`,
  );
}

const RENDER: Record<string, (d: CvData) => string> = { basic, executive, centered, slate, aura, accent };
export const cvHtml = (id: string, d: CvData) => (RENDER[id] || basic)(d);
