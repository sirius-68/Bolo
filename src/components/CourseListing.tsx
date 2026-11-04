/* Course listings: a row for lists, a tile for rails, and the details sheet.
   Tapping a course opens its own website; the bookmark saves it; "About" shows details and ratings. */
import React from 'react';
import { Pressable, View } from 'react-native';
import { Avatar, Btn, StatusPill, Txt, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { C, S } from '../ui/theme';
import { sheet, SheetTitle } from '../ui/overlay';
import { db, Course } from '../data/db';
import { COURSE_CATS } from '../data/catalog';
import { useLive } from '../logic/live';
import { isW } from '../logic/core';
import { domainOf, isSavedCourse, openCourseSite, priceLabel, toggleSaveCourse } from '../logic/listings';
import { markTook, tookCourse } from '../logic/reviews';
import { CourseReviews, RatingBadge } from './Reviews';
import { openCourse } from '../sheets/career';

const TONES: [string, string][] = [
  [C.blue, '#fff'],
  [C.orange, '#000'],
  [C.lav, '#000'],
  [C.mint, '#000'],
  [C.yellow, '#000'],
  [C.pink, '#000'],
];
export const toneOf = (c: Course) => TONES[Math.max(0, COURSE_CATS.findIndex((x) => x[0] === c.cat)) % TONES.length];
export const catIcon = (cat: string) => COURSE_CATS.find((x) => x[0] === cat)?.[1] || 'cap';
/** Open the course: its website, or (for your own listings without a link yet) the manage sheet. */
export const goCourse = (c: Course) => (tap(), c.url ? openCourseSite(c) : openCourse(c.id));

function Save({ c, color = C.text, bg = C.s2 }: { c: Course; color?: string; bg?: string }) {
  const on = isSavedCourse(c.id);
  return (
    <Pressable testID={`save-${c.id}`} accessibilityRole="button" accessibilityLabel={on ? 'Remove from saved' : 'Save course'} hitSlop={8} onPress={() => (tap(), toggleSaveCourse(c.id))} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: on ? C.yellow : bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="bookmark" size={16} color={on ? '#000' : color} />
    </Pressable>
  );
}

/** List row: tile, school · site, title, level · length, rating, price, save. */
export function CourseRow({ c }: { c: Course }) {
  const [bg, fg] = toneOf(c);
  return (
    <Pressable testID={`course-${c.id}`} accessibilityRole="link" accessibilityLabel={`${c.title} by ${c.prov.n}. Opens ${domainOf(c.url) || 'the course'}`} onPress={() => goCourse(c)} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 22, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line, alignItems: 'flex-start' }]}>
      <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={catIcon(c.cat)} size={28} color={fg} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={[S.row, { gap: 6 }]}>
          <Avatar pic={c.prov.logo} square size={16} />
          <Txt s={12} c={C.muted} style={{ flex: 1 }} lines={1}>
            {c.prov.n}
            {c.fmt === 'Offline' ? ` · In person${c.reg ? ', ' + c.reg : ''}` : ''}
          </Txt>
        </View>
        <Txt s={15} w={8} lines={2}>
          {c.title}
        </Txt>
        <Txt s={12} c={C.muted} lines={1}>
          {c.lv === 'Beginner' ? 'From zero' : 'Some experience'} · {c.dur}
        </Txt>
        <RatingBadge c={c} />
        <View style={[S.row, { gap: 8, marginTop: 2 }]}>
          {c.mine ? <StatusPill kind="blue" text="Your listing" /> : null}
          <Txt s={14} w={8} c={c.price || c.priceText ? C.yellow : C.mint} lines={1} style={{ flexShrink: 1 }}>
            {priceLabel(c)}
          </Txt>
          {c.url ? (
            <View style={[S.row, { gap: 3, marginLeft: 'auto' }]}>
              <Txt s={11} c={C.lav} lines={1}>
                {domainOf(c.url)}
              </Txt>
              <Icon name="arrow" size={10} color={C.lav} style={{ transform: [{ rotate: '-45deg' }] }} />
            </View>
          ) : null}
        </View>
      </View>
      {!c.mine ? <Save c={c} /> : null}
    </Pressable>
  );
}

/** Rail tile (Career and Courses). */
export function CourseTile({ c, w = 168 }: { c: Course; w?: number }) {
  const [bg, fg] = toneOf(c);
  const dark = fg === '#fff';
  return (
    <Pressable testID={`tile-${c.id}`} accessibilityRole="link" accessibilityLabel={`${c.title} by ${c.prov.n}. Opens ${domainOf(c.url)}`} onPress={() => goCourse(c)} style={({ pressed }) => ({ width: w, height: 196, padding: 14, borderRadius: 22, backgroundColor: bg, justifyContent: 'space-between', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <View style={S.rowB}>
        <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: dark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.1)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={catIcon(c.cat)} size={19} color={fg} />
        </View>
        {!c.mine ? <Save c={c} color={dark ? '#fff' : '#000'} bg={dark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.1)'} /> : null}
      </View>
      <View>
        <Txt s={15} w={8} c={fg} lines={3}>
          {c.title}
        </Txt>
        <Txt s={11} w={7} c={fg} style={{ opacity: 0.75, marginTop: 4 }} lines={1}>
          {c.prov.n}
        </Txt>
        <View style={[S.rowB, { marginTop: 6 }]}>
          <Txt s={12} w={8} c={fg} lines={1} style={{ flexShrink: 1 }}>
            {c.price ? priceLabel(c) : c.priceText ? 'Paid' : 'Free'}
          </Txt>
          <Icon name="arrow" size={13} color={fg} style={{ transform: [{ rotate: '-45deg' }] }} />
        </View>
      </View>
    </Pressable>
  );
}

/** Listing details: who runs it, price, level, and ratings from members who took it. */
export function openAbout(id: string) {
  sheet.show(() => <About id={id} />, { full: true, tag: 'about:' + id });
}
function About({ id }: { id: string }) {
  useLive();
  const c = db.COURSES.find((x) => x.id === id);
  if (!c) return null;
  const took = tookCourse(c.id);
  return (
    <View style={{ gap: 12 }}>
      <SheetTitle sub={`${c.prov.n} · ${domainOf(c.url)}`}>{c.title}</SheetTitle>
      {c.desc ? (
        <Txt s={14} c="#d6d6dc" style={{ lineHeight: 21 }}>
          {c.desc}
        </Txt>
      ) : null}
      <View style={{ padding: 14, borderRadius: 18, backgroundColor: C.s2, gap: 8 }}>
        {(
          [
            ['Price', priceLabel(c)],
            ['Level', c.lv === 'Beginner' ? 'From zero' : 'Some experience needed'],
            ['Format', c.fmt === 'Offline' ? `In person${c.reg ? ' · ' + c.reg : ''}` : 'Online'],
            ['Length', c.dur],
            ['Field', c.cat],
          ] as [string, string][]
        ).map(([k, v]) => (
          <View key={k} style={[S.row, { gap: 10 }]}>
            <Txt s={13} c={C.muted} style={{ width: 70 }}>
              {k}
            </Txt>
            <Txt s={13} w={7} style={{ flex: 1 }}>
              {v}
            </Txt>
          </View>
        ))}
      </View>
      <Txt s={12} c={C.faint}>
        You sign up and pay on {domainOf(c.url)}. bolo lists the course but doesn’t run it.
      </Txt>
      {isW() && !c.mine && !took ? <Btn testID="took-course" variant="dark" icon="checkc" title="I took this course · rate it" onPress={() => (tap(), markTook(c.id))} /> : null}
      <CourseReviews c={c} />
    </View>
  );
}
