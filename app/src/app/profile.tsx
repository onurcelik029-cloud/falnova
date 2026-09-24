import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { zodiacById, ELEMENT_LABEL } from '@/shared/zodiac.ts';
import { Badge, Button, Card, Dim, ErrorText, Eyebrow, Screen } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ZodiacGlyph } from '@/components/ZodiacGlyph';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { ProfileFields, draftFromProfile, draftToProfile, emptyDraft, type ProfileDraft } from '@/components/ProfileForm';
import { useApp } from '@/state/app';
import { colors, serif } from '@/theme';
import { resetToLogin } from '@/lib/nav';
import { getDemoFast, setDemoFast } from '@/lib/pace';
import { getAmbientSound, setAmbientSound } from '@/lib/ambient';

export default function Profile() {
  const { api, user, setUser, signOut, run, toast } = useApp();
  const [draft, setDraft] = useState<ProfileDraft>(() => (user ? draftFromProfile(user.profile) : emptyDraft));
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fast, setFast] = useState(false);
  const [ambient, setAmbient] = useState(false);
  useEffect(() => { if (api.mode === 'demo') getDemoFast().then(setFast); }, [api]);
  useEffect(() => { getAmbientSound().then(setAmbient); }, []);
  if (!user) return null;
  const z = zodiacById(user.profile.sign);

  const save = async () => {
    const { profile, error } = draftToProfile(draft);
    if (!profile) return setErr(error ?? 'Bilgileri kontrol et.');
    setErr(null);
    setSaving(true);
    const res = await run(() => api.updateProfile(profile));
    setSaving(false);
    if (res) { setUser(res.user); toast('Profilin güncellendi.'); }
  };

  return (
    <Screen title="Profilim" back mark="user">
      <Card gold>
        <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
            <ZodiacGlyph id={z.id} size={32} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ fontFamily: serif, color: colors.text, fontSize: 26, fontWeight: '600' }}>{user.profile.name}</Text>
            <Dim>{user.email}</Dim>
            <Badge text={`${z.name.toUpperCase()} · ${ELEMENT_LABEL[z.element].toUpperCase()}`} tone="gold" />
          </View>
        </View>
      </Card>
      <Eyebrow color={colors.textDim}>Bilgilerini düzenle</Eyebrow>
      <ProfileFields value={draft} onChange={setDraft} />
      <ErrorText>{err}</ErrorText>
      <Button title="Kaydet" onPress={save} loading={saving} />
      <View style={{ height: 4 }} />
      <Card onPress={() => { const v = !ambient; setAmbient(v); setAmbientSound(v); toast(v ? 'Ortam sesi açıldı: mum çıtırtısı ve hafif rüzgar.' : 'Ortam sesi kapatıldı.'); }} testID="ambient-sound">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <Icon name="speaker" size={22} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 15.5, fontWeight: '500' }}>Ortam Sesi</Text>
            <Dim style={{ fontSize: 12.5 }}>Mum çıtırtısı ve hafif oda tınısı — isteğe bağlı, varsayılan kapalı.</Dim>
          </View>
          <View style={{ width: 42, height: 24, borderRadius: 12, backgroundColor: ambient ? colors.gold : colors.goldTint, borderWidth: 1, borderColor: colors.borderStrong, padding: 2, alignItems: ambient ? 'flex-end' : 'flex-start' }}>
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: ambient ? colors.ink : colors.textFaint }} />
          </View>
        </View>
      </Card>
      {api.mode === 'demo' ? (
        <Card onPress={() => { const v = !fast; setFast(v); setDemoFast(v); toast(v ? 'Bekleme süreleri kısaltıldı (yalnızca demo).' : 'Bekleme süreleri normale döndü.'); }} testID="demo-fast">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <Icon name="bell" size={22} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 15.5, fontWeight: '500' }}>Demo: bekleme sürelerini kısalt</Text>
              <Dim style={{ fontSize: 12.5 }}>Okumaların hazırlanma süresi test için atlanır. Yalnızca demo sürümde görünür.</Dim>
            </View>
            <View style={{ width: 42, height: 24, borderRadius: 12, backgroundColor: fast ? colors.gold : colors.goldTint, borderWidth: 1, borderColor: colors.borderStrong, padding: 2, alignItems: fast ? 'flex-end' : 'flex-start' }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: fast ? colors.ink : colors.textFaint }} />
            </View>
          </View>
        </Card>
      ) : null}
      <Card style={{ paddingVertical: 4, paddingHorizontal: 0 }}>
        <Pressable onPress={() => router.push('/legal')} testID="legal-menu" style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 15, opacity: pressed ? 0.7 : 1 })}>
          <Icon name="shield" size={22} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 15.5, fontWeight: '500' }}>Yasal</Text>
            <Dim style={{ fontSize: 12.5 }}>KVKK, gizlilik, kullanım koşulları, verilerim</Dim>
          </View>
          <Icon name="chevron" size={18} color={colors.textFaint} />
        </Pressable>
      </Card>
      <Button title="Çıkış Yap" variant="danger" onPress={async () => { await signOut(); resetToLogin(); }} testID="logout" />
      <Dim style={{ textAlign: 'center', fontSize: 12, color: colors.textFaint }}>FalNova · sürüm 1.0</Dim>
    </Screen>
  );
}
