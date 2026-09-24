import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import { router } from 'expo-router';
import { Button, ErrorText, Field, Screen } from '@/components/ui';
import { LogoHalo, Ornament } from '@/components/Icon';
import { ProfileFields, draftToProfile, emptyDraft, type ProfileDraft } from '@/components/ProfileForm';
import { useApp } from '@/state/app';
import { colors, serif } from '@/theme';

/** Web'de ?ref=KOD ile paylaşılan bir davet linkinden gelindiyse kodu doldurur. */
const urlRefCode = (): string => {
  try {
    const g = globalThis as { location?: { search?: string } };
    const m = g.location?.search ? /[?&]ref=([A-Za-z0-9]{4,10})\b/.exec(g.location.search) : null;
    return m ? m[1].toUpperCase() : '';
  } catch {
    return '';
  }
};

export default function Login() {
  const { api, signIn } = useApp();
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [refCode, setRefCode] = useState(urlRefCode);
  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [busy, setBusy] = useState<'auth' | 'guest' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim());

  const submit = async () => {
    setError(null);
    if (!emailOk) return setError('Geçerli bir e-posta gir.');
    if (password.length < 6) return setError('Şifre en az 6 karakter olmalı.');
    try {
      setBusy('auth');
      if (mode === 'register') {
        const { profile, error: err } = draftToProfile(draft);
        if (!profile) { setBusy(null); return setError(err ?? 'Bilgileri kontrol et.'); }
        signIn(await api.register(email.trim().toLowerCase(), password, profile, refCode.trim() || undefined));
      } else {
        signIn(await api.login(email.trim().toLowerCase(), password));
      }
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Giriş yapılamadı.');
    } finally {
      setBusy(null);
    }
  };

  const guest = async () => {
    setError(null);
    const { profile, error: err } = draftToProfile(draft);
    if (!profile) return setError(err ?? 'Önce adını ve doğum tarihini gir.');
    try {
      setBusy('guest');
      signIn(await api.guest(profile, refCode.trim() || undefined));
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Misafir girişi yapılamadı.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 2, paddingTop: 2, paddingBottom: 6 }}>
        <LogoHalo size={148} />
        <Text style={{ fontFamily: serif, fontSize: 38, color: colors.text, letterSpacing: 4, fontWeight: '500' }}>FalNova</Text>
        <Ornament width={96} />
        <Text style={{ textAlign: 'center', color: colors.textDim, fontSize: 14.5, lineHeight: 22, maxWidth: 300 }}>
          Fincanın, kartların ve yıldızların sana ne söylediğini Madam Nova’nın masasında keşfet.
        </Text>
      </View>

      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {(['register', 'login'] as const).map((m) => (
          <Pressable key={m} onPress={() => { setMode(m); setError(null); }} style={{ flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: mode === m ? colors.gold : 'transparent', marginBottom: -1 }}>
            <Text style={{ fontFamily: serif, fontSize: 19, fontWeight: '600', color: mode === m ? colors.goldBright : colors.textFaint }}>
              {m === 'register' ? 'Üye Ol' : 'Giriş Yap'}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ gap: 15 }}>
        <Field label="E-posta" value={email} onChangeText={setEmail} placeholder="ornek@mail.com" keyboardType="email-address" autoCapitalize="none" testID="f-email" />
        <Field label="Şifre" value={password} onChangeText={setPassword} placeholder="En az 6 karakter" secure testID="f-pass" />
        {mode === 'register' ? <ProfileFields value={draft} onChange={setDraft} /> : null}
        {mode === 'register' ? (
          <Field
            label="Arkadaşının kodu (varsa)"
            value={refCode}
            onChangeText={(t) => setRefCode(t.toUpperCase())}
            placeholder="Örn. 8K3P2Q"
            autoCapitalize="none"
            maxLength={10}
            hint="Bir arkadaşın seni davet ettiyse kodunu buraya yaz, ikiniz de kredi kazanın."
            testID="f-refcode"
          />
        ) : null}
        <ErrorText>{error}</ErrorText>
        <Button title={mode === 'register' ? 'Üye Ol' : 'Giriş Yap'} onPress={submit} loading={busy === 'auth'} testID="submit-auth" />
        {mode === 'register' ? (
          <Text style={{ color: colors.textFaint, fontSize: 11.5, lineHeight: 17, textAlign: 'center' }}>
            Üye olarak{' '}
            <Text onPress={() => router.push({ pathname: '/legal/[id]', params: { id: 'kosullar' } })} style={s.link}>Kullanım Koşulları</Text>
            {' '}ve{' '}
            <Text onPress={() => router.push({ pathname: '/legal/[id]', params: { id: 'aydinlatma' } })} style={s.link}>KVKK Aydınlatma Metni</Text>
            ’ni okuduğunu ve 18 yaşından büyük olduğunu kabul edersin.
          </Text>
        ) : null}
      </View>

      {mode === 'register' ? (
        <View style={{ gap: 8, marginTop: 2 }}>
          <Button title="Üyeliksiz Misafir Olarak Dene" variant="ghost" onPress={guest} loading={busy === 'guest'} testID="guest-btn" />
          <Text style={{ color: colors.textFaint, fontSize: 12, textAlign: 'center' }}>Ad ve doğum tarihin yeterli. Falların bu cihazda kalır.</Text>
        </View>
      ) : null}
      <View style={{ height: 6 }} />
    </Screen>
  );
}

const s = StyleSheet.create({
  link: { color: colors.textDim, textDecorationLine: 'underline' },
});
