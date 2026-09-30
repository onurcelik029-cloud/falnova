import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import Svg, {
  Circle, Defs, Ellipse, Filter, FeGaussianBlur, LinearGradient as SvgLinearGradient,
  Path, RadialGradient, Rect, Stop,
} from 'react-native-svg';
import { colors } from '@/theme';

/**
 * Kahve falı sonucunun büyük "vizyon" sahnesi: fincan, buhar, telve dokusu ve telvede
 * belirsizce seçilen bir omen şekli — çerçevelenmiş, gece atmosferli, "mistik realist" bir
 * illüstrasyon. Küçük mühür ikonlarından kasıtlı olarak ayrı: burası ekranın vurucu anı,
 * o yüzden çok daha detaylı. Deterministik bir tohumla üretilen telve benekleri, her
 * render'da aynı, ama elle serpilmiş gibi görünür.
 */
export function CoffeeVision({ width = 210, label = 'KUŞ · HABER İŞARETİ' }: { width?: number; label?: string }) {
  const inner = width - 24;
  const speckles = useMemo(() => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 46 }, () => {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * 46;
      return { cx: 103 + Math.cos(a) * r, cy: 97 + Math.sin(a) * r * 0.22, rad: 0.6 + rnd() * 1.5, op: 0.25 + rnd() * 0.5 };
    });
  }, []);

  return (
    <View style={{ transform: [{ rotate: '-1.6deg' }], alignSelf: 'center' }}>
      <View
        style={{
          backgroundColor: colors.paper, padding: 9, borderRadius: 2, alignItems: 'center',
          shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 14 }, elevation: 8,
        }}
      >
        <View style={{ borderWidth: 1, borderColor: colors.gilt, padding: 3 }}>
          <Svg width={inner} height={inner} viewBox="0 0 210 210">
            <Defs>
              <RadialGradient id="cvGlow" cx="30%" cy="18%" r="70%">
                <Stop offset="0" stopColor="#4A2E22" stopOpacity={0.55} />
                <Stop offset="1" stopColor="#0A0611" stopOpacity={0} />
              </RadialGradient>
              <SvgLinearGradient id="cvCup" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#F3E7CE" />
                <Stop offset="0.55" stopColor="#D9C6A0" />
                <Stop offset="1" stopColor="#8B6A45" />
              </SvgLinearGradient>
              <RadialGradient id="cvGrounds" cx="45%" cy="35%" r="65%">
                <Stop offset="0" stopColor="#4A2E1C" />
                <Stop offset="0.7" stopColor="#20120A" />
                <Stop offset="1" stopColor="#0D0704" />
              </RadialGradient>
              <Filter id="cvSteamBlur" x="-50%" y="-50%" width="200%" height="200%">
                <FeGaussianBlur stdDeviation={2.2} />
              </Filter>
            </Defs>

            <Rect x={0} y={0} width={210} height={210} fill="#150C1E" />
            <Rect x={0} y={0} width={210} height={210} fill="url(#cvGlow)" />
            <Circle cx={168} cy={26} r={1.4} fill="#E9D6A8" opacity={0.8} />
            <Circle cx={182} cy={46} r={0.9} fill="#E9D6A8" opacity={0.55} />
            <Circle cx={150} cy={16} r={0.7} fill="#E9D6A8" opacity={0.5} />

            <Path d="M92,78 C86,66 100,60 94,48 C89,39 99,32 95,22" fill="none" stroke="#EFE6D6" strokeWidth={4} strokeLinecap="round" opacity={0.16} filter="url(#cvSteamBlur)" />
            <Path d="M112,80 C120,68 106,58 114,46 C120,37 110,29 116,18" fill="none" stroke="#EFE6D6" strokeWidth={4} strokeLinecap="round" opacity={0.13} filter="url(#cvSteamBlur)" />

            <Ellipse cx={103} cy={168} rx={72} ry={14} fill="url(#cvCup)" opacity={0.92} />
            <Ellipse cx={103} cy={165.5} rx={72} ry={13} fill="none" stroke="#5A4128" strokeWidth={0.7} opacity={0.5} />

            <Path d="M55,96 L151,96 L142,152 C140,160 132,164 103,164 C74,164 66,160 64,152 Z" fill="url(#cvCup)" />
            <Path d="M55,96 L151,96 L149,104 L57,104 Z" fill="#FBF3E1" opacity={0.75} />
            <Path d="M64,152 C66,160 74,164 103,164 C132,164 140,160 142,152" fill="none" stroke="#5A4128" strokeWidth={0.8} opacity={0.55} />

            <Path d="M151,110 C172,110 174,138 152,142" fill="none" stroke="#8B6A45" strokeWidth={7} strokeLinecap="round" />
            <Path d="M151,110 C172,110 174,138 152,142" fill="none" stroke="#F3E7CE" strokeWidth={2.2} strokeLinecap="round" opacity={0.5} />

            <Ellipse cx={103} cy={97} rx={48} ry={10} fill="url(#cvGrounds)" />
            {speckles.map((sp, i) => (
              <Circle key={i} cx={sp.cx} cy={sp.cy} r={sp.rad} fill="#1A0F08" opacity={sp.op} />
            ))}
            <Ellipse cx={103} cy={97} rx={48} ry={10} fill="none" stroke="#C79A4B" strokeWidth={1} opacity={0.6} />

            {/* Telvede belirsizce seçilen kuş şekli — haber omeni */}
            <Path
              d="M88,93 C92,90 97,90 100,93 C103,90 108,89 112,92 C109,94 106,94 104,96 C107,97 109,99 108,101 C104,100 101,98 99,96 C96,99 92,100 89,98 C92,96 94,95 95,93 C92,94 90,94 88,93 Z"
              fill="#7A5636" opacity={0.5}
            />
          </Svg>
        </View>

        <View
          style={{
            marginTop: -6, backgroundColor: colors.giltBright, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 2,
            shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3,
          }}
        >
          <Text style={{ fontSize: 9, letterSpacing: 1.4, color: '#241606', fontWeight: '600' }}>{label}</Text>
        </View>
      </View>
    </View>
  );
}
