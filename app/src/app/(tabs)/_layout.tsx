import React from 'react';
import { Platform } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { useApp } from '@/state/app';
import { Icon, type IconName } from '@/components/Icon';

const tabIcon = (name: IconName) => ({ color, focused }: { color: import('react-native').ColorValue; focused: boolean }) => (
  <Icon name={name} size={23} color={String(color)} stroke={focused ? 1.7 : 1.4} />
);

export default function TabsLayout() {
  const { ready, user } = useApp();
  const insets = useSafeAreaInsets();
  if (ready && !user) return <Redirect href="/login" />;
  const bottom = Math.max(insets.bottom, Platform.OS === 'web' ? 6 : 8);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: '#0E0914', borderTopColor: colors.border, borderTopWidth: 1, height: 60 + bottom, paddingTop: 8, paddingBottom: bottom,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '500', letterSpacing: 0.6 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Keşfet', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="chat" options={{ title: 'Falcı', tabBarIcon: tabIcon('chat') }} />
      <Tabs.Screen name="history" options={{ title: 'Geçmişim', tabBarIcon: tabIcon('book') }} />
      <Tabs.Screen name="wallet" options={{ title: 'Cüzdan', tabBarIcon: tabIcon('gem') }} />
    </Tabs>
  );
}
