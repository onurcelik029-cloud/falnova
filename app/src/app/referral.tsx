import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { useFocusEffect } from 'expo-router';
import { Body, Button, Card, Dim, Eyebrow, Screen } from '@/components/ui';
import { REFERRAL_REWARD_CREDITS, REFERRAL_WELCOME_CREDITS } from '@/shared/packages.ts';
import type { ReferralInfo } from '@/shared/types.ts';
import { useApp } from '@/state/app';
import { shareText } from '@/lib/share.ts';
import { colors, serif } from '@/theme';

export default function Referral() {
  const { api, run, toast } = useApp();
  const [info, setInfo] = useState<ReferralInfo | null>(null);

  const load = useCallback(async () => {
    const r = await run(() => api.referral());
    if (r) setInfo(r);
  }, [api, run]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const share = async () => {
    if (!info) return;
    const outcome = await shareText(
      `Ben FalNova kullanıyorum, sen de dene: kayıt olurken arkadaş kodumu gir — ${info.code} — ikimiz de kredi kazanalım.`,
    );
    if (outcome === 'copied') toast('Davet metni panoya kopyalandı.');
    else if (outcome === 'failed') toast('Paylaşılamadı, kodu elle iletebilirsin.');
  };

  return (
    <Screen title="Arkadaşını Davet Et" subtitle="Gerçek arkadaşların, gerçek kredi" back mark="share">
      <Card gold>
        <View style={{ gap: 10 }}>
          <Eyebrow>Senin kodun</Eyebrow>
          <Text style={{ fontFamily: serif, fontSize: 40, letterSpacing: 6, color: colors.goldBright, fontWeight: '600' }} testID="referral-code">
            {info?.code ?? '······'}
          </Text>
          <Dim>
            Bu kodu bir arkadaşınla paylaş. Arkadaşın üye olurken kodunu girerse hemen +{REFERRAL_WELCOME_CREDITS} kredi kazanır;
            arkadaşın ilk kez kredi ya da soru paketi satın aldığında sana da +{REFERRAL_REWARD_CREDITS} kredi hediye edilir.
          </Dim>
          <Button title="Kodu Paylaş" variant="gold" onPress={share} testID="referral-share" />
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', gap: 18 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: serif, fontSize: 30, color: colors.text, fontWeight: '600' }} testID="referral-invited">{info?.invited ?? 0}</Text>
            <Dim style={{ fontSize: 12 }}>Katılan arkadaş</Dim>
          </View>
          <View style={{ width: 1, backgroundColor: colors.border }} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: serif, fontSize: 30, color: colors.goldBright, fontWeight: '600' }} testID="referral-earned">{info?.earnedCredits ?? 0}</Text>
            <Dim style={{ fontSize: 12 }}>Kazanılan kredi</Dim>
          </View>
        </View>
      </Card>

      {info?.usedCode ? (
        <Card style={{ gap: 6 }}>
          <Eyebrow color={colors.textDim}>Sen de bir kodla katıldın</Eyebrow>
          <Body>Kayıt olurken girdiğin arkadaş kodu için hoş geldin hediyeni zaten aldın.</Body>
        </Card>
      ) : (
        <Card style={{ gap: 6 }}>
          <Eyebrow color={colors.textDim}>Sana bir kod verdiler mi?</Eyebrow>
          <Body>Arkadaş kodu yalnızca üye olurken girilebilir; senin hesabın zaten var, bundan sonra yeni bir hesap için geçerli.</Body>
        </Card>
      )}

      <Dim style={{ fontSize: 11.5, textAlign: 'center', marginTop: 2 }}>
        Sahte davet sayacı ya da uydurma "şu an katılanlar" listesi yok; burada gördüğün sayılar gerçek.
      </Dim>
    </Screen>
  );
}
