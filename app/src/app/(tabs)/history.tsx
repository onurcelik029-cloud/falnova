import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { router, useFocusEffect } from 'expo-router';
import type { FortuneResult } from '@/shared/types.ts';
import { KIND_LABEL } from '@/shared/packages.ts';
import { Icon, KIND_ICON } from '@/components/Icon';
import { Badge, Body, Button, Card, Chip, Dim, H1, Screen } from '@/components/ui';
import { useApp } from '@/state/app';
import { timeAgo } from '@/lib/format';
import { colors, serif } from '@/theme';

type Filter = 'all' | FortuneResult['kind'];
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'coffee', label: 'Kahve' },
  { id: 'tarot', label: 'Tarot' },
  { id: 'karmic', label: 'Kader' },
  { id: 'couple', label: 'Partner' },
  { id: 'dream', label: 'Rüya' },
  { id: 'horoscope', label: 'Burç' },
];

export default function History() {
  const { api, run, pending } = useApp();
  const [items, setItems] = useState<FortuneResult[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  // Bir okuma hazır olunca (bekleyen sayısı değişince) listeyi tazele.
  const [tick, setTick] = useState(0);
  useEffect(() => { setTick((t) => t + 1); }, [pending.length]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    run(() => api.history()).then((h) => alive && h && setItems(h));
    return () => { alive = false; };
  }, [api, run, tick]));

  const list = (items ?? []).filter((f) => filter === 'all' || f.kind === filter);

  return (
    <Screen bottomInset={false}>
      <View style={{ gap: 4 }}>
        <H1>Geçmişim</H1>
        <Dim>Tüm fallarının, partner haritalarının ve kader senaryolarının defteri.</Dim>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {FILTERS.map((f) => <Chip key={f.id} label={f.label} selected={filter === f.id} onPress={() => setFilter(f.id)} />)}
      </View>

      {items === null ? <Dim>Yükleniyor…</Dim> : list.length === 0 ? (
        <Card>
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 14 }}>
            <Icon name="book" size={34} />
            <Body style={{ textAlign: 'center' }}>Henüz burada bir fal yok.</Body>
            <Button title="İlk Falını Aç" small onPress={() => router.push('/(tabs)')} />
          </View>
        </Card>
      ) : list.map((f) => (
        <Card key={f.id} onPress={() => router.push({ pathname: '/fortune/[id]', params: { id: f.id } })}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.goldTint, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={KIND_ICON[f.kind]} size={22} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontFamily: serif, color: colors.text, fontSize: 19, fontWeight: '600' }} numberOfLines={1}>{f.title}</Text>
              <Dim numberOfLines={2}>{f.pending ? 'Nova bu okumayı hazırlıyor. Hazır olunca burada görünür.' : f.summary}</Dim>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 3 }}>
                <Badge text={KIND_LABEL[f.kind]} tone="violet" />
                {f.pending ? <Badge text="Hazırlanıyor" tone="amber" /> : f.kind === 'karmic' && !f.unlocked ? <Badge text="Kilitli" tone="gold" /> : null}
                <Dim style={{ fontSize: 11 }}>{timeAgo(f.createdAt)}</Dim>
              </View>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
