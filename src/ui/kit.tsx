import React, { memo, ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardTypeOptions,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IMG } from '../data/images';
import { Icon } from './Icon';
import { C, R, S, tx, Weight, hit } from './theme';

/* ---------------- text ---------------- */
type TxtProps = {
  s?: number;
  w?: Weight;
  c?: string;
  center?: boolean;
  lines?: number;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
  onPress?: () => void;
  selectable?: boolean;
};
export function Txt({ s = 14, w = 5, c = C.text, center, lines, style, children, onPress, selectable }: TxtProps) {
  return (
    <Text
      onPress={onPress}
      selectable={selectable}
      numberOfLines={lines}
      style={[tx(s, w, c), center && { textAlign: 'center' }, style]}
    >
      {children}
    </Text>
  );
}
/** Bold inline span inside a Txt. */
export const B = ({ children, c = C.text }: { children: ReactNode; c?: string }) => (
  <Text style={{ fontFamily: 'PlusJakartaSans_800ExtraBold', color: c }}>{children}</Text>
);

export const tap = () => Haptics.selectionAsync().catch(() => {});

/* ---------------- images ---------------- */
/** A picture reference: an IMG key ("faces/samuel"), a uri ("uri:file://…") or a generated logo ("logo:NX|#3d5af1|#fff"). */
export type Pic = string;
export function picSource(p?: Pic | null) {
  if (!p) return IMG['img/me'];
  if (p.startsWith('uri:')) return { uri: p.slice(4) };
  return IMG[p] ?? IMG['img/me'];
}
export const logoPic = (t: string, bg: string, fg = '#000') => `logo:${t}|${bg}|${fg}`;

export const Avatar = memo(function Avatar({
  pic,
  size = 44,
  square,
  ring,
  style,
}: {
  pic?: Pic | null;
  size?: number;
  square?: boolean;
  ring?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const rad = square ? Math.round(size * 0.28) : size / 2;
  const box: ViewStyle = {
    width: size,
    height: size,
    borderRadius: rad,
    overflow: 'hidden',
    backgroundColor: C.s3,
    ...(ring ? { borderWidth: 2, borderColor: ring } : null),
  };
  if (pic && pic.startsWith('logo:')) {
    const [t, bg, fg] = pic.slice(5).split('|');
    return (
      <View style={[box, { backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }, style]}>
        <Text style={tx(Math.round(size * (t.length > 2 ? 0.28 : 0.36)), 8, fg || '#000', { letterSpacing: 0 })}>{t}</Text>
      </View>
    );
  }
  return (
    <View style={[box, style]}>
      <Image source={picSource(pic)} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={0} recyclingKey={pic || 'me'} />
    </View>
  );
});

export function Pict({ pic, style, fit = 'cover' }: { pic: Pic; style?: any; fit?: 'cover' | 'contain' }) {
  return <Image source={picSource(pic)} style={style} contentFit={fit} transition={0} />;
}

/* ---------------- buttons ---------------- */
type BtnVariant = 'white' | 'yellow' | 'ghost' | 'dark' | 'soft' | 'danger' | 'blue';
export function Btn({
  title,
  onPress,
  variant = 'white',
  icon,
  disabled,
  loading,
  style,
  small,
  testID,
}: {
  title: string;
  onPress?: () => void;
  variant?: BtnVariant;
  icon?: string;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
  testID?: string;
}) {
  const bg = {
    white: C.white,
    yellow: C.yellow,
    ghost: 'transparent',
    dark: C.s2,
    soft: C.s2,
    danger: C.err,
    blue: C.blue,
  }[variant];
  const fg = variant === 'ghost' || variant === 'dark' || variant === 'soft' || variant === 'danger' || variant === 'blue' ? C.white : C.black;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          height: small ? 44 : 52,
          borderRadius: R.pill,
          backgroundColor: bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 18,
          opacity: disabled ? 0.35 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        variant === 'ghost' && { borderWidth: 1.5, borderColor: C.s3 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Icon name={icon} size={18} color={fg} /> : null}
      <Text style={tx(small ? 13 : 14, 7, fg)} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

/** Small pill action ("Hire", "Send offer"). */
export function Pill({
  title,
  onPress,
  on,
  kind = 'y',
  style,
  icon,
  disabled,
}: {
  title: string;
  onPress?: () => void;
  on?: boolean;
  kind?: 'y' | 'outline' | 'dim' | 'white' | 'black' | 'red';
  style?: StyleProp<ViewStyle>;
  icon?: string;
  disabled?: boolean;
}) {
  const k = on ? 'white' : kind;
  const bg = { y: C.yellow, outline: 'transparent', dim: C.s2, white: C.white, black: C.black, red: 'transparent' }[k];
  const fg = { y: C.black, outline: C.white, dim: C.white, white: C.black, black: C.white, red: C.errSoft }[k];
  return (
    <Pressable
      disabled={disabled}
      hitSlop={6}
      onPress={(e) => {
        e?.stopPropagation?.();
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          height: 34,
          paddingHorizontal: 16,
          borderRadius: R.pill,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
          opacity: disabled ? 0.4 : pressed ? 0.85 : 1,
        },
        (k === 'outline' || k === 'red') && { borderWidth: 1.5, borderColor: k === 'red' ? C.errSoft : C.s3 },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={14} color={fg} /> : null}
      <Text style={tx(12, 8, fg)} numberOfLines={1}>
        {title}
      </Text>
    </Pressable>
  );
}

export function IconBtn({
  name,
  onPress,
  ring,
  dot,
  count,
  size = 44,
  bg,
  color = C.text,
  label,
  style,
  testID,
}: {
  name: string;
  onPress?: () => void;
  ring?: boolean;
  dot?: boolean;
  count?: number;
  size?: number;
  bg?: string;
  color?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={4}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: pressed ? C.s2 : bg || 'transparent',
        },
        ring && { borderWidth: 1.5, borderColor: C.s3 },
        style,
      ]}
    >
      <Icon name={name} size={Math.round(size * 0.48)} color={color} />
      {dot ? <View style={st.dot} /> : null}
      {count ? (
        <View style={st.count}>
          <Text style={tx(10, 8, C.black, { lineHeight: 13 })}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function TextLink({ title, onPress, style, s = 13, testID }: { title: string; onPress?: () => void; style?: any; s?: number; testID?: string }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" hitSlop={hit} onPress={onPress} style={style}>
      <Text style={tx(s, 7, C.lav)}>{title}</Text>
    </Pressable>
  );
}

/* ---------------- chips ---------------- */
export function Chip({
  label,
  on,
  onPress,
  icon,
  small,
  tone = 'blue',
  style,
}: {
  label: string;
  on?: boolean;
  onPress?: () => void;
  icon?: string;
  small?: boolean;
  tone?: 'blue' | 'yellow' | 'white';
  style?: StyleProp<ViewStyle>;
}) {
  const onBg = tone === 'yellow' ? C.yellow : tone === 'white' ? C.white : C.blue;
  const onFg = tone === 'blue' ? C.white : C.black;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[
        {
          height: small ? 34 : 40,
          paddingHorizontal: small ? 12 : 16,
          borderRadius: R.pill,
          backgroundColor: on ? onBg : C.s2,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
        },
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={small ? 14 : 16} color={on ? onFg : C.text} /> : null}
      <Text style={tx(small ? 12 : 13, 7, on ? onFg : C.text)} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
export function Chips({ children, style, scroll }: { children: ReactNode; style?: StyleProp<ViewStyle>; scroll?: boolean }) {
  if (scroll)
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={[{ gap: 8, paddingHorizontal: 20 }, style]}>
        {children}
      </ScrollView>
    );
  return <View style={[{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, style]}>{children}</View>;
}
/** Single choice chips. */
export function ChoiceChips<T extends string | number>({
  options,
  value,
  onChange,
  small,
  labels,
}: {
  options: readonly T[];
  value: T | null | undefined;
  onChange: (v: T) => void;
  small?: boolean;
  labels?: (v: T) => string;
}) {
  return (
    <Chips>
      {options.map((o) => (
        <Chip key={String(o)} small={small} label={labels ? labels(o) : String(o)} on={value === o} onPress={() => onChange(o)} />
      ))}
    </Chips>
  );
}
/** Multi choice chips. */
export function MultiChips({
  options,
  value,
  onToggle,
  small,
  check,
}: {
  options: readonly string[];
  value: Set<string> | string[];
  onToggle: (v: string) => void;
  small?: boolean;
  check?: boolean;
}) {
  const has = (o: string) => (value instanceof Set ? value.has(o) : value.includes(o));
  return (
    <Chips>
      {options.map((o) => (
        <Chip key={o} small={small} label={check ? `${has(o) ? '✓ ' : ''}${o}` : o} on={has(o)} onPress={() => onToggle(o)} />
      ))}
    </Chips>
  );
}

/* ---------------- segmented & tabs ---------------- */
export function Seg<T extends string>({ items, value, onChange, style }: { items: [T, string][]; value: T; onChange: (v: T) => void; style?: any }) {
  return (
    <View style={[{ flexDirection: 'row', padding: 4, borderRadius: 12, backgroundColor: C.s2, gap: 4 }, style]}>
      {items.map(([k, l]) => (
        <Pressable
          key={k}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === k }}
          onPress={() => {
            tap();
            onChange(k);
          }}
          style={{ flex: 1, height: 36, borderRadius: 9, backgroundColor: value === k ? C.blue : 'transparent', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={tx(13, 7, value === k ? C.white : C.muted)} numberOfLines={1}>
            {l}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
/** Scrollable pill tabs with optional counts. */
export function PTabs<T extends string>({
  items,
  value,
  onChange,
  style,
  light,
}: {
  items: [T, string, (number | null)?][];
  value: T;
  onChange: (v: T) => void;
  style?: any;
  light?: boolean;
}) {
  return (
    // The rounded frame stays inside the screen; only the tabs scroll inside it when they don't fit.
    <View style={[{ flexGrow: 0, borderRadius: R.pill, backgroundColor: C.s1, borderWidth: 1, borderColor: C.line, overflow: 'hidden' }, style]}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ padding: 4, gap: 4, flexGrow: 1 }}
    >
      {items.map(([k, l, n]) => {
        const on = value === k;
        return (
          <Pressable
            key={k}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(k);
            }}
            style={{ flexGrow: 1, height: 38, paddingHorizontal: 14, borderRadius: R.pill, backgroundColor: on ? (light ? C.yellow : C.white) : 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={tx(13, 7, on ? C.black : C.muted)}>{l}</Text>
            {n != null ? <Text style={tx(12, 6, on ? 'rgba(0,0,0,.55)' : 'rgba(141,141,149,.7)', { marginLeft: 5 })}>{n}</Text> : null}
          </Pressable>
        );
      })}
    </ScrollView>
    </View>
  );
}

/* ---------------- form ---------------- */
export function Label({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={[S.rowB, { marginBottom: 8, marginLeft: 4 }]}>
      <Text style={tx(12, 6, C.muted)}>{children}</Text>
      {right}
    </View>
  );
}
export const Opt = () => <Text style={tx(12, 6, C.faint)}> · optional</Text>;

export function Field({ label, children, error, hint, style }: { label?: ReactNode; children: ReactNode; error?: string | false | null; hint?: ReactNode; style?: any }) {
  return (
    <View style={style}>
      {label ? <Label>{label}</Label> : null}
      {children}
      {error ? <Text style={tx(12, 6, C.err, { marginTop: 6, marginLeft: 4 })}>{error}</Text> : null}
      {hint && !error ? <View style={{ marginTop: 6, marginLeft: 4 }}>{typeof hint === 'string' ? <Text style={tx(12, 5, C.muted)}>{hint}</Text> : hint}</View> : null}
    </View>
  );
}

export type InputProps = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  icon?: string;
  prefix?: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  invalid?: boolean;
  right?: ReactNode;
  onSubmit?: () => void;
  style?: any;
  inputStyle?: any;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  testID?: string;
  minHeight?: number;
  returnKeyType?: 'done' | 'next' | 'search' | 'send' | 'go';
  editable?: boolean;
};
export function Input(p: InputProps) {
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  const multi = p.multiline;
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: multi ? 'flex-start' : 'center',
          gap: 10,
          minHeight: multi ? p.minHeight || 96 : 54,
          paddingHorizontal: 16,
          paddingVertical: multi ? 12 : 0,
          borderRadius: R.md,
          backgroundColor: C.s2,
          borderWidth: 1.5,
          borderColor: p.invalid ? C.err : focus ? C.blue : 'transparent',
        },
        p.style,
      ]}
    >
      {p.icon ? <Icon name={p.icon} size={20} color={C.muted} /> : null}
      {p.prefix ? (
        <Text style={tx(15, 7, C.muted, { paddingRight: 10, borderRightWidth: 1, borderRightColor: C.s3 })}>{p.prefix}</Text>
      ) : null}
      <TextInput
        testID={p.testID}
        value={p.value}
        onChangeText={p.onChangeText}
        placeholder={p.placeholder}
        placeholderTextColor={C.faint}
        secureTextEntry={p.secure && !show}
        keyboardType={p.keyboardType}
        multiline={multi}
        numberOfLines={multi ? undefined : 1}
        maxLength={p.maxLength}
        autoFocus={p.autoFocus}
        editable={p.editable}
        autoCapitalize={p.autoCapitalize ?? (p.keyboardType === 'email-address' || p.secure ? 'none' : 'sentences')}
        autoCorrect={!(p.secure || p.keyboardType === 'email-address')}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        onSubmitEditing={p.onSubmit}
        returnKeyType={p.returnKeyType}
        blurOnSubmit={!multi}
        selectionColor={C.yellow}
        style={[
          tx(15, 6, C.text),
          { flex: 1, paddingVertical: multi ? 2 : 0, minHeight: multi ? (p.minHeight || 96) - 24 : 50, maxHeight: multi ? undefined : 50, textAlignVertical: multi ? 'top' : 'center' },
          p.inputStyle,
        ]}
      />
      {p.secure ? (
        <Pressable hitSlop={hit} accessibilityLabel={show ? 'Hide password' : 'Show password'} onPress={() => setShow(!show)}>
          <Icon name={show ? 'eyeoff' : 'eye'} size={20} color={C.muted} />
        </Pressable>
      ) : null}
      {p.right}
    </View>
  );
}

/** Looks like an input; opens a picker sheet. */
export function SelectBox({ value, placeholder, icon, onPress, invalid, testID }: { value?: string; placeholder?: string; icon?: string; onPress: () => void; invalid?: boolean; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 54,
        paddingHorizontal: 16,
        borderRadius: R.md,
        backgroundColor: C.s2,
        borderWidth: 1.5,
        borderColor: invalid ? C.err : 'transparent',
      }}
    >
      {icon ? <Icon name={icon} size={20} color={C.muted} /> : null}
      <Text style={[tx(15, 6, value ? C.text : C.faint), { flex: 1 }]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <Icon name="down" size={16} color={C.muted} />
    </Pressable>
  );
}

export function Check({ on, onPress, children }: { on: boolean; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 4 }} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
      <View style={{ width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: on ? C.yellow : C.s3, backgroundColor: on ? C.yellow : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {on ? <Icon name="check" size={14} color="#000" /> : null}
      </View>
      <Text style={[tx(13, 5, C.muted), { flex: 1 }]}>{children}</Text>
    </Pressable>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  const a = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(a, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [value]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={8}
      onPress={() => {
        tap();
        onChange(!value);
      }}
    >
      <Animated.View
        style={{
          width: 48,
          height: 28,
          borderRadius: 14,
          padding: 3,
          backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: [C.s3, C.yellow] }) as any,
        }}
      >
        <Animated.View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: ['#fff', '#000'] }) as any,
            transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }],
          }}
        />
      </Animated.View>
    </Pressable>
  );
}
export function SwitchRow({ title, sub, value, onChange, style }: { title: string; sub?: string; value: boolean; onChange: (v: boolean) => void; style?: any }) {
  return (
    <View style={[S.row, { gap: 12, paddingVertical: 12 }, style]}>
      <View style={{ flex: 1 }}>
        <Txt s={14} w={7}>
          {title}
        </Txt>
        {sub ? (
          <Txt s={12} c={C.muted}>
            {sub}
          </Txt>
        ) : null}
      </View>
      <Toggle value={value} onChange={onChange} label={title} />
    </View>
  );
}

export function Stepper({ text, onMinus, onPlus }: { text: string; onMinus: () => void; onPlus: () => void }) {
  const b = (t: string, f: () => void, l: string) => (
    <Pressable
      accessibilityLabel={l}
      onPress={() => {
        tap();
        f();
      }}
      style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: C.s3, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={tx(20, 7)}>{t}</Text>
    </Pressable>
  );
  return (
    <View style={[S.rowB, { height: 54, borderRadius: R.md, backgroundColor: C.s2, paddingHorizontal: 8 }]}>
      {b('−', onMinus, 'Less')}
      <Txt s={16} w={8}>
        {text}
      </Txt>
      {b('+', onPlus, 'More')}
    </View>
  );
}

/* ---------------- status & feedback ---------------- */
export function StatusPill({ text, kind = 'wait', style }: { text: string; kind?: 'acc' | 'wait' | 'urg' | 'blue'; style?: any }) {
  const m = {
    acc: ['rgba(47,179,109,.16)', '#7be0a7'],
    wait: [C.s2, C.muted],
    urg: ['rgba(255,107,107,.15)', C.err],
    blue: ['rgba(169,182,255,.14)', C.lav],
  }[kind];
  return (
    <View style={[{ paddingHorizontal: 10, height: 24, borderRadius: R.pill, backgroundColor: m[0], alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, style]}>
      <Text style={tx(11, 8, m[1])} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}
export function ProTag({ text = 'PRO', small }: { text?: string; small?: boolean }) {
  return (
    <View style={{ paddingHorizontal: small ? 6 : 8, height: small ? 18 : 22, borderRadius: 6, backgroundColor: C.yellow, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
      <Text style={tx(small ? 9 : 10, 8, '#000', { letterSpacing: 0.6 })}>{text}</Text>
    </View>
  );
}
export function CoTag() {
  return (
    <View style={{ paddingHorizontal: 6, height: 18, borderRadius: 5, backgroundColor: 'rgba(169,182,255,.16)', marginLeft: 6, justifyContent: 'center' }}>
      <Text style={tx(10, 8, C.lav)}>Company</Text>
    </View>
  );
}

export function Empty({ title, text, children, style }: { title: string; text?: string; children?: ReactNode; style?: any }) {
  return (
    <View style={[{ paddingVertical: 30, paddingHorizontal: 18, borderRadius: 20, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.s3, alignItems: 'center' }, style]}>
      <Txt s={15} w={8} center>
        {title}
      </Txt>
      {text ? (
        <Txt s={13} c={C.muted} center style={{ marginTop: 4 }}>
          {text}
        </Txt>
      ) : null}
      {children ? <View style={{ marginTop: 12 }}>{children}</View> : null}
    </View>
  );
}

export function Verified({ size = 16 }: { size?: number }) {
  return <Icon name="verified" size={size} color={C.yellow} style={{ marginLeft: 4 }} />;
}
export function Rate({ r, s = 12, c }: { r: number | string; s?: number; c?: string }) {
  return (
    <View style={[S.row, { gap: 3 }]}>
      <Txt s={s} w={8} c={c}>
        {r}
      </Txt>
      <Icon name="star" size={s} color={c || C.yellow} />
    </View>
  );
}
/** "a · b · c" meta line. */
export function Meta({ parts, s = 12, c = C.muted, lines = 1, style }: { parts: (ReactNode | false | null | undefined)[]; s?: number; c?: string; lines?: number; style?: any }) {
  const L = parts.filter((x) => x !== false && x != null && x !== '');
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }, style]}>
      {L.map((p, i) => (
        <React.Fragment key={i}>
          {i ? <Text style={tx(s, 5, c, { marginHorizontal: 5 })}>•</Text> : null}
          {typeof p === 'string' || typeof p === 'number' ? (
            <Text style={tx(s, 5, c)} numberOfLines={lines}>
              {p}
            </Text>
          ) : (
            p
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

export function Bar({ pct, color = C.yellow, h = 4, bg = C.s3, style }: { pct: number; color?: string; h?: number; bg?: string; style?: any }) {
  return (
    <View style={[{ height: h, borderRadius: h, backgroundColor: bg, overflow: 'hidden' }, style]}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: '100%', backgroundColor: color, borderRadius: h }} />
    </View>
  );
}
export function Ring({ pct, size = 64, stroke = 6 }: { pct: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.s3} strokeWidth={stroke} fill="none" />
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.yellow} strokeWidth={stroke} fill="none" strokeDasharray={`${(c * pct) / 100} ${c}`} strokeLinecap="round" />
      </Svg>
      <Txt s={size > 56 ? 15 : 12} w={8}>
        {pct}%
      </Txt>
    </View>
  );
}

export function Kpis({ items, cols = 3 }: { items: [string | number, string, (() => void)?][]; cols?: number }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map(([v, l, f], i) => (
        <Pressable
          key={i}
          disabled={!f}
          onPress={f}
          style={{ flexBasis: `${100 / cols - 3}%`, flexGrow: 1, backgroundColor: C.s1, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.line, alignItems: 'center' }}
        >
          <Txt s={20} w={8}>
            {v}
          </Txt>
          <Txt s={11} c={C.muted} center lines={2}>
            {l}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}

/* ---------------- layout ---------------- */
export function SecHead({ title, action, onAction, style, count }: { title: string; action?: string; onAction?: () => void; style?: any; count?: string | number }) {
  return (
    <View style={[S.rowB, { marginTop: 28, marginBottom: 12 }, style]}>
      <Txt s={18} w={8} style={{ flex: 1 }} lines={1}>
        {title}
      </Txt>
      {count != null ? (
        <Txt s={12} w={7} c={C.muted}>
          {count}
        </Txt>
      ) : null}
      {action ? <TextLink title={action} onPress={onAction} s={12} /> : null}
    </View>
  );
}

/** Top bar: back · centred title · action. */
export function TopBar({
  title,
  right,
  onBack,
  left,
  style,
  noBack,
}: {
  title?: string;
  right?: ReactNode;
  onBack?: () => void;
  left?: ReactNode;
  style?: any;
  noBack?: boolean;
}) {
  return (
    <View style={[{ height: 56, flexDirection: 'row', alignItems: 'center', marginTop: 8 }, style]}>
      <View style={{ width: 88, alignItems: 'flex-start' }}>
        {left ?? (noBack ? null : <IconBtn name="back" label="Back" onPress={onBack || goBack} testID="back" />)}
      </View>
      <View style={{ flex: 1, alignItems: 'center' }}>
        {title ? (
          <Txt s={15} w={8} lines={1}>
            {title}
          </Txt>
        ) : null}
      </View>
      <View style={{ width: 88, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/feed');
}

/** Standard scrolling page with safe-area padding. */
export function Page({
  children,
  scroll = true,
  pad = true,
  bg = C.bg,
  bottom = 24,
  style,
  contentStyle,
  header,
  keyboard,
  refScroll,
}: {
  children: ReactNode;
  scroll?: boolean;
  pad?: boolean;
  bg?: string;
  bottom?: number;
  style?: any;
  contentStyle?: any;
  header?: ReactNode;
  keyboard?: boolean;
  refScroll?: any;
}) {
  const ins = useSafeAreaInsets();
  const inner = { paddingHorizontal: pad ? 20 : 0, paddingBottom: bottom + ins.bottom };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'padding' : undefined} style={[{ flex: 1, backgroundColor: bg, paddingTop: ins.top }, style]}>
      {header ? <View style={{ paddingHorizontal: pad ? 20 : 0 }}>{header}</View> : null}
      {scroll ? (
        <ScrollView
          ref={refScroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[{ flexGrow: 1 }, inner, contentStyle]}
          automaticallyAdjustKeyboardInsets={keyboard}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner, contentStyle]}>{children}</View>
      )}
    </KeyboardAvoidingView>
  );
}

export const Grow = () => <View style={{ flex: 1, minHeight: 16 }} />;
export const Gap = ({ h = 12 }: { h?: number }) => <View style={{ height: h }} />;

export function Title({ children, sm, center, style }: { children: ReactNode; sm?: boolean; center?: boolean; style?: any }) {
  return (
    <Txt s={sm ? 24 : 30} w={8} center={center} style={[{ marginTop: 22, lineHeight: sm ? 28 : 34 }, style]}>
      {children}
    </Txt>
  );
}
export function Sub({ children, center, style }: { children: ReactNode; center?: boolean; style?: any }) {
  return (
    <Txt s={14} c={C.muted} center={center} style={[{ marginTop: 8, maxWidth: 340 }, center && { alignSelf: 'center' }, style]}>
      {children}
    </Txt>
  );
}
export function Fine({ children, style }: { children: ReactNode; style?: any }) {
  return (
    <Txt s={12} c={C.muted} center style={[{ marginTop: 16 }, style]}>
      {children}
    </Txt>
  );
}

/** Progress dashes used in sign-up. */
export function Steps({ total, on, style }: { total: number; on: number; style?: any }) {
  return (
    <View style={[{ flexDirection: 'row', gap: 6, marginTop: 4 }, style]}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: i < on ? C.yellow : C.s3 }} />
      ))}
    </View>
  );
}

/** Row button used in option lists ("opt" in the prototype). */
export function OptRow({
  icon,
  bg = C.yellow,
  title,
  sub,
  onPress,
  chev = true,
  danger,
  right,
  iconColor = '#000',
  testID,
}: {
  icon?: string;
  bg?: string;
  title: ReactNode;
  sub?: ReactNode;
  onPress?: () => void;
  chev?: boolean;
  danger?: boolean;
  right?: ReactNode;
  iconColor?: string;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [S.row, { gap: 14, paddingVertical: 12, paddingHorizontal: 4, borderRadius: 14, backgroundColor: pressed ? C.s2 : 'transparent' }]}
    >
      {icon ? (
        <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? (
          <Txt s={14} w={7} c={danger ? C.errSoft : C.text}>
            {title}
          </Txt>
        ) : (
          title
        )}
        {sub ? (
          typeof sub === 'string' ? (
            <Txt s={12} c={C.muted}>
              {sub}
            </Txt>
          ) : (
            sub
          )
        ) : null}
      </View>
      {right}
      {chev && !right ? <Icon name="chev" size={18} color={C.faint} /> : null}
    </Pressable>
  );
}

/** Card-like row with picture, title, meta and trailing element. */
export function Row({
  pic,
  square,
  title,
  sub,
  right,
  onPress,
  size = 44,
  icon,
  style,
  children,
}: {
  pic?: Pic | null;
  square?: boolean;
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
  size?: number;
  icon?: string;
  style?: any;
  children?: ReactNode;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: pressed ? C.s2 : C.s1, borderWidth: 1, borderColor: C.line }, style]}
    >
      {icon ? (
        <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: C.s2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon} size={20} color={C.yellow} />
        </View>
      ) : pic !== undefined ? (
        <Avatar pic={pic} size={size} square={square} />
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        {typeof title === 'string' ? (
          <Txt s={14} w={8} lines={1}>
            {title}
          </Txt>
        ) : (
          title
        )}
        {sub ? (
          typeof sub === 'string' ? (
            <Txt s={12} c={C.muted} lines={2}>
              {sub}
            </Txt>
          ) : (
            sub
          )
        ) : null}
        {children}
      </View>
      {right}
    </Pressable>
  );
}

export function Note({ icon = 'lock', children, style, color = C.lav }: { icon?: string; children: ReactNode; style?: any; color?: string }) {
  return (
    <View style={[{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, backgroundColor: C.s1, alignItems: 'flex-start' }, style]}>
      <Icon name={icon} size={16} color={color} style={{ marginTop: 2 }} />
      <Text style={[tx(12.5, 5, C.muted), { flex: 1 }]}>{children}</Text>
    </View>
  );
}

/** Big illustrated circle used at the top of dialogs ("alert-ill"). */
export function AlertIll({ icon, bg = C.yellow, color = '#000' }: { icon: string; bg?: string; color?: string }) {
  return (
    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: bg, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginTop: 4, marginBottom: 10 }}>
      <Icon name={icon} size={30} color={color} />
    </View>
  );
}

export const st = StyleSheet.create({
  dot: { position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: C.yellow, borderWidth: 2, borderColor: '#000' },
  count: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: C.yellow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
});

/** Text with <b>bold</b> segments (used for activity logs and notifications). */
export function Rich({ text, s = 13, c = C.text, lines, style }: { text: string; s?: number; c?: string; lines?: number; style?: any }) {
  const parts = String(text || '').split(/(<b>.*?<\/b>)/g).filter(Boolean);
  return (
    <Txt s={s} c={c} lines={lines} style={style}>
      {parts.map((p, i) =>
        p.startsWith('<b>') ? (
          <Txt key={i} s={s} w={8} c={C.text}>
            {p.slice(3, -4)}
          </Txt>
        ) : (
          p.replace(/<[^>]+>/g, '')
        ),
      )}
    </Txt>
  );
}
