/* Larger pieces that several screens share: the halo behind a big icon, pulsing rings, a details card,
   a screen's top row. Sizes follow the design canvas. */
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, RefreshControl, StyleProp, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GIcon, GIconName, Mark } from './icons';
import { BRAND, RED, useG } from './theme';
import { goBack, tap } from './touch';
import { Round, T } from './ui';

/** Two quiet rings behind a round centre (a tick, a calendar, the logo). `size` is the outer ring. */
export function Halo({ size = 170, core = 80, children, color = RED }: { size?: number; core?: number; children?: ReactNode; color?: string }) {
  const t = useG();
  const mid = Math.round(size * 0.706);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: t.ringB }} />
      <View style={{ position: 'absolute', width: mid, height: mid, borderRadius: mid / 2, backgroundColor: t.ringA }} />
      <View style={{ width: core, height: core, borderRadius: core / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

/** Rings that grow out from behind the centre and fade, while something is going on (searching, ringing, working). */
export function Pulse({ size = 220, core = 116, rings = 2, period = 2200, peak = 0.3, on = true, children }: { size?: number; core?: number; rings?: number; period?: number; peak?: number; on?: boolean; children?: ReactNode }) {
  const vals = useRef(Array.from({ length: 3 }, () => new Animated.Value(0))).current;
  useEffect(() => {
    if (!on) return;
    const runs = vals.slice(0, rings).map((v, i) => {
      v.setValue(0);
      return Animated.sequence([Animated.delay((i * period) / rings), Animated.loop(Animated.timing(v, { toValue: 1, duration: period, easing: Easing.out(Easing.quad), useNativeDriver: true }))]);
    });
    runs.forEach((r) => r.start());
    return () => runs.forEach((r) => r.stop());
  }, [on, rings, period, vals]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {on
        ? vals.slice(0, rings).map((v, i) => (
            <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', width: core, height: core, borderRadius: core / 2, backgroundColor: BRAND, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [peak, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, size / core] }) }] }} />
          ))
        : null}
      {children}
    </View>
  );
}
/** The round red centre with the logo in it (searching, the agent). */
export function LogoDot({ size = 116 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }}>
      <Mark height={Math.round(size * 0.5)} color="#f1efe9" />
    </View>
  );
}

/** The small red line above a title ("3 PLUMBERS NEAR YOU", "NEW JOB · 1.1 KM AWAY"). */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <T s={13} w={8} c="accent" ls={0.4} style={{ textTransform: 'uppercase' }}>
      {children}
    </T>
  );
}

/** A card: rounded, on the card colour, with a hairline. */
export function Card({ children, style, r = 20, pad = 16 }: { children: ReactNode; style?: StyleProp<ViewStyle>; r?: number; pad?: number }) {
  const t = useG();
  return <View style={[{ padding: pad, borderRadius: r, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }, style]}>{children}</View>;
}

/** Label-and-value lines in one card (What, When, Where, Price). Empty values are left out. */
export function Details({ rows, style, sheet }: { rows: [string, string | undefined | null, string?][]; style?: StyleProp<ViewStyle>; /** inside a sheet: one line each, on the darker card */ sheet?: boolean }) {
  const t = useG();
  const list = rows.filter((r) => !!r[1]);
  if (sheet)
    return (
      <View style={[{ paddingHorizontal: 16, paddingVertical: 4, borderRadius: 20, backgroundColor: t.card2 }, style]}>
        {list.map(([label, value], i) => (
          <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 48, borderBottomWidth: i < list.length - 1 ? 1 : 0, borderBottomColor: t.line }}>
            <T s={14} c="muted">
              {label}
            </T>
            <T s={15} w={8} style={{ flexShrink: 1, textAlign: 'right' }}>
              {value}
            </T>
          </View>
        ))}
      </View>
    );
  return (
    <View style={[{ paddingHorizontal: 16, paddingVertical: 4, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }, style]}>
      {list.map(([label, value, sub], i) => (
        <View key={label} style={{ paddingVertical: 12, borderBottomWidth: i < list.length - 1 ? 1 : 0, borderBottomColor: t.line }}>
          <T s={12} w={7} c="muted">
            {label}
          </T>
          <T s={15} w={7} style={{ marginTop: 2 }}>
            {value}
          </T>
          {sub ? (
            <T s={13} c="muted" style={{ marginTop: 2 }}>
              {sub}
            </T>
          ) : null}
        </View>
      ))}
    </View>
  );
}

/** The top row of a screen: a round back (or close) button on the left, something optional on the right. */
export function Top({ close, onBack, right, title, pad = 20 }: { close?: boolean; onBack?: () => void; right?: ReactNode; title?: string; pad?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: pad, minHeight: 44 }}>
      <Round testID={close ? 'top-close' : 'top-back'} icon={close ? 'x' : 'back'} label={close ? 'Close' : 'Back'} onPress={onBack || goBack} />
      {title ? (
        <T s={16} w={8}>
          {title}
        </T>
      ) : null}
      {right || <View style={{ width: 44 }} />}
    </View>
  );
}

/** A whole "it happened" screen: a halo with an icon, a title, a line, optional cards, and buttons at the bottom. */
export function Moment({ icon, big, title, sub, children, foot, halo = 170, core = 80, quiet }: { icon?: GIconName; big?: ReactNode; title: string; sub?: string; children?: ReactNode; foot: ReactNode; halo?: number; core?: number; /** a grey circle instead of the red halo (cancelled) */ quiet?: boolean }) {
  const t = useG();
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + 40, paddingHorizontal: 20, paddingBottom: ins.bottom + 28 }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {quiet ? (
          <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: t.card2, alignItems: 'center', justifyContent: 'center' }}>{icon ? <GIcon name={icon} size={40} color={t.muted} /> : null}</View>
        ) : (
          <Halo size={halo} core={core}>
            {big || (icon ? <GIcon name={icon} size={Math.round(core * 0.48)} color="#ffffff" sw={2.6} /> : null)}
          </Halo>
        )}
        <T s={26} w={8} lh={1.2} ls={-0.6} center style={{ marginTop: 16, marginBottom: 6 }}>
          {title}
        </T>
        {sub ? (
          <T s={15} lh={1.5} c="muted" center style={{ maxWidth: 290 }}>
            {sub}
          </T>
        ) : null}
        {children ? <View style={{ alignSelf: 'stretch', marginTop: 22, gap: 10 }}>{children}</View> : null}
      </View>
      {foot}
    </View>
  );
}
/** A small card on a "moment" screen: a grey label and a bold line. */
export function Fact({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card pad={0} style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
      <T s={12} w={7} c="muted">
        {label}
      </T>
      <T s={16} w={8} style={{ marginTop: 4 }}>
        {value}
      </T>
      {sub ? (
        <T s={14} c="muted" style={{ marginTop: 2 }}>
          {sub}
        </T>
      ) : null}
    </Card>
  );
}

/** On or off (48 × 28). */
export function Switch({ on }: { on: boolean }) {
  const t = useG();
  return (
    <View style={{ width: 48, height: 28, borderRadius: 14, backgroundColor: on ? RED : t.line }}>
      <View style={{ position: 'absolute', top: 2, left: on ? 22 : 2, width: 24, height: 24, borderRadius: 12, backgroundColor: '#ffffff' }} />
    </View>
  );
}
/** A row with a title, a line under it and a switch, in a card. */
export function SwitchCard({ title, sub, on, onChange, testID, style }: { title: string; sub?: string; on: boolean; onChange: (v: boolean) => void; testID?: string; style?: StyleProp<ViewStyle> }) {
  const t = useG();
  return (
    <Pressable testID={testID} accessibilityRole="switch" accessibilityState={{ checked: on }} onPress={() => (tap(), onChange(!on))} style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: t.line, backgroundColor: t.card }, style]}>
      <View style={{ flex: 1, gap: 2 }}>
        <T s={15} w={8}>
          {title}
        </T>
        {sub ? (
          <T s={13} c="muted">
            {sub}
          </T>
        ) : null}
      </View>
      <Switch on={on} />
    </Pressable>
  );
}
/** One choice in a list where only one can be picked. */
export function RadioRow({ label, on, onPress, testID }: { label: string; on: boolean; onPress: () => void; testID?: string }) {
  const t = useG();
  return (
    <Pressable testID={testID} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => (tap(), onPress())} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingVertical: 6, paddingHorizontal: 2, borderBottomWidth: 1, borderBottomColor: t.line }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? RED : t.line, alignItems: 'center', justifyContent: 'center' }}>{on ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: RED }} /> : null}</View>
      <T s={15} w={7} style={{ flex: 1 }}>
        {label}
      </T>
    </Pressable>
  );
}
/** A soft note with an icon (privacy, how paying works). */
export function Hint({ icon = 'shield', children, style }: { icon?: GIconName; children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useG();
  return (
    <View style={[{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }, style]}>
      <View style={{ marginTop: 1 }}>
        <GIcon name={icon} size={18} color={t.muted} />
      </View>
      <T s={13} lh={1.5} c="muted" style={{ flex: 1 }}>
        {children}
      </T>
    </View>
  );
}

/** Pull down to load again. */
export function Pull(props: any) {
  const [busy, setBusy] = useState(false);
  return (
    <RefreshControl
      {...props}
      refreshing={busy}
      tintColor={BRAND}
      colors={['#ffffff']}
      progressBackgroundColor={RED}
      onRefresh={async () => {
        setBusy(true);
        try {
          await require('../logic/server').loadAll(true);
        } finally {
          setBusy(false);
        }
      }}
    />
  );
}
/** A whole screen saying something is no longer there, with a way back. */
export function Gone({ title, text }: { title: string; text?: string }) {
  const t = useG();
  const ins = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: ins.top + 16 }}>
      <Top />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 }}>
        <T s={20} w={8} center>
          {title}
        </T>
        {text ? (
          <T s={15} lh={1.5} c="muted" center>
            {text}
          </T>
        ) : null}
      </View>
    </View>
  );
}
