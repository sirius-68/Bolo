import React from 'react';
import { View } from 'react-native';
import { db } from '../data/db';
import { LANG_SETS } from '../data/catalog';
import { Avatar, Txt } from '../ui/kit';
import { P, WORKERS, aboutOf, ensureSkillList, k, myLevel, myPhoto, myCity } from '../logic/core';
import { syncContacts } from '../logic/account';
import { exSummary } from './skills';
import { showPhone } from '../data/countries';

const H = ({ children }: { children: string }) => (
  <Txt s={11} w={8} c="#3d5af1" style={{ letterSpacing: 1, marginTop: 16, marginBottom: 4 }}>
    {children.toUpperCase()}
  </Txt>
);
const T = ({ children, b }: { children: React.ReactNode; b?: boolean }) => (
  <Txt s={13} w={b ? 8 : 5} c="#111" style={{ lineHeight: 19 }}>
    {children}
  </Txt>
);

/** The user's CV, built from their profile. */
export function MyCV({ modern }: { modern?: boolean }) {
  ensureSkillList();
  syncContacts();
  const u = db.user;
  const s = u.skillList || [];
  const m = s[0];
  const cv = u.cv;
  return (
    <View style={{ backgroundColor: modern ? '#f7f5ec' : '#fff', borderRadius: 16, padding: 18 }}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: modern ? '#f6ee5c' : '#3d5af1', paddingBottom: 12 }}>
        <Avatar pic={myPhoto()} size={64} />
        <View style={{ flex: 1 }}>
          <Txt s={18} w={8} c="#111">
            {u.name || 'Your name'}
          </Txt>
          <T>{cv?.prof || `${m?.n || 'Professional'} · ${myLevel()} · ${u.years} years`}</T>
          <Txt s={11} c="#555">
            {[db.PR.ct.phone ? showPhone(db.PR.ct.phone) : '', db.PR.ct.email, myCity()].filter(Boolean).join(' · ')}
          </Txt>
        </View>
      </View>
      <H>Profile</H>
      <T>{u.bio || `${m?.n || 'Professional'} with ${u.years} years of experience, based in ${myCity()}. ${myLevel()} level.`}</T>
      <H>Skills</H>
      {s.map((e) => (
        <T key={e.n}>
          • <T b>{e.n}</T>
          {exSummary(e) ? ': ' + exSummary(e) : ''}
        </T>
      ))}
      {cv ? (
        <>
          <H>Personal details</H>
          <T>{[cv.gender, cv.dob ? 'Born ' + new Date(cv.dob).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '', 'Citizenship: ' + cv.cit, 'Work permit: ' + cv.permit].filter(Boolean).join(' · ')}</T>
          {cv.skills.length ? (
            <>
              <H>Key skills</H>
              <T>{cv.skills.join(' · ')}</T>
            </>
          ) : null}
        </>
      ) : null}
      {db.PR.exp.length ? (
        <>
          <H>Experience</H>
          {db.PR.exp.map((e, i) => (
            <View key={i} style={{ marginBottom: 6 }}>
              <T b>
                {e.role} · {e.org}
              </T>
              <Txt s={11} c="#555">
                {e.from} – {e.to || 'present'}
              </Txt>
              {e.desc ? <T>{e.desc}</T> : null}
            </View>
          ))}
        </>
      ) : cv?.noExp ? (
        <>
          <H>Experience</H>
          <T>No formal experience yet, eager to learn and start.</T>
        </>
      ) : null}
      <H>Education</H>
      <T>
        {db.PR.edu.level}
        {db.PR.edu.courses.length ? ' · ' + db.PR.edu.courses.map((c) => c.name).join(', ') : ''}
      </T>
      <H>Languages</H>
      <T>{db.PR.langs.map(([l, v]) => `${l} (${v})`).join(' · ')}</T>
    </View>
  );
}

/** A CV for someone else (generated from their bolo profile). */
export function PersonCV({ id }: { id: string }) {
  const p = P(id);
  const a = aboutOf(id);
  const i = Math.max(0, WORKERS().indexOf(id));
  const Y = new Date().getFullYear();
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18 }}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#3d5af1', paddingBottom: 12 }}>
        <Avatar pic={p.photo} size={64} />
        <View style={{ flex: 1 }}>
          <Txt s={18} w={8} c="#111">
            {p.name}
          </Txt>
          <T>
            {p.role} · {p.years} years experience
          </T>
          <Txt s={11} c="#555">
            {p.area} · {p.rate}★ on bolo
          </Txt>
        </View>
      </View>
      <H>Profile</H>
      <T>{a.bio}</T>
      <H>Skills</H>
      {a.spec.map((s) => (
        <T key={s}>• {s}</T>
      ))}
      <H>Experience</H>
      <T b>{p.role} · Self-employed</T>
      <Txt s={11} c="#555">
        {Y - Math.min(p.years, 3)} – present
      </Txt>
      <T>
        {k(p.jobs)} jobs completed on bolo with {p.reviews} reviews.
      </T>
      <View style={{ height: 6 }} />
      <T b>
        {p.years > 3 ? 'Senior ' : ''}
        {p.role} · {['Buea Services Co.', 'Mountain Works', 'Limbe Trading', 'Douala Partners'][i % 4]}
      </T>
      <Txt s={11} c="#555">
        {Y - p.years} – {Y - Math.min(p.years, 3)}
      </Txt>
      <H>Education</H>
      <T>{['GCE A Level · Technical certificate', 'HND · University of Buea', 'GCE O Level · Vocational training', 'BSc · University of Buea'][i % 4]}</T>
      <H>Languages</H>
      <T>{LANG_SETS[i % 4].join(' · ')}</T>
    </View>
  );
}

/** Plain HTML version of my CV for printing / sharing as PDF. */
export function myCvHtml() {
  ensureSkillList();
  const u = db.user;
  const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const s = u.skillList || [];
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Helvetica,Arial,sans-serif;max-width:720px;margin:28px auto;color:#111;padding:0 20px}h2{margin:0}h4{text-transform:uppercase;letter-spacing:.08em;font-size:12px;color:#3d5af1;margin:18px 0 6px}p,li{font-size:14px;line-height:1.5}small{color:#555}.h{border-bottom:3px solid #3d5af1;padding-bottom:12px}</style></head><body>
  <div class="h"><h2>${esc(u.name || 'Your name')}</h2><p>${esc(u.cv?.prof || (s[0]?.n || 'Professional') + ' · ' + myLevel() + ' · ' + u.years + ' years')}</p><small>${[db.PR.ct.phone ? showPhone(db.PR.ct.phone) : '', db.PR.ct.email, myCity()].filter(Boolean).map(esc).join(' · ')}</small></div>
  <h4>Profile</h4><p>${esc(u.bio || `${s[0]?.n || 'Professional'} with ${u.years} years of experience, based in ${myCity()}.`)}</p>
  <h4>Skills</h4><ul>${s.map((e) => `<li><b>${esc(e.n)}</b>${exSummary(e) ? ': ' + esc(exSummary(e)) : ''}</li>`).join('')}</ul>
  ${db.PR.exp.length ? `<h4>Experience</h4>${db.PR.exp.map((e) => `<p><b>${esc(e.role)} · ${esc(e.org)}</b><br><small>${e.from} – ${e.to || 'present'}</small>${e.desc ? '<br>' + esc(e.desc) : ''}</p>`).join('')}` : ''}
  <h4>Education</h4><p>${esc(db.PR.edu.level)}${db.PR.edu.courses.length ? ' · ' + db.PR.edu.courses.map((c) => esc(c.name)).join(', ') : ''}</p>
  <h4>Languages</h4><p>${db.PR.langs.map(([l, v]) => `${esc(l)} (${v})`).join(' · ')}</p></body></html>`;
}
