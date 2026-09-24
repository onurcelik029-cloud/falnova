// Bekleme ritüeli: bazı okumalar anında değil, belirli bir sürede "hazırlanır".
// Süre ürün deneyiminin parçasıdır (Kullanım Koşulları'nda da belirtilir); atlama satışı YOKTUR.

import type { FortuneKind } from './types.ts';

/** Ortalama hazırlanma süresi (ms). Yoksa anında. */
export const READING_MS: Partial<Record<FortuneKind, number>> = {
  coffee: 180_000, // "birkaç dakika"
  tarot: 45_000,
  dream: 70_000,
  couple: 100_000,
  karmic: 50_000,
  palm: 60_000,
};

/** Derin kahve okuması daha uzun sürer. */
export const DEEP_COFFEE_MS = 300_000;

/**
 * Bir okumanın hazır olma süresi. ±%25 sapma verilir; her okuma aynı sürede bitmez.
 * scale=0 ise bekleme yok (testler, "hızlı demo").
 */
export function readingDelayMs(kind: FortuneKind, opts: { scale?: number; deep?: boolean; rand?: () => number } = {}): number {
  const scale = opts.scale ?? 1;
  const base = kind === 'coffee' && opts.deep ? DEEP_COFFEE_MS : READING_MS[kind] ?? 0;
  if (base <= 0 || scale <= 0) return 0;
  const r = (opts.rand ?? Math.random)();
  return Math.round(base * scale * (0.75 + r * 0.5));
}

export interface Pending {
  /** Sunucunun cevap verdiği andan itibaren kalan süre (ms). İstemci kendi saatine çevirir. */
  readyInMs: number;
  totalMs: number;
}

/** Bekleme ekranında ilerleme yüzdesine göre dönen ritüel satırları. Sadece atmosfer; belirli bir insan iddiası içermez. */
export const WAIT_STAGES: Partial<Record<FortuneKind, string[]>> = {
  coffee: [
    'Fincan ters çevrildi, telve yerine oturuyor.',
    'Nova fincanın kenarındaki izleri tek tek gözden geçiriyor.',
    'Fincanın ortasında beliren şekiller sıralanıyor.',
    'Dipteki yoğun telve, tabaktaki izlerle birlikte okunuyor.',
    'Semboller senin sorunla ve dönemle buluşturuluyor.',
    'Yorum son kez gözden geçiriliyor.',
  ],
  tarot: [
    'Seçtiğin kartlar sırayla masaya diziliyor.',
    'Her kartın pozisyonu ve yönü tartılıyor.',
    'Kartların birbirine söylediği şey okunuyor.',
    'Açılımın bütünü yazılıyor.',
  ],
  dream: [
    'Rüyanın sahneleri sırayla ayrıştırılıyor.',
    'Ana semboller geleneksel yorumlarla eşleştiriliyor.',
    'Rüyanın seninle bağı düşünülüyor.',
    'Yorum toparlanıyor.',
  ],
  couple: [
    'İki doğum haritasının elementleri yan yana konuyor.',
    'Uyum ve gerilim noktaları işaretleniyor.',
    'Yakın, orta ve uzun dönem haritası çiziliyor.',
    'Yorum son kez gözden geçiriliyor.',
  ],
  karmic: [
    'Doğum bilgilerin döngülerle karşılaştırılıyor.',
    'Tıkanıklığın kökü aranıyor.',
    'Önümüzdeki üç aylık akış çiziliyor.',
    'Dönemeç noktası netleştiriliyor.',
  ],
  palm: [
    'Avuç içindeki çizgiler tek tek izleniyor.',
    'Yaşam ve kalp çizgisi karşılaştırılıyor.',
    'Akıl ve kader çizgisi okunuyor.',
    'Bütünsel yorum toparlanıyor.',
  ],
};

export const WAIT_TITLE: Partial<Record<FortuneKind, string>> = {
  coffee: 'Nova fincanını yorumluyor',
  tarot: 'Kartların sırası okunuyor',
  dream: 'Rüyanın izi sürülüyor',
  couple: 'İki haritanın buluşması hazırlanıyor',
  karmic: 'Kader senaryon çiziliyor',
  palm: 'Avuç için okunuyor',
};

export const READY_TITLE: Partial<Record<FortuneKind, string>> = {
  coffee: 'Kahve falın hazır',
  tarot: 'Tarot açılımın hazır',
  dream: 'Rüya tabirin hazır',
  couple: 'Partner analizin hazır',
  karmic: 'Kader senaryon hazır',
  palm: 'El falın hazır',
};

/** "2 dk 40 sn" biçimi. */
export function formatRemaining(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s < 60) return `${s} sn`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} dk ${r} sn` : `${m} dk`;
}

/** Sohbet cevabının "yazıyor…" süresi: kısa cevap kısa, uzun cevap uzun; 1.4–4.2 sn. */
export function typingDelayMs(replyLength: number, scale = 1): number {
  if (scale <= 0) return 0;
  return Math.round(Math.min(4200, 1400 + replyLength * 9) * scale);
}
