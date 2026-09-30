import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Text } from '@/components/Text';
import { router, type Href } from 'expo-router';
import type { FortuneResult } from '@/shared/types.ts';
import { KIND_LABEL } from '@/shared/packages.ts';
import { Icon, KIND_ICON, type IconName } from './Icon';
import { zodiacById } from '@/shared/zodiac.ts';
import { KARMIC_TOPICS } from '@/shared/mock2.ts';
import { colors, serif } from '@/theme';
import { fmtDate } from '@/lib/format';
import { sharePoster } from '@/lib/share';
import { Badge, Body, Button, Card, Dim, Eyebrow, H1, H2 } from './ui';
import { ScoreBar, ScoreRing } from './ScoreRing';
import { TarotCardFace } from './TarotCardFace';
import { Poster } from './Poster';
import { ZodiacGlyph } from './ZodiacGlyph';
import { VISION_META, VisionPhoto } from './VisionPhoto';
import { useApp } from '@/state/app';

interface Props {
  fortune: FortuneResult;
  onUnlock?: () => void;
  unlocking?: boolean;
  userName: string;
}

/** Okuma sonucu tek seferde çakılmaz — her blok sırayla, hafif bir gecikmeyle belirir
 * ve aşağıdan yukarı süzülerek yerine oturur. `index` ne kadar geriyse gecikme o kadar artar. */
function Reveal({ children, index = 0, style }: { children: React.ReactNode; index?: number; style?: object }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const t = Animated.timing(anim, {
      toValue: 1,
      duration: 460,
      delay: 60 + index * 90,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    t.start();
    return () => t.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View
      style={[
        {
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function FortuneView({ fortune, onUnlock, unlocking, userName }: Props) {
  const { toast } = useApp();
  const posterRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const m = fortune.meta ?? {};
  const locked = !fortune.unlocked && fortune.lock;

  const doShare = async () => {
    setSharing(true);
    const out = await sharePoster(posterRef, `Kader Posterim hazır — ${m.posterQuote ?? ''} #FalNova`);
    setSharing(false);
    if (out === 'downloaded') toast('Poster indirildi. Hikâyene ekleyebilirsin.');
    else if (out === 'text') toast('Görsel oluşturulamadı, metin olarak paylaşıldı.');
    else if (out === 'failed') toast('Paylaşım açılamadı.');
  };

  const sectionCount = fortune.sections.length;
  const afterSectionsIdx = 2 + sectionCount;
  const nextStepsIdx = afterSectionsIdx + (locked ? 1 : 0);

  return (
    <View style={{ gap: 14 }}>
      <Reveal index={0}>
        <View style={{ alignItems: 'center', gap: 8, paddingVertical: 6 }}>
          {VISION_META[fortune.kind] ? (
            <View style={{ marginBottom: 6 }}>
              <VisionPhoto
                source={VISION_META[fortune.kind]!.source}
                rotate={VISION_META[fortune.kind]!.rotate}
                label={
                  fortune.kind === 'coffee' && m.symbols?.[0]
                    ? `${m.symbols[0].toLocaleUpperCase('tr-TR')} · İŞARET`
                    : VISION_META[fortune.kind]!.label
                }
              />
            </View>
          ) : (
            <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={KIND_ICON[fortune.kind]} size={28} stroke={1.3} />
            </View>
          )}
          <Eyebrow>{KIND_LABEL[fortune.kind]}</Eyebrow>
          <H1 style={{ textAlign: 'center' }}>{fortune.title}</H1>
          <Dim style={{ textAlign: 'center' }}>{fortune.summary}</Dim>
          <Dim style={{ fontSize: 11.5, color: colors.textFaint, letterSpacing: 0.5 }}>{fmtDate(fortune.createdAt)}</Dim>
        </View>
      </Reveal>

      {fortune.kind === 'tarot' && m.cards ? (
        <Reveal index={1}>
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            {m.cards.map((c, i) => (
              <TarotCardFace key={i} id={c.id} reversed={c.reversed} width={m.cards!.length > 1 ? 92 : 130} label={c.position} />
            ))}
          </View>
        </Reveal>
      ) : null}

      {fortune.kind === 'coffee' && m.symbols ? (
        <Reveal index={1}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {m.symbols.map((sym) => <Badge key={sym} text={sym} tone="gold" />)}
          </View>
        </Reveal>
      ) : null}

      {fortune.kind === 'horoscope' && m.scores ? (
        <Reveal index={1}>
          <Card>
            <View style={{ gap: 12 }}>
              {m.scores.map((sc) => <ScoreBar key={sc.label} label={sc.label} value={sc.value} />)}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Dim>Şanslı sayı: <Text style={{ color: colors.goldBright, fontWeight: '600' }}>{m.luckyNumber}</Text></Dim>
                <Dim>Şanslı renk: <Text style={{ color: colors.goldBright, fontWeight: '600' }}>{m.luckyColor}</Text></Dim>
              </View>
            </View>
          </Card>
        </Reveal>
      ) : null}

      {fortune.kind === 'couple' && m.scores && typeof m.score === 'number' ? (
        <Reveal index={1}>
          <Card gold>
            <View style={{ alignItems: 'center', gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <SignBubble id={fortune.meta?.sign} name={userName} />
                <ScoreRing value={m.score} label="ortak uyum" />
                <SignBubble id={m.partner?.sign} name={m.partner?.name ?? ''} />
              </View>
              <View style={{ alignSelf: 'stretch', gap: 10 }}>
                {m.scores.map((sc) => <ScoreBar key={sc.label} label={sc.label} value={sc.value} />)}
              </View>
            </View>
          </Card>
        </Reveal>
      ) : null}

      {fortune.kind === 'natal' && m.natal ? (
        <Reveal index={1}>
          <Card gold>
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 18 }}>
              <NatalBubble label="Güneş" id={m.natal.sun} />
              <NatalBubble label="Ay" id={m.natal.moon} />
              <NatalBubble label="Yükselen" id={m.natal.ascendant} />
            </View>
          </Card>
        </Reveal>
      ) : null}

      {fortune.kind === 'palm' && m.palmLines ? (
        <Reveal index={1}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {m.palmLines.map((l) => <Badge key={l.name} text={l.name} tone="gold" />)}
          </View>
        </Reveal>
      ) : null}

      {fortune.sections.map((s, i) => (
        <Reveal key={`${s.title}-${i}`} index={2 + i}>
          <Card style={s.title.includes('Poster') ? { alignItems: 'center' } : undefined}>
            <H2 style={{ marginBottom: 8 }}>{s.title}</H2>
            {s.title.includes('Senaryosu') && m.timeline ? <Timeline items={m.timeline} /> : s.title.includes('Poster') ? null : s.body.split('\n\n').map((para, k) => (
              <Body key={k} style={{ marginTop: k ? 10 : 0 }}>{para}</Body>
            ))}
            {s.title.includes('Poster') && fortune.unlocked && m.posterQuote ? (
              <View style={{ alignItems: 'center', gap: 14, marginTop: 4 }}>
                <Poster
                  ref={posterRef}
                  quote={m.posterQuote}
                  name={userName}
                  sign={(m.sign ?? 'koc') as never}
                  topic={KARMIC_TOPICS.find((t) => t.id === m.topic)?.label ?? 'Kader'}
                  dateLabel={fmtDate(fortune.createdAt)}
                />
                <Button title="Hikâyende Paylaş" variant="gold" onPress={doShare} loading={sharing} style={{ alignSelf: 'stretch' }} />
                <Dim style={{ textAlign: 'center' }}>Poster görsel olarak kaydedilir; Instagram, WhatsApp veya TikTok hikâyene ekleyebilirsin.</Dim>
              </View>
            ) : null}
          </Card>
        </Reveal>
      ))}

      {locked ? (
        <Reveal index={afterSectionsIdx}>
          <Card gold style={{ gap: 14 }}>
            <View style={{ alignItems: 'center', gap: 6 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="lock" size={22} />
              </View>
              <H2 style={{ textAlign: 'center' }}>Kader Dönemecin Kilitli</H2>
              <Body style={{ textAlign: 'center', color: colors.textDim }}>{fortune.lock!.teaser}</Body>
            </View>
            {fortune.lock!.lockedTitles.map((t) => (
              <View key={t} style={{ gap: 7, opacity: 0.9 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="lock" size={14} stroke={1.6} />
                  <Text style={{ color: colors.goldBright, fontFamily: serif, fontSize: 17, fontWeight: '600' }}>{t}</Text>
                </View>
                <View style={{ height: 9, borderRadius: 5, backgroundColor: 'rgba(221,187,122,0.14)', width: '96%' }} />
                <View style={{ height: 9, borderRadius: 5, backgroundColor: 'rgba(221,187,122,0.1)', width: '82%' }} />
                <View style={{ height: 9, borderRadius: 5, backgroundColor: 'rgba(221,187,122,0.07)', width: '60%' }} />
              </View>
            ))}
            <Button title={`Kilidi Aç · ${fortune.lock!.cost} Kredi`} variant="gold" onPress={onUnlock} loading={unlocking} testID="unlock-btn" />
          </Card>
        </Reveal>
      ) : null}

      {!locked ? <Reveal index={nextStepsIdx}><NextSteps kind={fortune.kind} /></Reveal> : null}
      <Dim style={{ textAlign: 'center', fontSize: 11.5, color: colors.textFaint, lineHeight: 17, paddingHorizontal: 8 }}>
        Fal; eğlence ve kişisel farkındalık amacıyla hazırlanır. Kesin bir gelecek bilgisi ya da sağlık, hukuk ve finans tavsiyesi değildir.
      </Dim>
    </View>
  );
}

interface Step { icon: IconName; title: string; sub: string; href: Href }
const ASK: Step = { icon: 'chat', title: 'Nova\'ya sor', sub: 'Merak ettiğin bir noktayı birebir konuş', href: '/(tabs)/chat' };
const NEXT: Partial<Record<FortuneResult['kind'], Step[]>> = {
  coffee: [ASK, { icon: 'tarot', title: 'Tarot ile derinleştir', sub: 'Aynı konuya kartlardan da bak', href: '/tarot' }],
  tarot: [ASK, { icon: 'dream', title: 'Rüya Tabiri', sub: 'Son gördüğün rüyayı çözümle', href: '/dream' }],
  dream: [{ icon: 'coffee', title: 'Kahve Falı', sub: 'Fincanın ne söylediğine bak', href: '/coffee' }, ASK],
  couple: [{ icon: 'karmic', title: 'Karmik Dönemeç', sub: 'İlişki döngülerinin kökünü gör', href: '/karmic' }, ASK],
  karmic: [{ icon: 'couple', title: 'Partner Analizi', sub: 'İki haritanın buluşmasına bak', href: '/couple' }, ASK],
  horoscope: [{ icon: 'coffee', title: 'Kahve Falı', sub: 'Günün enerjisini fincanda gör', href: '/coffee' }, { icon: 'tarot', title: 'Tarot', sub: 'Bir kart çek', href: '/tarot' }],
  natal: [{ icon: 'hand', title: 'El Falı', sub: 'Avuç içindeki çizgilere bak', href: '/palm' }, ASK],
  palm: [ASK, { icon: 'sun', title: 'Doğum Haritan', sub: 'Güneş, Ay ve Yükselenini gör', href: '/natal' }],
};

/** Okumanın sonunda, konuyla bağlantılı iki sakin öneri. */
function NextSteps({ kind }: { kind: FortuneResult['kind'] }) {
  const steps = NEXT[kind];
  if (!steps) return null;
  return (
    <View style={{ gap: 8 }} testID="next-steps">
      <Eyebrow color={colors.textDim}>Sıradaki adım</Eyebrow>
      {steps.map((st) => (
        <Card key={st.title} onPress={() => router.push(st.href)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={st.icon} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: serif, fontSize: 18, color: colors.text, fontWeight: '600' }}>{st.title}</Text>
              <Dim style={{ fontSize: 12.5 }}>{st.sub}</Dim>
            </View>
            <Icon name="chevron" size={16} color={colors.textFaint} />
          </View>
        </Card>
      ))}
    </View>
  );
}

function Timeline({ items }: { items: { month: string; title: string; text: string }[] }) {
  return (
    <View style={{ gap: 0 }}>
      {items.map((it, i) => (
        <View key={it.month} style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ alignItems: 'center', width: 28 }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.goldBright, fontFamily: serif, fontWeight: '600', fontSize: 15 }}>{i + 1}</Text>
            </View>
            {i < items.length - 1 ? <View style={{ flex: 1, width: 1.5, backgroundColor: 'rgba(221,187,122,0.3)', marginVertical: 2 }} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: i < items.length - 1 ? 16 : 0, gap: 3 }}>
            <Text style={{ color: colors.goldBright, fontFamily: serif, fontSize: 18, fontWeight: '600' }}>{it.month} · {it.title}</Text>
            <Body style={{ fontSize: 14 }}>{it.text}</Body>
          </View>
        </View>
      ))}
    </View>
  );
}

function NatalBubble({ label, id }: { label: string; id: string | null }) {
  const z = id ? zodiacById(id as never) : null;
  return (
    <View style={{ alignItems: 'center', gap: 5, width: 76 }}>
      <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
        {z ? <ZodiacGlyph id={z.id} size={24} /> : <Text style={{ fontSize: 18, color: colors.textFaint }}>?</Text>}
      </View>
      <Text style={{ color: colors.textDim, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 12.5, fontWeight: '600' }} numberOfLines={1}>{z ? z.name : 'Bilinmiyor'}</Text>
    </View>
  );
}

function SignBubble({ id, name }: { id?: string; name: string }) {
  const z = id ? zodiacById(id as never) : null;
  return (
    <View style={{ alignItems: 'center', gap: 4, width: 70 }}>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
        {z ? <ZodiacGlyph id={z.id} size={26} /> : <Text style={{ fontSize: 22, color: colors.gold }}>✦</Text>}
      </View>
      <Text style={{ color: colors.text, fontSize: 12 }} numberOfLines={1}>{name}</Text>
    </View>
  );
}
