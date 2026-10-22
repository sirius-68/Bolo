import React, { memo } from 'react';
import Svg, { Path } from 'react-native-svg';
import { GEM, ICONS, IconName } from './icons';
import { C } from './theme';

type Props = { name: IconName | string; size?: number; color?: string; style?: any };

/** Phosphor icon from the bundled set. */
export const Icon = memo(function Icon({ name, size = 24, color = C.text, style }: Props) {
  if (name === 'gem') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
        {GEM.map(([d, fill, sw], i) => (
          <Path key={i} d={d} fill={fill === 'none' ? 'none' : fill || C.yellow} stroke="#000" strokeWidth={Number(sw) || 1.5} strokeLinejoin="round" />
        ))}
      </Svg>
    );
  }
  const def = (ICONS as Record<string, { vb: number; d: string[] }>)[name] || ICONS.job;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${def.vb} ${def.vb}`} style={style}>
      {def.d.map((d, i) => (
        <Path key={i} d={d} fill={color} />
      ))}
    </Svg>
  );
});
