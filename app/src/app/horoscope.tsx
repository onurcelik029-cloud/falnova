import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Pressable } from 'react-native';
import { Text } from '@/components/Text';
import type { FortuneResult, ZodiacId } from '@/shared/types.ts';
import { ZODIAC, zodiacById } from '@/shared/zodiac.ts';
import { Body, Button, Card, Chip, Dim, Screen } from '@/components/ui';
import { MysticLoader } from '@/components/MysticLoader';
import { ZodiacGlyph } from '@/components/ZodiacGlyph';
import { FortuneView } from '@/components/FortuneView';
import { useApp } from '@/state/app';
import { colors } from '@/theme';

export default function Horoscope() {
  const { api, user, run, ensureConsent } = useApp();
  const mySign = user?.profile.sign ?? 'koc';
  const [sign, setSign] = useState<ZodiacId>(mySign);
  const [period, setPeriod] = useState<'daily' | 'weekly'>('daily');
  const [fortune, setFortune] = useState<FortuneResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [needConsent, setNeedConsent] = useState(false);

  const load = useCallback(async () => {
    if (!(await ensureConsent())) { setNeedConsent(true); setLoading(false); return; }
    setNeedConsent(false);
    setLoading(true);
    const res = await run(() => api.horoscope(sign, period));
    setLoading(false);
    if (res) setFortune(res.fortune);
  }, [api, run, sign, period, ensureConsent]);

  useEffect(() => { load(); }, [load]);

  return (
    <Screen title="Burçlar ve Günlük Rehber" back mark="wheel">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 10 }}>
        {ZODIAC.map((z) => (
          <Pressable key={z.id} onPress={() => setSign(z.id)} testID={`sign-${z.id}`} style={{ alignItems: 'center', gap: 4, width: 62 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: sign === z.id ? colors.gold : colors.border, backgroundColor: sign === z.id ? colors.goldTintStrong : 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center' }}>
              <ZodiacGlyph id={z.id} size={24} color={sign === z.id ? colors.gold : colors.text} />
            </View>
            <Text style={{ fontSize: 11, color: sign === z.id ? colors.gold : colors.textDim }}>{z.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="Günlük" selected={period === 'daily'} onPress={() => setPeriod('daily')} />
        <Chip label="Haftalık" selected={period === 'weekly'} onPress={() => setPeriod('weekly')} />
        {sign === mySign ? <Chip label="Senin burcun" selected /> : null}
      </View>

      {needConsent ? (
        <Card>
          <View style={{ gap: 10 }}>
            <Body>Burç yorumunu hazırlamak için önce açık rıza onayını vermen gerekiyor.</Body>
            <Button title="Devam Et" variant="gold" small onPress={load} testID="horoscope-consent" />
          </View>
        </Card>
      ) : loading || !fortune ? (
        <MysticLoader messages={[`${zodiacById(sign).name} burcunun gökyüzü haritası çiziliyor…`, 'Gezegen dizilimi okunuyor…']} />
      ) : (
        <>
          <FortuneView fortune={fortune} userName={user?.profile.name ?? ''} />
          <Dim style={{ textAlign: 'center' }}>Burç yorumları eğlence ve ilham amaçlıdır.</Dim>
        </>
      )}
    </Screen>
  );
}
