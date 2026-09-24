import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import { router, useFocusEffect, type Href } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge, Card, Dim, Eyebrow, Screen } from '@/components/ui';
import { Icon, Ornament, type IconName } from '@/components/Icon';
import { ZodiacGlyph } from '@/components/ZodiacGlyph';
import { DailyCard, NovaNote, PendingList, useHome } from '@/components/DailyRitual';
import { useApp } from '@/state/app';
import { zodiacById } from '@/shared/zodiac.ts';
import { COSTS } from '@/shared/packages.ts';
import { colors, gradients, serif } from '@/theme';

interface Tile { href: Href; icon: IconName; title: string; sub: string; cost: string; mark: { size: number; top: number; right: number; rotate: string } }

// mark: her karta özgü, kartın kendi ikonunun soluk/kocaman su damgası hâli — tek biçimli
// rozet tekrarını kırmak için 5 karta 5 farklı boyut/açı/konum.
const TILES: Tile[] = [
  { href: '/coffee', icon: 'coffee', title: 'Kahve Falı', sub: 'Fincanın ve tabağın konuşsun', cost: `${COSTS.coffee} kredi`, mark: { size: 108, top: -22, right: -20, rotate: '-8deg' } },
  { href: '/tarot', icon: 'tarot', title: 'Tarot', sub: 'Kartını seç, yorumunu al', cost: `${COSTS.tarot} kredi`, mark: { size: 96, top: -16, right: -14, rotate: '11deg' } },
  { href: '/horoscope', icon: 'wheel', title: 'Burç Rehberi', sub: 'Günlük ve haftalık yorum', cost: 'Hediye', mark: { size: 118, top: -28, right: -26, rotate: '4deg' } },
  { href: '/dream', icon: 'dream', title: 'Rüya Tabiri', sub: 'Rüyanın gizli anlamı', cost: `${COSTS.dream} kredi`, mark: { size: 100, top: -18, right: -22, rotate: '-14deg' } },
  { href: '/natal', icon: 'sun', title: 'Doğum Haritası', sub: 'Güneş, Ay ve Yükselenin', cost: 'Hediye', mark: { size: 104, top: -20, right: -16, rotate: '9deg' } },
];

export default function Dashboard() {
  const { user, wallet, pending } = useApp();
  const { home, refresh, claim, busy } = useHome();
  // Ekrana her dönüldüğünde (yeni okuma, yeni not) yenile.
  useFocusEffect(useCallback(() => { if (user) refresh(); }, [user, refresh]));
  if (!user) return null;
  const z = zodiacById(user.profile.sign);
  const hour = new Date().getHours();
  const greet = hour < 6 ? 'İyi geceler' : hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar';

  return (
    <Screen bottomInset={false} contentStyle={{ gap: 18 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Eyebrow color={colors.textDim}>{greet}</Eyebrow>
          <Text style={{ fontFamily: serif, fontSize: 32, color: colors.text, fontWeight: '600', lineHeight: 38 }} numberOfLines={1}>{user.profile.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <ZodiacGlyph id={z.id} size={14} />
            <Text style={{ color: colors.gold, fontSize: 13, letterSpacing: 0.4 }}>{z.name}</Text>
          </View>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/wallet')} testID="wallet-pill" style={{ flexDirection: 'row', gap: 7, alignItems: 'center', borderColor: colors.borderStrong, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 22 }}>
          <Icon name="spark" size={14} color={colors.gold} stroke={1.5} />
          <Text style={{ color: colors.goldBright, fontWeight: '600', fontSize: 15 }}>{wallet.credits}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/profile')} testID="profile-btn" style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="user" size={19} color={colors.text} />
        </Pressable>
      </View>

      <PendingList items={pending} />

      {home ? <DailyCard daily={home.daily} onClaim={claim} busy={busy} /> : null}
      {home?.note ? <NovaNote note={home.note} /> : null}

      {/* Öne çıkan: Karmik Dönemeç */}
      <Pressable onPress={() => router.push('/karmic')} testID="karmic-hero" style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}>
        <LinearGradient colors={gradients.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 22, gap: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderStrong }}>
          <View style={{ position: 'absolute', right: -18, top: -18, opacity: 0.16 }}>
            <Icon name="karmic" size={150} color={colors.gold} stroke={0.7} />
          </View>
          <Eyebrow>İlk bölüm hediye</Eyebrow>
          <Text style={{ fontFamily: serif, fontSize: 28, color: colors.text, fontWeight: '600', lineHeight: 33, maxWidth: 270 }}>Karmik Dönemeç ve Kader Senaryosu</Text>
          <Text style={{ color: colors.textDim, fontSize: 14, lineHeight: 21, maxWidth: 290 }}>Geçmişten taşıdığın borcu ve önümüzdeki üç ayın dönemecini öğren.</Text>
          <Text style={{ color: colors.goldBright, fontWeight: '500', fontSize: 14, letterSpacing: 0.6, marginTop: 4 }}>Raporunu aç  →</Text>
        </LinearGradient>
      </Pressable>

      <View style={{ alignItems: 'center', marginVertical: -2 }}><Ornament width={100} /></View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {TILES.map((t) => (
          <Pressable key={t.title} onPress={() => router.push(t.href)} style={({ pressed }) => ({ width: '48%', flexGrow: 1, alignSelf: 'stretch', opacity: pressed ? 0.88 : 1 })} testID={`tile-${t.title}`}>
            <LinearGradient colors={gradients.card} style={{ borderRadius: 18, padding: 16, gap: 8, borderWidth: 1, borderColor: colors.border, minHeight: 156, flex: 1, overflow: 'hidden' }}>
              <View pointerEvents="none" style={{ position: 'absolute', top: t.mark.top, right: t.mark.right, opacity: 0.1, transform: [{ rotate: t.mark.rotate }] }}>
                <Icon name={t.icon} size={t.mark.size} color={colors.gold} stroke={0.7} />
              </View>
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={t.icon} size={22} />
              </View>
              <Text style={{ fontFamily: serif, color: colors.text, fontSize: 21, fontWeight: '600', marginTop: 2 }}>{t.title}</Text>
              <Dim style={{ fontSize: 12.5, flex: 1, lineHeight: 18 }}>{t.sub}</Dim>
              <Text style={{ color: colors.gold, fontSize: 11, letterSpacing: 1.4 }}>{t.cost.toLocaleUpperCase('tr-TR')}</Text>
            </LinearGradient>
          </Pressable>
        ))}
      </View>

      <WideRow icon="couple" title="Partner Analizi" sub={`Sinerji, çatışma ve ilişki haritanız · ${COSTS.couple} kredi`} href="/couple" gold />
      <WideRow icon="hand" title="El Falı" sub={`Avuç içindeki çizgilerin ne söylediğine bak · ${COSTS.palm} kredi`} href="/palm" />
      <WideRow icon="voice" title="Sesli Falcı" sub="Gerçek falcı sesiyle sohbet — çok yakında" href="/voice" soon />
      <View style={{ height: 10 }} />
    </Screen>
  );
}

function WideRow({ icon, title, sub, href, gold, soon }: { icon: IconName; title: string; sub: string; href: Href; gold?: boolean; soon?: boolean }) {
  return (
    <Card onPress={() => router.push(href)} gold={gold} style={{ paddingVertical: 16 }}>
      <View pointerEvents="none" style={{ position: 'absolute', right: -20, top: -24, opacity: 0.09, transform: [{ rotate: '-9deg' }] }}>
        <Icon name={icon} size={104} color={colors.gold} stroke={0.7} />
      </View>
      <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: soon ? 0.6 : 1 }}>
          <Icon name={icon} size={23} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: serif, fontSize: 21, color: soon ? colors.textDim : colors.text, fontWeight: '600' }}>{title}</Text>
            {soon ? <Badge text="Yakında" tone="amber" /> : null}
          </View>
          <Dim style={{ fontSize: 12.5 }}>{sub}</Dim>
        </View>
        <Icon name="chevron" size={18} color={colors.textFaint} />
      </View>
    </Card>
  );
}
