/* Your services: under your main skill, the things you do, each with a starting price if you like.
   Every service belongs to the skill: the list is getit's for that skill, and one you add in your own words is
   checked against it. Clients looking for one of your services are sent to you first, and ratings are per service. */
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db, Service } from '../src/data/db';
import { bump } from '../src/logic/live';
import { mySkill } from '../src/logic/core';
import { uuid } from '../src/logic/server';
import { GIcon } from '../src/g/icons';
import { KeyAvoid } from '../src/g/keyboard';
import { toast } from '../src/g/notice';
import { SwitchCard, Top } from '../src/g/parts';
import { fitsSkill, servicesOf } from '../src/g/services';
import { RED, ft, useG } from '../src/g/theme';
import { goBack, tap } from '../src/g/touch';
import { Big, Link, T } from '../src/g/ui';

type Line = { id: string; name: string; price: string; on: boolean; own?: boolean };
export const MAX_SERVICES = 12;

export default function WPrices() {
  const t = useG();
  const ins = useSafeAreaInsets();
  const trade = db.user.skills[0] || '';
  const skill = mySkill() || trade;
  const [lines, setLines] = useState<Line[]>(() => {
    const mine = (db.PR.services || []).filter((s) => s && s.skill && !s.draft);
    const std = servicesOf(trade);
    const price = (s?: Service) => (s && +s.price ? String(+s.price) : '');
    const find = (name: string) => mine.find((s) => s.skill.toLowerCase() === name.toLowerCase());
    return [
      ...std.map((name): Line => ({ id: find(name)?.id || uuid(), name, price: price(find(name)), on: !!find(name) })),
      // services saved earlier in their own words stay, marked as their own
      ...mine.filter((s) => !std.some((n) => n.toLowerCase() === s.skill.toLowerCase())).map((s): Line => ({ id: s.id, name: s.skill, price: price(s), on: true, own: true })),
    ];
  });
  const [afterSee, setAfterSee] = useState(!!(db.PR.area as any)?.afterSee);
  const [add, setAdd] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (id: string, patch: Partial<Line>) => setLines((L) => L.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const picked = lines.filter((x) => x.on);
  const toggle = (x: Line) => {
    tap();
    if (!x.on && picked.length >= MAX_SERVICES) return toast(`${MAX_SERVICES} services is the most. Untick one first`);
    if (x.own) return setLines((L) => L.filter((y) => y.id !== x.id));
    set(x.id, { on: !x.on });
  };
  const addOwn = async () => {
    const name = add.trim().replace(/\s+/g, ' ');
    if (busy || name.length < 3) return;
    if (picked.length >= MAX_SERVICES) return setErr(`${MAX_SERVICES} services is the most. Untick one first.`);
    const same = lines.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (same) return set(same.id, { on: true }), setAdd(''), setErr('');
    setBusy(true);
    setErr('');
    const r = await fitsSkill(trade, name);
    setBusy(false);
    // every service must be part of the main skill: this one isn't
    if (!r.ok)
      return setErr(
        r.other
          ? `“${name}” looks like ${r.other.toLowerCase()} work, not ${skill.toLowerCase()} work. Your services must be part of your main skill. To offer it, change your main skill.`
          : `“${name}” doesn’t look like ${skill.toLowerCase()} work. Your services must be part of your main skill.`,
      );
    setLines((L) => [...L, { id: uuid(), name: name.charAt(0).toUpperCase() + name.slice(1), price: '', on: true, own: true }]);
    setAdd('');
  };
  const save = () => {
    const old = db.PR.services || [];
    db.PR.services = picked.map((x): Service => {
      const was = old.find((s) => s.id === x.id);
      return { ...(was || { unit: 'job', where: '', desc: '', boost: 0 }), id: x.id, skill: x.name, price: +x.price || 0, pub: true, draft: false } as Service;
    });
    db.PR.area = { ...db.PR.area, afterSee } as any;
    bump();
    toast(picked.length ? `${picked.length} ${picked.length === 1 ? 'service' : 'services'} saved` : 'Saved: general ' + skill.toLowerCase() + ' work');
    goBack();
  };
  return (
    <KeyAvoid style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flex: 1, paddingTop: ins.top + 16, paddingBottom: ins.bottom + 28 }}>
        <Top />
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}>
          <T s={13} w={8} c="accent" style={{ marginTop: 22 }}>
            {skill ? `Your main skill: ${skill}` : 'Your services'}
          </T>
          <T s={28} w={8} ls={-0.6} style={{ marginTop: 4, marginBottom: 6 }}>
            What do you do?
          </T>
          <T s={15} lh={1.5} c="muted" style={{ marginBottom: 14 }}>
            Tick the services you do. Clients who need one of them are sent to you first, and your ratings show per service. A starting price is optional: you agree the final price together.
          </T>
          {lines.map((x, i) => (
            <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, borderBottomWidth: 1, borderBottomColor: t.line }}>
              <Pressable testID={`wsvc-${i}`} accessibilityRole="checkbox" accessibilityState={{ checked: x.on }} accessibilityLabel={x.name} onPress={() => toggle(x)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60 }}>
                <View style={{ width: 26, height: 26, borderRadius: 8, borderWidth: x.on ? 0 : 2, borderColor: t.line, backgroundColor: x.on ? RED : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {x.on ? <GIcon name="check" size={15} color="#ffffff" sw={2.8} /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <T s={15} w={x.on ? 8 : 6}>
                    {x.name}
                  </T>
                  {x.own ? (
                    <T s={12} c="muted">
                      Added by you · tap to remove
                    </T>
                  ) : null}
                </View>
              </Pressable>
              {x.on ? (
                <>
                  <TextInput
                    testID={`wprice-${i}`}
                    accessibilityLabel={`Starting price for ${x.name}, in FCFA`}
                    value={x.price ? (+x.price).toLocaleString('en-US') : ''}
                    onChangeText={(v) => set(x.id, { price: v.replace(/[^\d]/g, '').slice(0, 8) })}
                    placeholder="from…"
                    placeholderTextColor={t.muted}
                    keyboardType="number-pad"
                    selectionColor={RED}
                    maxFontSizeMultiplier={1.3}
                    style={[ft(15, 8, t.text), { width: 96, height: 44, paddingHorizontal: 12, paddingVertical: 0, borderRadius: 14, backgroundColor: t.card2, borderWidth: 1, borderColor: t.line, textAlign: 'right' }]}
                  />
                  <T s={13} w={7} c="muted">
                    FCFA
                  </T>
                </>
              ) : null}
            </View>
          ))}
          {/* one of their own: allowed when it is part of the skill */}
          <T s={13} w={7} c="muted" style={{ marginTop: 18, marginBottom: 6 }}>
            Not in the list?
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              testID="wsvc-add"
              accessibilityLabel="A service of your own"
              value={add}
              onChangeText={(v) => (setAdd(v), setErr(''))}
              onSubmitEditing={() => void addOwn()}
              placeholder={skill ? `Another ${skill.toLowerCase()} service` : 'Another service'}
              placeholderTextColor={t.muted}
              maxLength={40}
              returnKeyType="done"
              selectionColor={RED}
              maxFontSizeMultiplier={1.3}
              style={[ft(15, 6, t.text), { flex: 1, height: 48, paddingHorizontal: 14, paddingVertical: 0, borderRadius: 16, backgroundColor: t.card2, borderWidth: 1, borderColor: err ? RED : t.line }]}
            />
            <Pressable testID="wsvc-add-ok" accessibilityRole="button" accessibilityLabel="Add this service" disabled={busy || add.trim().length < 3} onPress={() => (tap(), void addOwn())} style={{ height: 48, paddingHorizontal: 16, borderRadius: 24, backgroundColor: add.trim().length < 3 ? t.card2 : RED, alignItems: 'center', justifyContent: 'center' }}>
              {busy ? <ActivityIndicator color="#ffffff" /> : <T s={14} w={8} c={add.trim().length < 3 ? t.muted : '#ffffff'}>Add</T>}
            </Pressable>
          </View>
          {err ? (
            <View style={{ marginTop: 8, gap: 2 }}>
              <T testID="wsvc-err" s={13} w={7} lh={1.45} c="danger">
                {err}
              </T>
              <Link title="Change my main skill" onPress={() => router.push('/w1?edit=1' as any)} style={{ alignSelf: 'flex-start' }} />
            </View>
          ) : null}
          <SwitchCard testID="wprice-after" title="I give my price after seeing the job" sub="Clients see “price after a look”" on={afterSee} onChange={setAfterSee} style={{ marginTop: 18 }} />
          {!picked.length ? (
            <T s={13} lh={1.45} c="muted" style={{ marginTop: 12 }}>
              With nothing ticked, clients see you for general {skill.toLowerCase() || 'work'} only, after workers who list the service they need.
            </T>
          ) : null}
        </ScrollView>
        <Big testID="wprice-save" title={picked.length ? `Save ${picked.length} ${picked.length === 1 ? 'service' : 'services'}` : 'Save'} onPress={save} style={{ marginHorizontal: 20 }} />
      </View>
    </KeyAvoid>
  );
}
