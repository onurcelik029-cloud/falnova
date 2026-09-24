import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { zodiacById } from '@/shared/zodiac.ts';
import type { ZodiacId } from '@/shared/types.ts';
import { colors, serif } from '@/theme';
import { Logo } from '@/components/Icon';
import { ZodiacGlyph } from '@/components/ZodiacGlyph';

interface Props {
  quote: string;
  name: string;
  sign: ZodiacId;
  topic: string;
  dateLabel: string;
  width?: number;
}

/** 9:16 "Kader Posteri" — sosyal medya hikâyesi olarak paylaşılır. */
export const Poster = forwardRef<View, Props>(function Poster({ quote, name, sign, topic, dateLabel, width = 270 }, ref) {
  const z = zodiacById(sign);
  const height = (width * 16) / 9;
  const dots = Array.from({ length: 30 }, (_, i) => ({ l: (i * 37) % 100, t: (i * 53) % 100, o: 0.2 + ((i * 7) % 6) / 10, s: 1 + (i % 3) }));
  return (
    <View ref={ref} collapsable={false} style={{ width, height, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderGold }}>
      <LinearGradient colors={['#1A0B26', '#3A1650', '#0E0616']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={{ flex: 1, padding: 24, justifyContent: 'space-between' }}>
        {dots.map((d, i) => (
          <View key={i} style={{ position: 'absolute', left: `${d.l}%`, top: `${d.t}%`, width: d.s, height: d.s, borderRadius: 3, backgroundColor: i % 4 === 0 ? colors.gold : '#F4ECDD', opacity: d.o }} />
        ))}
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Logo size={30} />
          <Text style={{ color: colors.gold, letterSpacing: 6, fontSize: 11, marginTop: 4 }}>FALNOVA</Text>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 2 }}>KARMİK DÖNEMEÇ RAPORU</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 18 }}>
          <View style={{ width: 92, height: 92, borderRadius: 46, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(221,187,122,0.08)' }}>
            <ZodiacGlyph id={z.id} size={46} />
          </View>
          <Text style={{ color: colors.text, fontFamily: serif, fontSize: width * 0.088, lineHeight: width * 0.112, textAlign: 'center', fontStyle: 'italic', fontWeight: '500' }}>
            “{quote}”
          </Text>
        </View>
        <View style={{ alignItems: 'center', gap: 3 }}>
          <Text style={{ color: colors.gold, fontFamily: serif, fontSize: 18, fontWeight: '600' }}>{name}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>{z.name} · {topic}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4 }}>{dateLabel}</Text>
        </View>
      </LinearGradient>
    </View>
  );
});
