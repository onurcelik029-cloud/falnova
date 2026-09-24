import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Text } from '@/components/Text';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ChatMessage } from '@/shared/types.ts';
import { COSTS } from '@/shared/packages.ts';
import { typingDelayMs } from '@/shared/pacing.ts';
import { Chip, Dim } from '@/components/ui';
import { useApp } from '@/state/app';
import { colors, sans, serif } from '@/theme';
import { Icon, Logo } from '@/components/Icon';

const inputFamily = Platform.OS === 'web' ? sans : 'Jost_400Regular';
import { LinearGradient } from 'expo-linear-gradient';
import { gradients } from '@/theme';

const SUGGESTIONS = ['Bu ay aşk hayatımda ne değişecek?', 'İş değişikliği yapmalı mıyım?', 'Maddi durumum ne zaman rahatlar?', 'Önümüzdeki 3 ayda beni ne bekliyor?'];

export default function Chat() {
  const { api, user, wallet, run, setWallet, typingScale, ensureConsent } = useApp();
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const scroller = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    let alive = true;
    api.chatHistory().then((m) => alive && setMsgs(m)).catch(() => {});
    return () => { alive = false; };
  }, [api]));

  useEffect(() => { setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 60); }, [msgs.length, busy]);

  const send = async (t?: string) => {
    const q = (t ?? text).trim();
    if (!q || busy) return;
    if (!(await ensureConsent())) return;
    setText('');
    setBusy(true);
    const optimistic: ChatMessage = { id: `tmp_${Date.now()}`, role: 'user', text: q, createdAt: new Date().toISOString() };
    setMsgs((m) => [...m, optimistic]);
    const t0 = Date.now();
    const res = await run(() => api.chatAsk(q));
    if (res) {
      // Cevap bir insan gibi "yazılsın": kısa cevap kısa, uzun cevap biraz daha uzun beklenir.
      const wait = typingDelayMs(res.reply.text.length, await typingScale()) - (Date.now() - t0);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
    setBusy(false);
    if (res) { setWallet(res.wallet); setMsgs((m) => [...m, res.reply]); }
    else { setMsgs((m) => m.filter((x) => x.id !== optimistic.id)); setText(q); }
  };

  const available = wallet.questions + wallet.credits;
  const empty = msgs.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={gradients.bg} style={{ position: 'absolute', inset: 0 } as never} />
      <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 18, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
          <Logo size={34} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: serif, color: colors.text, fontSize: 22, fontWeight: '600', lineHeight: 26 }}>Madam Nova</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success }} />
            <Dim style={{ fontSize: 12 }}>Dijital falcı · çevrimiçi</Dim>
          </View>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/wallet')} style={{ borderColor: colors.borderStrong, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18 }}>
          <Text style={{ color: colors.goldBright, fontWeight: '500', fontSize: 12.5, letterSpacing: 0.3 }}>{wallet.questions} soru{wallet.questions === 0 && wallet.credits > 0 ? ` · ${wallet.credits} kredi` : ''}</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroller} style={{ flex: 1 }} contentContainerStyle={{ padding: 18, gap: 12 }} keyboardShouldPersistTaps="handled">
          {empty ? (
            <View style={{ alignItems: 'center', gap: 12, paddingVertical: 22 }}>
              <Logo size={58} />
              <Text style={{ fontFamily: serif, color: colors.text, fontSize: 25, textAlign: 'center', fontWeight: '600', lineHeight: 30 }}>Hoş geldin {user?.profile.name}.</Text>
              <Dim style={{ textAlign: 'center', maxWidth: 300, lineHeight: 21 }}>Aklındaki soruyu sor; kartlara, yıldızlara ve sezgilerime danışıp cevaplayayım. Her soru {COSTS.question} soru hakkı harcar.</Dim>
              <View style={{ gap: 8, alignSelf: 'stretch', marginTop: 10 }}>
                {SUGGESTIONS.map((s) => <Chip key={s} label={s} onPress={() => send(s)} />)}
              </View>
            </View>
          ) : null}
          {msgs.map((m) => (
            <View key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '86%' }}>
              <View style={{
                backgroundColor: m.role === 'user' ? colors.userBubble : colors.surface, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12,
                borderBottomRightRadius: m.role === 'user' ? 4 : 18, borderBottomLeftRadius: m.role === 'user' ? 18 : 4,
                borderWidth: 1, borderColor: m.role === 'user' ? 'rgba(221,187,122,0.22)' : colors.border,
              }}>
                <Text style={{ color: colors.text, fontSize: 15, lineHeight: 23 }}>{m.text}</Text>
              </View>
            </View>
          ))}
          {busy ? (
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: 15, paddingVertical: 12, borderWidth: 1, borderColor: colors.border }}>
              <ActivityIndicator size="small" color={colors.gold} />
              <Dim>Nova yazıyor…</Dim>
            </View>
          ) : null}
        </ScrollView>

        {available === 0 ? (
          <Pressable onPress={() => router.push('/(tabs)/wallet')} style={{ marginHorizontal: 18, marginBottom: 8, padding: 13, borderRadius: 14, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.borderStrong }}>
            <Text style={{ color: colors.goldBright, textAlign: 'center', fontWeight: '500', letterSpacing: 0.3 }}>Soru hakkın bitti · Soru paketi al  →</Text>
          </Pressable>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 10, padding: 14, alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: colors.border }}>
          <TextInput
            value={text} onChangeText={setText} placeholder="Falcıya bir soru sor…" placeholderTextColor={colors.textFaint}
            multiline onSubmitEditing={() => send()} testID="chat-input" selectionColor={colors.gold}
            style={{ flex: 1, maxHeight: 110, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 22, paddingHorizontal: 17, paddingVertical: 12, color: colors.text, fontSize: 15, fontFamily: inputFamily, borderWidth: 1, borderColor: colors.border, ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}) }}
          />
          <Pressable onPress={() => send()} disabled={busy || !text.trim()} testID="chat-send" style={{ opacity: busy || !text.trim() ? 0.4 : 1 }}>
            <LinearGradient colors={gradients.gold} style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ transform: [{ rotate: '90deg' }] }}><Icon name="back" size={20} color={colors.ink} stroke={1.9} /></View>
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
