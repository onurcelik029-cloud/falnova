// Ödeme altyapısı: mock (geliştirme) ve Stripe (Checkout + webhook) hazır; iyzico iskelet;
// mağaza içi satın alma (IAP) makbuz doğrulaması (Apple App Store + Google Play) hazır, yalnızca
// APPLE_SHARED_SECRET / GOOGLE_SERVICE_ACCOUNT_JSON tanımlı değilse devre dışı kalır.
import { createHmac, createSign, timingSafeEqual } from 'node:crypto';
import type { CreditPackage, IapVerifyRequest, TransactionRecord } from '../../app/src/shared/types.ts';
import { iapProductId, packageById } from '../../app/src/shared/packages.ts';
import { config } from './config.ts';
import { HttpError } from './errors.ts';
import type { Store } from './store.ts';

export interface CheckoutOutcome {
  transaction: TransactionRecord;
  /** Kullanıcının ödemeyi tamamlayacağı sayfa (Stripe/iyzico). Mock'ta yok, bakiye anında yüklenir. */
  checkoutUrl?: string;
}

export async function startCheckout(store: Store, userId: string, pkg: CreditPackage): Promise<CheckoutOutcome> {
  const provider = config.payments.provider;

  if (provider === 'mock') {
    if (config.isProd && !config.payments.allowMockInProd) {
      throw new HttpError(503, 'PAYMENTS_DISABLED', 'Ödeme sağlayıcısı yapılandırılmadı.');
    }
    return { transaction: store.creditPurchase(userId, pkg, 'mock', null) };
  }

  if (provider === 'stripe') {
    if (!config.payments.stripeSecret) throw new HttpError(503, 'PAYMENTS_DISABLED', 'Stripe yapılandırılmadı.');
    const form = new URLSearchParams({
      mode: 'payment',
      success_url: config.payments.successUrl,
      cancel_url: config.payments.cancelUrl,
      client_reference_id: userId,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': 'try',
      'line_items[0][price_data][unit_amount]': String(Math.round(pkg.priceTry * 100)),
      'line_items[0][price_data][product_data][name]': `FalNova · ${pkg.title}`,
      'metadata[user_id]': userId,
      'metadata[package_id]': pkg.id,
    });
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.payments.stripeSecret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const json = (await res.json().catch(() => ({}))) as { id?: string; url?: string; error?: { message?: string } };
    if (!res.ok || !json.id || !json.url) throw new HttpError(502, 'PAYMENT_ERROR', 'Ödeme oturumu oluşturulamadı.');
    return { transaction: store.createPendingPurchase(userId, pkg, 'stripe', json.id), checkoutUrl: json.url };
  }

  // TODO(iyzico): iyzico Checkout Form başlat → { transaction: pending, checkoutUrl } döndür; callback'te creditPurchase çağır.
  throw new HttpError(501, 'NOT_CONFIGURED', 'Bu ödeme sağlayıcısı henüz yapılandırılmadı.');
}

/** Stripe imza doğrulaması (Stripe-Signature: t=...,v1=...). Ham gövde gerekir. */
export function verifyStripeSignature(rawBody: string, header: string | undefined, secret: string, toleranceSec = 300): boolean {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest();
  const given = Buffer.from(parts.v1 ?? '', 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function handleStripeEvent(store: Store, event: { type?: string; data?: { object?: { id?: string; payment_status?: string } } }): boolean {
  if (event.type !== 'checkout.session.completed') return false;
  const s = event.data?.object;
  if (!s?.id || s.payment_status !== 'paid') return false;
  const pending = store.findPendingByRef('stripe', s.id);
  const pkg = pending && packageById(pending.packageId);
  if (!pending || !pkg) return false;
  store.creditPurchase(pending.userId, pkg, 'stripe', s.id);
  return true;
}

// ───────── Mağaza İçi Satın Alma (IAP): makbuz doğrulaması ─────────

interface VerifiedPurchase { transactionId: string; productId: string }

/** Apple App Store makbuzunu (base64) doğrular. TestFlight/sandbox makbuzları üretim uç noktasında 21007 döner; o zaman sandbox'a düşer. */
async function verifyAppleReceipt(receiptData: string): Promise<VerifiedPurchase> {
  if (!config.iap.appleSharedSecret) throw new HttpError(501, 'NOT_CONFIGURED', 'Apple App Store doğrulaması için APPLE_SHARED_SECRET tanımlı değil.');
  const body = JSON.stringify({ 'receipt-data': receiptData, password: config.iap.appleSharedSecret, 'exclude-old-transactions': true });
  const call = async (url: string) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    return res.json() as Promise<{
      status: number;
      latest_receipt_info?: { transaction_id: string; product_id: string }[];
      receipt?: { in_app?: { transaction_id: string; product_id: string }[] };
    }>;
  };
  let json = await call(config.iap.appleVerifyProdUrl);
  if (json.status === 21007) json = await call(config.iap.appleVerifySandboxUrl); // sandbox makbuzu üretim uç noktasına gönderilmiş
  if (json.status !== 0) throw new HttpError(402, 'IAP_INVALID', `Apple makbuzu doğrulanamadı (status ${json.status}).`);
  const items = json.latest_receipt_info ?? json.receipt?.in_app ?? [];
  const latest = items.at(-1);
  if (!latest) throw new HttpError(402, 'IAP_INVALID', 'Makbuzda bir satın alma bulunamadı.');
  return { transactionId: latest.transaction_id, productId: latest.product_id };
}

const base64url = (input: Buffer | string) => Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Google servis hesabı JSON'undan RS256 imzalı JWT ile OAuth2 erişim jetonu alır (ek bağımlılık gerekmez). */
async function googleAccessToken(): Promise<string> {
  const raw = config.iap.googleServiceAccountJson;
  if (!raw) throw new HttpError(501, 'NOT_CONFIGURED', 'Google Play doğrulaması için GOOGLE_SERVICE_ACCOUNT_JSON tanımlı değil.');
  let sa: { client_email: string; private_key: string };
  try {
    sa = JSON.parse(raw);
  } catch {
    throw new HttpError(500, 'IAP_MISCONFIGURED', 'GOOGLE_SERVICE_ACCOUNT_JSON geçerli bir JSON değil.');
  }
  const iat = Math.floor(Date.now() / 1000);
  const signInput = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify({
    iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600,
  }))}`;
  const signature = base64url(createSign('RSA-SHA256').update(signInput).sign(sa.private_key));
  const res = await fetch(config.iap.googleTokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${signInput}.${signature}` }),
  });
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new HttpError(502, 'IAP_ERROR', 'Google erişim jetonu alınamadı.');
  return json.access_token;
}

/** Google Play Developer API ile bir satın alma jetonunu doğrular (purchaseState 0 = satın alındı). */
async function verifyGooglePurchase(productId: string, purchaseToken: string): Promise<VerifiedPurchase> {
  if (!config.iap.androidPackageName) throw new HttpError(501, 'NOT_CONFIGURED', 'Google Play doğrulaması için ANDROID_PACKAGE_NAME tanımlı değil.');
  if (!productId) throw new HttpError(400, 'VALIDATION', 'Android doğrulaması için productId gerekli.');
  const token = await googleAccessToken();
  const url = `${config.iap.googlePublisherBaseUrl}/applications/${config.iap.androidPackageName}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const json = (await res.json()) as { purchaseState?: number; orderId?: string; error?: { message?: string } };
  if (!res.ok || json.purchaseState !== 0) throw new HttpError(402, 'IAP_INVALID', `Google satın alması doğrulanamadı${json.error?.message ? `: ${json.error.message}` : ''}.`);
  return { transactionId: json.orderId ?? purchaseToken, productId };
}

/**
 * Makbuzu ilgili mağazada doğrular, doğrulanan ürünün seçilen paketle eşleştiğini kontrol eder
 * ve bakiyeyi yükler. providerRef (transactionId) idempotent — aynı satın alma iki kez işlenmez.
 */
export async function verifyIapPurchase(store: Store, userId: string, req: IapVerifyRequest, pkg: CreditPackage): Promise<TransactionRecord> {
  const verified = req.platform === 'ios'
    ? await verifyAppleReceipt(req.receipt)
    : await verifyGooglePurchase(req.productId ?? '', req.receipt);
  const expected = iapProductId(req.platform, pkg.id);
  if (expected && verified.productId !== expected) {
    throw new HttpError(402, 'IAP_MISMATCH', 'Doğrulanan mağaza ürünü seçilen paketle uyuşmuyor.');
  }
  return store.creditPurchase(userId, pkg, req.platform, verified.transactionId);
}
