/* getit design tokens: the same colours, type and spacing as the design canvas, in dark and light. */
import { useSyncExternalStore } from 'react';
import { Platform, TextStyle, ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FONT, Weight, paint } from '../ui/theme';
import { bump } from '../logic/live';

/** The action red (buttons) and the brand red (the logo, the big button). White text on both. */
export const RED = '#e02f17';
export const BRAND = '#ff3b1f';
export const STAR = '#f5a524';
export const GOOD = '#1f9d55';

const DARK = {
  dark: true,
  bg: '#171615',
  card: '#211f1d',
  card2: '#2b2926',
  line: '#363330',
  text: '#f1efe9',
  muted: '#a8a39b',
  accent: '#ff6a52',
  ringA: 'rgba(255, 59, 31, 0.18)',
  ringB: 'rgba(255, 59, 31, 0.09)',
  sheet: '#211f1d',
  scrim: 'rgba(0, 0, 0, 0.6)',
  bar: 'rgba(33, 31, 29, 0.96)',
  tabOn: '#3a2420',
  shadow: '#000000',
  shadowOp: 0.4,
  bigShadowOp: 0.35,
  mapBg: '#1f1d1b',
  road: '#302d2a',
  danger: '#ff6a52',
  dangerBg: '#f1efe9',
  dangerFg: '#111111',
};
export type Theme = typeof DARK;
const LIGHT: Theme = {
  dark: false,
  bg: '#f1efe9',
  card: '#fbfaf7',
  card2: '#e6e2d7',
  line: '#ddd8cc',
  text: '#111111',
  muted: '#5f5a52',
  accent: '#c42a12',
  ringA: 'rgba(255, 59, 31, 0.14)',
  ringB: 'rgba(255, 59, 31, 0.07)',
  sheet: '#fbfaf7',
  scrim: 'rgba(17, 17, 17, 0.42)',
  bar: 'rgba(251, 250, 247, 0.97)',
  tabOn: '#fde6df',
  shadow: '#3c2814',
  shadowOp: 0.12,
  bigShadowOp: 0.28,
  mapBg: '#e6e2d7',
  road: '#fbfaf7',
  danger: '#c42a12',
  dangerBg: '#111111',
  dangerFg: '#f1efe9',
};

/* ---------------- dark or light: chosen in Me → Appearance, remembered on this phone ---------------- */
export type Look = 'dark' | 'light';
const KEY = 'getit.look';
let look: Look = 'dark';
const subs = new Set<() => void>();
export const getLook = () => look;
export const theme = () => (look === 'light' ? LIGHT : DARK);
export function setLook(l: Look) {
  if (l === look) return;
  look = l;
  paint(l);
  subs.forEach((f) => f());
  bump(); // the screens built on the first building blocks redraw with the new colours too
  AsyncStorage.setItem(KEY, l).catch(() => {});
}
/** Read the saved choice once at start-up (before the first screen shows). */
export async function loadLook() {
  try {
    const v = await AsyncStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') {
      look = v;
      paint(v);
      subs.forEach((f) => f());
    }
  } catch {}
}
const sub = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};
/** The current colours. Screens re-render when the look changes. */
export function useG(): Theme {
  useSyncExternalStore(sub, getLook, getLook);
  return theme();
}

/* ---------------- type ---------------- */
/** Text style: size, weight, colour, line height (a multiple of the size) and letter spacing, as written in the design. */
export function ft(size: number, w: Weight, color: string, lh = 1.4, ls = 0, extra?: TextStyle): TextStyle {
  return {
    fontFamily: FONT[w],
    fontSize: size,
    lineHeight: Math.round(size * lh),
    color,
    letterSpacing: ls,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
    ...extra,
  };
}

/** The soft shadow under floating things (the tab bar, cards that lift). */
export function lift(t: Theme, radius = 30, y = 10): ViewStyle {
  return { shadowColor: t.shadow, shadowOpacity: t.shadowOp, shadowRadius: radius / 2, shadowOffset: { width: 0, height: y }, elevation: 10 };
}

/** Pastel circles behind initials, picked by name so a person always gets the same one. */
const PASTEL = ['#f3dfb4', '#d8d2f0', '#cfe2d2', '#ffd2c7', '#f4c8d4', '#cfe0f2'];
export function pastel(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PASTEL[h % PASTEL.length];
}
export function initials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() || '?';
}
