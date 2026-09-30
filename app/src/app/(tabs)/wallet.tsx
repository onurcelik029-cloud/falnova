import React, { useCallback, useState } from 'react';
import { Linking, Platform, View } from 'react-native';
import { Text } from '@/components/Text';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/Icon';
import type { CreditPackage, TransactionRecord, Wallet as WalletBalance } from '@/shared/types.ts';
import { AD_WATCH_PER_CREDIT, SOFT_SPEND_NOTICE, formatTry, savingsPercent, unitPrice } from '@/shared/packages.ts';
import type { Offers } from '@/api';
import { Badge, Body, Button, Card, Dim, Eyebrow, H1, Screen } from '@/components/ui';
import { useAdWatch } from '@/components/AdWatch';
import { useApp } from '@/state/app';
import { timeAgo } from '@/lib/format';
import { iapCapable, purchasePackage } from '@/lib/iap';
import { colors, gradients, serif } from '@/theme';

function Section({ children }: { children: string }) {
  return <Eyebrow color={colors.textDim} style={{ marginTop: 6 }}>{children}</Eyebrow>;
}

export default function Wallet() {
  const { api, wallet, run, setWallet, toast } = useApp();
  const { watch: watchAd, playing: adPlaying, Overlay: AdOverlay } = useAdWatch();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [txs, setTxs] = useState<TransactionRecord[]>([]);
  const [selected, setSelected] = useState<CreditPackage | null>(null);
  const [paying, setPaying] = useState(false);
  const [offers, setOffers] = useState<Offers>({ firstPurchaseBonus: 0, spentToday: 0 });
  const [adWatched, setAdWatched] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [p, t, w, o] = await Promise.all([run(() => api.packages()), run(() => api.transactions()), run(() => api.wallet()), run(() => api.offers())]);
    if (o) setOffers(o);
    if (p) setPackages(p);
    if (t) setTxs(t);
    if (w) setWallet(w);
  }, [api, run, setWallet]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /** Bir satın alma (Stripe/mock ya da IAP) bakiyeye yansıdıktan sonra ortak arayüz güncellemesi. */
  const afterPurchase = async (wallet: WalletBalance, title: string) => {
    const bonus = offers.firstPurchaseBonus;
    setWallet(wallet);
    toast(`${title} hesabına eklendi${bonus ? ` · ilk alışveriş hediyesi +${bonus} kredi` : ''}. İyi fallar!`);
    setSelected(null);
    const [t, o] = await Promise.all([run(() => api.transactions()), run(() => api.offers())]);
    if (t) setTxs(t);
    if (o) setOffers(o);
  };

  /** Mevcut ödeme akışı: web/demoda tek yol, native canlı sürümde mağaza (IAP) kurulamazsa yedek. */
  const payWithCheckout = async (pkg: CreditPackage) => {
    const res = await run(() => api.checkout(pkg.id));
    if (res?.checkoutUrl) {
      // Stripe/iyzico: ödeme sağlayıcının sayfasında tamamlanır; bakiye webhook ile yüklenir ve sekmeye dönünce yenilenir.
      setSelected(null);
      toast('Güvenli ödeme sayfası açılıyor. Ödemeyi tamamlayınca bakiyen güncellenir.');
      Linking.openURL(res.checkoutUrl).catch(() => toast('Ödeme sayfası açılamadı.'));
    } else if (res) {
      await afterPurchase(res.wallet, pkg.title);
    }
  };

  /**
   * Mağaza (App Store/Google Play) üzerinden satın alma dener. Mağaza bağlantısı kurulamazsa
   * (Expo Go, ya da henüz özel geliştirme derlemesi alınmamış sürüm) false döner — çağıran taraf
   * o zaman mevcut Stripe/mock akışına sessizce düşer. Gerçek bir mağaza hatası/iptali sonrasında
   * ise (bağlantı kurulduktan SONRA) Stripe'a düşülmez — aynı ürün için çifte ödeme yolu açılmasın diye.
   */
  const payWithStore = async (pkg: CreditPackage): Promise<boolean> => {
    let purchase: Awaited<ReturnType<typeof purchasePackage>>;
    try {
      purchase = await purchasePackage(pkg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('Mağaza bağlantısı kurulamadı')) return false;
      toast(msg || 'Satın alma tamamlanamadı.');
      return true;
    }
    const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
    const res = await run(() => api.iapVerify({ platform, packageId: pkg.id, receipt: purchase.receipt, productId: purchase.productId }));
    await purchase.finish(); // sunucu doğrulaması bittikten sonra mağaza kuyruğundan sil (başarısız olsa da kritik değil)
    if (res) await afterPurchase(res.wallet, pkg.title);
    return true;
  };

  const onWatchAd = async () => {
    const res = await watchAd();
    if (res) setAdWatched(res.watched);
  };

  const pay = async () => {
    if (!selected) return;
    setPaying(true);
    try {
      if (api.mode === 'live' && iapCapable) {
        if (await payWithStore(selected)) return;
      }
      await payWithCheckout(selected);
    } finally {
      setPaying(false);
    }
  };

  const credits = packages.filter((p) => p.kind === 'credit');
  const questions = packages.filter((p) => p.kind === 'question');

  const renderPkg = (p: CreditPackage) => (
    <Card key={p.id} gold={selected?.id === p.id || !!p.badge} onPress={() => setSelected(p)} style={{ overflow: 'hidden' }}>
      {/* Paketin miktarı, kartın arkasında soluk kocaman bir rakam olarak da görünür — her paket
          kendi ağırlığını taşısın diye (5, 15, 40… hepsi aynı görünmesin). */}
      <Text pointerEvents="none" style={{ position: 'absolute', right: -6, top: -22, fontFamily: serif, fontSize: 92, fontWeight: '700', color: colors.gold, opacity: 0.07 }}>{p.amount}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} testID={`pkg-${p.id}`}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={p.kind === 'credit' ? 'spark' : 'chat'} size={21} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Text style={{ fontFamily: serif, color: colors.text, fontSize: 20, fontWeight: '600' }}>{p.title}</Text>
            {p.badge ? <Badge text={p.badge.toLocaleUpperCase('tr-TR')} tone="amber" /> : null}
          </View>
          <Dim style={{ fontSize: 12 }}>{p.description}</Dim>
          <Dim style={{ fontSize: 11.5, color: colors.textFaint }}>
            {p.kind === 'credit' ? 'Kredi' : 'Soru'} başı {formatTry(unitPrice(p))}{savingsPercent(p) > 0 ? ` · %${savingsPercent(p)} daha uygun` : ''}
          </Dim>
        </View>
        <Text style={{ color: colors.goldBright, fontWeight: '500', fontSize: 16, letterSpacing: 0.3 }}>{formatTry(p.priceTry)}</Text>
      </View>
    </Card>
  );

  return (
    <>
    <Screen bottomInset={false}>
      <H1>Cüzdan ve Mağaza</H1>
      <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 22, flexDirection: 'row', gap: 14, borderWidth: 1, borderColor: colors.borderStrong }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Eyebrow>Kredi</Eyebrow>
          <Text style={{ color: colors.goldBright, fontSize: 46, fontFamily: serif, fontWeight: '600', lineHeight: 52 }} testID="credits">{wallet.credits}</Text>
          <Text style={{ color: colors.textDim, fontSize: 12 }}>Kahve, tarot, rüya, partner</Text>
        </View>
        <View style={{ width: 1, backgroundColor: colors.borderStrong }} />
        <View style={{ flex: 1, gap: 3 }}>
          <Eyebrow>Soru hakkı</Eyebrow>
          <Text style={{ color: colors.text, fontSize: 46, fontFamily: serif, fontWeight: '600', lineHeight: 52 }} testID="questions">{wallet.questions}</Text>
          <Text style={{ color: colors.textDim, fontSize: 12 }}>Falcı sohbeti ve sesli falcı</Text>
        </View>
      </LinearGradient>

      {offers.firstPurchaseBonus > 0 ? (
        <Card gold testID="first-bonus">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Icon name="gem" size={24} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: serif, fontSize: 19, color: colors.text, fontWeight: '600' }}>İlk alışverişine +{offers.firstPurchaseBonus} kredi hediye</Text>
              <Dim style={{ fontSize: 12 }}>Herhangi bir paketi ilk kez aldığında, paketin üstüne eklenir.</Dim>
            </View>
          </View>
        </Card>
      ) : null}
      {offers.spentToday >= SOFT_SPEND_NOTICE ? (
        <Card testID="spend-notice">
          <View style={{ gap: 4 }}>
            <Text style={{ fontFamily: serif, fontSize: 18, color: colors.text, fontWeight: '600' }}>Bugün {offers.spentToday} kredi harcadın</Text>
            <Dim style={{ fontSize: 13 }}>Fal bir eğlence ve kendine bakma aracı; kararlarını onun yerine vermemeli. Bütçeni zorlamadan, ara vererek kullanmanı öneririm.</Dim>
          </View>
        </Card>
      ) : null}

      <Card onPress={() => router.push('/referral')} testID="referral-entry">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="gem" size={20} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ fontFamily: serif, fontSize: 18, color: colors.text, fontWeight: '600' }}>Arkadaşını Davet Et</Text>
            <Dim style={{ fontSize: 12 }}>Arkadaşın katılınca o kredi kazanır, ilk alışverişinde sen de kazanırsın.</Dim>
          </View>
          <Icon name="chevron" size={16} color={colors.textFaint} />
        </View>
      </Card>

      <Card testID="ad-credit">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="speaker" size={20} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={{ fontFamily: serif, fontSize: 18, color: colors.text, fontWeight: '600' }}>Reklam İzleyerek Kredi Kazan</Text>
            <Dim style={{ fontSize: 12 }}>
              Her {AD_WATCH_PER_CREDIT} reklam izlemede +1 kredi{adWatched !== null ? ` · bugün ${adWatched} reklam izlendi` : ''}
            </Dim>
          </View>
        </View>
        <Button title="Reklam İzle" variant="ghost" small loading={adPlaying} onPress={onWatchAd} style={{ marginTop: 12 }} testID="watch-ad" />
      </Card>

      <Section>Kredi paketleri</Section>
      {credits.map(renderPkg)}
      <Section>Soru paketleri</Section>
      {questions.map(renderPkg)}

      {selected ? (
        <Card gold style={{ gap: 10 }}>
          <Section>Ödemeyi onayla</Section>
          <Body>{selected.title} · <Text style={{ color: colors.goldBright, fontWeight: '600' }}>{formatTry(selected.priceTry)}</Text></Body>
          <Dim>{api.mode === 'demo'
            ? 'Test ortamı: ücret alınmaz, hak anında hesabına eklenir.'
            : 'Ödeme, güvenli ödeme sağlayıcısı üzerinden tamamlanır.'}</Dim>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Vazgeç" variant="ghost" style={{ flex: 1 }} onPress={() => setSelected(null)} />
            <Button title="Satın Al" variant="gold" style={{ flex: 1.4 }} loading={paying} onPress={pay} testID="pay" />
          </View>
        </Card>
      ) : null}

      <Section>Hareketler</Section>
      <Card>
        {txs.length === 0 ? <Dim>Henüz hareket yok.</Dim> : txs.slice(0, 12).map((t, i) => (
          <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 14 }}>{t.title}</Text>
              <Dim style={{ fontSize: 11 }}>{timeAgo(t.createdAt)}{t.amountTry ? ` · ${formatTry(t.amountTry)}` : ''}</Dim>
            </View>
            <Text style={{ color: t.credits + t.questions < 0 ? colors.danger : colors.success, fontWeight: '500' }}>
              {t.credits ? `${t.credits > 0 ? '+' : ''}${t.credits} kredi` : ''}{t.questions ? `${t.questions > 0 ? '+' : ''}${t.questions} soru` : ''}
            </Text>
          </View>
        ))}
      </Card>
    </Screen>
    {AdOverlay}
    </>
  );
}
