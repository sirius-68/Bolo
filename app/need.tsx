import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyAvoid } from '../src/g/keyboard';
import { tap } from '../src/g/touch';
import { NEEDS, Understood, understand } from '../src/g/data';
import { canListen } from '../src/g/speech';
import { GIcon } from '../src/g/icons';
import { RED, ft, useG } from '../src/g/theme';
import { Big, Round, Screen, T } from '../src/g/ui';

/** "What do you need?" Type it in your own words, or pick an everyday need. */
export default function Need() {
  const t = useG();
  const ins = useSafeAreaInsets();
  const p = useLocalSearchParams<{ q?: string; miss?: string }>();
  const [q, setQ] = useState(typeof p.q === 'string' ? p.q : '');
  // miss=1: what was said out loud matched no kind of worker, so it arrives here to be put another way
  const [miss, setMiss] = useState(p.miss === '1');
  const [busy, setBusy] = useState(false);
  const input = useRef<TextInput>(null);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/find' as any));
  const open = (need: string, trade: string, u?: Understood) =>
    router.push(`/workers?trade=${encodeURIComponent(trade)}&need=${encodeURIComponent(need)}${u?.service ? `&service=${encodeURIComponent(u.service)}` : ''}${u?.when ? `&when=${u.when}` : ''}${u?.budget ? `&budget=${u.budget}` : ''}` as any);
  const find = async () => {
    const text = q.trim();
    if (!text) return input.current?.focus();
    if (busy) return;
    setBusy(true);
    const u = await understand(text);
    setBusy(false);
    if (!u.trade) return setMiss(true);
    open(u.title, u.trade, u);
  };
  return (
    <KeyAvoid style={{ flex: 1, backgroundColor: t.bg }}>
      <Screen style={{ paddingHorizontal: 20, paddingBottom: 28 + ins.bottom }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Round testID="need-close" icon="x" label="Close" onPress={close} />
          {canListen() ? <Round testID="need-say" icon="mic" label="Say it instead" color={t.accent} onPress={() => router.replace('/listen' as any)} /> : null}
        </View>
        <T s={28} w={8} lh={1.15} ls={-0.6} style={{ marginTop: 22, marginBottom: 14 }}>
          What do you need?
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, height: 56, paddingHorizontal: 16, borderRadius: 18, backgroundColor: t.card, borderWidth: 2, borderColor: RED }}>
          <GIcon name="search" size={20} color={t.muted} />
          <TextInput
            ref={input}
            testID="need-input"
            accessibilityLabel="What do you need?"
            value={q}
            onChangeText={(v) => (setQ(v), setMiss(false))}
            placeholder="For example: fix a leaking sink"
            placeholderTextColor={t.muted}
            selectionColor={RED}
            returnKeyType="search"
            onSubmitEditing={() => void find()}
            autoFocus={!q}
            maxLength={120}
            style={[ft(16, 6, t.text), { flex: 1, height: '100%', paddingVertical: 0, lineHeight: undefined }]}
          />
        </View>
        {miss ? (
          <T s={13} w={7} lh={1.45} c={t.accent} style={{ marginTop: 10 }}>
            We’re not sure which kind of worker that is. Try other words, or pick one below.
          </T>
        ) : null}
        <T s={13} w={7} c={t.muted} style={{ marginTop: 22, marginBottom: 4 }}>
          Or pick one
        </T>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {NEEDS.map(([need, trade]) => (
            <Pressable key={need} testID={`need-${trade}`} accessibilityRole="button" onPress={() => (tap(), open(need, trade))} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 58, paddingVertical: 8, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: t.line, opacity: pressed ? 0.6 : 1 })}>
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <T s={15} w={7}>
                  {need}
                </T>
                <T s={13} c={t.muted}>
                  {trade}
                </T>
              </View>
              <GIcon name="chev" size={18} color={t.muted} />
            </Pressable>
          ))}
        </ScrollView>
        <Big testID="need-find" title="Find workers" loading={busy} onPress={() => void find()} style={{ marginTop: 12 }} />
      </Screen>
    </KeyAvoid>
  );
}
