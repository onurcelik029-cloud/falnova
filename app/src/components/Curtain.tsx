import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

/**
 * "Perde açılma" geçişi: bir ekran ilk açıldığında iki panel ortadan ayrılıp içeriği açığa çıkarır,
 * tam bir teatral perde gibi. Ekranın kendisi arkada zaten hazır durur — yalnızca üzerindeki örtü kalkar,
 * bu yüzden içerik her zaman anında etkileşime hazırdır. Sekmeler arası geçişte tekrar oynamaz (yalnızca
 * ilk montajda), böylece göz yormaz.
 */
export function CurtainReveal({ children }: { children: React.ReactNode }) {
  const t = useRef(new Animated.Value(0)).current;
  const native = Platform.OS !== 'web';

  useEffect(() => {
    const a = Animated.timing(t, { toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: native });
    a.start();
    return () => a.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const left = t.interpolate({ inputRange: [0, 1], outputRange: [0, -101] });
  const right = t.interpolate({ inputRange: [0, 1], outputRange: [0, 101] });
  const seam = t.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 0.9, 0] });
  const contentOpacity = t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.35, 0.7, 1] });
  const contentScale = t.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={{ flex: 1, opacity: contentOpacity, transform: [{ scale: contentScale }] }}>
        {children}
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.panel, { left: 0, right: '50%' as never, transform: [{ translateX: left.interpolate({ inputRange: [-101, 0], outputRange: ['-101%', '0%'] }) }] }]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.panel, { left: '50%' as never, right: 0, transform: [{ translateX: right.interpolate({ inputRange: [0, 101], outputRange: ['0%', '101%'] }) }] }]} />
      <Animated.View pointerEvents="none" style={[s.seam, { opacity: seam }]} />
    </View>
  );
}

const s = StyleSheet.create({
  panel: { backgroundColor: colors.bg },
  seam: {
    position: 'absolute', left: '50%' as never, top: 0, bottom: 0, width: 2, marginLeft: -1,
    backgroundColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
});
