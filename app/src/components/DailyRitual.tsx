import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { router } from 'expo-router';
import { Text } from '@/components/Text';
import type { DailyState } from '@/shared/daily.ts';
import { STREAK_CYCLE, STREAK_REWARD_CREDITS } from '@/shared/daily.ts';
import { formatRemaining } from '@/shared/pacing.ts';
import { Button, Card, Dim, Eyebrow } from '@/components/ui';
import { Icon, KIND_ICON } from '@/components/Icon';
import { useApp, type PendingItem } from '@/state/app';
import { colors, serif } from '@/theme';

/** Ay evresi: aydınlık kısım altın, karanlık kısım koyu. phase: 0 (yeni) … 0.5 (dolunay) … 1. */
export function MoonGlyph({ phase, size = 44 }: { phase: number; size?: number }) {
  const r = size / 2 - 2;
  const c = size / 2;
  const k = Math.cos(phase * Math.PI * 2);
  const rx = Math.abs(k) * r;
  const waxing = phase < 0.5;
  const outer = waxing ? 1 : 0;
  const inner = waxing ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
  const lit = `M ${c} ${c - r} A ${r} ${r} 0 0 ${outer} ${c} ${c + r} A ${rx} ${r} 0 0 ${inner} ${c} ${c - r} Z`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} fill="#1a1024" stroke={colors.borderStrong} strokeWidth={1} />
      <Path d={lit} fill={colors.goldBright} opacity={0.92} />
    </Svg>
  );
}

function Dots({ done }: { done: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
      {Array.from({ length: STREAK_CYCLE }, (_, i) => {
        const on = i < done;
        const last = i === STREAK_CYCLE - 1;
        return (
          <View key={i} style={{ width: last ? 20 : 10, height: last ? 20 : 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.gold : 'transparent', borderWidth: 1, borderColor: on ? colors.gold : colors.borderStrong }}>
            {last ? <Icon name="gem" size={12} color={on ? colors.ink : colors.textFaint} stroke={1.6} /> : null}
          </View>
        );
      })}
    </View>
  );
}

/** Günlük ritüel: günde bir kez açılır; seri 7. günde 1 kredi verir. */
export function DailyCard({ daily, onClaim, busy }: { daily: DailyState; onClaim: () => void; busy: boolean }) {
  return (
    <Card gold testID="daily-card">
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <MoonGlyph phase={daily.moon.phase} />
          <View style={{ flex: 1, gap: 2 }}>
            <Eyebrow>Günlük Ritüel</Eyebrow>
            <Text style={{ fontFamily: serif, fontSize: 20, color: colors.text, fontWeight: '600' }}>
              {daily.claimed ? 'Bugünün mesajı' : 'Bugünün mesajı seni bekliyor'}
            </Text>
            <Dim style={{ fontSize: 12 }}>Ay bugün: {daily.moon.name}</Dim>
          </View>
        </View>

        {daily.claimed && daily.message ? (
          <Text style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 18, lineHeight: 26, color: colors.text }} testID="daily-message">{daily.message}</Text>
        ) : (
          <Button title="Mesajımı Aç" variant="gold" small onPress={onClaim} loading={busy} testID="daily-claim" />
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Dots done={daily.cycleDay} />
          <Dim style={{ fontSize: 11.5 }}>{daily.streak > 0 ? `${daily.streak}. gün` : 'Seriye başla'} · {STREAK_CYCLE}. günde {STREAK_REWARD_CREDITS} kredi hediye</Dim>
        </View>
      </View>
    </Card>
  );
}

/** "Nova'nın notu": yalnızca kayıtlı gerçek geçmişe/odak konusuna dayanır. */
export function NovaNote({ note }: { note: string }) {
  return (
    <Pressable onPress={() => router.push('/(tabs)/chat')} testID="nova-note">
      <View style={{ borderLeftWidth: 2, borderLeftColor: colors.gold, paddingLeft: 14, paddingVertical: 2, gap: 6 }}>
        <Eyebrow color={colors.textDim}>Nova&apos;nın notu</Eyebrow>
        <Text style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 18, lineHeight: 26, color: colors.text }}>{note}</Text>
        <Text style={{ color: colors.gold, fontSize: 12.5, letterSpacing: 0.5 }}>Nova&apos;yla konuş  →</Text>
      </View>
    </Pressable>
  );
}

/** Hazırlanmakta olan okumalar. */
export function PendingList({ items }: { items: PendingItem[] }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!items.length) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [items.length]);
  if (!items.length) return null;
  return (
    <View style={{ gap: 8 }} testID="pending-list">
      <Eyebrow color={colors.textDim}>Hazırlananlar</Eyebrow>
      {items.map((p) => {
        const left = Math.max(0, p.readyAt - now);
        return (
          <Card key={p.id} onPress={() => router.push({ pathname: '/fortune/[id]', params: { id: p.id } })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={KIND_ICON[p.kind]} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: serif, fontSize: 18, color: colors.text, fontWeight: '600' }}>{p.title}</Text>
                <Dim style={{ fontSize: 12 }}>{left > 0 ? `Hazırlanıyor · yaklaşık ${formatRemaining(left)}` : 'Birazdan hazır'}</Dim>
              </View>
              <Icon name="chevron" size={16} color={colors.textFaint} />
            </View>
          </Card>
        );
      })}
    </View>
  );
}

/** Ana sayfa verisini yükleyip claim işlemini yönetir. */
export function useHome() {
  const { api, run, setWallet, toast } = useApp();
  const [home, setHome] = useState<{ note: string | null; daily: DailyState } | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = React.useCallback(async () => {
    const h = await run(() => api.home());
    if (h) setHome(h);
  }, [api, run]);

  const claim = React.useCallback(async () => {
    setBusy(true);
    const r = await run(() => api.claimDaily());
    setBusy(false);
    if (!r) return;
    setWallet(r.wallet);
    setHome((h) => (h ? { ...h, daily: r.daily } : h));
    if (r.daily.reward) toast(`${STREAK_CYCLE} günlük seri tamamlandı: +${r.daily.reward} kredi cüzdanına eklendi.`);
  }, [api, run, setWallet, toast]);

  return { home, refresh, claim, busy };
}
