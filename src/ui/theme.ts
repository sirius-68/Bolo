import { useSyncExternalStore } from 'react';
import { Platform, StyleSheet, TextStyle } from 'react-native';

/** Colours for the screens that still use the first building blocks (src/g has the newer tokens).
    The names are the old ones but the values are getit's: `yellow` is the old accent's name and holds the brand
    red; `onAccent` is the text colour on top of it. The table follows the look chosen in You → Appearance:
    `paint()` swaps the values and the app redraws, so every one of these screens works in dark and in light. */
const DARK = {
  dark: true as boolean,
  bg: '#171615',
  s1: '#211f1d',
  s2: '#2b2926',
  s3: '#363330',
  line: '#363330',
  yellow: '#ff3b1f',
  onAccent: '#ffffff',
  red: '#e02f17',
  blue: '#3d5af1',
  lav: '#ff6a52',
  orange: '#f47b3b',
  pink: '#f6a4b4',
  ok: '#2fb36d',
  mint: '#7be0a7',
  err: '#ff6b6b',
  errSoft: '#ff9b9b',
  peach: '#ffb37a',
  text: '#f1efe9',
  muted: '#a8a39b',
  faint: '#6f6a62',
  white: '#ffffff',
  black: '#000000',
  /** a veil over the page colour: pressed rows, soft chips */
  veil: 'rgba(255,255,255,.08)',
  veil2: 'rgba(255,255,255,.16)',
};
const LIGHT: typeof DARK = {
  dark: false,
  bg: '#f1efe9',
  s1: '#fbfaf7',
  s2: '#e6e2d7',
  s3: '#d8d3c6',
  line: '#ddd8cc',
  yellow: '#ff3b1f',
  onAccent: '#ffffff',
  red: '#e02f17',
  blue: '#3d5af1',
  lav: '#c42a12',
  orange: '#c2571c',
  pink: '#b8516a',
  ok: '#1f9d55',
  mint: '#17824a',
  err: '#d92d20',
  errSoft: '#b42318',
  peach: '#b45f1f',
  text: '#111111',
  muted: '#5f5a52',
  faint: '#8a857c',
  white: '#ffffff',
  black: '#000000',
  veil: 'rgba(17,17,17,.06)',
  veil2: 'rgba(17,17,17,.12)',
};
export const C: typeof DARK = { ...DARK };
/** Switch every colour in the table to the dark or the light set (src/g/theme calls this when the look changes). */
export function paint(look: 'dark' | 'light') {
  Object.assign(C, look === 'light' ? LIGHT : DARK);
  painted++;
  watchers.forEach((f) => f());
}
let painted = 0;
const watchers = new Set<() => void>();
const watch = (f: () => void) => {
  watchers.add(f);
  return () => {
    watchers.delete(f);
  };
};
/** For the few pieces that remember their last drawing (icons, avatars): redraw when the look changes. */
export function useLook() {
  return useSyncExternalStore(watch, () => painted, () => painted);
}

export const R = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 } as const;

export type Weight = 5 | 6 | 7 | 8;
export const FONT: Record<Weight, string> = {
  5: 'PlusJakartaSans_500Medium',
  6: 'PlusJakartaSans_600SemiBold',
  7: 'PlusJakartaSans_700Bold',
  8: 'PlusJakartaSans_800ExtraBold',
};

/** Text style for a size + weight. Uses the right font file per weight (Android ignores fontWeight for custom fonts). */
export function tx(size: number, w: Weight = 5, color: string = C.text, extra?: TextStyle): TextStyle {
  return {
    fontFamily: FONT[w],
    fontSize: size,
    lineHeight: Math.round(size * (size >= 22 ? 1.15 : 1.42)),
    color,
    letterSpacing: size >= 20 ? -0.4 : -0.05,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
    ...extra,
  };
}

export const S = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  rowB: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

export const hit = { top: 8, bottom: 8, left: 8, right: 8 };
