import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Text';
import type { FortuneKind, FortuneResult, User, Wallet } from '@/shared/types.ts';
import { READY_TITLE } from '@/shared/pacing.ts';
import { KIND_LABEL } from '@/shared/packages.ts';
import { cancelReady, getExpoPushToken, scheduleReady } from '@/lib/notify';
import { getDemoFast } from '@/lib/pace';
import { ApiError, createApi, type Api, type Session } from '@/api';
import { colors, serif } from '@/theme';
import { Button } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { router } from 'expo-router';
import { resetToLogin } from '@/lib/nav';

/** Hazırlanmakta olan bir okuma (bekleme ritüeli). readyAt: bu cihazın saatiyle. */
export interface PendingItem {
  id: string;
  kind: FortuneKind;
  title: string;
  readyAt: number;
}

interface ToastAction { label: string; onPress: () => void }

interface AppState {
  ready: boolean;
  api: Api;
  user: User | null;
  wallet: Wallet;
  signIn: (s: Session) => void;
  signOut: () => Promise<void>;
  setWallet: (w: Wallet) => void;
  setUser: (u: User) => void;
  /** Bir API çağrısını sarar: kredi/soru bitti ise paywall açar, diğer hatalarda toast gösterir. */
  run: <T>(fn: () => Promise<T>) => Promise<T | null>;
  toast: (msg: string, action?: ToastAction) => void;
  openPaywall: (message?: string) => void;
  openSupport: (message: string) => void;
  /** Hazırlanmakta olan okumalar (yeniden başlatmada sunucudan/cihazdan geri yüklenir). */
  pending: PendingItem[];
  /** Bir okumayı izlemeye alır (hazırsa yok sayar); hazır olunca bildirim gösterilir. */
  track: (f: FortuneResult) => void;
  /** Bu okumanın bekleme ekranı açık: hazır olunca ayrıca bildirim gösterme. */
  setViewing: (id: string | null) => void;
  /** Okumayı fal ekranında açar (ekranı değiştirir). */
  showFortune: (f: FortuneResult) => void;
  /** Sohbet "yazıyor…" gecikme çarpanı (hızlı demoda 0). */
  typingScale: () => Promise<number>;
  /** Yapay zekâ destekli bir işlemden önce açık rızayı (bir kez) alır. false = vazgeçti. */
  ensureConsent: () => Promise<boolean>;
}

const Ctx = createContext<AppState | null>(null);

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp yalnızca AppProvider içinde kullanılabilir');
  return v;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const api = useMemo(() => createApi(), []);
  const [ready, setReady] = useState(false);
  const [user, setUserState] = useState<User | null>(null);
  const [wallet, setWalletState] = useState<Wallet>({ credits: 0, questions: 0 });
  const [paywall, setPaywall] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastAction, setToastAction] = useState<ToastAction | null>(null);
  const [support, setSupport] = useState<string | null>(null);
  const [consentAsk, setConsentAsk] = useState<{ resolve: (v: boolean) => void } | null>(null);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const viewing = useRef<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    api.restore().then((s) => {
      if (!alive) return;
      if (s) {
        setUserState(s.user);
        setWalletState(s.wallet);
      }
      setReady(true);
    }).catch(() => alive && setReady(true));
    return () => { alive = false; };
  }, [api]);

  const toast = useCallback((msg: string, action?: ToastAction) => {
    setToastMsg(msg);
    setToastAction(action ?? null);
    Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start();
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastAnim, { toValue: 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }).start(() => { setToastMsg(null); setToastAction(null); });
    }, action ? 7000 : 3200);
  }, [toastAnim]);

  const userRef = useRef<User | null>(null);
  userRef.current = user;
  const ensureConsent = useCallback(async () => {
    if (userRef.current?.consentAt) return true;
    return new Promise<boolean>((resolve) => setConsentAsk({ resolve }));
  }, []);

  const track = useCallback((f: FortuneResult) => {
    if (!f.pending) return;
    const readyAt = Date.now() + f.pending.readyInMs;
    setPending((list) => (list.some((p) => p.id === f.id) ? list : [...list, { id: f.id, kind: f.kind, title: f.title, readyAt }]));
    // Uygulama kapalıyken de haber verebilmek için (izin verildiyse) bildirim zamanlanır.
    scheduleReady(f.id, READY_TITLE[f.kind] ?? `${KIND_LABEL[f.kind]} hazır`, 'Yorumun hazır. Açmak için dokun.', f.pending.readyInMs);
  }, []);

  const showFortune = useCallback((f: FortuneResult) => {
    track(f);
    router.replace({ pathname: '/fortune/[id]', params: { id: f.id } });
  }, [track]);

  // Hazır olan okumaları bul: bildirimi göster ve listeden çıkar.
  useEffect(() => {
    if (!pending.length) return;
    const t = setInterval(() => {
      const nowMs = Date.now();
      const done = pending.filter((p) => p.readyAt <= nowMs);
      if (!done.length) return;
      setPending((list) => list.filter((p) => p.readyAt > nowMs));
      for (const p of done) {
        cancelReady(p.id);
        if (viewing.current === p.id) continue;
        toast(READY_TITLE[p.kind] ?? `${KIND_LABEL[p.kind]} hazır`, { label: 'Aç', onPress: () => router.push({ pathname: '/fortune/[id]', params: { id: p.id } }) });
      }
    }, 1000);
    return () => clearInterval(t);
  }, [pending, toast]);

  // Oturum açılınca (ya da uygulama yeniden başlayınca) hâlâ hazırlanmakta olanları geri yükle.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) { setPending([]); return; }
    let alive = true;
    api.history().then((list) => { if (alive) list.forEach(track); }).catch(() => undefined);
    return () => { alive = false; };
  }, [userId, api, track]);

  // İzin daha önce verildiyse (ör. önceki bir oturumda) her açılışta jetonu tazeler — Expo push
  // jetonları zaman zaman değişebilir. İzin henüz sorulmadıysa burada İSTENMEZ (bkz. PendingReading'de
  // "Hazır Olunca Haber Ver"); bu yalnızca zaten açık olan izni sunucuyla senkron tutar.
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    getExpoPushToken().then((pt) => { if (alive && pt) api.registerPushToken(pt.token, pt.platform).catch(() => undefined); }).catch(() => undefined);
    return () => { alive = false; };
  }, [userId, api]);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'NO_CREDITS' || e.code === 'NO_QUESTIONS')) setPaywall(e.message);
      else if (e instanceof ApiError && e.code === 'SAFETY') setSupport(e.message);
      else if (e instanceof ApiError && e.code === 'UNAUTHORIZED') {
        setUserState(null);
        resetToLogin();
      } else toast(e instanceof Error ? e.message : 'Bir şeyler ters gitti.');
      return null;
    }
  }, [toast]);

  const value = useMemo<AppState>(() => ({
    ready, api, user, wallet,
    signIn: (s) => { setUserState(s.user); setWalletState(s.wallet); },
    signOut: async () => {
      // Bu cihazda artık bu hesaba bildirim gitmesin diye jeton silinir (oturum kapanmadan ÖNCE — token gerekir).
      try {
        const pt = await getExpoPushToken();
        if (pt) await api.unregisterPushToken(pt.token);
      } catch { /* kritik değil */ }
      await api.logout();
      setUserState(null);
      setWalletState({ credits: 0, questions: 0 });
    },
    setWallet: setWalletState,
    setUser: setUserState,
    run, toast,
    openPaywall: (m) => setPaywall(m ?? 'Devam etmek için kredi gerekiyor.'),
    openSupport: setSupport,
    pending, track, showFortune,
    setViewing: (id) => { viewing.current = id; },
    ensureConsent,
    typingScale: async () => (api.mode === 'demo' && (await getDemoFast()) ? 0 : 1),
  }), [ready, api, user, wallet, run, toast, pending, track, showFortune, ensureConsent]);

  return (
    <Ctx.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        {paywall ? (
          <View style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,2,8,0.72)' }]} onPress={() => setPaywall(null)} />
            <View style={s.sheetWrap} pointerEvents="box-none">
              <View style={s.sheet}>
                <Icon name="spark" size={32} stroke={1.3} />
                <Text style={s.sheetTitle}>Kredin tükendi</Text>
                <Text style={s.sheetText}>{paywall}</Text>
                <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 8 }}>
                  <Button title="Kredi Al" variant="gold" onPress={() => { setPaywall(null); router.push('/(tabs)/wallet'); }} />
                  <Button title="Vazgeç" variant="ghost" onPress={() => setPaywall(null)} />
                </View>
              </View>
            </View>
          </View>
        ) : null}
        {consentAsk ? (
          <View style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,2,8,0.72)' }]} onPress={() => { consentAsk.resolve(false); setConsentAsk(null); }} />
            <View style={s.sheetWrap} pointerEvents="box-none">
              <View style={s.sheet} testID="consent-sheet">
                <Icon name="shield" size={28} stroke={1.3} />
                <Text style={s.sheetTitle}>Devam etmeden önce</Text>
                <Text style={s.sheetText}>
                  Yorumunu hazırlamak için yazdıkların ve doğum bilgilerin, yorum üreten yurt dışındaki hizmet sağlayıcılara iletilir. Ayrıntılar{' '}
                  <Text onPress={() => { consentAsk.resolve(false); setConsentAsk(null); router.push({ pathname: '/legal/[id]', params: { id: 'riza' } }); }} style={{ textDecorationLine: 'underline' }}>Açık Rıza</Text>
                  {' ve '}
                  <Text onPress={() => { consentAsk.resolve(false); setConsentAsk(null); router.push({ pathname: '/legal/[id]', params: { id: 'aydinlatma' } }); }} style={{ textDecorationLine: 'underline' }}>Aydınlatma</Text>
                  {' metinlerinde.'}
                </Text>
                <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 8 }}>
                  <Button title="Okudum, Onaylıyorum" variant="gold" testID="consent-accept" onPress={async () => {
                    const r = await run(() => api.recordConsent());
                    if (r) setUserState(r.user);
                    consentAsk.resolve(!!r);
                    setConsentAsk(null);
                  }} />
                  <Button title="Vazgeç" variant="ghost" onPress={() => { consentAsk.resolve(false); setConsentAsk(null); }} />
                </View>
              </View>
            </View>
          </View>
        ) : null}
        {support ? (
          <View style={StyleSheet.absoluteFill}>
            <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,2,8,0.78)' }]} onPress={() => setSupport(null)} />
            <View style={s.sheetWrap} pointerEvents="box-none">
              <View style={s.sheet} testID="support-sheet">
                <Icon name="heart" size={30} stroke={1.3} />
                <Text style={s.sheetTitle}>Önce sen</Text>
                <Text style={s.sheetText}>{support}</Text>
                <View style={{ gap: 10, alignSelf: 'stretch', marginTop: 8 }}>
                  <Button title="112'yi Ara" variant="gold" onPress={() => { Linking.openURL('tel:112').catch(() => undefined); }} />
                  <Button title="Tamam" variant="ghost" onPress={() => setSupport(null)} />
                </View>
              </View>
            </View>
          </View>
        ) : null}
        {toastMsg ? (
          <Animated.View pointerEvents={toastAction ? 'auto' : 'none'} style={[s.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ color: colors.text, fontSize: 14, lineHeight: 20, flex: 1 }}>{toastMsg}</Text>
              {toastAction ? (
                <Pressable onPress={() => { toastAction.onPress(); setToastMsg(null); setToastAction(null); }} hitSlop={10} testID="toast-action">
                  <Text style={{ color: colors.gold, fontSize: 14, fontWeight: '700' }}>{toastAction.label}</Text>
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Ctx.Provider>
  );
}

const s = StyleSheet.create({
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#150E1E', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 26, paddingBottom: 32,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.borderGold,
  },
  sheetGlyph: { fontSize: 34, color: colors.gold },
  sheetTitle: { fontSize: 28, color: colors.text, fontWeight: '600', fontFamily: serif },
  sheetText: { fontSize: 15, color: colors.textDim, textAlign: 'center', lineHeight: 22 },
  toast: {
    position: 'absolute', left: 18, right: 18, bottom: 96, backgroundColor: 'rgba(28,19,39,0.97)', borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 13, borderWidth: 1, borderColor: colors.border,
  },
});
