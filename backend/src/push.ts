// Push bildirimleri (Expo Push Servisi): sunucu → https://exp.host/... → cihaz. Herhangi bir anahtar
// gerekmez (Expo'nun ücretsiz push servisi) — yalnızca istemcinin kaydettirdiği ExponentPushToken'a
// gönderilir, hiç jeton yoksa sessizce hiçbir şey yapılmaz. Ağ hatası ya da sağlayıcı kesintisi bildirimi
// engellese bile kullanıcı akışını ASLA bloklamaz: her çağrı best-effort'tur ve hata fırlatmaz — tıpkı
// AI sağlayıcılarının mock'a düşmesi gibi, bildirim de burada "kritik olmayan" bir katmandır.
import { config } from './config.ts';
import type { Store } from './store.ts';

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/** Şu an Türkiye saatiyle sessiz saatler içinde miyiz? start..end aralığı gece yarısını sarabilir. */
export function isQuietHoursNow(d: Date = new Date()): boolean {
  const { quietStartHourTR: start, quietEndHourTR: end } = config.push;
  if (start === end) return false; // sessiz saat tanımlı değil
  const hourTR = new Date(d.getTime() + 3 * 3600_000).getUTCHours();
  return start < end ? hourTR >= start && hourTR < end : hourTR >= start || hourTR < end; // gece yarısını saran aralık
}

/**
 * Bir kullanıcının kayıtlı tüm cihazlarına push gönderir. Sessiz saatlerdeyse (ve `force` verilmediyse)
 * hiçbir şey göndermez. Geçersiz/iptal edilmiş jetonlar (DeviceNotRegistered) otomatik silinir.
 */
export async function sendPush(store: Store, userId: string, msg: PushMessage, opts: { force?: boolean; now?: Date } = {}): Promise<void> {
  if (!opts.force && isQuietHoursNow(opts.now)) return;
  const tokens = store.pushTokens(userId);
  if (tokens.length === 0) return;
  await sendToTokens(store, tokens, msg);
}

async function sendToTokens(store: Store, tokens: string[], msg: PushMessage): Promise<void> {
  try {
    const res = await fetch(config.push.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(tokens.map((to) => ({ to, title: msg.title, body: msg.body, data: msg.data, sound: 'default' }))),
    });
    const json = (await res.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
    (json?.data ?? []).forEach((r, i) => {
      if (r.status === 'error' && r.details?.error === 'DeviceNotRegistered') store.removePushToken(tokens[i]);
    });
  } catch {
    // Ağ hatası ya da Expo push servisi kesintisi: bildirim gönderilemedi. Kritik değil — kullanıcı
    // uygulamayı bir sonraki açtığında içerik zaten orada; yalnızca bildirimi kaçırmış olur.
  }
}
