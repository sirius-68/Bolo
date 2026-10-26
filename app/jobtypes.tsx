import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Btn, Chip, Chips, Empty, Input, Label, Page, Steps, Sub, Title, TopBar, Txt, tap } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, R } from '../src/ui/theme';
import { AREAS, WORKSTYLE } from '../src/data/catalog';
import { db } from '../src/data/db';
import { bump, useLive } from '../src/logic/live';
import { toggle } from '../src/logic/core';
import { SK, freshDraft } from '../src/components/skills';

export default function JobTypes() {
  useLive();
  const [q, setQ] = useState('');
  const ql = q.toLowerCase().trim();
  const sel = db.user.jobTypes;
  const L = AREAS.filter(([a, , , ex, sk]) => !ql || a.toLowerCase().includes(ql) || ex.toLowerCase().includes(ql) || sk.some((s) => s[0].toLowerCase().includes(ql)));
  return (
    <Page keyboard bottom={110}>
      <TopBar title="Your work" />
      <Steps total={7} on={4} />
      <Title sm>What do you do?</Title>
      <Sub>Pick everything you can be hired for — trades, crafts, office jobs, gigs or remote work. We’ll send you matching jobs and clients.</Sub>
      <Input value={q} onChangeText={setQ} icon="search" placeholder="Search — e.g. tailoring, plumbing, driving, design" style={{ marginTop: 20 }} autoCapitalize="none" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 10, marginHorizontal: 4 }}>
        <Txt s={12} w={6} c={C.muted}>
          All kinds of work
        </Txt>
        {sel.length ? (
          <Txt s={12} w={8} c={C.yellow}>
            {sel.length} selected
          </Txt>
        ) : null}
      </View>
      {L.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {L.map(([a, i, , ex]) => {
            const on = sel.includes(a);
            return (
              <Pressable
                key={a}
                testID={`jt-${a}`}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  tap();
                  toggle(sel, a);
                  bump();
                }}
                style={{ width: '48%', flexGrow: 1, minHeight: 112, padding: 14, borderRadius: R.lg, backgroundColor: on ? C.blue : C.s1, borderWidth: 1.5, borderColor: on ? C.lav : C.line }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: on ? 'rgba(255,255,255,.18)' : C.s2, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={i} size={20} color={on ? '#fff' : C.yellow} />
                </View>
                <Txt s={14} w={8} style={{ marginTop: 10 }}>
                  {a}
                </Txt>
                <Txt s={11} c={on ? 'rgba(255,255,255,.8)' : C.muted} lines={2}>
                  {ex}
                </Txt>
                {on ? (
                  <View style={{ position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={13} color="#000" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Empty title={`Nothing matches “${q}”`} text="You can add any skill on the next step." />
      )}
      <View style={{ marginTop: 24 }}>
        <Label>How do you want to work? · optional</Label>
        <Chips>
          {WORKSTYLE.map((w) => (
            <Chip key={w} small label={w} on={db.user.workTypes.includes(w)} onPress={() => (toggle(db.user.workTypes, w), bump())} />
          ))}
        </Chips>
      </View>
      <Btn
        testID="jt-continue"
        title={sel.length ? `Continue · ${sel.length} selected` : 'Pick at least one'}
        disabled={!sel.length}
        style={{ marginTop: 26 }}
        onPress={() => {
          SK.mode = 'onboard';
          if (!SK.d) SK.d = freshDraft();
          router.push('/skills');
        }}
      />
    </Page>
  );
}
