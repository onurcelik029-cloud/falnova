import React, { useEffect } from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '@/state/app';
import { useAppFonts } from '@/lib/fonts';
import { initAmbientSound, retryAmbientOnGesture } from '@/lib/ambient';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { colors } from '@/theme';

/** Kayıtlı ortam sesi tercihini açılışta uygular; web'de otomatik oynatma engellenirse ilk dokunuşta yeniden dener. */
function useAmbientSoundBoot() {
  useEffect(() => {
    initAmbientSound();
    if (Platform.OS !== 'web') return;
    const retry = () => retryAmbientOnGesture();
    const g = globalThis as { addEventListener?: typeof addEventListener; removeEventListener?: typeof removeEventListener };
    g.addEventListener?.('pointerdown', retry);
    g.addEventListener?.('keydown', retry);
    return () => {
      g.removeEventListener?.('pointerdown', retry);
      g.removeEventListener?.('keydown', retry);
    };
  }, []);
}

/** Web'de geniş ekranlarda uygulamayı telefon çerçevesi içinde gösterir. */
function Frame({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const isWide = Platform.OS === 'web' && width > 520;
  if (!isWide) return <View style={{ flex: 1, backgroundColor: colors.bg }}>{children}</View>;
  const frameH = Math.min(height - 32, 880);
  return (
    <View style={s.stage}>
      <View style={[s.phone, { height: frameH }]}>{children}</View>
    </View>
  );
}

export default function RootLayout() {
  const fontsReady = useAppFonts();
  useAmbientSoundBoot();
  if (!fontsReady) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <SafeAreaProvider>
      <Frame>
        <ErrorBoundary>
          <AppProvider>
            <StatusBar style="light" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade' }} />
          </AppProvider>
        </ErrorBoundary>
      </Frame>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#050308', alignItems: 'center', justifyContent: 'center' },
  phone: {
    width: 412, borderRadius: 40, overflow: 'hidden', backgroundColor: colors.bg, borderWidth: 1, borderColor: 'rgba(221,187,122,0.28)',
    ...(Platform.OS === 'web' ? ({ boxShadow: '0 40px 100px rgba(0,0,0,0.65), 0 0 0 6px #0F0A14, 0 0 60px rgba(221,187,122,0.06)' } as object) : {}),
  },
});
