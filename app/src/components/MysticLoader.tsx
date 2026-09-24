import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { Text } from '@/components/Text';
import { colors, serif } from '@/theme';
import { CandleFlame } from '@/components/Candle';
import { Stardust } from '@/components/Stardust';

/**
 * "Ritüel başlıyor": bir okuma isteği gönderildiğinde kısa süreli gösterilir. Mum yanıyor, yıldız
 * tozu süzülüyor — Nova'nın gerçekten oturup baktığı hissini vermek için (bekleme ritüelinin girişi).
 */
export function MysticLoader({ messages }: { messages: string[] }) {
  const spin = useRef(new Animated.Value(0)).current;
  const [i, setI] = useState(0);
  const native = Platform.OS !== 'web';

  useEffect(() => {
    const a = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: native }));
    a.start();
    const t = setInterval(() => setI((x) => (x + 1) % messages.length), 1700);
    return () => { a.stop(); clearInterval(t); };
  }, [spin, messages.length, native]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const R = 74;
  const boxSize = R * 2 + 30;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 26 }}>
      <View style={{ width: boxSize, height: boxSize, alignItems: 'center', justifyContent: 'center' }}>
        <Stardust count={16} width={boxSize} height={boxSize} seed="ritual-ignite" />
        <Animated.View style={{ position: 'absolute', width: boxSize, height: boxSize, borderRadius: R + 15, borderWidth: 1, borderColor: colors.borderStrong, borderStyle: 'dashed', transform: [{ rotate }] }} />
        <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
          <CandleFlame size={44} />
        </View>
      </View>
      <Text style={{ fontFamily: serif, color: colors.text, fontSize: 22, fontWeight: '500', textAlign: 'center', paddingHorizontal: 24, minHeight: 56 }}>{messages[i]}</Text>
    </View>
  );
}
