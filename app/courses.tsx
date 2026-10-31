import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { db, Course } from '../src/data/db';
import { COURSE_CATS } from '../src/data/catalog';
import { Avatar, Bar, Btn, Empty, IconBtn, PTabs, StatusPill, Txt, goBack, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { fname, isW, me, xaf } from '../src/logic/core';
import { bump, useLive } from '../src/logic/live';
import { classWhen, coursePct, isLive, lessonsOf, timeLeft } from '../src/logic/career';
import { SearchBar } from '../src/components/common';
import { CourseWelcome, needsCourseWelcome } from '../src/components/CourseWelcome';
import { openCourse, openOppForm } from '../src/sheets/career';
import { courseF, openCourseFilters } from '../src/sheets/filters';

const SORTS = ['Relevant', 'Cheapest', 'Biggest discount'] as const;
/** Colour per course field, so every course has a recognisable tile. */
const TONES: [string, string][] = [
  [C.blue, '#fff'],
  [C.orange, '#000'],
  [C.lav, '#000'],
  [C.mint, '#000'],
  [C.yellow, '#000'],
  [C.pink, '#000'],
];
const catIcon = (cat: string) => COURSE_CATS.find((x) => x[0] === cat)?.[1] || 'cap';
const toneOf = (c: Course) => TONES[Math.max(0, COURSE_CATS.findIndex((x) => x[0] === c.cat)) % TONES.length];
const mineL = () => db.myLearning.map((id) => db.COURSES.find((c) => c.id === id)).filter(Boolean) as Course[];
const openC = (c: Course) => (tap(), db.myLearning.includes(c.id) ? router.push(`/course/${c.id}` as any) : openCourse(c.id));

export default function Courses() {
  useLive();
  const { cat, tab: t0 } = useLocalSearchParams<{ cat?: string; tab?: string }>();
  const ins = useSafeAreaInsets();
  const w = isW();
  const [tab, setTab] = useState<'mine' | 'explore'>(t0 === 'mine' || (!cat && t0 !== 'explore' && w && db.myLearning.length) ? 'mine' : 'explore');
  const [intro, setIntro] = useState(w && needsCourseWelcome());
  useEffect(() => {
    courseF.cat = cat || '';
    bump();
  }, [cat]);
  const mine = mineL();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      <View style={{ paddingHorizontal: 20, gap: 12, paddingBottom: 4 }}>
        <View style={[S.row, { gap: 10, paddingTop: 6 }]}>
          <IconBtn name="back" label="Back" onPress={goBack} />
          <Txt s={22} w={8} style={{ flex: 1 }}>
            Courses
          </Txt>
          {!w ? <IconBtn name="plus" bg={C.yellow} color="#000" label="Create a course" onPress={() => openOppForm('Course')} /> : null}
        </View>
        {w ? (
          <PTabs
            items={[
              ['mine', 'My learning', mine.length],
              ['explore', 'Explore'],
            ]}
            value={tab}
            onChange={setTab}
          />
        ) : null}
      </View>
      {w && tab === 'mine' ? <MyLearning list={mine} onExplore={() => setTab('explore')} bottom={ins.bottom} /> : <Explore bottom={ins.bottom} />}
      {intro ? <CourseWelcome onDone={() => setIntro(false)} /> : null}
    </View>
  );
}

/* ---------------- My learning ---------------- */
function MyLearning({ list, onExplore, bottom }: { list: Course[]; onExplore: () => void; bottom: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!list.length)
    return (
      <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: 'center', paddingBottom: 80 + bottom }}>
        <Empty title="You haven’t enrolled yet" text="Pick a course. It shows up here with your lessons, live classes and class group.">
          <Btn variant="yellow" icon="search" title="Explore courses" onPress={onExplore} style={{ marginTop: 16, alignSelf: 'stretch' }} />
        </Empty>
      </View>
    );
  const going = list.filter((c) => coursePct(c) < 100);
  const done = list.filter((c) => coursePct(c) >= 100);
  const total = list.reduce((n, c) => n + lessonsOf(c).length, 0);
  const finished = list.reduce((n, c) => n + Math.min(c.done || 0, lessonsOf(c).length), 0);
  const pct = total ? Math.round((finished / total) * 100) : 0;
  const next = list
    .filter((c) => c.startAt && c.startAt + 90 * 60_000 > now && coursePct(c) < 100)
    .sort((a, b) => (a.startAt || 0) - (b.startAt || 0))[0];
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 + bottom }}>
      {/* summary */}
      <View style={[S.row, { gap: 14, padding: 18, borderRadius: 26, backgroundColor: C.lav }]}>
        <View style={{ flex: 1 }}>
          <Txt s={22} w={8} c="#000">
            {(() => {
              const n = fname(me().name || '');
              const who = n && n !== 'You' ? `, ${n}` : '';
              return `${pct >= 100 ? 'All done' : 'Keep going'}${who}!`;
            })()}
          </Txt>
          <Txt s={13} c="#26294a" style={{ marginTop: 2 }}>
            {finished} of {total} lessons finished
          </Txt>
          <Bar pct={pct} h={6} color="#000" bg="rgba(0,0,0,.15)" style={{ marginTop: 12 }} />
        </View>
        <ProgressRing pct={pct} />
      </View>

      {/* next live class */}
      {next ? (
        <Pressable testID="ml-next-class" accessibilityRole="button" onPress={() => openC(next)} style={({ pressed }) => [S.row, { gap: 12, marginTop: 10, padding: 12, borderRadius: 22, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: isLive(next, now) ? C.mint : C.line }]}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: isLive(next, now) ? '#e11d48' : C.blue, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="video" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt s={12} c={C.muted}>
              {isLive(next, now) ? 'Live now' : `Next live class · ${classWhen(next.startAt!)}`}
            </Txt>
            <Txt s={14} w={8} lines={1}>
              {next.title}
            </Txt>
          </View>
          <View style={{ paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: isLive(next, now) ? C.yellow : C.s2, justifyContent: 'center' }}>
            <Txt s={12} w={8} c={isLive(next, now) ? '#000' : C.yellow}>
              {isLive(next, now) ? 'Join' : `in ${timeLeft(next.startAt! - now)}`}
            </Txt>
          </View>
        </Pressable>
      ) : null}

      {going.length ? <Head t="In progress" n={going.length} /> : null}
      <View style={{ gap: 10 }}>
        {going.map((c) => (
          <LearnRow key={c.id} c={c} />
        ))}
      </View>
      {done.length ? <Head t="Completed" n={done.length} /> : null}
      <View style={{ gap: 10 }}>
        {done.map((c) => (
          <LearnRow key={c.id} c={c} />
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={() => (tap(), onExplore())} style={[S.row, { gap: 10, marginTop: 16, padding: 14, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: C.s3, justifyContent: 'center' }]}>
        <Icon name="plus" size={18} color={C.yellow} />
        <Txt s={14} w={8}>
          Find another course
        </Txt>
      </Pressable>
    </ScrollView>
  );
}
function Head({ t, n }: { t: string; n: number }) {
  return (
    <View style={[S.row, { gap: 8, marginTop: 22, marginBottom: 10 }]}>
      <Txt s={18} w={8}>
        {t}
      </Txt>
      <Txt s={14} w={7} c={C.muted}>
        {n}
      </Txt>
    </View>
  );
}
function ProgressRing({ pct }: { pct: number }) {
  const size = 76;
  const sw = 7;
  const r = (size - sw) / 2;
  const len = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(0,0,0,.15)" strokeWidth={sw} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#000" strokeWidth={sw} fill="none" strokeDasharray={`${(len * pct) / 100} ${len}`} strokeLinecap="round" />
      </Svg>
      <Txt s={17} w={8} c="#000">
        {pct}%
      </Txt>
    </View>
  );
}
function Tile({ c, size = 56 }: { c: Course; size?: number }) {
  const [bg, fg] = toneOf(c);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={catIcon(c.cat)} size={size * 0.44} color={fg} />
    </View>
  );
}
function LearnRow({ c }: { c: Course }) {
  const L = lessonsOf(c).length;
  const d = Math.min(c.done || 0, L);
  const pct = coursePct(c);
  return (
    <Pressable testID={`ml-${c.id}`} accessibilityRole="button" onPress={() => openC(c)} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 22, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
      <Tile c={c} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Txt s={15} w={8} lines={2}>
          {c.title}
        </Txt>
        <Txt s={12} c={C.muted} lines={1}>
          {pct >= 100 ? `Completed · certificate earned` : `${d} of ${L} lessons · ${c.prov.n}`}
        </Txt>
        <View style={[S.row, { gap: 8, marginTop: 4 }]}>
          <Bar pct={pct} h={5} color={pct >= 100 ? C.mint : C.yellow} style={{ flex: 1 }} />
          <Txt s={12} w={8} c={pct >= 100 ? C.mint : C.text}>
            {pct}%
          </Txt>
        </View>
      </View>
    </Pressable>
  );
}

/* ---------------- Explore ---------------- */
function Explore({ bottom }: { bottom: number }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<(typeof SORTS)[number]>('Relevant');
  const qq = q.trim().toLowerCase();
  let L = db.COURSES.filter(
    (c) =>
      (!courseF.cat || c.cat === courseF.cat) &&
      (!courseF.lv || c.lv === courseF.lv) &&
      (!courseF.price || (courseF.price === 'free' ? !c.price : !!c.price)) &&
      (!courseF.fmt || c.fmt === courseF.fmt) &&
      (!qq || (c.title + ' ' + c.prof + ' ' + c.skills.join(' ') + ' ' + c.prov.n).toLowerCase().includes(qq)),
  );
  if (sort === 'Cheapest') L = L.slice().sort((a, b) => a.price - b.price);
  if (sort === 'Biggest discount') L = L.slice().sort((a, b) => (b.old ? 1 - b.price / b.old : 0) - (a.old ? 1 - a.price / a.old : 0));
  const nf = (courseF.lv ? 1 : 0) + (courseF.price ? 1 : 0) + (courseF.fmt ? 1 : 0);
  const plain = !qq && !courseF.cat && !nf;
  const free = db.COURSES.filter((c) => !c.price && !db.myLearning.includes(c.id) && !c.mine).slice(0, 8);
  return (
    <FlatList
      data={L}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 + bottom, gap: 10 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 4 }}>
          <SearchBar value={q} onChange={setQ} placeholder="Course, profession or skill" onFilter={openCourseFilters} filters={nf} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
            {[['', 'job'] as [string, string], ...COURSE_CATS].map(([c, i]) => {
              const on = courseF.cat === c;
              return (
                <Pressable
                  key={c || 'all'}
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    tap();
                    courseF.cat = c;
                    bump();
                  }}
                  style={[S.row, { gap: 6, height: 36, paddingHorizontal: 14, borderRadius: 999, backgroundColor: on ? C.text : C.s1, borderWidth: 1, borderColor: on ? C.text : C.line }]}
                >
                  {c ? <Icon name={i} size={14} color={on ? '#000' : C.yellow} /> : null}
                  <Txt s={12} w={7} c={on ? '#000' : C.text}>
                    {c || 'All'}
                  </Txt>
                </Pressable>
              );
            })}
          </ScrollView>
          {plain && free.length ? (
            <>
              <Txt s={18} w={8} style={{ marginTop: 6 }}>
                Free to start
              </Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
                {free.map((c) => (
                  <FeatureCard key={c.id} c={c} />
                ))}
              </ScrollView>
            </>
          ) : null}
          <View style={[S.rowB, { marginTop: plain ? 8 : 0 }]}>
            <Txt s={plain ? 18 : 13} w={plain ? 8 : 5} c={plain ? C.text : C.muted}>
              {plain ? 'All courses' : `${L.length} course${L.length === 1 ? '' : 's'}`}
            </Txt>
            <Pressable onPress={() => setSort(SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length])} style={[S.row, { gap: 4 }]} accessibilityLabel={`Sort: ${sort}. Tap to change`}>
              <Icon name="filter" size={14} color={C.lav} />
              <Txt s={13} w={7} c={C.lav}>
                {sort}
              </Txt>
            </Pressable>
          </View>
        </View>
      }
      renderItem={({ item }) => <CourseRow c={item} />}
      ListEmptyComponent={<Empty title="No courses match" text="Try another field or fewer filters." />}
      initialNumToRender={8}
    />
  );
}
function FeatureCard({ c }: { c: Course }) {
  const [bg, fg] = toneOf(c);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${c.title}, free`} onPress={() => openC(c)} style={({ pressed }) => ({ width: 168, height: 196, padding: 14, borderRadius: 24, backgroundColor: bg, justifyContent: 'space-between', transform: [{ scale: pressed ? 0.97 : 1 }] })}>
      <View style={S.rowB}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: fg === '#fff' ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.1)', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={catIcon(c.cat)} size={20} color={fg} />
        </View>
        <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: fg === '#fff' ? '#fff' : '#000', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-45deg' }] }}>
          <Icon name="arrow" size={14} color={fg === '#fff' ? '#000' : '#fff'} />
        </View>
      </View>
      <View>
        <Txt s={15} w={8} c={fg} lines={3}>
          {c.title}
        </Txt>
        <Txt s={11} w={7} c={fg} style={{ opacity: 0.7, marginTop: 4 }} lines={1}>
          {lessonsOf(c).length} lessons · {c.dur}
        </Txt>
      </View>
    </Pressable>
  );
}
function CourseRow({ c }: { c: Course }) {
  const d = c.old ? Math.round((1 - c.price / c.old) * 100) : 0;
  const mine = db.myLearning.includes(c.id);
  return (
    <Pressable onPress={() => openC(c)} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 22, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line, alignItems: 'flex-start' }]}>
      <Tile c={c} size={64} />
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View style={[S.row, { gap: 6 }]}>
          <Avatar pic={c.prov.logo} square size={16} />
          <Txt s={12} c={C.muted} style={{ flex: 1 }} lines={1}>
            {c.prov.n} · {c.fmt === 'Offline' ? `In person${c.reg ? ' · ' + c.reg : ''}` : 'Online'}
          </Txt>
        </View>
        <Txt s={15} w={8} lines={2}>
          {c.title}
        </Txt>
        <Txt s={12} c={C.muted}>
          {c.lv === 'Beginner' ? 'From zero' : 'Advanced'} · {c.dur}
        </Txt>
        <View style={[S.row, { gap: 8, marginTop: 2 }]}>
          {mine ? (
            <StatusPill kind="acc" text={`Enrolled · ${coursePct(c)}%`} />
          ) : c.mine ? (
            <StatusPill kind="blue" text="Yours" />
          ) : (
            <>
              <Txt s={15} w={8} c={C.yellow}>
                {c.price ? xaf(c.price) : 'Free'}
              </Txt>
              {c.old ? (
                <Txt s={12} c={C.muted} style={{ textDecorationLine: 'line-through' }}>
                  {xaf(c.old)}
                </Txt>
              ) : null}
              {d ? <StatusPill kind="urg" text={`−${d}%`} /> : null}
            </>
          )}
        </View>
      </View>
    </Pressable>
  );
}
