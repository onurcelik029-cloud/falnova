import React, { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import type { KarmicTopicId } from '@/shared/types.ts';
import { KARMIC_TOPICS } from '@/shared/mock2.ts';
import { COSTS } from '@/shared/packages.ts';
import { Body, Button, Card, Dim, Eyebrow, Field, H1, Screen } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { MysticLoader } from '@/components/MysticLoader';
import { useApp } from '@/state/app';
import { colors, gradients, serif } from '@/theme';

const TOPIC_ICON: Record<string, IconName> = { ask: 'heart', kariyer: 'wheel', para: 'gem', aile: 'user', kendini: 'eye', saglik: 'dream' };

const LOADING = [
  'Ruhunun geçmiş yaşam izleri taranıyor…',
  'Karmik borç defteri açılıyor…',
  'Önümüzdeki 3 ayın yıldız haritası çiziliyor…',
  'Kader dönemecin hesaplanıyor…',
];

export default function Karmic() {
  const { api, run, setWallet, showFortune, ensureConsent } = useApp();
  const [topic, setTopic] = useState<KarmicTopicId | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!topic || !(await ensureConsent())) return;
    setLoading(true);
    const res = await run(() => api.karmic({ topic, note: note.trim() || undefined }));
    setLoading(false);
    if (res) { setWallet(res.wallet); showFortune(res.fortune); }
  };

  if (loading) return <Screen title="Karmik Dönemeç" back mark="karmic"><MysticLoader messages={LOADING} /></Screen>;

  return (
    <Screen title="Karmik Dönemeç" subtitle="Kader Senaryosu Raporu" back mark="karmic">
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 20, padding: 20, gap: 10, borderWidth: 1, borderColor: colors.borderStrong }}>
        <Eyebrow>İlk bölüm hediye</Eyebrow>
        <H1 style={{ fontSize: 26, lineHeight: 31 }}>Hayatındaki tıkanıklık hangi alanda?</H1>
        <Text style={{ color: colors.textDim, lineHeight: 22, fontSize: 14 }}>
          Seçtiğin alana göre geçmiş karmik borcunu ve tıkanıklığının kökünü ücretsiz göreceksin. 3 aylık kader senaryosu ve paylaşılabilir Kader Posteri kilitli ({COSTS.karmicUnlock} kredi).
        </Text>
      </LinearGradient>

      <View style={{ gap: 10 }}>
        {KARMIC_TOPICS.map((t, i) => (
          <Card key={t.id} gold={topic === t.id} onPress={() => setTopic(t.id)}>
            <View pointerEvents="none" style={{ position: 'absolute', right: -14 - (i % 3) * 6, top: -16 - (i % 2) * 8, opacity: 0.08, transform: [{ rotate: `${i % 2 === 0 ? '-' : ''}${8 + (i % 3) * 4}deg` }] }}>
              <Icon name={TOPIC_ICON[t.id] ?? 'spark'} size={88} color={colors.gold} stroke={0.7} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: topic === t.id ? colors.goldTintStrong : colors.goldTint, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={TOPIC_ICON[t.id] ?? 'spark'} size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: serif, color: colors.text, fontSize: 20, fontWeight: '600' }}>{t.label}</Text>
                <Dim>“{t.blurb}”</Dim>
              </View>
              {topic === t.id ? <Icon name="check" size={20} stroke={1.8} /> : null}
            </View>
          </Card>
        ))}
      </View>

      <Field label="Eklemek istediğin bir not (isteğe bağlı)" value={note} onChangeText={setNote} placeholder="Örn. Son 2 yıldır aynı döngüyü yaşıyorum" multiline />
      <Button title="Raporumu Hazırla · Ücretsiz Başla" variant="gold" disabled={!topic} onPress={create} testID="karmic-create" />
      <Body style={{ color: colors.textFaint, fontSize: 12, textAlign: 'center' }}>Rapor eğlence ve kişisel farkındalık amaçlıdır; tıbbi, hukuki ya da finansal tavsiye değildir.</Body>
    </Screen>
  );
}
