// Mağaza içi satın alma (IAP) — web sürümü. Tarayıcıda App Store/Google Play yoktur; bu dosya
// her zaman "kullanılamaz" der. Gerçek uygulama (iOS/Android) iap.native.ts'i kullanır — Metro
// bu iki dosya arasında platforma göre otomatik seçim yapar (bkz. notify.ts / notify.native.ts).
import type { CreditPackage } from '@/shared/types.ts';

/** Bu platformda IAP prensipte mümkün mü. Web'de her zaman false. */
export const iapCapable = false;

export interface IapPurchaseResult {
  /** Sunucuya gönderilecek makbuz/jeton (iOS: StoreKit2 JWS; Android: purchaseToken). */
  receipt: string;
  /** Doğrulanan mağaza ürün kimliği. */
  productId: string;
  /** Sunucu doğrulaması BAŞARILI olduktan sonra çağrılmalı — mağaza kuyruğundan siler. */
  finish(): Promise<void>;
}

export async function ensureIapReady(): Promise<boolean> {
  return false;
}

export async function purchasePackage(_pkg: CreditPackage): Promise<IapPurchaseResult> {
  throw new Error('Mağaza içi satın alma bu platformda kullanılamaz.');
}
