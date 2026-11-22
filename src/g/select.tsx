/* Hold to select: press and hold a row to select it, tap others to add them, then act on all of them at once
   (mark as read, delete…). Used by Inbox (messages, updates) and Jobs.
     const sel = useSelect();
     <Row onPress={() => sel.press(id, open)} onLongPress={() => sel.hold(id)} />   · sel.has(id) · sel.on
     {sel.on ? <SelectHead … /> : <Title />}   {sel.on ? <SelectActions … /> : <Tabs />} */
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { GIcon, GIconName } from './icons';
import { RED, useG } from './theme';
import { tap } from './touch';
import { T } from './ui';

export type Select = ReturnType<typeof useSelect>;
export function useSelect() {
  const [ids, setIds] = useState<string[]>([]);
  const on = ids.length > 0;
  const clear = useCallback(() => setIds([]), []);
  const toggle = (id: string) => setIds((L) => (L.includes(id) ? L.filter((x) => x !== id) : [...L, id]));
  // the phone's Back button leaves selection first
  useEffect(() => {
    if (!on) return;
    const h = BackHandler.addEventListener('hardwareBackPress', () => (clear(), true));
    return () => h.remove();
  }, [on, clear]);
  // leaving the screen ends it
  useFocusEffect(useCallback(() => clear, [clear]));
  return {
    ids,
    on,
    clear,
    has: (id: string) => ids.includes(id),
    /** a tap: opens the row, or (while selecting) adds or removes it */
    press: (id: string, open: () => void) => (tap(), on ? toggle(id) : open()),
    /** press and hold: starts selecting with this row */
    hold: (id: string) => (tap(), toggle(id)),
    /** all of these, or none when they are all selected already */
    all: (list: string[]) => setIds((L) => (list.length && list.every((x) => L.includes(x)) ? [] : [...list])),
    /** keep only rows that still exist (after a delete, or when the list changes) */
    keep: (list: string[]) => setIds((L) => (L.every((x) => list.includes(x)) ? L : L.filter((x) => list.includes(x)))),
  };
}

/** In place of the screen's title while selecting: close, how many, select all. */
export function SelectHead({ sel, all }: { sel: Select; all: string[] }) {
  const t = useG();
  const every = all.length > 0 && all.every((x) => sel.has(x));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 40 }}>
      <Pressable testID="sel-close" accessibilityRole="button" accessibilityLabel="Stop selecting" hitSlop={8} onPress={() => (tap(), sel.clear())} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center' }}>
        <GIcon name="x" size={18} color={t.text} />
      </Pressable>
      <T testID="sel-count" s={22} w={8} ls={-0.4} style={{ flex: 1 }} lines={1}>
        {sel.ids.length} selected
      </T>
      <Pressable testID="sel-all" accessibilityRole="button" hitSlop={8} onPress={() => (tap(), sel.all(all))} style={{ height: 40, justifyContent: 'center' }}>
        <T s={15} w={8} c="accent">
          {every ? 'Select none' : 'Select all'}
        </T>
      </Pressable>
    </View>
  );
}

export type SelAction = { id: string; icon: GIconName; label: string; run: () => void; danger?: boolean };
/** In place of the tabs while selecting: what can be done with the selected rows. */
export function SelectActions({ actions }: { actions: SelAction[] }) {
  const t = useG();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 8 }} style={{ flexGrow: 0 }}>
      {actions.map((a) => (
        <Pressable key={a.id} testID={`sel-${a.id}`} accessibilityRole="button" onPress={() => (tap(), a.run())} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 16, borderRadius: 24, backgroundColor: a.danger ? t.dangerBg : t.card2, opacity: pressed ? 0.7 : 1 })}>
          <GIcon name={a.icon} size={18} color={a.danger ? t.dangerFg : t.text} />
          <T s={14} w={8} c={a.danger ? t.dangerFg : t.text}>
            {a.label}
          </T>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/** The round mark at the start of a row while selecting (in place of the picture). */
export function SelectMark({ on, size = 48 }: { on: boolean; size?: number }) {
  const t = useG();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: on ? RED : 'transparent', borderWidth: on ? 0 : 2, borderColor: t.line, alignItems: 'center', justifyContent: 'center' }}>
      {on ? <GIcon name="check" size={Math.round(size * 0.45)} color="#ffffff" sw={2.6} /> : null}
    </View>
  );
}
