import React, { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import * as ImagePicker from 'expo-image-picker';
import { COSTS } from '@/shared/packages.ts';
import { Body, Button, Card, Dim, ErrorText, Eyebrow, Field, H2, Screen } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { router } from 'expo-router';
import { MysticLoader } from '@/components/MysticLoader';
import { useApp } from '@/state/app';
import { colors } from '@/theme';
import { SAMPLE_CUP_URI } from '@/lib/sampleCup';

const LOADING = [
  'Fotoğrafların Nova\'ya ulaştırılıyor…',
  'Fincan masaya alınıyor…',
  'Okuma sıraya yazılıyor…',
];
const SAMPLE = 'demo://sample-cup';

interface Pic { uri: string; payload: string }

export default function Coffee() {
  const { api, user, setUser, run, setWallet, showFortune } = useApp();
  const [pics, setPics] = useState<Pic[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [deep, setDeep] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const recorded = !!user?.consentAt;
  const [consent, setConsent] = useState(recorded);

  useEffect(() => { if (recorded) setConsent(true); }, [recorded]);

  const add = async (source: 'library' | 'camera') => {
    setErr(null);
    try {
      const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted && source === 'camera') return setErr('Kamera izni gerekli. Galeriden seçmeyi deneyebilirsin.');
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.55, base64: true, allowsEditing: false };
      const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.[0]) return;
      const a = res.assets[0];
      const payload = a.base64 ? `data:${a.mimeType ?? 'image/jpeg'};base64,${a.base64}` : a.uri;
      setPics((p) => [...p, { uri: a.uri, payload }].slice(0, 3));
    } catch {
      setErr('Fotoğraf seçilemedi. Tekrar dene.');
    }
  };

  const submit = async (virtual = false) => {
    if (!virtual && !pics.length) return setErr('En az bir fotoğraf ekle (fincan ve tabak en iyisi), ya da fincanın yoksa aşağıdan sezgiyle bakmamı iste.');
    if (!consent) return setErr('Devam etmek için aşağıdaki onayı işaretlemelisin.');
    if (!recorded) {
      const s = await run(() => api.recordConsent());
      if (!s) return;
      setUser(s.user);
    }
    setErr(null);
    setLoading(true);
    const res = await run(() => api.coffee(
      virtual
        ? { images: [], question: question.trim() || undefined, depth: deep ? 'deep' : 'standard', virtual: true }
        : { images: pics.map((p) => p.payload), question: question.trim() || undefined, depth: deep ? 'deep' : 'standard' },
    ));
    setLoading(false);
    if (res) { setWallet(res.wallet); showFortune(res.fortune); }
  };

  if (loading) return <Screen title="Kahve Falı" back mark="coffee"><MysticLoader messages={LOADING} /></Screen>;

  return (
    <Screen title="Kahve Falı" subtitle="Fincanın ve tabağın fotoğrafını yükle" back mark="coffee">
      <Card gold>
        <View style={{ gap: 6 }}>
          <Eyebrow>Nasıl çekmeli</Eyebrow>
          <Body style={{ fontSize: 14, color: colors.textDim }}>Kahveni iç, fincanı ters çevirip soğumasını bekle. Sonra fincanın içini, yan tarafını ve tabağı iyi ışıkta çek.</Body>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[0, 1, 2].map((i) => (
          <Pressable key={i} onPress={pics[i] ? () => setPics((p) => p.filter((_, k) => k !== i)) : () => add('library')} style={{ flex: 1, aspectRatio: 1 }}>
            <View style={{ flex: 1, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: pics[i] ? colors.gold : colors.borderStrong, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.02)' }}>
              {pics[i] ? (
                <>
                  <Image source={{ uri: pics[i].uri === SAMPLE ? SAMPLE_CUP_URI : pics[i].uri }} style={{ width: '100%', height: '100%' }} />
                  <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] }}>
                    <Icon name="plus" size={14} color="#fff" stroke={2} />
                  </View>
                </>
              ) : (
                <>
                  <Icon name="coffee" size={24} color={colors.textFaint} stroke={1.1} />
                  <Dim style={{ fontSize: 11 }}>{['Fincan içi', 'Fincan yanı', 'Tabak'][i]}</Dim>
                </>
              )}
            </View>
          </Pressable>
        ))}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="Galeriden Seç" variant="ghost" small style={{ flex: 1 }} onPress={() => add('library')} />
        <Button title="Kamerayla Çek" variant="ghost" small style={{ flex: 1 }} onPress={() => add('camera')} />
      </View>
      {api.mode === 'demo' ? (
        <Button
          title="Örnek Fincanla Dene" variant="ghost" small
          onPress={() => setPics([{ uri: SAMPLE, payload: SAMPLE }, { uri: SAMPLE, payload: SAMPLE + '-plate' }])}
          testID="sample-cup"
        />
      ) : null}

      {!pics.length ? (
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.borderStrong }} />
            <Dim style={{ fontSize: 11 }}>ya da</Dim>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.borderStrong }} />
          </View>
          <Button
            title="Fincanım Yok, Yine de Bakar mısın?" variant="ghost" small
            onPress={() => submit(true)}
            testID="coffee-virtual"
          />
          <Dim style={{ fontSize: 11, textAlign: 'center' }}>Sezgiyle, fotoğrafsız bir okuma yaparım.</Dim>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Eyebrow>Okuma türü</Eyebrow>
        <Card gold={!deep} onPress={() => setDeep(false)}>
          <View style={{ gap: 4 }} testID="depth-standard">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <H2 style={{ fontSize: 20 }}>Klasik okuma</H2>
              <Text style={{ color: colors.gold, fontSize: 14, fontWeight: '600' }}>{COSTS.coffee} kredi</Text>
            </View>
            <Dim style={{ fontSize: 13 }}>Kenar, orta, dip ve tabak yorumu. Birkaç dakikada hazır olur.</Dim>
          </View>
        </Card>
        <Card gold={deep} onPress={() => setDeep(true)}>
          <View style={{ gap: 4 }} testID="depth-deep">
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <H2 style={{ fontSize: 20 }}>Derin okuma</H2>
              <Text style={{ color: colors.gold, fontSize: 14, fontWeight: '600' }}>{COSTS.coffeeDeep} kredi</Text>
            </View>
            <Dim style={{ fontSize: 13 }}>Klasik okumaya ek olarak Gönül Alanı, İş ve Para ile Önümüzdeki 30 Gün bölümleri. Yaklaşık 5 dakikada hazır olur.</Dim>
          </View>
        </Card>
      </View>

      <Field label="Falcıya sorun (isteğe bağlı)" value={question} onChangeText={setQuestion} placeholder="Örn. İş değişikliği hakkında ne görüyorsun?" multiline />
      <Pressable onPress={() => setConsent((c) => !c)} testID="photo-consent" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 2 }}>
        <View style={{ width: 18, height: 18, borderRadius: 5, borderWidth: 1, borderColor: consent ? colors.gold : colors.borderStrong, backgroundColor: consent ? colors.goldTintStrong : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
          {consent ? <Icon name="check" size={13} color={colors.gold} stroke={2} /> : null}
        </View>
        <Text style={{ flex: 1, color: colors.textFaint, fontSize: 11.5, lineHeight: 17 }}>
          Fotoğraflarımın ve yazdıklarımın fal yorumunun hazırlanması için işlenmesine ve yurt dışındaki hizmet sağlayıcılara iletilmesine izin veriyorum.{' '}
          <Text onPress={() => router.push({ pathname: '/legal/[id]', params: { id: 'riza' } })} style={{ textDecorationLine: 'underline' }}>Açık Rıza Metni</Text>
          {' · '}
          <Text onPress={() => router.push({ pathname: '/legal/[id]', params: { id: 'aydinlatma' } })} style={{ textDecorationLine: 'underline' }}>Aydınlatma Metni</Text>
        </Text>
      </Pressable>
      <ErrorText>{err}</ErrorText>
      <Button title={`Falıma Bak · ${deep ? COSTS.coffeeDeep : COSTS.coffee} Kredi`} variant="gold" onPress={() => submit(false)} testID="coffee-submit" />
    </Screen>
  );
}
