import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/Text';
import type { TarotRequest } from '@/shared/types.ts';
import { SPREADS } from '@/shared/tarot.ts';
import { COSTS } from '@/shared/packages.ts';
import { Body, Button, Card, Chip, Dim, Eyebrow, Field, Screen } from '@/components/ui';
import { MysticLoader } from '@/components/MysticLoader';
import { TarotCardFace } from '@/components/TarotCardFace';
import { useApp } from '@/state/app';
import { colors, serif } from '@/theme';

type SpreadId = TarotRequest['spread'];

const LOADING = ['Kartlar karılıyor…', 'Kartların enerjisi okunuyor…', 'Kartlar konuşuyor…', 'Yorumun hazırlanıyor…'];

/** Fandaki bir kart seçildiğinde anında kaybolmaz — hafifçe yükselip küçülerek ve solarak
 * "elden çekiliyor" hissi verir; seçilmemiş kartlar yerinde kalır. */
function DeckCard({ i, taken, onPress, testID }: { i: number; taken: boolean; onPress: () => void; testID?: string }) {
  const anim = useRef(new Animated.Value(0)).current;
  const native = Platform.OS !== 'web';
  useEffect(() => {
    Animated.spring(anim, { toValue: taken ? 1 : 0, useNativeDriver: native, speed: 14, bounciness: 6 }).start();
  }, [taken, anim, native]);
  return (
    <Pressable onPress={onPress} testID={testID} style={{ marginLeft: i === 0 ? 0 : -36 }}>
      <Animated.View
        style={{
          opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.22] }),
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [i % 2 ? 4 : 0, -26] }) },
            { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) },
          ],
        }}
      >
        <TarotCardFace faceUp={false} width={72} />
      </Animated.View>
    </Pressable>
  );
}

function FlipCard({ id, reversed, revealed, label, width }: { id: number; reversed: boolean; revealed: boolean; label: string; width: number }) {
  const sx = useRef(new Animated.Value(1)).current;
  const [face, setFace] = useState(false);
  const native = Platform.OS !== 'web';
  useEffect(() => {
    if (!revealed) return;
    Animated.timing(sx, { toValue: 0, duration: 180, useNativeDriver: native }).start(() => {
      setFace(true);
      Animated.timing(sx, { toValue: 1, duration: 220, useNativeDriver: native }).start();
    });
  }, [revealed, sx, native]);
  return (
    <Animated.View style={{ transform: [{ scaleX: sx }], alignItems: 'center' }}>
      <TarotCardFace id={id} reversed={reversed} faceUp={face} width={width} label={face ? label : undefined} />
    </Animated.View>
  );
}

export default function Tarot() {
  const { api, run, setWallet, showFortune, ensureConsent } = useApp();
  const [spread, setSpread] = useState<SpreadId>('three');
  const [question, setQuestion] = useState('');
  const [stage, setStage] = useState<'setup' | 'pick' | 'loading'>('setup');
  const [chosen, setChosen] = useState<number[]>([]);
  const [flags, setFlags] = useState<boolean[]>([]);
  const [revealed, setRevealed] = useState(false);

  const deck = useMemo(() => {
    const ids = Array.from({ length: 22 }, (_, i) => i);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids;
  }, [stage === 'pick']); // eslint-disable-line react-hooks/exhaustive-deps

  const sp = SPREADS[spread];
  const need = sp.positions.length;

  const pickCard = (id: number) => {
    if (revealed || chosen.includes(id) || chosen.length >= need) return;
    setChosen((c) => [...c, id]);
    setFlags((f) => [...f, Math.random() < 0.28]);
  };


  const interpret = async () => {
    if (!(await ensureConsent())) return;
    setStage('loading');
    const res = await run(() => api.tarot({ spread, cardIds: chosen, reversedFlags: flags, question: question.trim() || undefined }));
    if (res) { setWallet(res.wallet); showFortune(res.fortune); } else setStage('pick');
  };

  if (stage === 'loading') return <Screen title="Tarot" back mark="tarot"><MysticLoader messages={LOADING} /></Screen>;

  if (stage === 'pick') {
    return (
      <Screen title={sp.label} subtitle={revealed ? 'Kartların açıldı' : `Kalbinden geçenle ${need} kart seç (${chosen.length}/${need})`} back mark="tarot">
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 8 }}>
          {sp.positions.map((pos, i) => (
            <View key={pos} style={{ alignItems: 'center', gap: 6 }}>
              {chosen[i] !== undefined ? (
                <FlipCard id={chosen[i]} reversed={flags[i]} revealed={revealed} label={pos} width={need === 1 ? 120 : 92} />
              ) : (
                <View style={{ width: need === 1 ? 120 : 92, height: (need === 1 ? 120 : 92) * 1.62, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.textFaint, fontSize: 24, fontFamily: serif }}>{i + 1}</Text>
                </View>
              )}
              {chosen[i] === undefined || !revealed ? <Dim style={{ fontSize: 12 }}>{pos}</Dim> : null}
            </View>
          ))}
        </View>

        {!revealed ? (
          <>
            <Card>
              <Body style={{ fontSize: 14, color: colors.textDim, textAlign: 'center' }}>Gözlerini kapat, sorunu düşün ve sana çağrı yapan kartlara dokun.</Body>
            </Card>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 34, paddingVertical: 10 }} style={{ marginHorizontal: -18 }}>
              {deck.map((id, i) => (
                <DeckCard key={id} i={i} taken={chosen.includes(id)} onPress={() => pickCard(id)} testID={`deck-${i}`} />
              ))}
            </ScrollView>
            <Button title="Kartları Aç" variant="gold" disabled={chosen.length < need} onPress={() => setRevealed(true)} testID="reveal" />
          </>
        ) : (
          <Button title={`Yorumla · ${COSTS.tarot} Kredi`} variant="gold" onPress={interpret} testID="interpret" />
        )}
      </Screen>
    );
  }

  return (
    <Screen title="Tarot Açılımı" subtitle="Kartlar kaderi değil, ışığı gösterir" back mark="tarot">
      <Eyebrow color={colors.textDim}>Açılım türü</Eyebrow>
      <View style={{ gap: 10 }}>
        {(Object.keys(SPREADS) as SpreadId[]).map((k) => (
          <Card key={k} gold={spread === k} onPress={() => setSpread(k)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: serif, color: colors.text, fontWeight: '600', fontSize: 20 }}>{SPREADS[k].label}</Text>
                <Dim>{SPREADS[k].desc}</Dim>
              </View>
              <Chip label={`${SPREADS[k].positions.length} kart`} selected={spread === k} />
            </View>
          </Card>
        ))}
      </View>
      <Field label="Soru (isteğe bağlı)" value={question} onChangeText={setQuestion} placeholder="Örn. Bu ilişki nereye gidiyor?" multiline />
      <Button title="Kartları Karıştır" onPress={() => setStage('pick')} testID="shuffle" />
      <Dim style={{ textAlign: 'center' }}>Yorum ücreti: {COSTS.tarot} kredi</Dim>
    </Screen>
  );
}
