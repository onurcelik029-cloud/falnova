// Mağaza içi satın alma (IAP) — mobil sürüm: expo-iap köprüsü (App Store / Google Play).
// expo-iap yalnızca özel geliştirme derlemesinde çalışır (Expo Go'nun native modül listesinde
// yoktur — bkz. AGENTS.md "Expo Go only includes its bundled native modules"). Bağlantı
// kurulamazsa (Expo Go, henüz derleme alınmamış sürüm) ensureIapReady/purchasePackage sessizce
// başarısız olur; çağıran taraf (wallet.tsx) o zaman mevcut Stripe/mock ödeme akışına düşer —
// tıpkı sunucudaki AI/ödeme sağlayıcılarının anahtar yokken mock'a düşmesi gibi, burada da
// kullanıcı asla çıplak bir hata görmez.
import { Platform } from 'react-native';
import {
  initConnection, requestPurchase, finishTransaction, purchaseUpdatedListener, purchaseErrorListener,
  type Purchase,
} from 'expo-iap';
import type { CreditPackage } from '@/shared/types.ts';
import { iapProductId } from '@/shared/packages.ts';

/** Bu platformda IAP prensipte mümkün mü (gerçekten bağlanabileceği anlamına gelmez). */
export const iapCapable = Platform.OS === 'ios' || Platform.OS === 'android';

export interface IapPurchaseResult {
  /** Sunucuya gönderilecek makbuz/jeton (iOS: StoreKit2 JWS; Android: purchaseToken). */
  receipt: string;
  /** Doğrulanan mağaza ürün kimliği. */
  productId: string;
  /** Sunucu doğrulaması BAŞARILI olduktan sonra çağrılmalı — mağaza kuyruğundan siler. */
  finish(): Promise<void>;
}

let connected = false;

/** Mağaza bağlantısını kurar. Native modül yoksa (Expo Go / dev build alınmamış) sessizce false döner. */
export async function ensureIapReady(): Promise<boolean> {
  if (!iapCapable) return false;
  if (connected) return true;
  try {
    connected = await initConnection();
  } catch {
    connected = false;
  }
  return connected;
}

const receiptOf = (p: Purchase): string | null => p.purchaseToken ?? null;

/**
 * Bir paket için mağaza satın alma akışını başlatır ve sonucu bekler. Sonuç olay tabanlı
 * geldiği için (purchaseUpdatedListener) burada tek seferlik bir dinleyici kurulup Promise'e
 * çevrilir. Kullanıcı vazgeçerse ya da mağaza hata döndürürse reddedilir — bu durumda çağıran
 * taraf mevcut ödeme akışına (Stripe/mock) düşebilir.
 */
export async function purchasePackage(pkg: CreditPackage, timeoutMs = 5 * 60_000): Promise<IapPurchaseResult> {
  const ready = await ensureIapReady();
  if (!ready) throw new Error('Mağaza bağlantısı kurulamadı. Bu özellik yalnızca App Store/Google Play üzerinden kurulan sürümde çalışır.');
  const platform = Platform.OS as 'ios' | 'android';
  const productId = iapProductId(platform, pkg.id);
  if (!productId) throw new Error(`"${pkg.title}" için mağaza ürünü tanımlı değil.`);

  return new Promise<IapPurchaseResult>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      updateSub.remove();
      errorSub.remove();
      fn();
    };
    const updateSub = purchaseUpdatedListener((purchase) => {
      if (purchase.productId !== productId) return; // başka bir bekleyen işlemin bildirimi olabilir
      const receipt = receiptOf(purchase);
      if (!receipt) { finish(() => reject(new Error('Satın alma makbuzu alınamadı.'))); return; }
      finish(() => resolve({
        receipt,
        productId,
        // Kredi/soru paketleri tüketilebilir: mağaza kaydını temizler, ürün tekrar satın alınabilir olur.
        finish: () => finishTransaction({ purchase, isConsumable: true }).then(() => undefined).catch(() => undefined),
      }));
    });
    const errorSub = purchaseErrorListener((err) => {
      finish(() => reject(new Error(err.code === 'user-cancelled' ? 'Satın alma iptal edildi.' : (err.message || 'Satın alma başarısız oldu.'))));
    });
    const timer = setTimeout(() => finish(() => reject(new Error('Satın alma zaman aşımına uğradı.'))), timeoutMs);
    requestPurchase({ type: 'in-app', request: { apple: { sku: productId }, google: { skus: [productId] } } }).catch((err) => {
      finish(() => reject(err instanceof Error ? err : new Error(String(err))));
    });
  });
}
