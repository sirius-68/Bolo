import { Platform, StyleSheet, TextStyle } from 'react-native';

/** Colours for the screens not yet rebuilt in the getit design (src/g has the new tokens, in dark and light).
    These keep the old names but carry getit's dark palette, so every screen already belongs to the same app:
    `yellow` is the old accent's name and now holds the brand red; `onAccent` is the text colour on top of it. */
export const C = {
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
} as const;

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
