import React, { useState } from 'react';
import { View } from 'react-native';
import { COSTS } from '@/shared/packages.ts';
import { Body, Button, Card, Chip, Dim, ErrorText, Eyebrow, Field, Screen } from '@/components/ui';
import { MysticLoader } from '@/components/MysticLoader';
import { useApp } from '@/state/app';
import { colors } from '@/theme';

const EXAMPLES = [
  'Denizin ortasında yüzüyordum, sular çok berraktı ve uzaktan bir ev görünüyordu.',
  'Yüksek bir yerden düşüyordum ama yere çarpmadan uyandım.',
  'Eski sevgilim bana bir anahtar uzattı, kapıyı açınca karanlık bir oda vardı.',
];

export default function Dream() {
  const { api, run, setWallet, showFortune, ensureConsent } = useApp();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (text.trim().length < 15) return setErr('Rüyanı biraz daha ayrıntılı anlatır mısın? (en az 15 karakter)');
    if (!(await ensureConsent())) return;
    setErr(null);
    setLoading(true);
    const res = await run(() => api.dream({ text: text.trim() }));
    setLoading(false);
    if (res) { setWallet(res.wallet); showFortune(res.fortune); }
  };

  if (loading) return <Screen title="Rüya Tabiri" back mark="dream"><MysticLoader messages={['Rüyanın sembolleri ayrıştırılıyor…', 'Bilinçaltın dinleniyor…', 'Mistik ve psikolojik katmanlar birleşiyor…']} /></Screen>;

  return (
    <Screen title="Rüya Tabiri" subtitle="Psikolojik ve mistik çözümleme" back mark="dream">
      <Card>
        <View style={{ gap: 6 }}>
          <Eyebrow>Rüyanı anlat</Eyebrow>
          <Body style={{ fontSize: 14, color: colors.textDim }}>Ne gördüğünü, neler hissettiğini ve varsa renk, kişi, mekân ayrıntılarını yaz. Ne kadar ayrıntı, o kadar net yorum.</Body>
        </View>
      </Card>
      <Field value={text} onChangeText={setText} placeholder="Rüyamda…" multiline maxLength={1200} testID="dream-text" />
      <Dim style={{ textAlign: 'right' }}>{text.length}/1200</Dim>
      <Dim>Örnek rüyalar:</Dim>
      <View style={{ gap: 8 }}>
        {EXAMPLES.map((e) => <Chip key={e} label={e.length > 52 ? `${e.slice(0, 52)}…` : e} onPress={() => setText(e)} />)}
      </View>
      <ErrorText>{err}</ErrorText>
      <Button title={`Rüyamı Yorumla · ${COSTS.dream} Kredi`} variant="gold" onPress={submit} testID="dream-submit" />
    </Screen>
  );
}
