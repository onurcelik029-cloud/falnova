import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import { Badge, Body, Button, Card, Dim, H2, Screen } from '@/components/ui';
import { Icon, Logo } from '@/components/Icon';
import { colors, serif } from '@/theme';

/**
 * Sesli Falcı — gerçek falcı sesleri (ElevenLabs) için bütçe ayrılana kadar "yapım aşamasında".
 * Ekran tamamen kaldırılmadı: özelliğin var olduğunu göstermek ve kullanıcıyı elde tutmak için
 * markaya uygun, animasyonlu bir "çok yakında" hâli gösteriyor, metin tabanlı Soru-Cevap Odasına yönlendiriyor.
 */
export default function Voice() {
  const pulse = useRef(new Animated.Value(0)).current;
  const native = Platform.OS !== 'web';

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse, native]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.75] });

  return (
    <Screen title="Sesli Falcı" subtitle="Mistik sesle soru-cevap" back mark="voice">
      <View style={{ alignItems: 'center', gap: 18, paddingVertical: 18 }}>
        <Animated.View style={{ transform: [{ scale }], opacity: ringOpacity, width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.goldTint }}>
          <View style={{ width: 104, height: 104, borderRadius: 52, backgroundColor: '#1D1129', borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
            <Logo size={62} />
          </View>
        </Animated.View>

        <Badge text="Yapım aşamasında" tone="amber" />

        <View style={{ alignItems: 'center', gap: 8, maxWidth: 320 }}>
          <H2 style={{ textAlign: 'center' }}>Falcının sesi çok yakında</H2>
          <Body style={{ textAlign: 'center', color: colors.textDim }}>
            Bilge, Gizemli ve Fısıltı karakterlerinin gerçek sesleriyle konuşabileceğin bu deneyimi hazırlıyoruz. Şimdilik aynı üç falcıyla yazılı sohbet edebilirsin — istersen sesli sürüm açıldığında sana haber verelim.
          </Body>
        </View>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="chat" size={20} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ fontFamily: serif, color: colors.text, fontSize: 16, fontWeight: '600' }}>Bu arada, yazarak sor</Text>
            <Dim style={{ fontSize: 12.5, lineHeight: 18 }}>Soru-Cevap Odasında aynı falcı karakterleriyle yazılı sohbet edebilirsin.</Dim>
          </View>
        </View>
      </Card>

      <Button title="Soru-Cevap Odasına Git" variant="gold" onPress={() => router.push('/(tabs)/chat')} testID="voice-goto-chat" />
      <Button title="Geri Dön" variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} />
    </Screen>
  );
}
