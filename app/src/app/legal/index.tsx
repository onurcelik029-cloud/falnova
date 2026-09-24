import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import { Body, Button, Card, Dim, Eyebrow, Screen } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { LEGAL_DOCS, LEGAL_UPDATED } from '@/legal/texts';
import { useApp } from '@/state/app';
import { resetToLogin } from '@/lib/nav';
import { colors } from '@/theme';

export default function Legal() {
  const { api, user, setUser, signOut, run, toast } = useApp();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const wipe = async () => {
    setBusy(true);
    const ok = await run(async () => { await api.deleteAccount(); return true; });
    setBusy(false);
    if (!ok) return;
    await signOut().catch(() => {});
    toast('Hesabın ve tüm verilerin silindi.');
    resetToLogin();
  };

  const revoke = async () => {
    const r = await run(() => api.revokeConsent());
    if (!r) return;
    setUser(r.user);
    toast('Açık rızan geri alındı. Yeni bir fal için tekrar onayın istenecek.');
  };

  return (
    <Screen title="Yasal" subtitle={`Son güncelleme: ${LEGAL_UPDATED}`} back>
      <Card style={{ paddingVertical: 4, paddingHorizontal: 0 }}>
        {LEGAL_DOCS.map((d, i) => (
          <Pressable
            key={d.id}
            testID={`legal-${d.id}`}
            onPress={() => router.push({ pathname: '/legal/[id]', params: { id: d.id } })}
            style={({ pressed }) => ({
              flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 15,
              borderTopWidth: i ? 1 : 0, borderTopColor: colors.border, opacity: pressed ? 0.7 : 1,
            })}
          >
            <Icon name={d.icon} size={22} color={colors.gold} />
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={{ color: colors.text, fontSize: 15.5, fontWeight: '500' }}>{d.title}</Text>
              <Dim style={{ fontSize: 12.5 }}>{d.short}</Dim>
            </View>
            <Icon name="chevron" size={18} color={colors.textFaint} />
          </Pressable>
        ))}
      </Card>

      <View style={{ gap: 10, marginTop: 6 }}>
        <Eyebrow>Verilerim</Eyebrow>
        <Dim>{user?.consentAt
          ? 'Fal yorumları için fotoğraf ve metinlerinin işlenmesine ve yurt dışındaki hizmet sağlayıcılara aktarılmasına açık rıza verdin. Bunu istediğin zaman geri alabilirsin; geri alırsan yeni fal oluşturmadan önce yeniden onayın istenir.'
          : 'Şu an kayıtlı bir açık rızan yok. Yeni bir fal oluştururken onayın istenir.'}</Dim>
        {user?.consentAt ? <Button title="Açık Rızamı Geri Al" variant="ghost" onPress={revoke} testID="revoke-consent" /> : null}
        <Dim>Hesabını ve fal geçmişin, sohbetler ve cüzdan kayıtların dahil tüm verilerini istediğin zaman kalıcı olarak silebilirsin. Bu işlem geri alınamaz; kalan kredilerin de silinir.</Dim>
        {!confirming ? (
          <Button title="Hesabımı ve Verilerimi Sil" variant="danger" onPress={() => setConfirming(true)} testID="delete-account" />
        ) : (
          <Card style={{ gap: 12, borderColor: 'rgba(231,120,143,0.35)' }}>
            <Body>Emin misin? Tüm verilerin kalıcı olarak silinecek.</Body>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button title="Vazgeç" variant="ghost" onPress={() => setConfirming(false)} style={{ flex: 1 }} />
              <Button title="Kalıcı Olarak Sil" variant="danger" onPress={wipe} loading={busy} style={{ flex: 1 }} testID="delete-confirm" />
            </View>
          </Card>
        )}
      </View>
    </Screen>
  );
}
