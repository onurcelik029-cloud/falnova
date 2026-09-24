import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { makeRng } from '@/shared/rng.ts';
import { colors } from '@/theme';

interface Mote {
  x: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
  gold: boolean;
}

/**
 * Yavaşça yukarı süzülüp sönen yıldız tozu parçacıkları. Salt süsleme — anlam taşımaz,
 * ekran okuyuculardan gizlenir. Ritüel sahnelerine ("mum yakılıyor", bekleme ekranı) derinlik katar.
 */
export function Stardust({ count = 14, width = 240, height = 160, seed = 'stardust' }: { count?: number; width?: number; height?: number; seed?: string }) {
  const particles = useMemo<Mote[]>(() => {
    const rng = makeRng(seed, width, height, count);
    return Array.from({ length: count }, (_, i) => ({
      x: rng() * width,
      delay: rng() * 3200,
      duration: 2400 + rng() * 2400,
      size: 1.4 + rng() * 2.4,
      drift: (rng() - 0.5) * 26,
      gold: i % 3 !== 0,
    }));
  }, [count, width, height, seed]);

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, left: 0, width, height, overflow: 'hidden' }}
    >
      {particles.map((p, i) => <Mote key={i} {...p} height={height} />)}
    </View>
  );
}

function Mote({ x, delay, duration, size, drift, gold, height }: Mote & { height: number }) {
  const t = useRef(new Animated.Value(0)).current;
  const native = Platform.OS !== 'web';
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: native }),
      Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [t, delay, duration, native]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [height * 0.18, -height * 0.18] });
  const translateX = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, drift, 0] });
  const opacity = t.interpolate({ inputRange: [0, 0.15, 0.55, 0.9, 1], outputRange: [0, 0.9, 1, 0.6, 0] });

  return (
    <Animated.View
      style={{
        position: 'absolute', left: x, top: height / 2, width: size, height: size, borderRadius: size,
        backgroundColor: gold ? colors.gold : colors.text, opacity, transform: [{ translateY }, { translateX }],
      }}
    />
  );
}
