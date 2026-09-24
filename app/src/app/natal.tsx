import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import type { FortuneResult } from '@/shared/types.ts';
import { Body, Button, Card, Dim, Eyebrow, Screen } from '@/components/ui';
import { MysticLoader } from '@/components/MysticLoader';
import { FortuneView } from '@/components/FortuneView';
import { router } from 'expo-router';
import { useApp } from '@/state/app';
import { colors } from '@/theme';

export default function Natal() {
  const { api, user, run, ensureConsent } = useApp();
  const [fortune, setFortune] = useState<FortuneResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [needConsent, setNeedConsent] = useState(false);

  const load = useCallback(async () => {
    if (!(await ensureConsent())) { setNeedConsent(true); setLoading(false); return; }
    setNeedConsent(false);
    setLoading(true);
    const res = await run(() => api.natal());
    setLoading(false);
    if (res) setFortune(res.fortune);
  }, [api, run, ensureConsent]);

  useEffect(() => { load(); }, [load]);

  const hasTime = !!user?.profile.birthTime;

  return (
    <Screen title="Doğum Haritası" subtitle="Güneş, Ay ve Yükselen burcun" back mark="sun">
      {needConsent ? (
        <Card>
          <View style={{ gap: 10 }}>
            <Body>Doğum haritanı hazırlamak için önce açık rıza onayını vermen gerekiyor.</Body>
            <Button title="Devam Et" variant="gold" small onPress={load} testID="natal-consent" />
          </View>
        </Card>
      ) : loading || !fortune ? (
        <MysticLoader messages={['Doğum anındaki gökyüzü hesaplanıyor…', 'Güneş, Ay ve Yükselen konumlanıyor…']} />
      ) : (
        <>
          <FortuneView fortune={fortune} userName={user?.profile.name ?? ''} />
          {!hasTime ? (
            <Card onPress={() => router.push('/profile')} testID="natal-add-time">
              <View style={{ gap: 4 }}>
                <Eyebrow>Yükselenini de görmek ister misin?</Eyebrow>
                <Body style={{ color: colors.textDim }}>Profiline doğum saatini ve yerini eklersen Yükselen burcun da hesaplanır.</Body>
                <Dim style={{ color: colors.gold, marginTop: 2 }}>Profilime git →</Dim>
              </View>
            </Card>
          ) : null}
          <Dim style={{ textAlign: 'center' }}>Doğum haritası eğlence ve ilham amaçlıdır.</Dim>
        </>
      )}
    </Screen>
  );
}
