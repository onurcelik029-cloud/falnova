import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path as RGPath } from 'react-native-svg';
import { tarotById } from '@/shared/tarot.ts';
import { colors, serif } from '@/theme';
import { Logo } from '@/components/Icon';
import { TarotGlyph } from '@/components/TarotGlyph';

interface Props {
  id?: number;
  reversed?: boolean;
  faceUp?: boolean;
  width?: number;
  label?: string;
}

/** Kartın dört köşesine iliştirilen ince "V" işareti — eski bir tarot destesinin baskılı çerçevesi gibi. */
function Corners({ w, h, color }: { w: number; h: number; color: string }) {
  const s = Math.max(9, w * 0.11);
  const d = `M0.5 ${s} V0.5 H${s}`;
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', top: 5, left: 5 }}>
        <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><RGPath d={d} stroke={color} strokeWidth={0.9} fill="none" strokeLinecap="round" /></Svg>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', top: 5, right: 5, transform: [{ scaleX: -1 }] }}>
        <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><RGPath d={d} stroke={color} strokeWidth={0.9} fill="none" strokeLinecap="round" /></Svg>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', bottom: 5, left: 5, transform: [{ scaleY: -1 }] }}>
        <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><RGPath d={d} stroke={color} strokeWidth={0.9} fill="none" strokeLinecap="round" /></Svg>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', bottom: 5, right: 5, transform: [{ scaleX: -1 }, { scaleY: -1 }] }}>
        <Svg width={s} height={s} viewBox={`0 0 ${s} ${s}`}><RGPath d={d} stroke={color} strokeWidth={0.9} fill="none" strokeLinecap="round" /></Svg>
      </View>
    </>
  );
}

export function TarotCardFace({ id, reversed, faceUp = true, width = 96, label }: Props) {
  const height = width * 1.62;
  if (!faceUp || id === undefined) {
    // Kart sırtı: gece mürekkebi zemin üstünde tekrar eden elmas deseni + ortada marka mührü —
    // uygulamanın geri kalanıyla aynı gece-mürekkebi + altın kimliğini taşır, ayrı bir "kart oyunu" paleti değil.
    const cell = Math.max(10, width * 0.16);
    const cols = Math.ceil(width / cell) + 1;
    const rows = Math.ceil(height / cell) + 1;
    const diamonds: React.ReactNode[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cell + (r % 2 ? cell / 2 : 0);
        const y = r * cell;
        diamonds.push(
          <View key={`${r}-${c}`} style={{ position: 'absolute', left: x - cell * 0.28, top: y - cell * 0.28, width: cell * 0.56, height: cell * 0.56, borderWidth: 0.6, borderColor: 'rgba(221,187,122,0.16)', transform: [{ rotate: '45deg' }] }} />
        );
      }
    }
    return (
      <LinearGradient
        colors={['#160D22', '#0C0714']}
        style={{ width, height, borderRadius: 12, borderWidth: 1, borderColor: colors.borderGold, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
      >
        <View style={{ position: 'absolute', inset: 0 as never }}>{diamonds}</View>
        <View style={{ width: width - 16, height: height - 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(221,187,122,0.4)', alignItems: 'center', justifyContent: 'center' }}>
          <Logo size={width * 0.5} />
          <Text style={{ color: 'rgba(221,187,122,0.8)', fontSize: width * 0.1, letterSpacing: 3, marginTop: 6 }}>NOVA</Text>
        </View>
        <Corners w={width} h={height} color={colors.borderGold} />
      </LinearGradient>
    );
  }
  const card = tarotById(id);
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <LinearGradient
        colors={reversed ? ['#1C1327', '#0E0916'] : ['#1F1529', '#100A19']}
        style={{ width, height, borderRadius: 12, borderWidth: 1.5, borderColor: colors.borderGold, padding: 6, transform: [{ rotate: reversed ? '180deg' : '0deg' }] }}
      >
        <View style={{ flex: 1, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(221,187,122,0.3)', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 }}>
          <Text style={{ color: colors.goldBright, fontSize: width * 0.13, fontFamily: serif, fontWeight: '700', letterSpacing: 1 }}>{roman(card.id)}</Text>
          <View style={{ width: width * 0.62, height: width * 0.62, borderRadius: width * 0.31, backgroundColor: colors.goldTint, alignItems: 'center', justifyContent: 'center' }}>
            <TarotGlyph id={card.id} size={width * 0.42} color={colors.goldBright} accent={colors.gold} />
          </View>
          <Text style={{ color: colors.text, fontSize: width * 0.108, fontFamily: serif, fontWeight: '700', textAlign: 'center', paddingHorizontal: 2, letterSpacing: 0.5 }} numberOfLines={2}>
            {card.name.toUpperCase()}
          </Text>
        </View>
        <Corners w={width} h={height} color={colors.borderGold} />
      </LinearGradient>
      {label ? <Text style={{ color: colors.textDim, fontSize: 12 }}>{label}{reversed ? ' · ters' : ''}</Text> : null}
    </View>
  );
}

function roman(n: number): string {
  if (n === 0) return '0';
  const map: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let out = '';
  let x = n;
  for (const [v, r] of map) while (x >= v) { out += r; x -= v; }
  return out;
}
