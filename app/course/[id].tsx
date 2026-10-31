import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { db } from '../../src/data/db';
import { Avatar, Btn, Empty, Page, PTabs, StatusPill, TopBar, Txt, tap } from '../../src/ui/kit';
import { Icon } from '../../src/ui/Icon';
import { C, S } from '../../src/ui/theme';
import { WORKERS, P, xaf } from '../../src/logic/core';
import { bump, useLive } from '../../src/logic/live';
import { learnerGroup, lessonsOf } from '../../src/logic/career';
import { openChat } from '../../src/sheets/chat';
import { openCourse } from '../../src/sheets/career';
import { toast } from '../../src/ui/overlay';

const two = (n: number) => String(n).padStart(2, '0');
function left(ms: number) {
  if (ms <= 0) return 'now';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${two(m)}m` : `${two(m)}:${two(s % 60)}`;
}

/** A course you've enrolled in: next class countdown, Join class, class group, lessons and classmates. */
export default function CoursePage() {
  useLive();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = db.COURSES.find((x) => x.id === id);
  const [tab, setTab] = useState('Lessons');
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!c)
    return (
      <Page header={<TopBar title="Course" />}>
        <Empty title="Course not found" />
      </Page>
    );
  if (!db.myLearning.includes(c.id)) {
    // Not enrolled: show the details sheet instead.
    setTimeout(() => (router.back(), openCourse(c.id)), 0);
    return null;
  }
  const start = c.startAt || 0;
  const live = start && now >= start && now < start + 90 * 60_000;
  const lessons = lessonsOf(c);
  const done = Math.min(c.done || 0, lessons.length);
  const pct = Math.round((done / lessons.length) * 100);
  const gid = learnerGroup(c);
  const th = db.THREADS_W[gid];
  const mates = (th?.members || WORKERS().slice(2, 9)).slice(0, 8);
  const joinClass = () => {
    tap();
    router.push({ pathname: '/call', params: { id: gid, type: 'video' } } as any);
  };
  const finishLesson = () => {
    c.done = Math.min(lessons.length, (c.done || 0) + 1);
    bump();
    toast(c.done >= lessons.length ? 'Course complete! Your certificate is ready' : `Lesson ${c.done} done`);
  };

  return (
    <Page header={<TopBar title="My course" />}>
      {/* hero */}
      <View style={{ marginTop: 8, padding: 18, borderRadius: 26, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
        <View style={[S.row, { gap: 12 }]}>
          <Avatar pic={c.prov.logo} square size={56} />
          <View style={{ flex: 1 }}>
            <Txt s={13} c={C.muted}>
              {c.prov.n} · {c.fmt}
            </Txt>
            <Txt s={19} w={8} lines={3}>
              {c.title}
            </Txt>
          </View>
        </View>
        <View style={[S.row, { gap: 8, marginTop: 14 }]}>
          <StatusPill kind="acc" text="Enrolled" />
          <Txt s={12} c={C.muted}>
            {c.dur} · {c.price ? xaf(c.price) : 'Free'}
          </Txt>
        </View>
        <View style={{ marginTop: 14 }}>
          <View style={S.rowB}>
            <Txt s={12} c={C.muted}>
              Progress
            </Txt>
            <Txt s={12} w={8}>
              {pct}%
            </Txt>
          </View>
          <View style={{ height: 8, borderRadius: 4, backgroundColor: C.s3, marginTop: 6 }}>
            <View style={{ width: `${pct}%`, height: 8, borderRadius: 4, backgroundColor: C.mint }} />
          </View>
        </View>
      </View>

      {/* next class */}
      <View style={{ marginTop: 14, padding: 18, borderRadius: 26, backgroundColor: live ? C.mint : C.blue }}>
        <View style={S.rowB}>
          <View style={[S.row, { gap: 8 }]}>
            {live ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#e11d48' }} /> : <Icon name="video" size={18} color="#fff" />}
            <Txt s={13} w={8} c={live ? '#000' : '#e3e7ff'}>
              {live ? 'LIVE NOW' : 'Next class'}
            </Txt>
          </View>
          {!live && start ? (
            <Txt s={12} c="#e3e7ff">
              {new Date(start).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </Txt>
          ) : null}
        </View>
        <Txt s={live ? 22 : 34} w={8} c={live ? '#000' : '#fff'} style={{ marginTop: 8 }}>
          {live ? 'Your class has started' : start ? `Starts in ${left(start - now)}` : 'Time to be announced'}
        </Txt>
        <Txt s={13} c={live ? '#1d3b2b' : '#e3e7ff'} style={{ marginTop: 4 }}>
          {lessons[Math.min(done, lessons.length - 1)]}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Btn testID="course-join-class" variant={live ? 'dark' : 'yellow'} icon="video" title={live ? 'Join class' : 'Join when it starts'} disabled={!live} style={{ flex: 1 }} onPress={joinClass} />
        </View>
      </View>

      {/* class group */}
      <Pressable testID="course-join-group" accessibilityRole="button" onPress={() => (tap(), openChat(gid))} style={[S.row, { marginTop: 14, gap: 12, padding: 14, borderRadius: 22, backgroundColor: C.yellow }]}>
        <View style={{ flexDirection: 'row' }}>
          {mates.slice(0, 3).map((m, i) => (
            <Avatar key={m} pic={P(m).photo} size={34} style={{ marginLeft: i ? -10 : 0, borderWidth: 2, borderColor: C.yellow }} />
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Txt s={15} w={8} c="#000">
            Join the class group
          </Txt>
          <Txt s={12} c="#333">
            {mates.length + 1} classmates · links, files and questions
          </Txt>
        </View>
        {th?.unread ? (
          <View style={{ minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
            <Txt s={11} w={8}>
              {th.unread}
            </Txt>
          </View>
        ) : (
          <Icon name="chev" size={20} color="#000" />
        )}
      </Pressable>

      <PTabs style={{ marginTop: 16 }} items={['Lessons', 'Classmates', 'About'].map((x) => [x, x] as [string, string])} value={tab} onChange={setTab} />
      <View style={{ marginTop: 12, gap: 10 }}>
        {tab === 'Lessons' ? (
          <>
            {lessons.map((l, i) => {
              const st = i < done ? 'done' : i === done ? 'next' : 'locked';
              return (
                <View key={l} style={[S.row, { gap: 12, padding: 14, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: st === 'next' ? C.lav : C.line, opacity: st === 'locked' ? 0.6 : 1 }]}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: st === 'done' ? C.mint : st === 'next' ? C.blue : C.s2 }}>
                    <Icon name={st === 'done' ? 'check' : st === 'next' ? 'play' : 'lock'} size={16} color={st === 'done' ? '#000' : '#fff'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt s={14} w={8}>
                      {l}
                    </Txt>
                    <Txt s={12} c={C.muted}>
                      {st === 'done' ? 'Completed' : st === 'next' ? 'Up next' : 'Unlocks after the previous lesson'}
                    </Txt>
                  </View>
                  {st === 'next' ? <Btn small variant="dark" title="Mark done" onPress={finishLesson} /> : null}
                </View>
              );
            })}
            {done >= lessons.length ? (
              <View style={[S.row, { gap: 12, padding: 16, borderRadius: 18, backgroundColor: 'rgba(123,224,167,.14)' }]}>
                <Icon name="cert" size={22} color={C.mint} />
                <Txt s={14} w={8} c={C.mint} style={{ flex: 1 }}>
                  Certificate from {c.prov.n} added to your profile
                </Txt>
              </View>
            ) : null}
          </>
        ) : tab === 'Classmates' ? (
          <View style={{ borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
            {mates.map((m, i) => (
              <View key={m} style={[S.row, { gap: 12, padding: 12, borderBottomWidth: i < mates.length - 1 ? 1 : 0, borderColor: C.line }]}>
                <Avatar pic={P(m).photo} size={40} />
                <View style={{ flex: 1 }}>
                  <Txt s={14} w={8}>
                    {P(m).name}
                  </Txt>
                  <Txt s={12} c={C.muted}>
                    {P(m).role}
                  </Txt>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ padding: 16, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 8 }}>
            <Txt s={16} w={8}>
              What you’ll learn
            </Txt>
            {[...c.skills, `A certificate from ${c.prov.n}`].map((x) => (
              <View key={x} style={[S.row, { gap: 8 }]}>
                <Icon name="check" size={16} color={C.mint} />
                <Txt s={14}>{x}</Txt>
              </View>
            ))}
          </View>
        )}
      </View>
    </Page>
  );
}
