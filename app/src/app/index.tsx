import React, { useEffect } from 'react';
import { Animated, View } from 'react-native';
import { Text } from '@/components/Text';
import { Redirect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '@/state/app';
import { Logo, Ornament } from '@/components/Icon';
import { colors, gradients, serif } from '@/theme';

export default function Splash() {
  const { ready, user } = useApp();
  const [minDone, setMinDone] = React.useState(false);
  const fade = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 900, useNativeDriver: false }).start();
    const t = setTimeout(() => setMinDone(true), 1800);
    return () => clearTimeout(t);
  }, [fade]);

  if (ready && minDone) return <Redirect href={user ? '/(tabs)' : '/login'} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={gradients.hero} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ alignItems: 'center', gap: 18, opacity: fade }}>
          <Logo size={84} />
          <Text style={{ fontFamily: serif, fontSize: 46, color: colors.text, letterSpacing: 5, fontWeight: '500' }}>FalNova</Text>
          <Ornament width={110} />
          <Text style={{ color: colors.textDim, fontSize: 11.5, letterSpacing: 4.5 }}>YILDIZLARIN FISILTISI</Text>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}
