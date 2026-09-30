// Reklam izleyerek kredi/ipucu kazanma: ödüllü reklam SDK'sı (ör. AdMob) henüz bağlı değil —
// bunun için kullanıcının kendi AdMob hesabı + native (EAS) derleme gerekir, aynı Stripe anahtarları
// gibi bu proje sahibinin kendi başına kuracağı bir bağlantı. Bu bileşen o SDK'nın yerini tutan,
// açıkça işaretlenmiş bir simülasyondur: sunucudaki kredi ekonomisi (bkz. backend/src/store.ts
// adWatch()) tamamen gerçek ve uygulanıyor — yalnızca "reklamı izletme" adımı burada sahte bir
// gecikmeyle simüle ediliyor. Gerçek SDK bağlanınca yalnızca aşağıdaki playAd() içeriği, gerçek
// ödüllü reklam çağrısıyla değiştirilecek; geri kalan (api.adWatch, kredi/ipucu mantığı) aynen kalır.
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { Icon } from '@/components/Icon';
import { useApp } from '@/state/app';
import { colors, serif } from '@/theme';

const AD_SECONDS = 3;

export interface AdWatchResult { watched: number; rewarded: boolean; nextCreditIn: number }

export function useAdWatch() {
  const { api, setWallet, toast } = useApp();
  const [playing, setPlaying] = useState(false);
  const [left, setLeft] = useState(AD_SECONDS);

  const playAd = useCallback(async () => {
    setPlaying(true);
    for (let i = AD_SECONDS; i >= 1; i--) {
      setLeft(i);
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 700));
    }
    setPlaying(false);
  }, []);

  /** Reklamı "izletir", sunucuya bildirir ve güncel sonucu döner (kredi kazanıldıysa cüzdanı da günceller). */
  const watch = useCallback(async (): Promise<AdWatchResult | null> => {
    await playAd();
    try {
      const res = await api.adWatch();
      setWallet(res.wallet);
      if (res.rewarded) toast('Reklam için teşekkürler — +1 kredi kazandın!');
      return res;
    } catch {
      toast('Reklam şu an yüklenemedi, birazdan tekrar dene.');
      return null;
    }
  }, [api, playAd, setWallet, toast]);

  const Overlay = playing ? (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      <View style={s.wrap}>
        <Icon name="speaker" size={36} stroke={1.2} />
        <Text style={s.title}>Reklam oynatılıyor…</Text>
        <Text style={s.sub}>{left} sn sonra devam edebilirsin</Text>
      </View>
    </View>
  ) : null;

  return { watch, playing, Overlay };
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(4,2,8,0.94)', alignItems: 'center', justifyContent: 'center', gap: 12 },
  title: { fontFamily: serif, fontSize: 20, color: colors.text, fontWeight: '600' },
  sub: { color: colors.textDim, fontSize: 13 },
});
