import React, { ReactNode, useEffect, useReducer, useRef, useState } from 'react';
import { Animated, BackHandler, Dimensions, Easing, FlatList, Keyboard, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { bump, useTick } from '../logic/live';
import { KeyAvoid } from './keyboard';
import { Icon } from './Icon';
import { C, R, tx } from './theme';
import { AlertIll, Btn } from './kit';

/* =========================================================================
   Bottom sheet, one slot, like the prototype's bx(): showing new content
   replaces what's there. Content is a render function so it re-renders
   whenever the data model changes.
   ========================================================================= */
/** `over`: open on top of the sheet that is showing and come back to it afterwards (a city or date chooser opened
    from a form). Without it, a new sheet takes the place of the one that is open. */
type SheetOpts = { tag?: string; footer?: () => ReactNode; full?: boolean; onClose?: () => void; over?: boolean };
type SheetState = { render: (() => ReactNode) | null; opts: SheetOpts; key: number };
let sheetState: SheetState = { render: null, opts: {}, key: 0 };
/** Sheets waiting underneath the one on top (kept alive, so a half-filled form is still there on return). */
let under: SheetState[] = [];
let lastKey = 0;
const sheetSubs = new Set<() => void>();
const emitSheet = () => sheetSubs.forEach((f) => f());

/** While a full-screen story is open, sheets wait until it closes (so nothing covers an ad or What's new). */
let held: { render: () => ReactNode; opts: SheetOpts } | null = null;
let gate = false;
export function holdSheets(on: boolean) {
  gate = on;
  if (!on) setTimeout(flushHeld, 600);
}
// A held sheet waits for any sheet the story opened (e.g. the job behind an ad) to close first.
function flushHeld() {
  if (!held || gate || sheetState.render) return;
  const h = held;
  held = null;
  sheet.show(h.render, h.opts);
}
export const sheet = {
  show(render: () => ReactNode, opts: SheetOpts = {}) {
    if (gate) {
      held = { render, opts };
      return;
    }
    const wasOpen = !!sheetState.render;
    if (wasOpen && opts.over) {
      under.push(sheetState);
      sheetState = { render, opts, key: ++lastKey };
    } else sheetState = { render, opts, key: wasOpen ? sheetState.key : ++lastKey };
    emitSheet();
  },
  close(msg?: string) {
    const cb = sheetState.opts.onClose;
    // a sheet opened over another one gives the screen back to it
    const back = under.pop();
    sheetState = back || { render: null, opts: {}, key: sheetState.key };
    emitSheet();
    cb?.();
    // whatever the sheet changed shows on the screen behind it and is saved, without each sheet having to ask
    bump();
    if (msg) toast(msg);
    if (held) setTimeout(flushHeld, 500);
  },
  isOpen: () => !!sheetState.render,
  is: (tag: string) => !!sheetState.render && sheetState.opts.tag === tag,
  tag: () => (sheetState.render ? sheetState.opts.tag : undefined),
};
/** Close the sheet (and any it was opened over: we are leaving for another screen), then run fn once the
    close animation finished (prototype used 260 ms). */
export function afterSheet(fn: () => void, ms = 280) {
  const below = under;
  under = [];
  below.forEach((u) => u.opts.onClose?.());
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

  // Keep the sheet below the status bar when the keyboard pushes it up.
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const b = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  const H = Dimensions.get('window').height;
  const cur = last.current;
  const room = H - kb - ins.top - 12;
  if (!visible || !cur.render) return null;
  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={() => sheet.close()}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,.6)', opacity: y.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
        <Pressable style={{ flex: 1 }} onPress={() => sheet.close()} accessibilityLabel="Close" />
      </Animated.View>
      <KeyAvoid style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }} pointerEvents="box-none">
        <Animated.View
          style={{
            maxHeight: Math.min(H * (cur.opts.full ? 0.94 : 0.9), room),
            minHeight: cur.opts.full ? Math.min(H * 0.7, room) : undefined,
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
          {/* the sheets underneath stay mounted but hidden, so what was typed in them is still there on return */}
          {[...(open ? under : []), cur].map((L, i, all) => (
            <View key={L.key} style={i === all.length - 1 ? { flexShrink: 1 } : { display: 'none' }}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: 4 }}>
                {L.render ? L.render() : null}
              </ScrollView>
              {L.opts.footer ? <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>{L.opts.footer()}</View> : null}
            </View>
          ))}
        </Animated.View>
      </KeyAvoid>
      <PickerHost />
      <ToastHost inModal />
    </Modal>
  );
}

/* =========================================================================
   Picker, a list chooser that can open on top of a sheet.
   ========================================================================= */
type PickExtra = { search?: boolean; /** offered when the search finds nothing: use what was typed */ other?: (typed: string) => void; otherLabel?: (typed: string) => string; hint?: string };
type PickState = ({ title: string; options: { v: string; sub?: string }[]; value?: string; onPick: (v: string) => void } & PickExtra) | null;
let pickState: PickState = null;
const pickSubs = new Set<() => void>();
export function pick(title: string, options: (string | { v: string; sub?: string })[], value: string | undefined, onPick: (v: string) => void, search?: boolean | PickExtra) {
  const extra: PickExtra = typeof search === 'object' && search ? search : { search: search as boolean | undefined };
  pickState = { title, options: options.map((o) => (typeof o === 'string' ? { v: o } : o)), value, onPick, ...extra, search: extra.search ?? options.length > 12 };
  pickSubs.forEach((f) => f());
}
function closePick() {
  pickState = null;
  pickSubs.forEach((f) => f());
}

function PickerHost() {
  const [, force] = useReducer((x: number) => x + 1, 0);
  const [q, setQ] = useState('');
  const [kb, setKb] = useState(0);
  const ins = useSafeAreaInsets();
  useEffect(() => {
    pickSubs.add(force);
    return () => {
      pickSubs.delete(force);
    };
  }, []);
  useEffect(() => {
    const a = Keyboard.addListener('keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const b = Keyboard.addListener('keyboardDidHide', () => setKb(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  useEffect(() => setQ(''), [pickState?.title]);
  if (!pickState) return null;
  const p = pickState;
  const typed = q.trim();
  const L = p.options.filter((o) => !typed || (o.v + ' ' + (o.sub || '')).toLowerCase().includes(typed.toLowerCase()));
  const H = Dimensions.get('window').height;
  const choose = (v: string) => {
    const f = p.onPick;
    Keyboard.dismiss();
    closePick();
    f(v);
  };
  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={closePick}>
      <Pressable style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,.6)' }} onPress={closePick} accessibilityLabel="Close" />
      {/* the list sits above the keyboard: its search box can never slide underneath it */}
      <KeyAvoid style={{ flex: 1, justifyContent: 'flex-end' }} pointerEvents="box-none">
        <View style={{ maxHeight: Math.min(H * 0.8, H - kb - ins.top - 12), backgroundColor: C.s2, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: (kb ? 0 : ins.bottom) + 8 }}>
          <Text style={tx(16, 8, C.text, { textAlign: 'center', paddingVertical: 16 })}>{p.title}</Text>
          {p.search ? (
            <View style={{ marginHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 14, borderRadius: R.md, backgroundColor: C.s1 }}>
              <Icon name="search" size={18} color={C.muted} />
              <TextInput testID="pick-search" value={q} onChangeText={setQ} placeholder="Search" placeholderTextColor={C.faint} style={[tx(15, 6), { flex: 1, paddingVertical: 0 }]} autoCorrect={false} returnKeyType="search" />
              {q ? (
                <Pressable accessibilityLabel="Clear search" hitSlop={10} onPress={() => setQ('')}>
                  <Icon name="x" size={16} color={C.muted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <FlatList
            data={L}
            keyExtractor={(o) => o.v}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
            initialNumToRender={16}
            windowSize={9}
            style={{ flexGrow: 0 }}
            renderItem={({ item: o }) => {
              const on = o.v === p.value;
              return (
                <Pressable onPress={() => choose(o.v)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12, backgroundColor: pressed ? C.s3 : 'transparent' })}>
                  <View style={{ flex: 1 }}>
                    <Text style={tx(15, on ? 8 : 6, on ? C.yellow : C.text)}>{o.v}</Text>
                    {o.sub ? <Text style={tx(12, 5, C.muted)}>{o.sub}</Text> : null}
                  </View>
                  {on ? <Icon name="check" size={20} color={C.yellow} /> : null}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', gap: 10, padding: 22 }}>
                <Text style={tx(15, 8, C.text, { textAlign: 'center' })}>{typed ? `Nothing matches “${typed}”` : 'Nothing to choose from yet'}</Text>
                <Text style={tx(13, 5, C.muted, { textAlign: 'center' })}>{p.hint || (typed ? 'Check the spelling or try a shorter word.' : '')}</Text>
                {p.other && typed ? (
                  <Pressable
                    testID="pick-other"
                    accessibilityRole="button"
                    onPress={() => {
                      const f = p.other!;
                      Keyboard.dismiss();
                      closePick();
                      f(typed);
                    }}
                    style={{ height: 42, paddingHorizontal: 18, borderRadius: 21, backgroundColor: C.yellow, justifyContent: 'center' }}
                  >
                    <Text style={tx(14, 8, '#000')}>{p.otherLabel ? p.otherLabel(typed) : `Use “${typed}”`}</Text>
                  </Pressable>
                ) : null}
              </View>
            }
          />
        </View>
      </KeyAvoid>
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
let toastBottom = 32;
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
  const atTop = inModal || toastBottom <= 40;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        // Above the tab bar on the main tabs; at the top elsewhere so it never covers a screen's or sheet's main button.
        ...(atTop ? { top: ins.top + 8 } : { bottom: toastBottom + ins.bottom }),
        alignItems: 'center',
        opacity: a,
        transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [atTop ? -16 : 16, 0] }) }],
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
      <Btn testID="confirm-ok" title={o.ok} variant={o.danger ? 'danger' : 'yellow'} onPress={() => {
        sheet.close();
        o.onOk();
      }} style={{ marginTop: 8 }} />
      <Btn title={o.cancel || 'Cancel'} variant="ghost" onPress={() => sheet.close()} />
    </View>
  ));
}
