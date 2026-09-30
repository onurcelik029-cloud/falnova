import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import { router, useFocusEffect, type Href } from 'expo-router';
import { Badge, Dim, Eyebrow, ParchmentCard, Screen } from '@/components/ui';
import { Icon, Ornament, type IconName } from '@/components/Icon';
import { Medallion, type MedallionKind } from '@/components/Medallion';
import { ZodiacGlyph } from '@/components/ZodiacGlyph';
import { DailyCard, NovaNote, PendingList, useHome } from '@/components/DailyRitual';
import { useApp } from '@/state/app';
import { zodiacById } from '@/shared/zodiac.ts';
import { COSTS } from '@/shared/packages.ts';
import { colors, serif } from '@/theme';

interface Tile { href: Href; icon: IconName; medallion: MedallionKind; title: string; sub: string; cost: string; rotate: number }

// Her kart hafifçe farklı açıda — kusursuz bir ızgara değil, masaya elle bırakılmış kartlar gibi.
const TILES: Tile[] = [
  { href: '/coffee', icon: 'coffee', medallion: 'coffee', title: 'Kahve Falı', sub: 'Fincanın ve tabağın konuşsun', cost: `${COSTS.coffee} kredi`, rotate: -2.4 },
  { href: '/tarot', icon: 'tarot', medallion: 'tarot', title: 'Tarot', sub: 'Kartını seç, yorumunu al', cost: `${COSTS.tarot} kredi`, rotate: 2.1 },
  { href: '/horoscope', icon: 'wheel', medallion: 'zodiac', title: 'Burç Rehberi', sub: 'Günlük ve haftalık yorum', cost: 'Hediye', rotate: 1.6 },
  { href: '/dream', icon: 'dream', medallion: 'dream', title: 'Rüya Tabiri', sub: 'Rüyanın gizli anlamı', cost: `${COSTS.dream} kredi`, rotate: -1.5 },
  { href: '/natal', icon: 'sun', medallion: 'natal', title: 'Doğum Haritası', sub: 'Güneş, Ay ve Yükselenin', cost: 'Hediye', rotate: 2.3 },
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
      <ParchmentCard onPress={() => router.push('/karmic')} testID="karmic-hero" rotate={-1.1} seal contentStyle={{ padding: 22, gap: 10 }}>
        <View style={{ position: 'absolute', right: 8, top: 6, opacity: 0.9 }}>
          <Medallion kind="karmic" size={54} />
        </View>
        <Text style={{ fontFamily: serif, fontSize: 10.5, letterSpacing: 2.4, color: colors.gilt, fontWeight: '600' }}>İLK BÖLÜM HEDİYE</Text>
        <Text style={{ fontFamily: serif, fontSize: 26, color: colors.inkText, fontWeight: '600', lineHeight: 31, maxWidth: 230, marginTop: 4 }}>Karmik Dönemeç ve Kader Senaryosu</Text>
        <Text style={{ color: colors.inkDim, fontSize: 13.5, lineHeight: 20, maxWidth: 260, marginTop: 2 }}>Geçmişten taşıdığın borcu ve önümüzdeki üç ayın dönemecini öğren.</Text>
        <Text style={{ color: colors.wine, fontWeight: '600', fontSize: 14, letterSpacing: 0.4, marginTop: 6 }}>Raporunu aç  →</Text>
      </ParchmentCard>

      <View style={{ alignItems: 'center', marginVertical: -2 }}><Ornament width={100} /></View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 4 }}>
        {TILES.map((t, i) => (
          <ParchmentCard
            key={t.title}
            onPress={() => router.push(t.href)}
            testID={`tile-${t.title}`}
            rotate={t.rotate}
            style={{ width: '46.5%', flexGrow: 1, marginTop: i % 2 ? 12 : 0 }}
            contentStyle={{ padding: 15, minHeight: 172, alignItems: 'center' }}
          >
            <View style={{ transform: [{ scale: 1.05 }], marginBottom: 2 }}>
              <Medallion kind={t.medallion} size={68} />
            </View>
            <Text style={{ fontFamily: serif, color: colors.inkText, fontSize: 18, fontWeight: '600', marginTop: 4, textAlign: 'center' }}>{t.title}</Text>
            <Dim style={{ fontSize: 11.5, textAlign: 'center', color: colors.inkDim, marginTop: 2 }}>{t.sub}</Dim>
            <Text style={{ color: colors.gilt, fontSize: 9.5, letterSpacing: 1, marginTop: 8, fontWeight: '600' }}>{t.cost.toLocaleUpperCase('tr-TR')}</Text>
          </ParchmentCard>
        ))}
      </View>

      <WideRow icon="couple" medallion="couple" title="Partner Analizi" sub={`Sinerji, çatışma ve ilişki haritanız · ${COSTS.couple} kredi`} href="/couple" rotate={-0.9} />
      <WideRow icon="hand" medallion="palm" title="El Falı" sub={`Avuç içindeki çizgilerin ne söylediğine bak · ${COSTS.palm} kredi`} href="/palm" rotate={0.8} />
      <WideRow icon="puzzle" medallion="game" title="Nova'nın Sözcük Bulmacası" sub="Oyna, kelimeleri bul, kredi kazan" href="/game" rotate={-1.1} />
      <WideRow icon="voice" medallion="voice" title="Sesli Falcı" sub="Gerçek falcı sesiyle sohbet — çok yakında" href="/voice" rotate={0.7} soon />
      <View style={{ height: 10 }} />
    </Screen>
  );
}

function WideRow({ icon, medallion, title, sub, href, rotate = 0, soon }: { icon: IconName; medallion: MedallionKind; title: string; sub: string; href: Href; rotate?: number; soon?: boolean }) {
  return (
    <ParchmentCard onPress={() => router.push(href)} rotate={rotate} contentStyle={{ paddingVertical: 15, opacity: soon ? 0.7 : 1 }}>
      <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={{ transform: [{ scale: 0.72 }], margin: -9 }}>
          <Medallion kind={medallion} size={72} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontFamily: serif, fontSize: 19, color: colors.inkText, fontWeight: '600' }}>{title}</Text>
            {soon ? <Badge text="Yakında" tone="amber" /> : null}
          </View>
          <Dim style={{ fontSize: 12, color: colors.inkDim }}>{sub}</Dim>
        </View>
        <Icon name="chevron" size={16} color={colors.gilt} />
      </View>
    </ParchmentCard>
  );
}
