import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, View } from 'react-native';
import { goHome } from '@/lib/nav';
import { Text } from '@/components/Text';
import type { FortuneResult } from '@/shared/types.ts';
import { WAIT_STAGES, WAIT_TITLE, formatRemaining } from '@/shared/pacing.ts';
import { Body, Button, Card, Dim, Eyebrow, H1 } from '@/components/ui';
import { Icon, KIND_ICON, Ornament } from '@/components/Icon';
import { CandleFlame } from '@/components/Candle';
import { Stardust } from '@/components/Stardust';
import { backgroundCapable, getExpoPushToken, notifyPermission, requestNotifyPermission, scheduleReady } from '@/lib/notify';
import { READY_TITLE } from '@/shared/pacing.ts';
import { useApp } from '@/state/app';
import { colors, serif } from '@/theme';

/**
 * Bekleme ritüeli ekranı. Okuma sunucuda hazırlanır; içerik süre dolana dek cihaza gelmez.
 * Kullanıcı uygulamada gezmeye devam edebilir, hazır olunca bildirim alır.
 */
export function PendingReading({ fortune, onReady }: { fortune: FortuneResult; onReady: () => void }) {
  const { api, setViewing } = useApp();
  const pending = fortune.pending!;
  const readyAt = useMemo(() => Date.now() + pending.readyInMs, [pending.readyInMs, fortune.id]);
  const [now, setNow] = useState(Date.now());
  const [perm, setPerm] = useState(notifyPermission());
  const fired = useRef(false);
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const native = Platform.OS !== 'web';

  useEffect(() => { setViewing(fortune.id); return () => setViewing(null); }, [fortune.id, setViewing]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    const a = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
    ]));
    const b = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: native }));
    a.start(); b.start();
    return () => { clearInterval(t); a.stop(); b.stop(); };
  }, [pulse, spin, native]);

  const left = Math.max(0, readyAt - now);
  const total = Math.max(pending.totalMs, 1);
  const progress = Math.min(1, Math.max(0, 1 - left / total));

  useEffect(() => {
    if (left <= 0 && !fired.current) { fired.current = true; onReady(); }
  }, [left, onReady]);
  useEffect(() => { fired.current = false; }, [readyAt]);

  const stages = WAIT_STAGES[fortune.kind] ?? ['Hazırlanıyor…'];
  const stage = stages[Math.min(stages.length - 1, Math.floor(progress * stages.length))];
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.05] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  const askNotify = async () => {
    const p = await requestNotifyPermission();
    setPerm(p);
    if (p === 'granted') {
      scheduleReady(fortune.id, READY_TITLE[fortune.kind] ?? 'Yorumun hazır', 'Yorumun hazır. Açmak için dokun.', left);
      // Uygulama tamamen kapatılırsa yerel bildirim hiç zamanlanamamış olabilir; sunucudan da bir
      // "hazır" bildirimi gidebilsin diye jeton kaydedilir (isteğe bağlı — kaydedilemezse akış bozulmaz).
      const pt = await getExpoPushToken();
      if (pt) api.registerPushToken(pt.token, pt.platform).catch(() => undefined);
    }
  };

  const R = 62;
  const ringSize = R * 2 + 24;
  return (
    <View style={{ alignItems: 'center', gap: 18, paddingTop: 8 }} testID="pending-reading">
      <CandleFlame size={38} withBase={false} />
      <View style={{ width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }}>
        <Stardust count={12} width={ringSize} height={ringSize} seed={`pending-${fortune.id}`} />
        <Animated.View style={{ position: 'absolute', width: ringSize, height: ringSize, borderRadius: R + 12, borderWidth: 1, borderColor: colors.borderStrong, borderStyle: 'dashed', transform: [{ rotate }] }} />
        <Animated.View style={{ opacity: glow, transform: [{ scale }], width: R * 2 - 20, height: R * 2 - 20, borderRadius: R - 10, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.borderGold, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={KIND_ICON[fortune.kind]} size={48} stroke={1.1} />
        </Animated.View>
      </View>

      <View style={{ alignItems: 'center', gap: 8 }}>
        <Eyebrow>Nova</Eyebrow>
        <H1 style={{ textAlign: 'center' }}>{WAIT_TITLE[fortune.kind] ?? 'Okuman hazırlanıyor'}</H1>
        <Ornament width={110} />
      </View>

      <View style={{ alignSelf: 'stretch', gap: 10 }}>
        <View style={{ height: 3, borderRadius: 2, backgroundColor: colors.goldTint, overflow: 'hidden' }}>
          <View style={{ height: 3, width: `${Math.round(progress * 100)}%` as never, backgroundColor: colors.gold }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Dim style={{ fontSize: 12 }}>Hazırlanıyor</Dim>
          <View testID="pending-left"><Dim style={{ fontSize: 12 }}>{left > 0 ? `yaklaşık ${formatRemaining(left)}` : 'birazdan'}</Dim></View>
        </View>
      </View>

      <Text style={{ fontFamily: serif, fontSize: 20, lineHeight: 28, color: colors.text, textAlign: 'center', fontStyle: 'italic', minHeight: 84, paddingHorizontal: 6 }}>{stage}</Text>

      <Card style={{ alignSelf: 'stretch' }}>
        <View style={{ gap: 8 }}>
          <Body style={{ fontSize: 14 }}>Bu sırada uygulamada gezebilirsin. Okuman hazır olduğunda haber vereceğiz; ayrıca <Text style={{ color: colors.gold }}>Geçmişim</Text> bölümünde seni bekler.</Body>
          {perm === 'granted' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="check" size={16} color={colors.success} stroke={2} />
              <Dim style={{ fontSize: 13 }}>{backgroundCapable ? 'Hazır olunca bildirim göndereceğiz.' : 'Bu sekme açıkken bildirim göndereceğiz.'}</Dim>
            </View>
          ) : perm === 'denied' ? (
            <Dim style={{ fontSize: 13 }}>Bildirimler kapalı. Ayarlardan açabilirsin; kapalıyken de okuman burada seni bekler.</Dim>
          ) : perm === 'unsupported' ? null : (
            <Button title="Hazır Olunca Haber Ver" variant="ghost" small onPress={askNotify} testID="notify-me" />
          )}
        </View>
      </Card>

      <Button title="Ana Sayfaya Dön" variant="ghost" onPress={goHome} testID="pending-home" />
    </View>
  );
}
