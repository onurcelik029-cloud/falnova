import { randomBytes } from 'node:crypto';
import { GAME_MIN_PLAY_MS } from '../../app/src/shared/packages.ts';

const env = process.env;

const isProd = env.NODE_ENV === 'production';
if (isProd && !env.JWT_SECRET) {
  throw new Error('Üretimde JWT_SECRET zorunludur.');
}

export const config = {
  isProd,
  port: Number(env.PORT ?? 8787),
  publicUrl: env.PUBLIC_URL ?? `http://localhost:${env.PORT ?? 8787}`,
  dbPath: env.DB_PATH ?? './data/falnova.db',
  audioDir: env.AUDIO_DIR ?? './data/audio',
  jwtSecret: env.JWT_SECRET ?? randomBytes(32).toString('hex'), // geliştirmede her açılışta yeni
  tokenTtlDays: 60,
  /** Bekleme ritüeli çarpanı: 1 = normal süre, 0 = bekleme yok (testler). */
  /** Kimlik uçları için IP başına dakikadaki istek sınırı. */
  authRatePerMin: Number(env.AUTH_RATE_LIMIT ?? 20),
  readingDelayScale: Number(env.READING_DELAY_SCALE ?? 1),
  corsOrigins: (env.CORS_ORIGINS ?? '*').split(',').map((s) => s.trim()),

  openai: { key: env.OPENAI_API_KEY ?? '', model: env.OPENAI_MODEL ?? 'gpt-4o', baseUrl: env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1' },
  gemini: { key: env.GEMINI_API_KEY ?? '', model: env.GEMINI_MODEL ?? 'gemini-3.6-flash', baseUrl: env.GEMINI_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta' },
  eleven: {
    key: env.ELEVENLABS_API_KEY ?? '',
    model: env.ELEVENLABS_MODEL ?? 'eleven_multilingual_v2',
    baseUrl: env.ELEVENLABS_BASE_URL ?? 'https://api.elevenlabs.io/v1',
    voices: {
      bilge: env.ELEVENLABS_VOICE_BILGE ?? '',
      gizemli: env.ELEVENLABS_VOICE_GIZEMLI ?? '',
      fisilti: env.ELEVENLABS_VOICE_FISILTI ?? '',
    } as Record<string, string>,
  },

  /** Yönetici paneli: normal kullanıcı hesap sisteminden tamamen ayrı, tek bir e-posta/şifre.
   *  Demo aşamasında .env içinde tutulur; gerçek yayına geçmeden önce ADMIN_PASSWORD_HASH mutlaka değiştirilmelidir. */
  admin: {
    email: (env.ADMIN_EMAIL ?? '').trim().toLowerCase(),
    passwordHash: env.ADMIN_PASSWORD_HASH ?? '',
  },

  payments: {
    provider: (env.PAYMENT_PROVIDER ?? 'mock') as 'mock' | 'stripe' | 'iyzico',
    allowMockInProd: env.ALLOW_MOCK_PAYMENTS === '1',
    stripeSecret: env.STRIPE_SECRET_KEY ?? '',
    stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET ?? '',
    successUrl: env.PAYMENT_SUCCESS_URL ?? 'falnova://wallet?status=success',
    cancelUrl: env.PAYMENT_CANCEL_URL ?? 'falnova://wallet?status=cancel',
  },

  /** Push bildirimleri (Expo Push) — anahtar gerekmez; yalnızca kayıtlı jeton varsa gönderilir. */
  push: {
    baseUrl: env.PUSH_BASE_URL ?? 'https://exp.host/--/api/v2/push/send', // test/geliştirmede sahte sunucuya yönlendirilebilir
    // Sessiz saatler (Türkiye saati, gün içinde sarar: start > end demek gece yarısını kapsar).
    quietStartHourTR: Number(env.PUSH_QUIET_START_HOUR ?? 22),
    quietEndHourTR: Number(env.PUSH_QUIET_END_HOUR ?? 9),
    // Günlük ritüel hatırlatmasının gönderildiği saat (TR).
    reminderHourTR: Number(env.DAILY_REMINDER_HOUR ?? 19),
    reminderEnabled: env.DAILY_REMINDER_ENABLED !== '0', // varsayılan açık; kapatmak için '0'
  },

  /** Mağaza içi satın alma (App Store / Google Play) makbuz doğrulaması — Stripe'tan ayrı, mobil mağaza kuralları gereği. */
  iap: {
    appleSharedSecret: env.APPLE_SHARED_SECRET ?? '', // App Store Connect → Uygulamalar → Uygulama İçi Satın Almalar → Paylaşılan Gizli Anahtar
    androidPackageName: env.ANDROID_PACKAGE_NAME ?? '', // ör. com.falnova.app
    googleServiceAccountJson: env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '', // Google Cloud servis hesabı JSON'unun tamamı, tek satır
    // Test/geliştirme için gerçek Apple/Google uç noktalarının yerini alabilir; üretimde boş bırakılır.
    appleVerifyProdUrl: env.APPLE_VERIFY_PROD_URL ?? 'https://buy.itunes.apple.com/verifyReceipt',
    appleVerifySandboxUrl: env.APPLE_VERIFY_SANDBOX_URL ?? 'https://sandbox.itunes.apple.com/verifyReceipt',
    googleTokenUrl: env.GOOGLE_TOKEN_URL ?? 'https://oauth2.googleapis.com/token',
    googlePublisherBaseUrl: env.GOOGLE_PUBLISHER_BASE_URL ?? 'https://androidpublisher.googleapis.com/androidpublisher/v3',
  },

  /** Sözcük Bulmacası: bir denemenin ödül alabilmesi için geçmesi gereken en az süre (kredi çiftliği
   *  botlarına karşı — bkz. store.ts gameFinish). Testlerde 0'a çekilerek gerçek zamanlı bekleme atlanır. */
  game: {
    minPlayMs: Number(env.GAME_MIN_PLAY_MS ?? GAME_MIN_PLAY_MS),
  },
};

export function aiStatus() {
  return {
    openai: !!config.openai.key,
    gemini: !!config.gemini.key,
    elevenlabs: !!config.eleven.key,
    payments: config.payments.provider,
    iap: { apple: !!config.iap.appleSharedSecret, google: !!config.iap.googleServiceAccountJson },
    push: { reminderEnabled: config.push.reminderEnabled },
  };
}
