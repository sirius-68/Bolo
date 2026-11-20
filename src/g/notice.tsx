/* Short messages that appear over the app and go away by themselves, and the "are you sure?" question.
   toast('Saved') · undoBar('Removed', putBack) · confirm({ title, text, ok, onOk }) */
import React, { useEffect, useReducer, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap } from './touch';
import { RED, ft, useG } from './theme';
import { Big, Link, T, gsheet } from './ui';

type Note = { msg: string; undo?: () => void; key: number };
let note: Note | null = null;
let seq = 0;
let offset = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

/** A short message at the bottom of the screen. */
export function toast(msg: string) {
  note = { msg, key: ++seq };
  emit();
}
/** The same, with an Undo button. */
export function undoBar(msg: string, undo: () => void) {
  note = { msg, undo, key: ++seq };
  emit();
}
/** Screens with the tab bar lift the message above it. */
export function setToastOffset(px: number) {
  offset = px;
}

/** Put once at the top of the app. */
export function NoticeHost() {
  const [, tick] = useReducer((x: number) => x + 1, 0);
  const t = useG();
  const ins = useSafeAreaInsets();
  const a = useRef(new Animated.Value(0)).current;
  const shown = useRef<Note | null>(null);
  useEffect(() => {
    let hide: any;
    const f = () => {
      clearTimeout(hide);
      shown.current = note;
      tick();
      if (!note) return;
      a.setValue(0);
      Animated.timing(a, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      const mine = note.key;
      hide = setTimeout(
        () =>
          Animated.timing(a, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
            if (note?.key === mine) {
              note = null;
              shown.current = null;
              tick();
            }
          }),
        note.undo ? 5000 : Math.min(6000, 2200 + note.msg.length * 35),
      );
    };
    subs.add(f);
    return () => {
      subs.delete(f);
      clearTimeout(hide);
    };
  }, [a]);
  const n = shown.current;
  if (!n) return null;
  return (
    <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: 16, right: 16, bottom: ins.bottom + 20 + offset, alignItems: 'center', opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
      <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, maxWidth: 420, minHeight: 48, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 24, backgroundColor: t.text }}>
        <Text maxFontSizeMultiplier={1.3} style={[ft(14, 7, t.bg), { flexShrink: 1 }]}>
          {n.msg}
        </Text>
        {n.undo ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => {
              tap();
              const u = n.undo;
              note = null;
              shown.current = null;
              tick();
              u?.();
            }}
          >
            <Text maxFontSizeMultiplier={1.3} style={ft(14, 8, RED)}>
              Undo
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** A question with two answers, in a sheet. `danger` is for things that can't be undone. */
export function confirm(o: { title: string; text?: string; ok: string; cancel?: string; danger?: boolean; icon?: string; onOk: () => void }) {
  gsheet.show(() => (
    <View>
      <T s={24} w={8} lh={1.2} ls={-0.5}>
        {o.title}
      </T>
      {o.text ? (
        <T s={14} lh={1.5} c="muted" style={{ marginTop: 6 }}>
          {o.text}
        </T>
      ) : null}
      <Big
        testID="confirm-ok"
        title={o.ok}
        danger={o.danger}
        style={{ marginTop: 20 }}
        onPress={() => {
          gsheet.close();
          setTimeout(o.onOk, 220);
        }}
      />
      <Link testID="confirm-cancel" title={o.cancel || 'Not now'} color="text" h={48} style={{ marginTop: 6 }} onPress={() => gsheet.close()} />
    </View>
  ));
}
