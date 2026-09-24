import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { VoiceTone } from '@/shared/types.ts';
import { colors } from '@/theme';

interface Emblem { paths: string[]; circles?: [number, number, number, boolean?][] }

/**
 * Sesli Falcı'nın üç karakteri için elle çizilmiş küçük amblemler — ZodiacGlyph ve
 * TarotGlyph ile aynı ince-çizgi dilinde: Madam Nova'nın hilali ve mumu, Derviş Kerem'in
 * gizemli gözü, Ruya'nın fısıldayan nefes izi.
 */
const EMBLEMS: Record<VoiceTone, Emblem> = {
  bilge: { // Madam Nova: hilal + mum alevi
    paths: [
      'M19,6 a8,8 0 1,0 0,16 a6,6 0 1,1 0,-16 Z',
      'M16,22 C14,25 14,27.5 16,29 C18,27.5 18,25 16,22 Z',
    ],
    circles: [[16, 26.5, 1, true]],
  },
  gizemli: { // Derviş Kerem: gölgeli, kirpikli bir göz
    paths: [
      'M4,17 Q16,7 28,17 Q16,27 4,17 Z',
      'M8,11 L6,8',
      'M24,11 L26,8',
    ],
    circles: [[16, 17, 4, false], [16, 17, 1.5, true]],
  },
  fisilti: { // Ruya: kıvrılıp sönen bir fısıltı/nefes izi
    paths: [
      'M9,25 C9,21 13,21 13,17 C13,13 9,13 9,9',
    ],
    circles: [[21, 8, 1.5, true], [15, 12, 1, false], [11, 17, 0.8, false], [8, 22, 0.6, false]],
  },
};

export function PersonaGlyph({ id, size = 26, color = colors.gold, accent }: { id: VoiceTone; size?: number; color?: string; accent?: string }) {
  const e = EMBLEMS[id];
  const bright = accent ?? color;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {e.paths.map((p, i) => (
        <Path key={`p${i}`} d={p} stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.7} />
      ))}
      {e.circles?.map(([cx, cy, r, isBright], i) => (
        <Circle key={`c${i}`} cx={cx} cy={cy} r={r} stroke={isBright ? undefined : color} strokeWidth={isBright ? 0 : 1.2} fill={isBright ? bright : 'none'} opacity={isBright ? 1 : 0.6} />
      ))}
    </Svg>
  );
}
