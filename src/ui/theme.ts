import { Platform, StyleSheet, TextStyle } from 'react-native';

/** Design tokens — same values as the bolo prototype (index.html :root). */
export const C = {
  bg: '#000000',
  s1: '#121214',
  s2: '#1c1c1f',
  s3: '#2a2a2e',
  line: '#26262a',
  yellow: '#f6ee5c',
  yellowH: '#fff46e',
  blue: '#3d5af1',
  blueD: '#2f49d8',
  lav: '#a9b6ff',
  orange: '#f47b3b',
  pink: '#f6a4b4',
  ok: '#2fb36d',
  mint: '#7be0a7',
  err: '#ff6b6b',
  errSoft: '#ff9b9b',
  peach: '#ffb37a',
  text: '#ffffff',
  muted: '#8d8d95',
  faint: '#5d5d64',
  white: '#ffffff',
  black: '#000000',
} as const;

export const R = { sm: 12, md: 16, lg: 20, xl: 24, pill: 999 } as const;
export const G = 20; // page gutter

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
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  card: { backgroundColor: C.s1, borderRadius: R.lg, padding: 16 },
  hair: { height: StyleSheet.hairlineWidth, backgroundColor: C.line },
});

export const hit = { top: 8, bottom: 8, left: 8, right: 8 };
