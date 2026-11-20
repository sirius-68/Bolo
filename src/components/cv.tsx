import React from 'react';
import { View } from 'react-native';
import { db } from '../data/db';
import { Avatar, Txt } from '../ui/kit';
import { P, aboutOf, cityLabel, ensureSkillList, k, myLevel, myPhoto, profileRaw } from '../logic/core';
import { aboutLine } from './cvTemplates';
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
          <T>{cv?.prof || [m?.n, myLevel()].filter(Boolean).join(' · ')}</T>
          <Txt s={11} c="#555">
            {[db.PR.ct.phone ? showPhone(db.PR.ct.phone) : '', db.PR.ct.email, cityLabel()].filter(Boolean).join(' · ')}
          </Txt>
        </View>
      </View>
      <H>Profile</H>
      <T>{u.bio || aboutLine()}</T>
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

/** A CV for someone else, built only from what they put on their getit profile. */
export function PersonCV({ id }: { id: string }) {
  const p = P(id);
  const a = aboutOf(id);
  const r = profileRaw(id) || {};
  const exp: { role: string; org: string; from: number; to: number | null; desc: string }[] = r.experience || [];
  const edu: { level?: string; courses?: { name: string; org: string; year: string }[] } = r.education || {};
  const langs: [string, string][] = r.languages || [];
  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18 }}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#3d5af1', paddingBottom: 12 }}>
        <Avatar pic={p.photo} size={64} />
        <View style={{ flex: 1 }}>
          <Txt s={18} w={8} c="#111">
            {p.name}
          </Txt>
          <T>
            {p.role}
            {p.years ? ` · ${p.years} years experience` : ''}
          </T>
          <Txt s={11} c="#555">
            {[p.area, p.rate ? `${p.rate}★ on getit` : ''].filter(Boolean).join(' · ')}
          </Txt>
        </View>
      </View>
      {a.bio ? (
        <>
          <H>Profile</H>
          <T>{a.bio}</T>
        </>
      ) : null}
      {a.spec.length ? (
        <>
          <H>Skills</H>
          {a.spec.map((x) => (
            <T key={x}>• {x}</T>
          ))}
        </>
      ) : null}
      <H>Experience</H>
      {exp.length ? (
        exp.map((e, i) => (
          <View key={i} style={{ marginBottom: 6 }}>
            <T b>
              {e.role}
              {e.org ? ` · ${e.org}` : ''}
            </T>
            <Txt s={11} c="#555">
              {e.from} – {e.to || 'present'}
            </Txt>
            {e.desc ? <T>{e.desc}</T> : null}
          </View>
        ))
      ) : (
        <T>{p.jobs ? `${k(p.jobs)} jobs completed on getit with ${p.reviews} reviews.` : 'Not added yet.'}</T>
      )}
      {exp.length && p.jobs ? <T>{`${k(p.jobs)} jobs completed on getit with ${p.reviews} reviews.`}</T> : null}
      {edu.level || edu.courses?.length ? (
        <>
          <H>Education</H>
          <T>{[edu.level, ...(edu.courses || []).map((c) => [c.name, c.org, c.year].filter(Boolean).join(', '))].filter(Boolean).join(' · ')}</T>
        </>
      ) : null}
      {langs.length ? (
        <>
          <H>Languages</H>
          <T>{langs.map((l) => (Array.isArray(l) ? `${l[0]} (${l[1]})` : String(l))).join(' · ')}</T>
        </>
      ) : null}
    </View>
  );
}

