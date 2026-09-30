import type { CreditPackage, FortuneKind } from './types.ts';

export const FREE_SIGNUP_CREDITS = 1;

/** Hangi işlem kaç kredi harcar. 0 = ücretsiz. */
export const COSTS = {
  coffee: 1,
  coffeeDeep: 2,
  tarot: 1,
  horoscope: 0,
  dream: 1,
  karmicPreview: 0,
  karmicUnlock: 2,
  couple: 2,
  /** Doğum haritası salt matematik — ücretsiz (burç rehberi gibi). */
  natal: 0,
  palm: 1,
  /** Soru-Cevap Odası ve Sesli Falcı: her mesaj 1 soru hakkı */
  question: 1,
} as const;

/** İlk başarılı kredi satın alımına eklenen hediye kredi. */
export const FIRST_PURCHASE_BONUS = 2;

/** Arkadaşını getiren kişiye, davet ettiği arkadaş ilk alışverişini yapınca verilir. */
export const REFERRAL_REWARD_CREDITS = 3;
/** Kayıt sırasında geçerli bir arkadaş kodu girene hemen verilen hoş geldin hediyesi. */
export const REFERRAL_WELCOME_CREDITS = 1;

/** Bir günde bu kadar krediden fazla harcanınca nazik bir mola hatırlatması gösterilir. */
export const SOFT_SPEND_NOTICE = 10;

// ── Nova'nın Sözcük Bulmacası (oyunla kredi kazanma) ──
/** Bulmacayı tamamlayınca kazanılan kredi. */
export const GAME_REWARD_CREDITS = 1;
/** Günde en fazla bu kadar kez ödüllendirilir (bulmaca istendiği kadar oynanabilir, fazlası kredi vermez). */
export const GAME_DAILY_LIMIT = 2;
/** Bir denemenin, sahtekârlığı zorlaştırmak için geçmesi gereken en az süre (ms). */
export const GAME_MIN_PLAY_MS = 12_000;

// ── Reklam izleyerek kredi kazanma ──
/** Bu kadar reklam izleyince 1 kredi kazanılır. */
export const AD_WATCH_PER_CREDIT = 5;
/** Günde reklamdan kazanılabilecek en fazla kredi. */
export const AD_CREDIT_DAILY_LIMIT = 2;

export const PACKAGES: CreditPackage[] = [
  { id: 'credit_5', kind: 'credit', title: '5 Kredi', amount: 5, priceTry: 49.9, description: 'Kahve, tarot ve rüya için ideal başlangıç.' },
  { id: 'credit_15', kind: 'credit', title: '15 Kredi', amount: 15, priceTry: 119.9, badge: 'Önerilen', description: 'Kader senaryosu ve partner analizi için dengeli paket.' },
  { id: 'credit_40', kind: 'credit', title: '40 Kredi', amount: 40, priceTry: 269.9, badge: 'En uygun fiyat', description: 'Tüm modüller için geniş kullanım.' },
  { id: 'question_5', kind: 'question', title: '5\'li Soru Hakkı', amount: 5, priceTry: 29.9, description: 'Falcıyla birebir sohbet için 5 soru.' },
  { id: 'question_15', kind: 'question', title: '15\'li Soru Hakkı', amount: 15, priceTry: 74.9, badge: 'En uygun fiyat', description: 'Derinlemesine sohbet ve sesli falcı için.' },
];

export function packageById(id: string): CreditPackage | undefined {
  return PACKAGES.find((p) => p.id === id);
}

/**
 * Mağaza (App Store / Google Play) ürün kimlikleri — PACKAGES.id ile 1:1 eşlenir.
 * Gerçek uygulama, bu kimliklerle App Store Connect / Play Console'da tüketilebilir ürün olarak
 * kaydedilmelidir; kayıt yapılana dek yalnızca istemci/sunucu arasında referans olarak kullanılır.
 */
export const IAP_PRODUCT_ID: Record<'ios' | 'android', Record<string, string>> = {
  ios: {
    credit_5: 'falnova.credit5', credit_15: 'falnova.credit15', credit_40: 'falnova.credit40',
    question_5: 'falnova.question5', question_15: 'falnova.question15',
  },
  android: {
    credit_5: 'falnova_credit_5', credit_15: 'falnova_credit_15', credit_40: 'falnova_credit_40',
    question_5: 'falnova_question_5', question_15: 'falnova_question_15',
  },
};

export const iapProductId = (platform: 'ios' | 'android', packageId: string): string | undefined => IAP_PRODUCT_ID[platform][packageId];

export const KIND_LABEL: Record<FortuneKind, string> = {
  coffee: 'Kahve Falı',
  tarot: 'Tarot',
  horoscope: 'Burç Yorumu',
  dream: 'Rüya Tabiri',
  karmic: 'Karmik Dönemeç',
  couple: 'Partner Analizi',
  chat: 'Falcı Sohbeti',
  voice: 'Sesli Falcı',
  natal: 'Doğum Haritası',
  palm: 'El Falı',
};

export const KIND_GLYPH: Record<FortuneKind, string> = {
  coffee: '☕',
  tarot: '🃏',
  horoscope: '☾',
  dream: '☁',
  karmic: '✺',
  couple: '♡',
  chat: '✎',
  voice: '♪',
  natal: '☉',
  palm: '✋',
};

/** Kredi paketlerinde kredi başına fiyat (TL). Soru paketlerinde soru başına. */
export const unitPrice = (p: CreditPackage): number => p.priceTry / p.amount;

/** Aynı türün en küçük paketine göre yüzde tasarruf (yuvarlanmış); en küçükte 0. */
export function savingsPercent(p: CreditPackage): number {
  const same = PACKAGES.filter((x) => x.kind === p.kind);
  const base = Math.max(...same.map(unitPrice));
  return Math.max(0, Math.round((1 - unitPrice(p) / base) * 100));
}

export function formatTry(n: number): string {
  return `₺${n.toFixed(2).replace('.', ',')}`;
}
