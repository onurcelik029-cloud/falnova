// FalNova — uygulama ve backend'in ortak kullandığı veri modelleri.

import type { Pending } from './pacing.ts';

export type ZodiacId =
  | 'koc' | 'boga' | 'ikizler' | 'yengec' | 'aslan' | 'basak'
  | 'terazi' | 'akrep' | 'yay' | 'oglak' | 'kova' | 'balik';

export type Element = 'ates' | 'toprak' | 'hava' | 'su';

export type FortuneKind =
  | 'coffee' | 'tarot' | 'horoscope' | 'dream' | 'karmic' | 'couple' | 'chat' | 'voice' | 'natal' | 'palm';

export type AiProvider = 'openai' | 'gemini' | 'mock';

export interface Profile {
  name: string;
  /** YYYY-MM-DD */
  birthDate: string;
  /** HH:MM (isteğe bağlı) */
  birthTime?: string;
  birthPlace?: string;
  sign: ZodiacId;
  /** Kullanıcının kendi seçtiği odak konusu (isteğe bağlı). Nova'nın yorumlarına ve notlarına yansır. */
  focus?: KarmicTopicId;
}

export interface User {
  id: string;
  email: string;
  profile: Profile;
  createdAt: string;
  /** Açık rıza (yurt dışı aktarım + yapay zekâ ile işleme) verildiği an. Yoksa AI destekli özellikler kapalıdır. */
  consentAt?: string;
  /** Arkadaşını Davet Et: kullanıcının kendi paylaşılabilir kodu. */
  referralCode: string;
}

export interface ReferralInfo {
  /** Kullanıcının kendi kodu; arkadaşları kayıt olurken girer. */
  code: string;
  /** Bu koda kayıt olan arkadaş sayısı. */
  invited: number;
  /** Bunlardan ilk alışverişini yapıp ödül kazandıranlar. */
  rewarded: number;
  /** Ödüllerden toplam kazanılan kredi. */
  earnedCredits: number;
  /** Bu hesap başka birinin kodunu kullanarak mı katıldı. */
  usedCode: boolean;
}

export interface PartnerInfo {
  id?: string;
  name: string;
  birthDate: string;
  birthTime?: string;
  sign: ZodiacId;
}

export interface FortuneSection {
  title: string;
  body: string;
}

export interface TarotCardDraw {
  id: number;
  name: string;
  reversed: boolean;
  position: string;
}

export interface FortuneResult {
  id: string;
  kind: FortuneKind;
  title: string;
  summary: string;
  sections: FortuneSection[];
  /** Kilitli içerik varsa (Karmik Dönemeç) — true ise sections tam açık. */
  unlocked: boolean;
  /** Kilitliyken gösterilecek merak uyandırıcı ipucu ve açma bedeli. */
  lock?: { teaser: string; cost: number; lockedTitles: string[] };
  meta?: {
    cards?: TarotCardDraw[];
    symbols?: string[];
    scores?: { label: string; value: number }[];
    luckyNumber?: number;
    luckyColor?: string;
    score?: number;
    partner?: PartnerInfo;
    topic?: string;
    timeline?: { month: string; title: string; text: string }[];
    posterQuote?: string;
    sign?: ZodiacId;
    natal?: { sun: ZodiacId; moon: ZodiacId; ascendant: ZodiacId | null; elements: Record<Element, number>; dominantElement: Element | null; placeMatched: boolean };
    palmLines?: { name: string; meaning: string }[];
    [k: string]: unknown;
  };
  provider: AiProvider;
  createdAt: string;
  /** Yorum henüz hazırlanıyorsa: içerik (bölümler, özet) sunucuda tutulur ve bu süre dolana dek gönderilmez. */
  pending?: Pending;
}

export interface Wallet {
  credits: number;
  questions: number;
}

export interface CreditPackage {
  id: string;
  kind: 'credit' | 'question';
  title: string;
  amount: number;
  priceTry: number;
  badge?: string;
  description: string;
}

export interface TransactionRecord {
  id: string;
  type: 'grant' | 'purchase' | 'spend' | 'refund';
  title: string;
  credits: number;
  questions: number;
  amountTry: number;
  status: 'pending' | 'paid' | 'failed';
  provider: string;
  createdAt: string;
}

/** Mağaza içi satın alma (App Store / Google Play) sonrası sunucuya gönderilen doğrulama isteği. */
export interface IapVerifyRequest {
  platform: 'ios' | 'android';
  /** PACKAGES içindeki paket kimliği (credit_5 gibi) — kullanıcının ekranda seçtiği paket. */
  packageId: string;
  /** iOS: App Store'dan dönen base64 makbuz. Android: satın alma jetonu (purchaseToken). */
  receipt: string;
  /** Android doğrulaması için gerekli; mağaza ürün kimliği (SKU). */
  productId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}

export interface KarmicRequest {
  topic: KarmicTopicId;
  note?: string;
}

export type KarmicTopicId = 'ask' | 'kariyer' | 'para' | 'aile' | 'kendini' | 'saglik';

export interface CoffeeRequest {
  /** data:image/jpeg;base64,... veya dosya URI'si (demoda) */
  images: string[];
  question?: string;
  /** 'deep': daha kapsamlı okuma (ek bölümler, 2 kredi, daha uzun hazırlanma). */
  depth?: 'standard' | 'deep';
}

export interface TarotRequest {
  spread: 'three' | 'one' | 'love';
  cardIds: number[];
  reversedFlags: boolean[];
  question?: string;
}

export interface CoupleRequest {
  partner: PartnerInfo;
  relationship: 'sevgili' | 'evli' | 'flort' | 'eski' | 'arkadas';
}

export interface DreamRequest {
  text: string;
}

export interface PalmRequest {
  /** data:image/jpeg;base64,... veya dosya URI'si (demoda) — avuç içi fotoğrafı. */
  images: string[];
  question?: string;
}

export type VoiceTone = 'bilge' | 'gizemli' | 'fisilti';
