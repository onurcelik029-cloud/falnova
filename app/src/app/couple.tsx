import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import type { CoupleRequest } from '@/shared/types.ts';
import { zodiacById } from '@/shared/zodiac.ts';
import { COSTS } from '@/shared/packages.ts';
import { Button, Card, Chip, Dim, ErrorText, Eyebrow, Screen } from '@/components/ui';
import { MysticLoader } from '@/components/MysticLoader';
import { ZodiacGlyph } from '@/components/ZodiacGlyph';
import { ProfileFields, draftToProfile, emptyDraft, type ProfileDraft } from '@/components/ProfileForm';
import { useApp } from '@/state/app';
import { colors } from '@/theme';

const RELS: { id: CoupleRequest['relationship']; label: string }[] = [
  { id: 'sevgili', label: 'Sevgili' },
  { id: 'evli', label: 'Evli' },
  { id: 'flort', label: 'Flört' },
  { id: 'eski', label: 'Eski sevgili' },
  { id: 'arkadas', label: 'Yakın arkadaş' },
];

export default function Couple() {
  const { api, user, run, setWallet, showFortune, ensureConsent } = useApp();
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [rel, setRel] = useState<CoupleRequest['relationship']>('sevgili');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  if (!user) return null;
  const me = zodiacById(user.profile.sign);

  const submit = async () => {
    const { profile, error } = draftToProfile(draft);
    if (!profile) return setErr(error ?? 'Partner bilgilerini kontrol et.');
    if (!(await ensureConsent())) return;
    setErr(null);
    setLoading(true);
    const res = await run(() => api.couple({
      relationship: rel,
      partner: { name: profile.name, birthDate: profile.birthDate, birthTime: profile.birthTime, sign: profile.sign },
    }));
    setLoading(false);
    if (res) { setWallet(res.wallet); showFortune(res.fortune); }
  };

  if (loading) return <Screen title="Partner Analizi" back mark="couple"><MysticLoader messages={['İki burcun enerjisi karşılaştırılıyor…', 'Sinerji haritası çiziliyor…', 'Olası çatışma noktaları taranıyor…', 'İlişki haritası yazılıyor…']} /></Screen>;

  return (
    <Screen title="Partner Analizi" subtitle="Sinerji ve ilişki haritası" back mark="couple">
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
            <ZodiacGlyph id={me.id} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '500', fontSize: 16 }}>{user.profile.name} <Text style={{ color: colors.textDim, fontWeight: '400' }}>(sen)</Text></Text>
            <Dim>{me.name} · {user.profile.birthDate.split('-').reverse().join('.')}</Dim>
          </View>
        </View>
      </Card>

      <Eyebrow color={colors.textDim}>Partnerinin bilgileri</Eyebrow>
      <ProfileFields value={draft} onChange={setDraft} showFocus={false} />

      <View style={{ gap: 8 }}>
        <Dim>Aranızdaki ilişki</Dim>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {RELS.map((r) => <Chip key={r.id} label={r.label} selected={rel === r.id} onPress={() => setRel(r.id)} />)}
        </View>
      </View>
      <ErrorText>{err}</ErrorText>
      <Button title={`Analizi Başlat · ${COSTS.couple} Kredi`} variant="gold" onPress={submit} testID="couple-submit" />
    </Screen>
  );
}
