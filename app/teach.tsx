import React from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { db } from '../src/data/db';
import { Btn, Page, TopBar, Txt, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { isW, mySkill, xaf } from '../src/logic/core';
import { useLive } from '../src/logic/live';
import { tutorCourses } from '../src/logic/career';
import { openCourse, openOppForm } from '../src/sheets/career';
import { openEdit } from '../src/sheets/account';
import { bizOnlyPrompt } from '../src/sheets/account';

/** Teach on bolo: anyone with a skill (tailoring, plumbing, coding, baking…) can run a course. */
export default function Teach() {
  useLive();
  const mine = tutorCourses();
  const students = mine.reduce((n, c) => n + (c.people || []).length, 0);
  const earned = mine.reduce((n, c) => n + (c.people || []).length * c.price, 0);
  const checks: [boolean, string, string, () => void][] = [
    [!!db.user.name && !!db.user.avatar, 'Name and photo on your profile', 'Students want to see who teaches them', openEdit],
    [db.PR.docs.id === 'verified', 'Verified ID', 'Verified tutors get a badge and more students', () => router.push('/id-verify')],
    [!!db.user.skills?.length || !!mySkill(), `A skill you’re good at`, mySkill() ? `${mySkill()}. You can teach anything you know well` : 'Add your main skill', () => router.push('/skills?mode=edit' as any)],
  ];
  const create = () => (tap(), isW() ? openOppForm('Course') : bizOnlyPrompt('teach'));
  return (
    <Page header={<TopBar title="Teach on bolo" />} bottom={32}>
      {/* hero */}
      <View style={{ marginTop: 6, padding: 20, borderRadius: 28, backgroundColor: C.lav }}>
        <View style={[S.row, { gap: 8 }]}>
          {(['cat-tailor', 'cat-plumber', 'cat-dev', 'cat-cook'] as const).map((i, k) => (
            <View key={i} style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: ['#000', C.yellow, C.blue, C.orange][k], alignItems: 'center', justifyContent: 'center', transform: [{ rotate: `${(k - 1.5) * 6}deg` }] }}>
              <Icon name={i} size={20} color={k === 0 ? C.lav : k === 2 ? '#fff' : '#000'} />
            </View>
          ))}
        </View>
        <Txt s={28} w={8} c="#000" style={{ marginTop: 16, lineHeight: 32 }}>
          Teach what you know.{'\n'}Get paid for it.
        </Txt>
        <Txt s={14} c="#26294a" style={{ marginTop: 8 }}>
          Tailors, plumbers, developers, bakers: run short courses with live classes and a class group. Fees go straight to your wallet.
        </Txt>
        <Pressable testID="teach-create" accessibilityRole="button" onPress={create} style={({ pressed }) => [S.rowB, { marginTop: 18, height: 58, paddingLeft: 20, paddingRight: 7, borderRadius: 29, backgroundColor: '#000', transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <Txt s={16} w={8}>
            {mine.length ? 'Create another course' : 'Create your first course'}
          </Txt>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.lav, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="arrow" size={20} color="#000" />
          </View>
        </Pressable>
      </View>

      {/* your courses */}
      {mine.length ? (
        <>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
            {(
              [
                [mine.length, 'Courses'],
                [students, 'Students'],
                [earned ? xaf(earned) : 'XAF 0', 'Earned'],
              ] as [string | number, string][]
            ).map(([v, l]) => (
              <View key={l} style={{ flex: 1, padding: 12, borderRadius: 18, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
                <Txt s={17} w={8} lines={1}>
                  {v}
                </Txt>
                <Txt s={11} c={C.muted}>
                  {l}
                </Txt>
              </View>
            ))}
          </View>
          <Head t="Your courses" />
          <View style={{ gap: 8 }}>
            {mine.map((c) => (
              <Pressable key={c.id} accessibilityRole="button" onPress={() => (tap(), openCourse(c.id))} style={({ pressed }) => [S.row, { gap: 12, padding: 12, borderRadius: 20, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }]}>
                <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="cap" size={22} color="#000" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Txt s={14} w={8} lines={1}>
                    {c.title}
                  </Txt>
                  <Txt s={12} c={C.muted}>
                    {(c.people || []).length} student{(c.people || []).length === 1 ? '' : 's'} · {c.price ? xaf(c.price) : 'Free'} · {c.dur}
                  </Txt>
                </View>
                <Txt s={12} w={8} c={C.lav}>
                  Manage
                </Txt>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {/* how it works */}
      <Head t="How it works" />
      <View style={{ gap: 10 }}>
        {(
          [
            ['edit', C.yellow, 'Create your course', 'Title, what people learn, price (or free) and how many places. Takes 2 minutes.'],
            ['follow', C.mint, 'Students enrol', 'They join your class group, where you share links, files and answer questions.'],
            ['video', C.orange, 'Teach live, get paid', 'Run live classes in the app. Paid course fees go to your wallet.'],
          ] as [string, string, string, string][]
        ).map(([i, bg, t, d], k) => (
          <View key={t} style={[S.row, { gap: 12, padding: 14, borderRadius: 20, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, alignItems: 'flex-start' }]}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={i} size={19} color="#000" />
            </View>
            <View style={{ flex: 1 }}>
              <Txt s={15} w={8}>
                {k + 1}. {t}
              </Txt>
              <Txt s={13} c={C.muted}>
                {d}
              </Txt>
            </View>
          </View>
        ))}
      </View>

      {/* readiness */}
      <Head t="Get ready to teach" />
      <View style={{ borderRadius: 22, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }}>
        {checks.map(([ok, t, d, fix], i) => (
          <Pressable key={t} accessibilityRole="button" disabled={ok} onPress={fix} style={[S.row, { gap: 12, padding: 14, borderBottomWidth: i < checks.length - 1 ? 1 : 0, borderColor: C.line }]}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: ok ? C.mint : C.s2, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={ok ? 'check' : 'plus'} size={14} color={ok ? '#000' : C.yellow} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt s={14} w={7}>
                {t}
              </Txt>
              <Txt s={12} c={C.muted}>
                {d}
              </Txt>
            </View>
            {!ok ? (
              <Txt s={12} w={8} c={C.yellow}>
                Add
              </Txt>
            ) : null}
          </Pressable>
        ))}
      </View>
      <Txt s={12} c={C.faint} style={{ marginTop: 10 }}>
        You can publish now; these just help you get more students.
      </Txt>
      <Btn variant="yellow" icon="cap" title={mine.length ? 'Create another course' : 'Create your first course'} style={{ marginTop: 18 }} onPress={create} />
    </Page>
  );
}
function Head({ t }: { t: string }) {
  return (
    <Txt s={18} w={8} style={{ marginTop: 24, marginBottom: 10 }}>
      {t}
    </Txt>
  );
}
