import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { colors } from '@/theme';

/**
 * Elle çizilmiş hissi veren, titreyen bir mum alevi. Nova'nın "ritüele başladığı" anları imler
 * (yeni bir okuma başlarken, bekleme ekranında). Salt atmosfer — bilgi taşımaz.
 */
export function CandleFlame({ size = 56, withBase = true }: { size?: number; withBase?: boolean }) {
  const flick = useRef(new Animated.Value(0)).current;
  const native = Platform.OS !== 'web';

  useEffect(() => {
    // Düzensiz aralıklı adımlar: gerçek bir alev gibi tekdüze olmayan bir titreşim.
    const step = (to: number, ms: number) => Animated.timing(flick, { toValue: to, duration: ms, easing: Easing.inOut(Easing.quad), useNativeDriver: native });
    const loop = Animated.loop(Animated.sequence([step(1, 640), step(0.35, 420), step(0.9, 560), step(0.15, 380), step(0.7, 500)]));
    loop.start();
    return () => loop.stop();
  }, [flick, native]);

  const scaleY = flick.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.12] });
  const skewDeg = flick.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-4deg', '2deg', '4deg'] });
  const glow = flick.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  const w = size, h = size * 1.55;
  return (
    <View style={{ width: w, height: h, alignItems: 'center' }}>
      <Animated.View style={{ opacity: glow, transform: [{ scaleY }, { skewX: skewDeg }], width: w, height: h * 0.72 }}>
        <Svg width={w} height={h * 0.72} viewBox="0 0 40 58" fill="none">
          <Defs>
            <RadialGradient id="flameCore" cx="50%" cy="62%" r="55%">
              <Stop offset="0" stopColor={colors.goldBright} stopOpacity={1} />
              <Stop offset="0.55" stopColor={colors.gold} stopOpacity={0.95} />
              <Stop offset="1" stopColor={colors.amberDeep} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id="flameHalo" cx="50%" cy="55%" r="60%">
              <Stop offset="0" stopColor={colors.gold} stopOpacity={0.35} />
              <Stop offset="1" stopColor={colors.gold} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Ellipse cx="20" cy="30" rx="19" ry="26" fill="url(#flameHalo)" />
          <Path d="M20 4C11 16 6 26 6 35a14 14 0 0 0 28 0c0-9-5-19-14-31z" fill="url(#flameCore)" />
          <Path d="M20 20c-4 7-6.5 12-6.5 16.5a6.5 6.5 0 0 0 13 0c0-4.5-2.5-9.5-6.5-16.5z" fill={colors.text} opacity={0.85} />
        </Svg>
      </Animated.View>
      {withBase ? (
        <View style={{ width: w * 0.5, height: h * 0.28, borderRadius: 3, backgroundColor: colors.goldTintStrong, borderWidth: 1, borderColor: colors.borderGold, marginTop: -h * 0.06 }} />
      ) : null}
    </View>
  );
}
