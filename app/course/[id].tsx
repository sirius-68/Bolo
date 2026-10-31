import React, { useEffect, useState } from 'react';
import { Pressable, Share, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, Course } from '../../src/data/db';
import { Avatar, Bar, Btn, Empty, IconBtn, OptRow, PTabs, Page, TopBar, Txt, goBack, tap } from '../../src/ui/kit';
import { Icon } from '../../src/ui/Icon';
import { C, S } from '../../src/ui/theme';
import { bump, useLive } from '../../src/logic/live';
import { classWhen, ensureClassTime, isLive, learnerGroup, leaveCourse, lessonMin, lessonsOf, timeLeft } from '../../src/logic/career';
import { openChat } from '../../src/sheets/chat';
import { openCourse } from '../../src/sheets/career';
import { afterSheet, confirm, sheet, toast } from '../../src/ui/overlay';
import { CourseWelcome, needsCourseWelcome } from '../../src/components/CourseWelcome';

const two = (n: number) => String(n).padStart(2, '0');

/** A course you've enrolled in. Order of importance: what to do next (continue / join the live class), the class group, then the lesson plan. */
export default function CoursePage() {
  useLive();
  const ins = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = db.COURSES.find((x) => x.id === id);
  const enrolled = !!c && db.myLearning.includes(c.id);
  const [tab, setTab] = useState<'lessons' | 'about'>('lessons');
  const [now, setNow] = useState(Date.now());
  const [intro, setIntro] = useState(needsCourseWelcome());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (c && enrolled && ensureClassTime(c)) bump();
    if (c && !enrolled) {
      // Not enrolled: the details sheet (with Enroll) is the right place.
      router.back();
      setTimeout(() => openCourse(c.id), 250);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!c)
    return (
      <Page header={<TopBar title="Course" />}>
        <Empty title="Course not found" text="It may have been removed by the trainer." />
      </Page>
    );
  if (!enrolled) return null;

  const lessons = lessonsOf(c);
  const done = Math.min(c.done || 0, lessons.length);
  const complete = done >= lessons.length;
  const pct = Math.round((done / lessons.length) * 100);
  const start = c.startAt || 0;
  const live = isLive(c, now);
  const gid = learnerGroup(c);
  const th = db.THREADS_W[gid];
  const nextI = Math.min(done, lessons.length - 1);

  const share = () => {
    tap();
    Share.share({ message: `I’m learning “${c.title}” with ${c.prov.n} on bolo. Join me: https://bolo.app/c/${c.id}` }).catch(() => {});
  };
  const menu = () =>
    sheet.show(() => (
      <View>
        <OptRow icon="chat" title="Open class group" onPress={() => afterSheet(() => openChat(gid))} />
        <OptRow icon="share" title="Share course" onPress={() => (sheet.close(), share())} />
        <OptRow
          icon="logout"
          bg={C.errSoft}
          danger
          chev={false}
          title="Leave course"
          onPress={() =>
            confirm({
              title: 'Leave this course?',
              text: 'Your progress is cleared. You can enroll again later.',
              ok: 'Leave course',
              danger: true,
              icon: 'logout',
              onOk: () => (leaveCourse(c.id), goBack()),
            })
          }
        />
      </View>
    ));

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Page
        header={
          <TopBar
            right={
              <View style={[S.row, { gap: 8 }]}>
                <IconBtn name="share" label="Share course" onPress={share} />
                <IconBtn name="dots" label="Course options" onPress={menu} testID="course-menu" />
              </View>
            }
          />
        }
        bottom={32}
      >
        {/* title block */}
        <View style={[S.row, { gap: 8, marginTop: 6 }]}>
          <Avatar pic={c.prov.logo} square size={22} />
          <Txt s={13} c={C.muted} lines={1} style={{ flex: 1 }}>
            By {c.prov.n}
          </Txt>
        </View>
        <Txt s={30} w={8} style={{ marginTop: 8, lineHeight: 34 }}>
          {c.title}
        </Txt>
        <View style={[S.row, { gap: 6, marginTop: 14, flexWrap: 'wrap' }]}>
          <Chip bg={C.yellow} fg="#000" text={`${lessons.length} lessons`} />
          <Chip bg={C.s2} fg={C.text} icon="clock" text={c.dur} />
          <Chip bg={C.s2} fg={C.text} icon="globe" text={c.fmt === 'Offline' ? 'In person' : 'Online'} />
        </View>

        {/* what to do next */}
        <View style={{ marginTop: 22 }}>
          {!complete && nextI + 1 < lessons.length ? (
            <View style={{ marginHorizontal: 10, paddingTop: 10, paddingBottom: 30, paddingHorizontal: 16, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: C.s2, marginBottom: -22 }}>
              <View style={{ alignSelf: 'center', width: 28, height: 4, borderRadius: 2, backgroundColor: C.s3, marginBottom: 8 }} />
              <Txt s={11} w={7} c={C.muted}>
                THEN · LESSON {nextI + 2}
              </Txt>
              <Txt s={14} w={7} lines={1}>
                {lessons[nextI + 1]}
              </Txt>
            </View>
          ) : null}
          <View style={{ borderRadius: 26, backgroundColor: complete ? C.mint : C.blue, padding: 16 }}>
            <View style={{ alignSelf: 'center', width: 28, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.35)', marginBottom: 10 }} />
            <View style={S.rowB}>
              <Txt s={11} w={8} c={complete ? '#1d3b2b' : '#e3e7ff'}>
                {complete ? 'COURSE COMPLETE' : `LESSON ${nextI + 1} OF ${lessons.length}`}
              </Txt>
              <Txt s={11} w={8} c={complete ? '#1d3b2b' : '#e3e7ff'}>
                {pct}% done
              </Txt>
            </View>
            <Txt s={22} w={8} c={complete ? '#000' : '#fff'} style={{ marginTop: 6 }} lines={2}>
              {complete ? `Certificate from ${c.prov.n}` : lessons[nextI]}
            </Txt>
            <Bar pct={pct} h={5} color={complete ? '#000' : C.yellow} bg={complete ? 'rgba(0,0,0,.15)' : 'rgba(255,255,255,.22)'} style={{ marginTop: 12 }} />
            <Pressable
              testID="course-continue"
              accessibilityRole="button"
              onPress={() => (tap(), complete ? toast('Your certificate is on your profile') : openLesson(c, nextI))}
              style={({ pressed }) => [S.rowB, { marginTop: 14, height: 64, paddingLeft: 18, paddingRight: 8, borderRadius: 20, backgroundColor: '#fff', transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <Txt s={16} w={8} c="#000">
                {complete ? 'View certificate' : done ? 'Continue lesson' : 'Start first lesson'}
              </Txt>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={complete ? 'cert' : 'playfill'} size={20} color="#fff" />
              </View>
            </Pressable>
          </View>
        </View>

        {/* live class */}
        <View testID="course-live" style={[S.row, { gap: 12, marginTop: 12, padding: 12, borderRadius: 22, backgroundColor: live ? 'rgba(123,224,167,.12)' : C.s1, borderWidth: 1, borderColor: live ? C.mint : C.line }]}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: live ? '#e11d48' : C.s2, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="video" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt s={14} w={8}>
              {live ? 'Live class is on now' : 'Next live class'}
            </Txt>
            <Txt s={12} c={C.muted} lines={1}>
              {live ? lessons[nextI] : start ? classWhen(start) : 'Time coming soon'}
            </Txt>
          </View>
          {live ? (
            <Btn testID="course-join-class" small variant="yellow" icon="video" title="Join" onPress={() => (tap(), router.push({ pathname: '/call', params: { id: gid, type: 'video' } } as any))} />
          ) : start ? (
            <View testID="course-countdown" style={{ paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: C.s2, justifyContent: 'center' }}>
              <Txt s={12} w={8} c={C.yellow}>
                in {timeLeft(start - now)}
              </Txt>
            </View>
          ) : null}
        </View>

        {/* class group (no member list here: classmates stay private) */}
        <Pressable testID="course-join-group" accessibilityRole="button" onPress={() => (tap(), openChat(gid))} style={({ pressed }) => [S.row, { gap: 12, marginTop: 8, padding: 12, borderRadius: 22, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.lav, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chat" size={20} color="#000" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Txt s={14} w={8}>
              Class group
            </Txt>
            <Txt s={12} c={C.muted} lines={1}>
              {th?.msgs?.length ? 'Lesson links, files and questions' : 'Ask the trainer anything'}
            </Txt>
          </View>
          {th?.unread ? (
            <View style={{ minWidth: 24, height: 24, borderRadius: 12, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 }}>
              <Txt s={12} w={8} c="#000">
                {th.unread}
              </Txt>
            </View>
          ) : (
            <Icon name="chev" size={18} color={C.muted} />
          )}
        </Pressable>

        <PTabs
          style={{ marginTop: 22 }}
          items={[
            ['lessons', 'Lessons', lessons.length],
            ['about', 'About'],
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === 'lessons' ? (
          <View style={{ marginTop: 12, gap: 8 }}>
            {lessons.map((l, i) => {
              const st = i < done ? 'done' : i === done ? 'next' : 'locked';
              return (
                <Pressable
                  key={l + i}
                  testID={`lesson-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Lesson ${i + 1}, ${l}, ${st === 'done' ? 'completed' : st === 'next' ? 'up next' : 'locked'}`}
                  onPress={() => (tap(), st === 'locked' ? toast(`Finish lesson ${done + 1} first`) : openLesson(c, i))}
                  style={({ pressed }) => [S.row, { gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: st === 'next' ? C.blue : C.line }]}
                >
                  <Txt s={13} w={8} c={st === 'locked' ? C.faint : C.muted} style={{ width: 22 }}>
                    {two(i + 1)}
                  </Txt>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt s={14} w={7} c={st === 'locked' ? C.muted : C.text} lines={1}>
                      {l}
                    </Txt>
                    <Txt s={12} c={C.muted}>
                      {lessonMin(c, i)} min{st === 'done' ? ' · done' : st === 'next' ? ' · up next' : ''}
                    </Txt>
                  </View>
                  <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: st === 'done' ? C.mint : st === 'next' ? C.yellow : C.s2 }}>
                    <Icon name={st === 'done' ? 'check' : st === 'next' ? 'playfill' : 'lock'} size={15} color={st === 'locked' ? C.muted : '#000'} />
                  </View>
                </Pressable>
              );
            })}
            <View style={[S.row, { gap: 12, marginTop: 4, padding: 16, borderRadius: 22, backgroundColor: complete ? C.mint : C.blue }]}>
              <View style={{ flex: 1 }}>
                <Txt s={15} w={8} c={complete ? '#000' : '#fff'}>
                  {complete ? 'Certificate earned' : 'Unlock your certificate'}
                </Txt>
                <Txt s={12} c={complete ? '#1d3b2b' : '#e3e7ff'}>
                  {complete ? `From ${c.prov.n}, shown on your profile and CV` : `Finish ${lessons.length - done} more lesson${lessons.length - done === 1 ? '' : 's'}. It goes on your profile and CV.`}
                </Txt>
              </View>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={complete ? 'cert' : 'lock'} size={20} color="#000" />
              </View>
            </View>
          </View>
        ) : (
          <View style={{ marginTop: 12, gap: 8 }}>
            <View style={{ padding: 16, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, gap: 10 }}>
              <Txt s={15} w={8}>
                What you’ll learn
              </Txt>
              {c.skills.map((x) => (
                <View key={x} style={[S.row, { gap: 10 }]}>
                  <Icon name="check" size={16} color={C.mint} />
                  <Txt s={14} style={{ flex: 1 }}>
                    {x}
                  </Txt>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                ['Level', c.lv === 'Beginner' ? 'From zero' : 'Advanced'],
                ['Length', c.dur],
                ['Price', c.price ? 'Paid' : 'Free'],
              ].map(([k, v]) => (
                <View key={k} style={{ flex: 1, padding: 12, borderRadius: 16, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
                  <Txt s={11} c={C.muted}>
                    {k}
                  </Txt>
                  <Txt s={14} w={8} lines={1}>
                    {v}
                  </Txt>
                </View>
              ))}
            </View>
            {c.prof ? (
              <View style={[S.row, { gap: 10, padding: 14, borderRadius: 16, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }]}>
                <Icon name="job" size={18} color={C.yellow} />
                <Txt s={13} style={{ flex: 1 }}>
                  Prepares you to work as a {c.prof.toLowerCase()}
                </Txt>
              </View>
            ) : null}
          </View>
        )}
        <View style={{ height: ins.bottom }} />
      </Page>
      {intro ? <CourseWelcome onDone={() => setIntro(false)} /> : null}
    </View>
  );
}

function Chip({ bg, fg, text, icon }: { bg: string; fg: string; text: string; icon?: string }) {
  return (
    <View style={[S.row, { gap: 6, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: bg }]}>
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <Txt s={12} w={8} c={fg}>
        {text}
      </Txt>
    </View>
  );
}

/** One lesson: recording, what it covers, mark as done. */
function openLesson(c: Course, i: number) {
  sheet.show(() => <LessonSheet c={c} i={i} />, { tag: 'lesson:' + c.id + i });
}
function LessonSheet({ c, i }: { c: Course; i: number }) {
  useLive();
  const lessons = lessonsOf(c);
  const isDone = i < (c.done || 0);
  const last = i === lessons.length - 1;
  const finish = () => {
    c.done = Math.min(lessons.length, Math.max(c.done || 0, i + 1));
    bump();
    sheet.close();
    toast(c.done >= lessons.length ? 'Course complete! Your certificate is on your profile' : `Lesson ${i + 1} done. Lesson ${i + 2} is unlocked`);
  };
  return (
    <View style={{ gap: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Play recording" onPress={() => (tap(), toast('The recording is posted after the live class'))}>
        <LinearGradient colors={['#3d5af1', '#1b2a9b']} style={{ height: 180, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="playfill" size={26} color="#000" />
          </View>
          <View style={{ position: 'absolute', right: 12, bottom: 12, paddingHorizontal: 8, height: 24, borderRadius: 8, backgroundColor: 'rgba(0,0,0,.45)', justifyContent: 'center' }}>
            <Txt s={11} w={8}>
              {lessonMin(c, i)}:00
            </Txt>
          </View>
        </LinearGradient>
      </Pressable>
      <View>
        <Txt s={12} w={7} c={C.muted}>
          LESSON {i + 1} OF {lessons.length}
        </Txt>
        <Txt s={20} w={8}>
          {lessons[i]}
        </Txt>
        <Txt s={13} c={C.muted} style={{ marginTop: 4 }}>
          {last ? 'Put everything together in a small project. Share it in the class group for feedback.' : 'Watch the recording or join the live class. Ask questions in the class group.'}
        </Txt>
      </View>
      {isDone ? (
        <View style={[S.row, { gap: 8, padding: 14, borderRadius: 16, backgroundColor: 'rgba(123,224,167,.14)' }]}>
          <Icon name="check" size={18} color={C.mint} />
          <Txt s={14} w={7} c={C.mint}>
            You finished this lesson
          </Txt>
        </View>
      ) : (
        <Btn testID="lesson-done" variant="yellow" icon="check" title={last ? 'Finish course' : 'Mark as done'} onPress={finish} />
      )}
      <Btn variant="dark" icon="chat" title="Ask in class group" onPress={() => afterSheet(() => openChat(learnerGroup(c)))} />
    </View>
  );
}
