// Canlı backend istemcisi (EXPO_PUBLIC_API_URL ile). AI anahtarları yalnızca sunucuda durur.

import type { CoffeeRequest, CoupleRequest, DreamRequest, IapVerifyRequest, KarmicRequest, PalmRequest, Profile, TarotRequest, ZodiacId } from '@/shared/types.ts';
import { getItem, removeItem, setItem } from '@/lib/storage.ts';
import { ApiError, type Api, type Session } from './types.ts';

const TOKEN_KEY = 'falnova.token';
/** Rıza metninin sürümü: metin değişince artırılır, sunucuda hangi sürüme rıza verildiği kayıtlı kalır. */
const CONSENT_VERSION = 'riza-2026-09-21';

export function createRemoteApi(baseUrl: string): Api {
  const base = baseUrl.replace(/\/$/, '');
  let token: string | null = null;

  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (token === null) token = (await getItem(TOKEN_KEY)) ?? '';
    let res: Response;
    try {
      res = await fetch(`${base}/api${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch {
      throw new ApiError('NETWORK', 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.');
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e = (json as { error?: { code?: string; message?: string } }).error;
      throw new ApiError(e?.code ?? 'ERROR', e?.message ?? 'Bir hata oluştu.');
    }
    return json as T;
  }

  const withToken = async (p: Promise<Session & { token?: string }>): Promise<Session> => {
    const r = await p;
    if (r.token) {
      token = r.token;
      await setItem(TOKEN_KEY, r.token);
    }
    return r;
  };

  return {
    mode: 'live',

    async restore() {
      const t = await getItem(TOKEN_KEY);
      if (!t) return null;
      token = t;
      try {
        return await call('GET', '/me');
      } catch {
        return null;
      }
    },
    register: (email, password, profile: Profile, refCode?: string) => withToken(call<Session & { token?: string }>('POST', '/auth/register', { email, password, profile, refCode })),
    login: (email, password) => withToken(call<Session & { token?: string }>('POST', '/auth/login', { email, password })),
    guest: (profile: Profile, refCode?: string) => withToken(call<Session & { token?: string }>('POST', '/auth/guest', { profile, refCode })),
    async logout() {
      token = '';
      await removeItem(TOKEN_KEY);
    },
    async deleteAccount() {
      await call('DELETE', '/me');
      token = '';
      await removeItem(TOKEN_KEY);
    },
    updateProfile: (profile: Profile) => call('PUT', '/me/profile', { profile }),
    recordConsent: () => call('POST', '/me/consent', { version: CONSENT_VERSION }),
    revokeConsent: () => call('DELETE', '/me/consent'),
    registerPushToken: async (pushToken: string, platform) => { await call('POST', '/me/push-token', { token: pushToken, platform }); },
    unregisterPushToken: async (pushToken: string) => { await call('DELETE', '/me/push-token', { token: pushToken }); },

    coffee: (req: CoffeeRequest) => call('POST', '/fortunes/coffee', req),
    tarot: (req: TarotRequest) => call('POST', '/fortunes/tarot', req),
    horoscope: (sign: ZodiacId, period) => call('POST', '/fortunes/horoscope', { sign, period }),
    dream: (req: DreamRequest) => call('POST', '/fortunes/dream', req),
    karmic: (req: KarmicRequest) => call('POST', '/fortunes/karmic', req),
    karmicUnlock: (id: string) => call('POST', `/fortunes/karmic/${id}/unlock`),
    couple: (req: CoupleRequest) => call('POST', '/fortunes/couple', req),
    natal: () => call('POST', '/fortunes/natal'),
    palm: (req: PalmRequest) => call('POST', '/fortunes/palm', req),

    chatHistory: async () => (await call<{ messages: never[] }>('GET', '/chat')).messages,
    chatAsk: (text: string, opts) => call('POST', '/chat', { text, voice: !!opts?.voice, tone: opts?.tone }),

    home: () => call('GET', '/home'),
    claimDaily: () => call('POST', '/daily/claim'),
    offers: () => call('GET', '/wallet/offers'),
    referral: () => call('GET', '/me/referral'),

    wallet: async () => (await call<{ wallet: { credits: number; questions: number } }>('GET', '/wallet')).wallet,
    packages: async () => (await call<{ packages: never[] }>('GET', '/wallet/packages')).packages,
    checkout: (packageId: string) => call('POST', '/wallet/checkout', { packageId }),
    iapVerify: (req: IapVerifyRequest) => call('POST', '/wallet/iap/verify', req),
    transactions: async () => (await call<{ transactions: never[] }>('GET', '/wallet/transactions')).transactions,

    history: async () => (await call<{ fortunes: never[] }>('GET', '/fortunes')).fortunes,
    fortune: async (id: string) => {
      try {
        return (await call<{ fortune: never }>('GET', `/fortunes/${id}`)).fortune;
      } catch {
        return null;
      }
    },
    removeFortune: async (id: string) => {
      await call('DELETE', `/fortunes/${id}`);
    },
  };
}
