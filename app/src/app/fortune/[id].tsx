import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import type { FortuneResult } from '@/shared/types.ts';
import { Button, Dim, Screen } from '@/components/ui';
import { FortuneView } from '@/components/FortuneView';
import { PendingReading } from '@/components/PendingReading';
import { useApp } from '@/state/app';

export default function FortuneDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { api, user, run, setWallet, toast, track } = useApp();
  const [f, setF] = useState<FortuneResult | null | undefined>(undefined);
  const [unlocking, setUnlocking] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const r = await run(() => api.fortune(id));
    setF(r ?? null);
    if (r?.pending) track(r);
  }, [id, api, run, track]);

  useEffect(() => { load(); }, [load]);

  const unlock = async () => {
    if (!f) return;
    setUnlocking(true);
    const res = await run(() => api.karmicUnlock(f.id));
    setUnlocking(false);
    if (res) { setWallet(res.wallet); setF(res.fortune); }
  };

  const remove = async () => {
    if (!f) return;
    const doIt = async () => { await run(() => api.removeFortune(f.id)); toast('Fal defterden silindi.'); router.back(); };
    if (Platform.OS === 'web') { await doIt(); return; }
    Alert.alert('Bu falı sil?', 'Bu işlem geri alınamaz.', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: doIt }]);
  };

  return (
    <Screen title={f?.pending ? f.title : 'Fal Detayı'} back>
      {f === undefined ? <Dim>Yükleniyor…</Dim> : f === null ? <Dim>Bu fal bulunamadı.</Dim> : f.pending ? (
        <PendingReading fortune={f} onReady={load} />
      ) : (
        <>
          <FortuneView fortune={f} userName={user?.profile.name ?? ''} onUnlock={unlock} unlocking={unlocking} />
          <Button title="Defterden Sil" variant="danger" onPress={remove} />
        </>
      )}
    </Screen>
  );
}
