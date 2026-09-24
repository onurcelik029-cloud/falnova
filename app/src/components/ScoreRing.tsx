import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { colors, serif } from '@/theme';

export function ScoreRing({ value, size = 132, label }: { value: number; size?: number; label?: string }) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="ring" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#C76A86" />
            <Stop offset="1" stopColor="#F0D9A4" />
          </SvgGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(221,187,122,0.14)" strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke="url(#ring)" strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={`${(c * value) / 100} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ color: colors.goldBright, fontSize: size * 0.3, fontFamily: serif, fontWeight: '600' }}>%{value}</Text>
      {label ? <Text style={{ color: colors.textDim, fontSize: 11, marginTop: -2 }}>{label}</Text> : null}
    </View>
  );
}

export function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ gap: 5 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ color: colors.textDim, fontSize: 13 }}>{label}</Text>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '500' }}>%{value}</Text>
      </View>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: 'rgba(221,187,122,0.12)', overflow: 'hidden' }}>
        <View style={{ width: `${value}%`, height: '100%', borderRadius: 3, backgroundColor: value >= 75 ? colors.gold : value >= 55 ? colors.primary : colors.rose }} />
      </View>
    </View>
  );
}
