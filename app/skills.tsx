import React from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Btn, Page, Steps, Stepper, Sub, Title, TopBar, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, R } from '../src/ui/theme';
import { EXPLV, lvOf } from '../src/data/catalog';
import { bump, useLive } from '../src/logic/live';
import { saveSkills } from '../src/logic/account';
import { toast } from '../src/ui/overlay';
import { LanguagesEditor, LevelSlider, SK, SkillCard, SkillCombo, draftFromUser, exSummary, freshDraft, openSkillSheet, skAll, skIcon, skOK } from '../src/components/skills';

export default function Skills() {
  useLive();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const edit = mode === 'edit';
  if (!SK.d) SK.d = edit ? draftFromUser() : freshDraft();
  const d = SK.d;
  const e = d.main;
  const ok = skOK(e);
  const ch = () => bump();
  const commit = () => {
    if (!ok) return;
    saveSkills({ main: e, others: d.others, level: d.level, years: d.years, langs: d.langs });
    SK.d = null;
    if (edit) {
      toast('Skills updated');
      router.back();
    } else router.push('/verify-id');
  };
  const sec = (t: string, children: React.ReactNode, small?: string) => (
    <View style={{ marginTop: 26 }}>
      <Txt s={17} w={8} style={{ marginBottom: 12 }}>
        {t}
        {small ? <Txt s={12} w={6} c={C.faint}>  {small}</Txt> : null}
      </Txt>
      {children}
    </View>
  );
  return (
    <Page keyboard bottom={30}>
      <TopBar title={edit ? 'Your skills' : 'Your work'} onBack={() => ((SK.d = edit ? null : SK.d), router.back())} />
      {!edit ? <Steps total={7} on={5} /> : null}
      <Title sm>{edit ? 'Edit your skills' : 'What are your skills?'}</Title>
      <Sub>{edit ? 'Update your main skill, experience, other skills and languages.' : 'Start with the skill you’re best at. Employers and clients find you by these.'}</Sub>
      {sec(
        'Main skill',
        e ? (
          <SkillCard main e={e} onChange={ch} onChangeSkill={() => ((d.main = null), bump())} />
        ) : (
          <SkillCombo taken={skAll(d).map((x) => x.n)} onPick={(x) => ((d.main = x), bump())} />
        ),
      )}
      {sec(
        'Experience',
        <View style={{ gap: 14 }}>
          <LevelSlider
            value={d.level}
            onChange={(i) => {
              const [l, , lo, hi] = EXPLV[i];
              d.level = l;
              if (d.years < lo || (d.years >= hi && hi < 40)) d.years = lo;
              bump();
            }}
          />
          <Stepper
            text={`${d.years} year${d.years === 1 ? '' : 's'}`}
            onMinus={() => ((d.years = Math.max(0, d.years - 1)), (d.level = lvOf(d.years)), bump())}
            onPlus={() => ((d.years = Math.min(40, d.years + 1)), (d.level = lvOf(d.years)), bump())}
          />
        </View>,
      )}
      {sec(
        'Other skills',
        <View style={{ gap: 10 }}>
          {d.others.map((o, i) => (
            <View key={o.n + i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: R.lg, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.s3, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={skIcon(o)} size={18} color={C.yellow} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt s={14} w={8}>
                  {o.n}
                </Txt>
                <Txt s={12} c={C.muted} lines={2}>
                  {o.lv}
                  {exSummary(o) ? ' · ' + exSummary(o) : ''}
                </Txt>
              </View>
              <Pressable accessibilityLabel={`Edit ${o.n}`} hitSlop={6} onPress={() => openSkillSheet(i)}>
                <Icon name="edit" size={18} color={C.muted} />
              </Pressable>
              <Pressable accessibilityLabel={`Remove ${o.n}`} hitSlop={6} onPress={() => (d.others.splice(i, 1), bump())}>
                <Icon name="x" size={18} color={C.muted} />
              </Pressable>
            </View>
          ))}
          <Pressable
            onPress={() => openSkillSheet(-1)}
            style={{ height: 50, borderRadius: R.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.s3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Icon name="plus" size={18} color={C.lav} />
            <Txt s={14} w={7} c={C.lav}>
              Add another skill
            </Txt>
          </Pressable>
        </View>,
        'optional',
      )}
      {sec('Languages', <LanguagesEditor langs={d.langs} onChange={ch} />)}
      <Btn testID="skills-continue" title={edit ? 'Save skills' : 'Continue'} disabled={!ok} style={{ marginTop: 28 }} onPress={commit} />
      {!ok ? (
        <Txt s={12} c={C.muted} center style={{ marginTop: 8 }}>
          {!e ? 'Choose your main skill to continue' : 'Add a name, a field and a short description (20+ characters)'}
        </Txt>
      ) : null}
    </Page>
  );
}
