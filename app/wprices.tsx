/* Your prices: a starting price for each thing you do. Clients see them before they call. */
import React, { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, Service } from '../src/data/db';
import { SERVICES } from '../src/data/catalog';
import { bump } from '../src/logic/live';
import { uuid } from '../src/logic/server';
import { GIcon } from '../src/g/icons';
import { KeyAvoid } from '../src/g/keyboard';
import { toast } from '../src/g/notice';
import { SwitchCard, Top } from '../src/g/parts';
import { RED, ft, useG } from '../src/g/theme';
import { goBack, tap } from '../src/g/touch';
import { Big, T } from '../src/g/ui';

type Line = { id: string; skill: string; price: string; fresh?: boolean };

export default function WPrices() {
  const t = useG();
  const ins = useSafeAreaInsets();
  const trade = db.user.skills[0] || '';
  const [lines, setLines] = useState<Line[]>(() => {
    const mine = (db.PR.services || []).filter((s) => s && s.skill && !s.draft).map((s) => ({ id: s.id, skill: s.skill, price: +s.price ? String(+s.price) : '' }));
    if (mine.length) return mine;
    // nothing yet: the usual jobs of the trade, with empty prices to fill in
    const usual = (SERVICES[trade] || []).slice(0, 3).map(([name]) => ({ id: uuid(), skill: name, price: '' }));
    return usual.length ? usual : [{ id: uuid(), skill: '', price: '', fresh: true }];
  });
  const [afterSee, setAfterSee] = useState(!!(db.PR.area as any)?.afterSee);
  const set = (id: string, patch: Partial<Line>) => setLines((L) => L.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const save = () => {
    const keep = lines.filter((x) => x.skill.trim());
    const old = db.PR.services || [];
    db.PR.services = keep.map((x): Service => {
      const was = old.find((s) => s.id === x.id);
      return { ...(was || { unit: 'job', where: '', desc: '', boost: 0 }), id: x.id, skill: x.skill.trim(), price: +x.price || 0, pub: true, draft: false } as Service;
    });
    db.PR.area = { ...db.PR.area, afterSee } as any;
    bump();
    toast('Prices saved');
    goBack();
  };
  return (
    <KeyAvoid style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flex: 1, paddingTop: ins.top + 16, paddingBottom: ins.bottom + 28 }}>
        <Top />
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <T s={28} w={8} ls={-0.6} style={{ marginTop: 22, marginBottom: 6 }}>
            Your prices
          </T>
          <T s={15} lh={1.5} c="muted" style={{ marginBottom: 14 }}>
            Clients see these before they call. Give a starting price; you agree the final price together.
          </T>
          {lines.map((x, i) => (
            <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 68, borderBottomWidth: 1, borderBottomColor: t.line }}>
              <TextInput
                testID={`wprice-name-${i}`}
                accessibilityLabel="What you do"
                value={x.skill}
                onChangeText={(v) => set(x.id, { skill: v })}
                placeholder="What you do"
                placeholderTextColor={t.muted}
                selectionColor={RED}
                autoFocus={!!x.fresh}
                maxLength={40}
                maxFontSizeMultiplier={1.3}
                style={[ft(15, 7, t.text), { flex: 1, minWidth: 0, height: 44, paddingVertical: 0, lineHeight: undefined }]}
              />
              <T s={13} c="muted">
                from
              </T>
              <TextInput
                testID={`wprice-${i}`}
                accessibilityLabel={`Starting price for ${x.skill || 'this service'}, in FCFA`}
                value={x.price ? (+x.price).toLocaleString('en-US') : ''}
                onChangeText={(v) => set(x.id, { price: v.replace(/[^\d]/g, '').slice(0, 8) })}
                placeholder="0"
                placeholderTextColor={t.muted}
                selectionColor={RED}
                keyboardType="number-pad"
                maxFontSizeMultiplier={1.3}
                style={[ft(16, 8, t.text), { width: 96, height: 44, paddingHorizontal: 12, paddingVertical: 0, borderRadius: 14, borderWidth: 1, borderColor: t.line, backgroundColor: t.card, textAlign: 'right', lineHeight: undefined }]}
              />
              <T s={13} w={7} c="muted">
                FCFA
              </T>
            </View>
          ))}
          <Pressable testID="wprice-add" accessibilityRole="button" onPress={() => (tap(), setLines((L) => [...L, { id: uuid(), skill: '', price: '', fresh: true }]))} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingHorizontal: 2, alignSelf: 'flex-start' }}>
            <GIcon name="plus" size={20} color={t.accent} />
            <T s={15} w={8} c="accent">
              Add a service
            </T>
          </Pressable>
          <SwitchCard testID="wprice-after" title="I give my price after seeing the job" sub="Clients see “price after a look”" on={afterSee} onChange={setAfterSee} style={{ marginTop: 8 }} />
        </ScrollView>
        <Big testID="wprice-save" title="Save prices" onPress={save} style={{ marginHorizontal: 20 }} />
      </View>
    </KeyAvoid>
  );
}
