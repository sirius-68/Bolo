/* Joining to offer a skill, step 1 of 3: the work you do best. */
import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyAvoid } from '../src/g/keyboard';
import { CATS } from '../src/data/catalog';
import { GIcon } from '../src/g/icons';
import { RED, ft, useG } from '../src/g/theme';
import { Big, Pill, StepBar, T } from '../src/g/ui';
import { Top } from '../src/g/parts';
import { titleOf } from '../src/g/data';
import { applyWorkerDraft, tradesLike, workerDraft } from '../src/g/worker';
import { db } from '../src/data/db';
import { goBack } from '../src/g/touch';

export default function W1() {
  const t = useG();
  const ins = useSafeAreaInsets();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const d = workerDraft();
  const [text, setText] = useState(edit ? db.user.skills[0] || '' : d.skill);
  const q = text.trim();
  const exact = CATS.find(([c]) => c.toLowerCase() === q.toLowerCase())?.[0] || null;
  const list = tradesLike(q);
  const hint = !q || exact ? 'Popular skills' : list.length ? 'Did you mean one of these?' : `Not in our list? No problem. We’ll use “${titleOf(q)}”.`;
  // at least three letters, so "Dr" can't slip through as a skill
  const ok = q.length >= 3;
  const next = () => {
    if (!ok) return;
    d.skill = exact || titleOf(q);
    d.trade = exact;
    if (edit) {
      // changing the main skill from the profile: how you work stays as it is
      const a = (db.PR.area || {}) as any;
      d.ways = Array.isArray(a.ways) && a.ways.length ? a.ways : ['go'];
      d.range = Number(a.radius) >= 50 ? 0 : Number(a.radius) || 5;
      applyWorkerDraft();
      return goBack();
    }
    router.push('/w2' as any);
  };
  return (
    <KeyAvoid style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flex: 1, paddingTop: ins.top + 16, paddingHorizontal: 20 }}>
        {edit ? <Top pad={0} /> : <StepBar on={1} total={3} onBack={() => (router.canGoBack() ? router.back() : router.replace('/wland' as any))} />}
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 16 }}>
          <T s={28} w={8} lh={1.15} ls={-0.6} style={{ marginTop: 26, marginBottom: 6 }}>
            What’s your main skill?
          </T>
          <T s={15} lh={1.45} c={t.muted} style={{ marginBottom: 16 }}>
            Type the work you do best, or tap one below. You can add other skills later.
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 56, paddingHorizontal: 16, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
            <GIcon name="search" size={20} color={t.muted} />
            <TextInput
              testID="w1-input"
              accessibilityLabel="Your main skill"
              value={text}
              onChangeText={setText}
              placeholder="e.g. driver, nurse, baker"
              placeholderTextColor={t.muted}
              selectionColor={RED}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={next}
              maxLength={40}
              maxFontSizeMultiplier={1.3}
              style={[ft(17, 7, t.text), { flex: 1, minWidth: 0, height: 56, paddingVertical: 0, lineHeight: undefined }]}
            />
          </View>
          <T s={13} w={7} c={t.muted} style={{ marginTop: 20, marginBottom: 10 }}>
            {hint}
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {list.map((c) => (
              <Pill key={c} testID={`w1-${c}`} label={c} on={exact === c} onPress={() => setText(exact === c ? '' : c)} />
            ))}
          </View>
        </ScrollView>
        <Big testID="w1-continue" title={ok ? (edit ? 'Save' : 'Continue') : q ? 'A little more…' : 'Type or pick your skill'} quiet={!ok} onPress={next} style={{ marginBottom: ins.bottom + 28, marginTop: 8 }} />
      </View>
    </KeyAvoid>
  );
}
