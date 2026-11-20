/* getit building blocks: text, buttons, avatars, the big button's rings, and the bottom sheet.
   Sizes and colours follow the design canvas exactly; every piece works in dark and light. */
import React, { ReactNode, useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, Animated, BackHandler, Easing, Keyboard, Modal, Platform, Pressable, ScrollView, StyleProp, Text, TextInput, TextInputProps, TextStyle, View, ViewStyle, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap } from '../ui/kit';
import { Weight } from '../ui/theme';
import { GIcon, GIconName, Mark, Word } from './icons';
import { BRAND, RED, ft, initials, pastel, useG } from './theme';

/* ---------------- text ---------------- */
export function T({
  s = 15,
  w = 5,
  c,
  lh,
  ls,
  center,
  lines,
  style,
  children,
  label,
}: {
  s?: number;
  w?: Weight;
  c?: string;
  lh?: number;
  ls?: number;
  center?: boolean;
  lines?: number;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
  label?: string;
}) {
  const t = useG();
  return (
    <Text accessibilityLabel={label} numberOfLines={lines} maxFontSizeMultiplier={1.3} style={[ft(s, w, c || t.text, lh ?? (s >= 22 ? 1.15 : 1.4), ls ?? (s >= 28 ? -0.7 : s >= 22 ? -0.5 : 0)), center && { textAlign: 'center' }, style]}>
      {children}
    </Text>
  );
}

/* ---------------- screen ---------------- */
/** A full screen in the app's background colour, clear of the status bar. */
export function Screen({ children, style, top = 16 }: { children: ReactNode; style?: StyleProp<ViewStyle>; top?: number }) {
  const t = useG();
  const ins = useSafeAreaInsets();
  return <View style={[{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + top }, style]}>{children}</View>;
}
/** Status bar icons that match the look (light icons on dark, dark icons on light). */
export function GStatusBar() {
  const t = useG();
  return <StatusBar style={t.dark ? 'light' : 'dark'} />;
}

/* ---------------- buttons ---------------- */
function usePressOnce(onPress?: () => void) {
  const last = useRef(0);
  return () => {
    // a double tap is one press
    const now = Date.now();
    if (now - last.current < 450) return;
    last.current = now;
    tap();
    onPress?.();
  };
}
/** The main action: full width, 56 high, red. */
export function Big({
  title,
  onPress,
  icon,
  testID,
  style,
  disabled,
  loading,
  h = 56,
}: {
  title: string;
  onPress?: () => void;
  icon?: GIconName;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  h?: number;
}) {
  const press = usePressOnce(onPress);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={press}
      style={({ pressed }) => [{ height: h, borderRadius: h / 2, backgroundColor: RED, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22, opacity: disabled ? 0.4 : pressed ? 0.9 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color="#ffffff" /> : icon ? <GIcon name={icon} size={20} color="#ffffff" /> : null}
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={ft(h >= 56 ? 16 : 15, 8, '#ffffff')}>
        {title}
      </Text>
    </Pressable>
  );
}
/** A quiet text action ("Type instead", "Sign in"). */
export function Link({ title, onPress, icon, color, testID, w = 7, h = 44, style }: { title: string; onPress?: () => void; icon?: GIconName; color?: string; testID?: string; w?: Weight; h?: number; style?: StyleProp<ViewStyle> }) {
  const t = useG();
  const press = usePressOnce(onPress);
  const c = color || t.accent;
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={press} hitSlop={6} style={({ pressed }) => [{ height: h, paddingHorizontal: 14, borderRadius: h / 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: pressed ? 0.6 : 1 }, style]}>
      {icon ? <GIcon name={icon} size={20} color={c} /> : null}
      <Text maxFontSizeMultiplier={1.2} style={ft(15, w, c)}>
        {title}
      </Text>
    </Pressable>
  );
}
/** A round 44 button with one icon (close, back, share, you). */
export function Round({ icon, label, onPress, color, bg, size = 44, testID, plain }: { icon: GIconName; label: string; onPress?: () => void; color?: string; bg?: string; size?: number; testID?: string; plain?: boolean }) {
  const t = useG();
  const press = usePressOnce(onPress);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={press}
      hitSlop={4}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, borderWidth: plain ? 0 : 1, borderColor: t.line, backgroundColor: bg || t.card, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}
    >
      <GIcon name={icon} size={size >= 56 ? 22 : 20} color={color || t.text} />
    </Pressable>
  );
}
/** Two or three choices side by side (Dark | Light, Messages | Updates). */
export function Seg<V extends string>({ items, value, onChange, h = 40 }: { items: [V, string][]; value: V; onChange: (v: V) => void; h?: number }) {
  const t = useG();
  return (
    <View style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 18, backgroundColor: t.card2 }}>
      {items.map(([v, label]) => {
        const on = v === value;
        return (
          <Pressable key={v} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => (tap(), onChange(v))} style={{ flex: 1, height: h, borderRadius: 14, backgroundColor: on ? RED : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <Text maxFontSizeMultiplier={1.2} style={ft(h >= 44 ? 15 : 14, 7, on ? '#ffffff' : t.text)}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------- forms ---------------- */
/** A small label above a field. */
export function Label({ children }: { children: ReactNode }) {
  const t = useG();
  return (
    <Text maxFontSizeMultiplier={1.3} style={[ft(13, 7, t.muted), { marginBottom: 6 }]}>
      {children}
    </Text>
  );
}
/** A one-line text box: 52 high, as in the design. `bad` draws the red edge. */
export const Input = React.forwardRef<TextInput, TextInputProps & { bad?: boolean; h?: number }>(function Input({ bad, h = 52, style, ...rest }, ref) {
  const t = useG();
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={t.muted}
      selectionColor={RED}
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[ft(16, 6, t.text), { height: h, paddingHorizontal: 16, paddingVertical: 0, borderRadius: 16, borderWidth: bad ? 2 : 1, borderColor: bad ? RED : t.line, backgroundColor: t.card2, lineHeight: undefined }, style]}
    />
  );
});
/** A choice chip (When? Today · Tomorrow). */
export function Chip({ label, on, onPress, testID }: { label: string; on?: boolean; onPress?: () => void; testID?: string }) {
  const t = useG();
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={() => (tap(), onPress?.())} style={({ pressed }) => ({ height: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: on ? RED : t.line, backgroundColor: on ? RED : t.card, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
      <Text maxFontSizeMultiplier={1.2} style={ft(14, 7, on ? '#ffffff' : t.text)}>
        {label}
      </Text>
    </Pressable>
  );
}
/** The second action under a red one: outlined, 52 high. */
export function Ghost({ title, onPress, testID, style, icon }: { title: string; onPress?: () => void; testID?: string; style?: StyleProp<ViewStyle>; icon?: GIconName }) {
  const t = useG();
  const press = usePressOnce(onPress);
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={press} style={({ pressed }) => [{ height: 52, borderRadius: 26, borderWidth: 1, borderColor: t.line, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, opacity: pressed ? 0.7 : 1 }, style]}>
      {icon ? <GIcon name={icon} size={20} color={t.text} /> : null}
      <Text maxFontSizeMultiplier={1.2} style={ft(15, 7, t.text)}>
        {title}
      </Text>
    </Pressable>
  );
}

/* ---------------- people ---------------- */
/** A person's picture: their photo when they have one, otherwise their initials on a soft colour. */
export function Face({ name, photo, size = 48 }: { name: string; photo?: string | null; size?: number }) {
  const uri = photo && photo.startsWith('uri:') ? photo.slice(4) : null;
  if (uri) return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: pastel(name) }} contentFit="cover" transition={120} />;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: pastel(name), alignItems: 'center', justifyContent: 'center' }}>
      <Text maxFontSizeMultiplier={1} style={ft(Math.round(size * 0.33), 8, '#14161c')}>
        {initials(name)}
      </Text>
    </View>
  );
}

/* ---------------- logo ---------------- */
/** The bag and the word side by side, sitting on the same line. */
export function Lockup({ mark = 92, word = 74, gap = 16 }: { mark?: number; word?: number; gap?: number }) {
  const t = useG();
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="getit" style={{ flexDirection: 'row', alignItems: 'flex-end', gap }}>
      <Mark height={mark} />
      <Word height={word} color={t.text} />
    </View>
  );
}

/* ---------------- the big button ---------------- */
/** Rings that grow out of the big button and fade (it is listening for a tap). `still` shows two quiet rings instead. */
export function BigButton({ label, onPress, still, dim, size = 300, testID, period = 2400, peak = 0.32 }: { label: string; onPress?: () => void; still?: boolean; dim?: boolean; size?: number; testID?: string; /** how long one ring takes to grow, and how strong it starts (listening is faster and stronger) */ period?: number; peak?: number }) {
  const t = useG();
  // the button itself is always 196 wide in the design; a bigger `size` only gives the rings more room
  const core = size >= 300 ? 196 : Math.round(size * (196 / 300));
  const a = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    if (still) return;
    // three rings, each growing for 2.4 s and starting 0.8 s after the one before (as in the design)
    a.forEach((v) => v.setValue(0));
    const runs = a.map((v, i) => Animated.sequence([Animated.delay((i * period) / 3), Animated.loop(Animated.timing(v, { toValue: 1, duration: period, easing: Easing.linear, useNativeDriver: true }))]));
    runs.forEach((r) => r.start());
    return () => runs.forEach((r) => r.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [still, period]);
  const press = usePressOnce(onPress);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {still ? (
        <>
          <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: t.ringB }} />
          <View style={{ position: 'absolute', width: size * (232 / 300), height: size * (232 / 300), borderRadius: size / 2, backgroundColor: t.ringA }} />
        </>
      ) : (
        a.map((v, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: BRAND, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [peak, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [core / size, 1] }) }] }}
          />
        ))
      )}
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={press}
        style={({ pressed }) => ({
          width: core,
          height: core,
          borderRadius: core / 2,
          backgroundColor: dim ? t.card2 : BRAND,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ scale: pressed ? 0.97 : 1 }],
          shadowColor: BRAND,
          shadowOpacity: dim ? 0 : t.bigShadowOp,
          shadowRadius: 25,
          shadowOffset: { width: 0, height: 20 },
          elevation: dim ? 0 : 12,
        })}
      >
        <View style={{ opacity: dim ? 0.5 : 1 }}>
          <Mark height={Math.round(core * (104 / 196) * (150 / 159.6))} color={dim ? t.muted : '#f1efe9'} />
        </View>
      </Pressable>
    </View>
  );
}

/* ---------------- list row ---------------- */
/** One line in a settings list: a label, an optional value, and an arrow. */
export function MenuRow({ label, value, onPress, color, testID, last }: { label: string; value?: string; onPress?: () => void; color?: string; testID?: string; last?: boolean }) {
  const t = useG();
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={() => (tap(), onPress?.())} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6, paddingHorizontal: 2, borderBottomWidth: last ? 0 : 1, borderBottomColor: t.line, opacity: pressed ? 0.6 : 1 })}>
      <Text maxFontSizeMultiplier={1.3} style={[ft(15, 8, color || t.text), { flex: 1 }]}>
        {label}
      </Text>
      {value ? (
        <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[ft(14, 5, t.muted), { maxWidth: '55%' }]}>
          {value}
        </Text>
      ) : null}
      <GIcon name="chev" size={18} color={t.muted} />
    </Pressable>
  );
}

/* ---------------- bottom sheet ---------------- */
type SheetState = { render: (() => ReactNode) | null; key: number };
let sheetState: SheetState = { render: null, key: 0 };
const sheetSubs = new Set<() => void>();
const emit = () => sheetSubs.forEach((f) => f());
/** One sheet at a time, sliding up from the bottom. `gsheet.show(() => <Content />)`. */
export const gsheet = {
  show(render: () => ReactNode) {
    sheetState = { render, key: sheetState.key + 1 };
    emit();
  },
  close() {
    if (!sheetState.render) return;
    Keyboard.dismiss();
    sheetState = { render: null, key: sheetState.key };
    emit();
  },
  isOpen: () => !!sheetState.render,
};
/** Put once at the top of the app (see app/_layout.tsx). */
export function GSheetHost() {
  const [, tick] = useReducer((x: number) => x + 1, 0);
  const t = useG();
  const ins = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const y = useRef(new Animated.Value(0)).current;
  const shown = useRef<SheetState>({ render: null, key: 0 });
  useEffect(() => {
    const f = () => {
      if (sheetState.render) {
        shown.current = sheetState;
        tick();
        Animated.timing(y, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      } else {
        Animated.timing(y, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
          if (!sheetState.render) {
            shown.current = { render: null, key: shown.current.key };
            tick();
          }
        });
      }
    };
    sheetSubs.add(f);
    return () => {
      sheetSubs.delete(f);
    };
  }, [y]);
  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!sheetState.render) return false;
      gsheet.close();
      return true;
    });
    return () => h.remove();
  }, []);
  // forms in a sheet stay above the keyboard
  const [kb, setKb] = useState(0);
  useEffect(() => {
    const a = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKb(e?.endCoordinates?.height || 0));
    const b = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);
  const s = shown.current;
  if (!s.render) return null;
  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={() => gsheet.close()}>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: t.scrim, opacity: y }}>
        <Pressable accessibilityLabel="Close" style={{ flex: 1 }} onPress={() => gsheet.close()} />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: kb,
          maxHeight: height - ins.top - 24 - kb,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          backgroundColor: t.sheet,
          transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) }],
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -10 },
          elevation: 24,
        }}
      >
        <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: t.line, alignSelf: 'center', marginTop: 10, marginBottom: 18 }} />
        <ScrollView key={s.key} bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: kb ? 20 : 30 + ins.bottom }}>
          {s.render()}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}
