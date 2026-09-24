import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '@/theme';

export type IconName =
  | 'coffee' | 'tarot' | 'wheel' | 'dream' | 'couple' | 'voice' | 'karmic' | 'spark' | 'lock' | 'back'
  | 'home' | 'chat' | 'book' | 'gem' | 'bell' | 'share' | 'mic' | 'speaker' | 'plus' | 'check' | 'shield'
  | 'camera' | 'trash' | 'user' | 'scroll' | 'chevron' | 'eye' | 'heart' | 'sun' | 'hand';

// 24x24 çizgi ikonları. Kalın dolgu yok; ince, tek kalınlıkta çizgi.
const P: Record<IconName, string[]> = {
  coffee: [
    'M5 9.5h11v3.6A5.4 5.4 0 0 1 10.6 18.5h-.2A5.4 5.4 0 0 1 5 13.1V9.5z',
    'M16 10.6h1.5a2.3 2.3 0 0 1 0 4.6H15.6',
    'M3 21h15',
    'M8.2 3.2c-1 1.2 1 2 0 3.3',
    'M12 3.2c-1 1.2 1 2 0 3.3',
  ],
  tarot: [
    'M7.2 3h9.6a1.7 1.7 0 0 1 1.7 1.7v14.6a1.7 1.7 0 0 1-1.7 1.7H7.2a1.7 1.7 0 0 1-1.7-1.7V4.7A1.7 1.7 0 0 1 7.2 3z',
    'M12 7.4l1.2 3.1 3.1 1.2-3.1 1.2L12 16l-1.2-3.1-3.1-1.2 3.1-1.2z',
  ],
  wheel: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    'M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6z',
    'M12 3v5.2M12 15.8V21M3 12h5.2M15.8 12H21M5.6 5.6l3.7 3.7M14.7 14.7l3.7 3.7M18.4 5.6l-3.7 3.7M9.3 14.7l-3.7 3.7',
  ],
  dream: [
    'M19.5 14.6A7.6 7.6 0 0 1 9.4 4.5a7.6 7.6 0 1 0 10.1 10.1z',
    'M17 3.5v3.4M15.3 5.2h3.4',
  ],
  couple: [
    'M9.2 6.2a5.3 5.3 0 1 0 0 10.6 5.3 5.3 0 0 0 0-10.6z',
    'M14.8 6.2a5.3 5.3 0 1 0 0 10.6 5.3 5.3 0 0 0 0-10.6z',
  ],
  voice: [
    'M12 3.2a3 3 0 0 0-3 3v5.6a3 3 0 0 0 6 0V6.2a3 3 0 0 0-3-3z',
    'M5.5 11.5a6.5 6.5 0 0 0 13 0',
    'M12 18v3M8.7 21h6.6',
  ],
  mic: [
    'M12 3.2a3 3 0 0 0-3 3v5.6a3 3 0 0 0 6 0V6.2a3 3 0 0 0-3-3z',
    'M5.5 11.5a6.5 6.5 0 0 0 13 0',
    'M12 18v3M8.7 21h6.6',
  ],
  speaker: [
    'M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z',
    'M15.5 9a4.2 4.2 0 0 1 0 6',
    'M18 6.6a7.6 7.6 0 0 1 0 10.8',
  ],
  karmic: [
    'M12 12c-1.9-3.1-3.5-4.5-5.4-4.5a4.5 4.5 0 0 0 0 9c1.9 0 3.5-1.4 5.4-4.5s3.5-4.5 5.4-4.5a4.5 4.5 0 0 1 0 9c-1.9 0-3.5-1.4-5.4-4.5z',
  ],
  spark: ['M12 3l1.7 5.6L19.5 10.3l-5.8 1.7L12 18l-1.7-6-5.8-1.7 5.8-1.7z'],
  lock: [
    'M6.5 10.5h11a1.5 1.5 0 0 1 1.5 1.5v6.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18.5V12a1.5 1.5 0 0 1 1.5-1.5z',
    'M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5',
  ],
  back: ['M14.5 5.5L8 12l6.5 6.5'],
  chevron: ['M9.5 5.5L16 12l-6.5 6.5'],
  home: [
    'M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z',
    'M18.5 15.5l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7z',
  ],
  chat: [
    'M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8.5A1.5 1.5 0 0 1 19 16.5h-7l-4.5 3.5v-3.5H5A1.5 1.5 0 0 1 3.5 15V6.5A1.5 1.5 0 0 1 5 5z',
  ],
  book: [
    'M5 4.5h10.5a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2V4.5z',
    'M5 17.5a2 2 0 0 1 2-2h10.5',
    'M9.5 8.5h4.5',
  ],
  gem: ['M6.5 4h11l4 5.2L12 20.5 2.5 9.2z', 'M2.5 9.2h19', 'M9.2 4L7.6 9.2 12 20.5', 'M14.8 4l1.6 5.2L12 20.5'],
  bell: ['M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z', 'M10 20.5a2.2 2.2 0 0 0 4 0'],
  share: ['M12 15V3.5M7.5 8L12 3.5 16.5 8', 'M5 12.5v6a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5v-6'],
  plus: ['M12 5v14M5 12h14'],
  check: ['M5 12.5l4.5 4.5L19 7.5'],
  shield: ['M12 3l7.5 2.8v5.6c0 4.4-3 8.1-7.5 9.6-4.5-1.5-7.5-5.2-7.5-9.6V5.8z', 'M8.8 12l2.4 2.4 4.2-4.6'],
  camera: [
    'M4.5 7.5h3l1.5-2.5h6l1.5 2.5h3a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V8.5a1 1 0 0 1 1-1z',
    'M12 10.2a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6z',
  ],
  trash: ['M4.5 7h15M9.5 7V4.5h5V7', 'M6.5 7l.8 12.5h9.4L17.5 7', 'M10 11v5M14 11v5'],
  user: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M4.5 20.5c.6-4 3.5-6 7.5-6s6.9 2 7.5 6'],
  scroll: [
    'M7 4h11v13a3 3 0 0 1-3 3H6.5a2.5 2.5 0 0 0 2.5-2.5V16H4.5v-1.5A2.5 2.5 0 0 1 7 12',
    'M7 4a2.5 2.5 0 0 0-2.5 2.5V12',
    'M10.5 8h4.5M10.5 11.5H15',
  ],
  eye: ['M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z', 'M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z'],
  heart: ['M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z'],
  sun: [
    'M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11z',
    'M12 2v2.2M12 19.8V22M4.2 12H2M22 12h-2.2M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6',
  ],
  hand: [
    'M7.5 11.5V6.5a1.5 1.5 0 0 1 3 0V10',
    'M10.5 10V5a1.5 1.5 0 0 1 3 0v5',
    'M13.5 10V6a1.5 1.5 0 0 1 3 0v6.5',
    'M16.5 12.5V9a1.5 1.5 0 0 1 3 0v6.5c0 3.6-2.9 6-6.5 6h-1c-2 0-3.3-.7-4.4-2.2L5.3 16c-.7-.9-.5-2.1.5-2.7.8-.5 1.8-.3 2.4.4l.8 1',
    'M9.6 15.6c1 .35 2 .35 3-.15M9.9 18.1c1.3.4 2.7.3 3.9-.3',
  ],
};

export function Icon({ name, size = 24, color = colors.gold, stroke = 1.4 }: { name: IconName; size?: number; color?: string; stroke?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <G stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill="none">
        {P[name].map((d, i) => <Path key={i} d={d} />)}
      </G>
    </Svg>
  );
}

/** Marka işareti: ince halka içinde hilal ve yıldız. */
export function Logo({ size = 64, color = colors.gold }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <G stroke={color} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Circle cx="32" cy="32" r="29" strokeWidth={1.1} opacity={0.9} />
        <Circle cx="32" cy="32" r="25.5" strokeWidth={0.6} opacity={0.5} />
        <Path d="M38.5 18.2A15 15 0 1 0 45 41a11.6 11.6 0 0 1-6.5-22.8z" strokeWidth={1.5} />
        <Path d="M43.5 21.5l1.3 3.4 3.4 1.3-3.4 1.3-1.3 3.4-1.3-3.4-3.4-1.3 3.4-1.3z" strokeWidth={1.1} fill={color} />
      </G>
    </Svg>
  );
}

/**
 * Marka anının büyük hâli: yumuşak bir altın hâle + iki eşmerkezli ince halka + ortada Logo.
 * Girişte tek başına küçük bir amblem yerine, kutlanan bir an gibi dursun diye — bir mağaza vitrini,
 * bir davetiyenin mührü gibi. Halkalar sabit durur (döndürülmez); yalnızca ışık hareket eder gibi hisseder.
 */
export function LogoHalo({ size = 156 }: { size?: number }) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={s} height={s} viewBox="0 0 156 156" style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id="logoGlow" cx="50%" cy="50%" r="52%">
            <Stop offset="0" stopColor={colors.gold} stopOpacity={0.28} />
            <Stop offset="0.55" stopColor={colors.gold} stopOpacity={0.08} />
            <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="78" cy="78" r="76" fill="url(#logoGlow)" />
        <Circle cx="78" cy="78" r="68" stroke={colors.borderGold} strokeWidth={0.7} fill="none" opacity={0.55} />
        <Circle cx="78" cy="78" r="58" stroke={colors.border} strokeWidth={0.7} fill="none" strokeDasharray="1 5" opacity={0.8} />
      </Svg>
      <Logo size={s * 0.42} />
    </View>
  );
}

/** Süsleme çizgisi: iki yanda ince çizgi, ortada minik yıldız. */
export function Ornament({ color = colors.gold, width = 120 }: { color?: string; width?: number }) {
  return (
    <Svg width={width} height={12} viewBox="0 0 120 12" fill="none">
      <G stroke={color} strokeWidth={0.8} strokeLinecap="round" opacity={0.75}>
        <Path d="M2 6h48" />
        <Path d="M70 6h48" />
      </G>
      <Path d="M60 1.5l1.3 3.4 3.4 1.1-3.4 1.1L60 10.5l-1.3-3.4L55.3 6l3.4-1.1z" fill={color} />
    </Svg>
  );
}

import type { FortuneResult } from '@/shared/types.ts';
export const KIND_ICON: Record<FortuneResult['kind'], IconName> = {
  coffee: 'coffee', tarot: 'tarot', horoscope: 'wheel', dream: 'dream', karmic: 'karmic', couple: 'couple', chat: 'chat', voice: 'voice',
  natal: 'sun', palm: 'hand',
};
