/* Joining to offer a skill, step 1 of 3: the work you do best. */
import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyAvoid } from '../src/ui/keyboard';
import { CATS } from '../src/data/catalog';
import { GIcon } from '../src/g/icons';
import { RED, ft, useG } from '../src/g/theme';
import { Big, Pill, StepBar, T } from '../src/g/ui';
import { titleOf } from '../src/g/data';
import { tradesLike, workerDraft } from '../src/g/worker';

export default function W1() {
  const t = useG();
  const ins = useSafeAreaInsets();
  const d = workerDraft();
  const [text, setText] = useState(d.skill);
  const q = text.trim();
  const exact = CATS.find(([c]) => c.toLowerCase() === q.toLowerCase())?.[0] || null;
  const list = tradesLike(q);
  const hint = !q || exact ? 'Popular skills' : list.length ? 'Did you mean one of these?' : `Not in our list? No problem. We’ll use “${titleOf(q)}”.`;
  const next = () => {
    if (!q) return;
    d.skill = exact || titleOf(q);
    d.trade = exact;
    router.push('/w2' as any);
  };
  return (
    <KeyAvoid style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flex: 1, paddingTop: ins.top + 16, paddingHorizontal: 20 }}>
        <StepBar on={1} total={3} onBack={() => (router.canGoBack() ? router.back() : router.replace('/wland' as any))} />
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
        <Big testID="w1-continue" title={q ? 'Continue' : 'Type or pick your skill'} disabled={!q} onPress={next} style={{ marginBottom: ins.bottom + 28, marginTop: 8 }} />
      </View>
    </KeyAvoid>
  );
}
