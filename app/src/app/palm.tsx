import React, { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COSTS } from '@/shared/packages.ts';
import { Body, Button, Card, Dim, ErrorText, Eyebrow, Field, Screen } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { router } from 'expo-router';
import { Text } from '@/components/Text';
import { MysticLoader } from '@/components/MysticLoader';
import { useApp } from '@/state/app';
import { colors } from '@/theme';

const LOADING = [
  'Fotoğrafların Nova\'ya ulaştırılıyor…',
  'Avuç içindeki çizgiler seçiliyor…',
  'Okuma sıraya yazılıyor…',
];

interface Pic { uri: string; payload: string }

export default function Palm() {
  const { api, user, setUser, run, setWallet, showFortune } = useApp();
  const [pics, setPics] = useState<Pic[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
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
      setPics((p) => [...p, { uri: a.uri, payload }].slice(0, 2));
    } catch {
      setErr('Fotoğraf seçilemedi. Tekrar dene.');
    }
  };

  const submit = async () => {
    if (!pics.length) return setErr('En az bir avuç içi fotoğrafı ekle.');
    if (!consent) return setErr('Devam etmek için aşağıdaki onayı işaretlemelisin.');
    if (!recorded) {
      const s = await run(() => api.recordConsent());
      if (!s) return;
      setUser(s.user);
    }
    setErr(null);
    setLoading(true);
    const res = await run(() => api.palm({ images: pics.map((p) => p.payload), question: question.trim() || undefined }));
    setLoading(false);
    if (res) { setWallet(res.wallet); showFortune(res.fortune); }
  };

  if (loading) return <Screen title="El Falı" back mark="hand"><MysticLoader messages={LOADING} /></Screen>;

  return (
    <Screen title="El Falı" subtitle="Avuç içinin fotoğrafını yükle" back mark="hand">
      <Card gold>
        <View style={{ gap: 6 }}>
          <Eyebrow>Nasıl çekmeli</Eyebrow>
          <Body style={{ fontSize: 14, color: colors.textDim }}>Baskın elinin avuç içini iyi ışıkta, parmakların hafifçe açık ve çizgilerin net görünecek şekilde çek. İkinci fotoğraf (diğer el) isteğe bağlı.</Body>
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[0, 1].map((i) => (
          <Pressable key={i} onPress={pics[i] ? () => setPics((p) => p.filter((_, k) => k !== i)) : () => add('library')} style={{ flex: 1, aspectRatio: 1 }}>
            <View style={{ flex: 1, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', borderColor: pics[i] ? colors.gold : colors.borderStrong, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.02)' }}>
              {pics[i] ? (
                <>
                  <Image source={{ uri: pics[i].uri }} style={{ width: '100%', height: '100%' }} />
                  <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '45deg' }] }}>
                    <Icon name="plus" size={14} color="#fff" stroke={2} />
                  </View>
                </>
              ) : (
                <>
                  <Icon name="hand" size={24} color={colors.textFaint} />
                  <Dim style={{ fontSize: 11 }}>{['Avuç içi', 'İkinci el (ops.)'][i]}</Dim>
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

      <Field label="Falcıya sorun (isteğe bağlı)" value={question} onChangeText={setQuestion} placeholder="Örn. Kariyerimde ne bekliyor?" multiline />
      <Pressable onPress={() => setConsent((c) => !c)} testID="palm-consent" style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 2 }}>
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
      <Button title={`Falıma Bak · ${COSTS.palm} Kredi`} variant="gold" onPress={submit} testID="palm-submit" />
    </Screen>
  );
}
