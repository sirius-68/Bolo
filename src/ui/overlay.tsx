import React, { ReactNode, useEffect, useReducer, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTick } from '../logic/live';
import { Icon } from './Icon';
import { C, R, tx } from './theme';
import { AlertIll, Btn } from './kit';

/* =========================================================================
   Bottom sheet — one slot, like the prototype's bx(): showing new content
   replaces what's there. Content is a render function so it re-renders
   whenever the data model changes.
   ========================================================================= */
type SheetOpts = { tag?: string; footer?: () => ReactNode; full?: boolean; onClose?: () => void };
type SheetState = { render: (() => ReactNode) | null; opts: SheetOpts; key: number };
let sheetState: SheetState = { render: null, opts: {}, key: 0 };
const sheetSubs = new Set<() => void>();
const emitSheet = () => sheetSubs.forEach((f) => f());

export const sheet = {
  show(render: () => ReactNode, opts: SheetOpts = {}) {
    const wasOpen = !!sheetState.render;
    sheetState = { render, opts, key: wasOpen ? sheetState.key : sheetState.key + 1 };
    emitSheet();
  },
  close(msg?: string) {
    const cb = sheetState.opts.onClose;
    sheetState = { render: null, opts: {}, key: sheetState.key };
    emitSheet();
    cb?.();
    if (msg) toast(msg);
  },
  isOpen: () => !!sheetState.render,
  is: (tag: string) => !!sheetState.render && sheetState.opts.tag === tag,
  tag: () => (sheetState.render ? sheetState.opts.tag : undefined),
};
/** Close the sheet, then run fn once the close animation finished (prototype used 260 ms). */
export function afterSheet(fn: () => void, ms = 280) {
  sheet.close();
  setTimeout(fn, ms);
}

function SheetHost() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    sheetSubs.add(force);
    return () => {
      sheetSubs.delete(force);
    };
  }, []);
  useTick();
  const ins = useSafeAreaInsets();
  const open = !!sheetState.render;
  const [visible, setVisible] = useState(open);
  const y = useRef(new Animated.Value(1)).current;
  const last = useRef<SheetState>(sheetState);
  if (open) last.current = sheetState;

  useEffect(() => {
    if (open) {
      setVisible(true);
      Animated.timing(y, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else if (visible) {
      Animated.timing(y, { toValue: 1, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setVisible(false));
    }
  }, [open]);

  const H = Dimensions.get('window').height;
  const cur = last.current;
  if (!visible || !cur.render) return null;
  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={() => sheet.close()}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.6)', opacity: y.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
        <Pressable style={{ flex: 1 }} onPress={() => sheet.close()} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
        <Animated.View
          style={{
            maxHeight: H * (cur.opts.full ? 0.94 : 0.9),
            minHeight: cur.opts.full ? H * 0.7 : undefined,
            backgroundColor: C.s1,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingBottom: ins.bottom + 12,
            transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, H] }) }],
          }}
        >
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
            <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: C.s3 }} />
          </View>
          <ScrollView
            key={cur.key}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 4 }}
          >
            {cur.render()}
          </ScrollView>
          {cur.opts.footer ? <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>{cur.opts.footer()}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
      <PickerHost />
      <ToastHost inModal />
    </Modal>
  );
}

/* =========================================================================
   Picker — a list chooser that can open on top of a sheet.
   ========================================================================= */
type PickState = { title: string; options: { v: string; sub?: string }[]; value?: string; onPick: (v: string) => void; search?: boolean } | null;
let pickState: PickState = null;
const pickSubs = new Set<() => void>();
export function pick(title: string, options: (string | { v: string; sub?: string })[], value: string | undefined, onPick: (v: string) => void, search?: boolean) {
  pickState = { title, options: options.map((o) => (typeof o === 'string' ? { v: o } : o)), value, onPick, search: search ?? options.length > 12 };
  pickSubs.forEach((f) => f());
}
function closePick() {
  pickState = null;
  pickSubs.forEach((f) => f());
}

function PickerHost() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [q, setQ] = useState('');
  const ins = useSafeAreaInsets();
  useEffect(() => {
    pickSubs.add(force);
    return () => {
      pickSubs.delete(force);
    };
  }, []);
  useEffect(() => setQ(''), [pickState?.title]);
  if (!pickState) return null;
  const p = pickState;
  const L = p.options.filter((o) => !q || o.v.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal visible transparent statusBarTranslucent animationType="fade" onRequestClose={closePick}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.6)' }} onPress={closePick} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '80%', backgroundColor: C.s2, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: ins.bottom + 8 }}>
        <Text style={tx(16, 8, C.text, { textAlign: 'center', paddingVertical: 16 })}>{p.title}</Text>
        {p.search ? (
          <View style={{ marginHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 14, borderRadius: R.md, backgroundColor: C.s1 }}>
            <Icon name="search" size={18} color={C.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={C.faint} style={[tx(15, 6), { flex: 1 }]} autoCorrect={false} />
          </View>
        ) : null}
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}>
          {L.map((o) => {
            const on = o.v === p.value;
            return (
              <Pressable
                key={o.v}
                onPress={() => {
                  const f = p.onPick;
                  closePick();
                  f(o.v);
                }}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, backgroundColor: pressed ? C.s3 : 'transparent' })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={tx(15, on ? 8 : 6, on ? C.yellow : C.text)}>{o.v}</Text>
                  {o.sub ? <Text style={tx(12, 5, C.muted)}>{o.sub}</Text> : null}
                </View>
                {on ? <Icon name="check" size={20} color={C.yellow} /> : null}
              </Pressable>
            );
          })}
          {!L.length ? <Text style={tx(13, 5, C.muted, { textAlign: 'center', padding: 20 })}>Nothing found</Text> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
/** Top-level picker (when no sheet is open the sheet's Modal isn't mounted). */
function RootPicker() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    sheetSubs.add(force);
    return () => {
      sheetSubs.delete(force);
    };
  }, []);
  return sheet.isOpen() ? null : <PickerHost />;
}

/* =========================================================================
   Toast + undo bar
   ========================================================================= */
type ToastState = { msg: string; id: number; undo?: () => void } | null;
let toastState: ToastState = null;
const toastSubs = new Set<() => void>();
let toastTimer: ReturnType<typeof setTimeout> | null = null;
export function toast(msg: string) {
  toastState = { msg, id: Date.now() };
  toastSubs.forEach((f) => f());
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastState = null;
    toastSubs.forEach((f) => f());
  }, 2300);
}
export function undoBar(msg: string, undo: () => void) {
  toastState = { msg, id: Date.now(), undo };
  toastSubs.forEach((f) => f());
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastState = null;
    toastSubs.forEach((f) => f());
  }, 4000);
}
let toastBottom = 110;
export function setToastOffset(px: number) {
  toastBottom = px;
}

function ToastHost({ inModal }: { inModal?: boolean }) {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const ins = useSafeAreaInsets();
  const a = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState<ToastState>(null);
  useEffect(() => {
    toastSubs.add(force);
    return () => {
      toastSubs.delete(force);
    };
  }, []);
  useEffect(() => {
    if (toastState) {
      setShown(toastState);
      a.setValue(0);
      Animated.spring(a, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
    } else if (shown) {
      Animated.timing(a, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => setShown(null));
    }
  }, [toastState?.id]);
  // only one host renders: the modal one while a sheet is open
  if (!inModal && sheet.isOpen()) return null;
  if (!shown) return null;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: (inModal ? 24 : toastBottom) + ins.bottom,
        alignItems: 'center',
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
      }}
    >
      <View
        accessibilityLiveRegion="polite"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 14, maxWidth: 420, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#fff' }}
      >
        <Text style={tx(13, 7, '#000', { flexShrink: 1 })}>{shown.msg}</Text>
        {shown.undo ? (
          <Pressable
            hitSlop={10}
            onPress={() => {
              const u = shown.undo;
              toastState = null;
              toastSubs.forEach((f) => f());
              u?.();
            }}
          >
            <Text style={tx(13, 8, C.blue)}>Undo</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** Mount once at the root. */
export function Overlays() {
  // Android hardware back closes the picker/sheet first (Modal handles it), nothing else needed here.
  useEffect(() => {
    const s = BackHandler.addEventListener('hardwareBackPress', () => {
      if (pickState) {
        closePick();
        return true;
      }
      return false;
    });
    return () => s.remove();
  }, []);
  return (
    <>
      <ToastHost />
      <SheetHost />
      <RootPicker />
    </>
  );
}

/* ---------------- shared sheet building blocks ---------------- */
export function SheetTitle({ children, center, sub }: { children: ReactNode; center?: boolean; sub?: ReactNode }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={tx(20, 8, C.text, { textAlign: center ? 'center' : 'left', marginTop: 4 })}>{children}</Text>
      {sub ? <Text style={tx(14, 5, C.muted, { marginTop: 4, textAlign: center ? 'center' : 'left' })}>{sub}</Text> : null}
    </View>
  );
}

/** A two-button confirmation sheet. */
export function confirm(o: { title: string; text?: string; ok: string; cancel?: string; danger?: boolean; icon?: string; onOk: () => void }) {
  sheet.show(() => (
    <View style={{ gap: 10 }}>
      {o.icon ? <AlertIll icon={o.icon} bg={o.danger ? C.errSoft : C.yellow} /> : null}
      <SheetTitle center={!!o.icon} sub={o.text}>
        {o.title}
      </SheetTitle>
      <Btn title={o.ok} variant={o.danger ? 'danger' : 'yellow'} onPress={() => {
        sheet.close();
        o.onOk();
      }} style={{ marginTop: 8 }} />
      <Btn title={o.cancel || 'Cancel'} variant="ghost" onPress={() => sheet.close()} />
    </View>
  ));
}
