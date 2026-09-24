import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import type { ZodiacId } from '@/shared/types.ts';
import { colors } from '@/theme';

type Pt = [number, number];
interface Strand { points: Pt[]; closed?: boolean }

/**
 * Her burç için özel çizilmiş küçük bir "takımyıldız" deseni: yıldızlar (nokta) ince çizgilerle
 * bağlanır. Sistem fontundaki ♈ ♉ … karakterlerinin yerini alır — cihazdan cihaza değişen,
 * markaya ait olmayan bir görünüm yerine, uygulamanın kendi ince-çizgi diline ait, tutarlı bir motif.
 * Bilimsel doğruluk hedeflenmez; ilgili takımyıldızın ruhundan esinlenilmiştir.
 */
const CONSTELLATIONS: Record<ZodiacId, Strand[]> = {
  koc: [{ points: [[7, 23], [13, 15], [23, 9]] }],
  boga: [
    { points: [[6, 9], [14, 23], [22, 9]] },
    { points: [[24, 5], [27, 7], [25, 9]], closed: true },
  ],
  ikizler: [
    { points: [[7, 6], [8, 14], [9, 22]] },
    { points: [[19, 7], [20, 15], [21, 23]] },
    { points: [[9, 22], [21, 23]] },
  ],
  yengec: [{ points: [[16, 8], [24, 16], [16, 24], [8, 16]], closed: true }],
  aslan: [{ points: [[6, 10], [8, 6], [13, 5], [17, 8], [16, 13], [13, 17]] }],
  basak: [{ points: [[6, 7], [11, 13], [8, 21], [16, 17], [24, 7]] }],
  terazi: [
    { points: [[8, 20], [16, 10], [24, 20]] },
    { points: [[16, 10], [16, 24]] },
  ],
  akrep: [{ points: [[6, 6], [9, 11], [11, 16], [12, 21], [16, 24], [20, 22], [23, 17]] }],
  yay: [{ points: [[7, 25], [12, 20], [17, 15], [22, 10], [25, 7]] }],
  oglak: [{ points: [[6, 9], [10, 7], [14, 11], [17, 17], [22, 21], [26, 19]] }],
  kova: [
    { points: [[6, 12], [11, 9], [16, 12], [21, 9], [26, 12]] },
    { points: [[6, 20], [11, 17], [16, 20], [21, 17], [26, 20]] },
  ],
  balik: [
    { points: [[9, 7], [13, 11], [9, 15], [5, 11]], closed: true },
    { points: [[23, 17], [27, 21], [23, 25], [19, 21]], closed: true },
    { points: [[9, 11], [23, 21]] },
  ],
};

const pathFor = (s: Strand): string => {
  const [first, ...rest] = s.points;
  return `M${first[0]},${first[1]} ${rest.map(([x, y]) => `L${x},${y}`).join(' ')}${s.closed ? ' Z' : ''}`;
};

export function ZodiacGlyph({ id, size = 24, color = colors.gold }: { id: ZodiacId; size?: number; color?: string }) {
  const strands = CONSTELLATIONS[id];
  const leadStar = strands[0].points[0];
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {strands.map((s, i) => (
        <Path key={i} d={pathFor(s)} stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.6} />
      ))}
      {strands.map((s, si) => s.points.map(([x, y], pi) => {
        const isLead = x === leadStar[0] && y === leadStar[1] && si === 0 && pi === 0;
        return <Circle key={`${si}-${pi}`} cx={x} cy={y} r={isLead ? 2.1 : 1.3} fill={isLead ? colors.goldBright : color} opacity={isLead ? 1 : 0.85} />;
      }))}
    </Svg>
  );
}
