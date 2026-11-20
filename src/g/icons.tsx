/* getit's line icons: the same drawings as the design canvas (24 × 24, round 2 px strokes). */
import React, { memo } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { MARK_D, MARK_VB, WORD_D, WORD_VB } from './logo';
import { BRAND, STAR } from './theme';

type Shape = string | ['c', number, number, number] | ['r', number, number, number, number, number];
/** A string is a path; ['c', cx, cy, r] a circle; ['r', x, y, w, h, rx] a rounded box. */
const LINE: Record<string, Shape[]> = {
  x: ['M6 6l12 12M18 6L6 18'],
  back: ['M15 5l-7 7 7 7'],
  chev: ['M9 6l6 6-6 6'],
  down: ['M6 9l6 6 6-6'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  pin: ['M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z', ['c', 12, 9.5, 2.5]],
  user: [['c', 12, 8, 4], 'M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7'],
  keyboard: [['r', 2.5, 6, 19, 12, 2.5], 'M6.5 10h.01M10 10h.01M13.5 10h.01M17 10h.01M7.5 14h9'],
  mic: [['r', 9, 3, 6, 11, 3], 'M5 11a7 7 0 0 0 14 0M12 18v3'],
  search: [['c', 11, 11, 7], 'M20 20l-3.5-3.5'],
  share: ['M12 3v12M7 8l5-5 5 5', 'M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6'],
  phone: ['M5 4h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.1 6.1l1.4-2.3 4.5 1.8V19a1.5 1.5 0 0 1-1.6 1.5A16.5 16.5 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4z'],
  chat: ['M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4A8 8 0 1 1 20 12z'],
  bell: ['M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z', 'M10 20.5a2.2 2.2 0 0 0 4 0'],
  shield: ['M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6z', 'M8.8 12l2.3 2.3 4.2-4.6'],
  find: [['c', 12, 12, 8], ['c', 12, 12, 3]],
  jobs: [['r', 3, 7, 18, 13, 2.5], 'M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18'],
  calendar: [['r', 3.5, 5, 17, 15, 2.5], 'M8 3v4M16 3v4M3.5 10h17'],
  camera: ['M4 8.5A2.5 2.5 0 0 1 6.5 6h1.8l1.5-2h4.4l1.5 2h1.8A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z', ['c', 12, 12.5, 3.5]],
  refresh: ['M20 11a8 8 0 0 0-14.3-4.3L4 8.5M4 4v4.5h4.5', 'M4 13a8 8 0 0 0 14.3 4.3L20 15.5M20 20v-4.5h-4.5'],
};

export type GIconName = keyof typeof LINE | 'spark' | 'star' | 'tick';

/** One icon. `spark` (Pro), `star` and `tick` (ID checked) are filled; everything else is a line drawing. */
export const GIcon = memo(function GIcon({ name, size = 20, color = '#000', sw = 2 }: { name: GIconName; size?: number; color?: string; sw?: number }) {
  if (name === 'spark')
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M11 2.5l2 5.9 5.9 2-5.9 2-2 5.9-2-5.9-5.9-2 5.9-2z" fill={color} />
        <Path d="M18.5 14.5l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9z" fill={color} />
      </Svg>
    );
  if (name === 'star')
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill={color === '#000' ? STAR : color} />
      </Svg>
    );
  if (name === 'tick')
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={10} fill="#e02f17" />
        <Path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  const shapes = LINE[name] || LINE.find;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {shapes.map((s, i) =>
        typeof s === 'string' ? (
          <Path key={i} d={s} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ) : s[0] === 'c' ? (
          <Circle key={i} cx={s[1]} cy={s[2]} r={s[3]} stroke={color} strokeWidth={sw} fill="none" />
        ) : (
          <Rect key={i} x={s[1]} y={s[2]} width={s[3]} height={s[4]} rx={s[5]} stroke={color} strokeWidth={sw} fill="none" />
        ),
      )}
    </Svg>
  );
});

/** The bag mark. `height` sets the size; the width follows. */
export const Mark = memo(function Mark({ height, color = BRAND }: { height: number; color?: string }) {
  return (
    <Svg width={(height * MARK_VB[0]) / MARK_VB[1]} height={height} viewBox={`0 0 ${MARK_VB[0]} ${MARK_VB[1]}`}>
      <Path d={MARK_D} fill={color} />
    </Svg>
  );
});
/** The "getit" wordmark. */
export const Word = memo(function Word({ height, color }: { height: number; color: string }) {
  return (
    <Svg width={(height * WORD_VB[0]) / WORD_VB[1]} height={height} viewBox={`0 0 ${WORD_VB[0]} ${WORD_VB[1]}`}>
      {WORD_D.map((d, i) => (
        <Path key={i} d={d} fill={color} />
      ))}
    </Svg>
  );
});
