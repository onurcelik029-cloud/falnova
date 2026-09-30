import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatabaseSync } from 'node:sqlite';
import { PACKAGES, COSTS, FIRST_PURCHASE_BONUS, packageById } from '../../app/src/shared/packages.ts';
import { mockHoroscope, mockNatal } from '../../app/src/shared/mock.ts';
import type { FortuneResult, ZodiacId } from '../../app/src/shared/types.ts';
import { READY_TITLE, readingDelayMs } from '../../app/src/shared/pacing.ts';
import { detectCrisis, detectSensitive, SENSITIVE_NOTE, SUPPORT_CODE, SUPPORT_MESSAGE } from '../../app/src/shared/safety.ts';
import { buildMemory } from '../../app/src/shared/memory.ts';
import { dailyStateFor, dayKeyTR, type DailyState } from '../../app/src/shared/daily.ts';
import { ZODIAC } from '../../app/src/shared/zodiac.ts';
import { aiStatus, config } from './config.ts';
import { tx } from './db.ts';
import { HttpError, badRequest, notFound, unauthorized } from './errors.ts';
import { createStore } from './store.ts';
import { createAdminStore } from './admin.ts';
import {
  hashPassword, rateLimit, requireAdmin, requireAuth as verifyBearer, signAdminToken, signToken, verifyPassword,
  type AuthedRequest,
} from './auth.ts';
import * as V from './validate.ts';
import * as AI from './ai/index.ts';
import { handleStripeEvent, startCheckout, verifyIapPurchase, verifyStripeSignature } from './payments.ts';
import { sendPush } from './push.ts';

type Handler = (req: AuthedRequest, res: Response) => Promise<void> | void;
const wrap = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req as AuthedRequest, res)).catch(next);
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(db: DatabaseSync) {
  const store = createStore(db);
  const adminStore = createAdminStore(db);

  /** Token imzası geçerli olsa bile hesabı silinmiş kullanıcı içeri alınmaz. */
  const requireAuth: typeof verifyBearer = (req, res, next) => verifyBearer(req, res, (err?: unknown) => {
    if (err) return next(err as Error);
    return store.getUser((req as AuthedRequest).userId) ? next() : next(unauthorized());
  });
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(cors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins }));
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });

  // Stripe webhook ham gövde ister; JSON parser'dan ÖNCE tanımlanır.
  app.post('/webhooks/stripe', express.raw({ type: '*/*', limit: '1mb' }), (req, res) => {
    const raw = (req.body as Buffer).toString('utf8');
    if (!verifyStripeSignature(raw, req.headers['stripe-signature'] as string | undefined, config.payments.stripeWebhookSecret)) {
      res.status(400).json({ error: { code: 'BAD_SIGNATURE', message: 'İmza geçersiz.' } });
      return;
    }
    try {
      handleStripeEvent(store, JSON.parse(raw));
      res.json({ received: true });
    } catch {
      res.status(500).json({ error: { code: 'WEBHOOK_ERROR', message: 'İşlenemedi.' } });
    }
  });

  app.use(express.json({ limit: '22mb' }));
  app.use('/audio', express.static(config.audioDir, { maxAge: '1h', index: false }));

  app.get('/health', (_req, res) => { res.json({ ok: true, ai: aiStatus(), time: new Date().toISOString() }); });

  const api = express.Router();
  const authLimit = rateLimit(config.authRatePerMin, 60_000);
  const aiLimit = rateLimit(30, 60_000);

  const session = (uid: string) => ({ user: store.getUser(uid)!, wallet: store.wallet(uid) });

  /** Nova'nın hafızası: kayıtlı gerçek geçmişten türetilir (odak konusu + son okumalar). */
  const memoryOf = (uid: string) => buildMemory(store.getUser(uid)!.profile, store.recentForMemory(uid));

  /** Kriz belirtisi içeren metinde işlem yapılmaz ve kredi düşmez; destek mesajı döner. */
  const guard = (...texts: (string | undefined)[]) => {
    if (texts.some((t) => t && detectCrisis(t))) throw new HttpError(422, SUPPORT_CODE, SUPPORT_MESSAGE);
  };
  /** Sağlık/ölüm/finans gibi fal dışı konularda yumuşak not. */
  const noteFor = (...texts: (string | undefined)[]): string | null => {
    for (const t of texts) { const k = t && detectSensitive(t); if (k) return SENSITIVE_NOTE[k]; }
    return null;
  };
  const withNote = <T extends { sections: { title: string; body: string }[] }>(d: T, note: string | null): T =>
    note ? { ...d, sections: [...d.sections, { title: 'Küçük Bir Not', body: note }] } : d;
  const pace = (kind: FortuneResult['kind'], deep = false) => readingDelayMs(kind, { scale: config.readingDelayScale, deep });

  // ───────── Kimlik ─────────
  api.post('/auth/register', authLimit, wrap((req, res) => {
    const { email, password } = V.parseCredentials(req.body ?? {});
    const profile = V.parseProfile(req.body?.profile);
    const refCode = V.parseRefCode(req.body?.refCode);
    if (store.getUserAuth(email)) throw new HttpError(409, 'EMAIL_TAKEN', 'Bu e-posta ile zaten bir hesap var.');
    const user = store.createUser(email, hashPassword(password), profile, false, refCode);
    res.status(201).json({ token: signToken(user.id), ...session(user.id) });
  }));

  api.post('/auth/login', authLimit, wrap((req, res) => {
    const { email, password } = V.parseCredentials(req.body ?? {});
    const u = store.getUserAuth(email);
    if (!u || !verifyPassword(password, u.passwordHash)) throw new HttpError(401, 'BAD_CREDENTIALS', 'E-posta ya da şifre hatalı.');
    res.json({ token: signToken(u.id), ...session(u.id) });
  }));

  api.post('/auth/guest', authLimit, wrap((req, res) => {
    const profile = V.parseProfile(req.body?.profile);
    const refCode = V.parseRefCode(req.body?.refCode);
    const user = store.createUser(`guest_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}@guest.falnova.app`, null, profile, true, refCode);
    res.status(201).json({ token: signToken(user.id), ...session(user.id) });
  }));

  api.get('/me', requireAuth, wrap((req, res) => { res.json(session(req.userId)); }));
  api.put('/me/profile', requireAuth, wrap((req, res) => {
    store.updateProfile(req.userId, V.parseProfile(req.body?.profile));
    res.json(session(req.userId));
  }));

  // Açık rıza: yurt dışındaki hizmet sağlayıcılara aktarım ve yapay zekâ ile işleme için. Verilmeden AI uçları çalışmaz.
  api.post('/me/consent', requireAuth, wrap((req, res) => {
    const version = typeof req.body?.version === 'string' && req.body.version.length <= 40 ? req.body.version : 'v1';
    store.setConsent(req.userId, version);
    res.json(session(req.userId));
  }));
  api.delete('/me/consent', requireAuth, wrap((req, res) => {
    store.setConsent(req.userId, null);
    res.json(session(req.userId));
  }));

  api.delete('/me', requireAuth, wrap((req, res) => {
    if (!store.deleteUser(req.userId)) throw notFound('Hesap bulunamadı.');
    res.json({ ok: true });
  }));

  // Arkadaşını Davet Et: gerçek paylaşım kodu; ödül yalnızca davet edilenin ilk (gerçek) alışverişinde verilir.
  api.get('/me/referral', requireAuth, wrap((req, res) => { res.json(store.referralInfo(req.userId)); }));

  // Expo Push jetonu: "okuma hazır" ve günlük ritüel hatırlatması için. Kayıt isteğe bağlıdır — jeton yoksa
  // bildirim gönderilmez, uygulama akışı bundan hiç etkilenmez (bkz. push.ts).
  api.post('/me/push-token', requireAuth, wrap((req, res) => {
    const { token, platform } = V.parsePushToken(req.body);
    store.savePushToken(req.userId, token, platform);
    res.json({ ok: true });
  }));
  api.delete('/me/push-token', requireAuth, wrap((req, res) => {
    const token = V.text(req.body?.token, 'Jeton', 8, 400);
    store.removePushToken(token);
    res.json({ ok: true });
  }));

  // ───────── Fallar ─────────
  /** Açık rıza olmadan yapay zekâ destekli uçlar çalışmaz. */
  function needConsent(req: Request, _res: Response, next: NextFunction) {
    const u = store.getUser((req as AuthedRequest).userId);
    if (!u?.consentAt) return next(new HttpError(403, 'CONSENT_REQUIRED', 'Devam etmek için açık rıza onayı gerekiyor.'));
    next();
  }
  const F = express.Router();
  F.use(requireAuth, aiLimit);
  // Yeni okuma üretimi rıza ister; geçmişi görme, silme ve daha önce üretilmiş raporun kilidini açma istemez.
  F.use((req, res, next) => (req.method === 'POST' && !req.path.endsWith('/unlock') ? needConsent(req, res, next) : next()));

  /** Krediyi önce düşer, üretim başarısız olursa iade eder. */
  async function paid(uid: string, cost: number, title: string, make: () => Promise<FortuneResult>): Promise<FortuneResult> {
    store.spendCredits(uid, cost, title);
    try {
      return await make();
    } catch (e) {
      if (cost > 0) store.refund(uid, cost, 0, title);
      throw e;
    }
  }
  const profileOf = (uid: string) => ({ ...store.getUser(uid)!.profile, memo: memoryOf(uid).promptLine || undefined });
  const out = (res: Response, fortune: FortuneResult, uid: string) => {
    res.json({ fortune, wallet: store.wallet(uid) });
    // Bekleme ritüeli varsa (yeni üretilen okuma): istemcideki yerel bildirime ek olarak, uygulama kapatılmış
    // olsa bile ulaşsın diye sunucudan da bir push planlanır (jeton kayıtlıysa). Zaten hazır bir fal için
    // (önbellekten dönen burç/doğum haritası) readyInMs 0 olduğundan hiçbir şey planlanmaz.
    const ms = fortune.pending?.readyInMs ?? 0;
    if (ms > 0) {
      // unref(): bu zamanlayıcı süreci/testleri canlı tutmasın — sunucu kapanırsa bildirim de sessizce
      // kaybolur (tek sunuculu basit bir best-effort katman; kalıcı bir iş kuyruğu değildir).
      setTimeout(() => {
        sendPush(store, uid, {
          title: READY_TITLE[fortune.kind] ?? 'Yorumun hazır',
          body: 'Yorumun hazır. Açmak için dokun.',
          data: { kind: fortune.kind, fortuneId: fortune.id },
        }).catch(() => undefined);
      }, ms).unref();
    }
  };

  F.post('/coffee', wrap(async (req, res) => {
    const body = V.parseCoffee(req.body);
    guard(body.question);
    const deep = body.depth === 'deep';
    const cost = deep ? COSTS.coffeeDeep : COSTS.coffee;
    const f = await paid(req.userId, cost, deep ? 'Derin Kahve Okuması' : 'Kahve Falı', async () =>
      store.saveFortune(req.userId, withNote(await AI.coffee(body, profileOf(req.userId)), noteFor(body.question)), { cost, readyInMs: pace('coffee', deep) }));
    out(res, f, req.userId);
  }));

  F.post('/tarot', wrap(async (req, res) => {
    const body = V.parseTarot(req.body);
    guard(body.question);
    const f = await paid(req.userId, COSTS.tarot, 'Tarot Açılımı', async () =>
      store.saveFortune(req.userId, withNote(await AI.tarot(body, profileOf(req.userId)), noteFor(body.question)), { cost: COSTS.tarot, readyInMs: pace('tarot') }));
    out(res, f, req.userId);
  }));

  F.post('/horoscope', wrap(async (req, res) => {
    const sign = String(req.body?.sign ?? '') as ZodiacId;
    if (!ZODIAC.some((z) => z.id === sign)) throw badRequest('Geçersiz burç.');
    const period = req.body?.period === 'weekly' ? 'weekly' : 'daily';
    const profile = profileOf(req.userId);
    const title = mockHoroscope(sign, profile, undefined, period).title; // başlık deterministik; günlük önbellek anahtarı
    const cached = store.todaysHoroscope(req.userId, title);
    if (cached) return out(res, cached, req.userId);
    out(res, store.saveFortune(req.userId, await AI.horoscope(sign, profile, period)), req.userId);
  }));

  F.post('/natal', wrap(async (req, res) => {
    const profile = profileOf(req.userId);
    const summary = mockNatal(profile).summary; // Güneş/Ay/Yükselen değişmediği sürece deterministik önbellek anahtarı
    const cached = store.latestNatal(req.userId, summary);
    if (cached) return out(res, cached, req.userId);
    out(res, store.saveFortune(req.userId, await AI.natal(profile)), req.userId);
  }));

  F.post('/palm', wrap(async (req, res) => {
    const body = V.parsePalm(req.body);
    guard(body.question);
    const f = await paid(req.userId, COSTS.palm, 'El Falı', async () =>
      store.saveFortune(req.userId, withNote(await AI.palm(body, profileOf(req.userId)), noteFor(body.question)), { cost: COSTS.palm, readyInMs: pace('palm') }));
    out(res, f, req.userId);
  }));

  F.post('/dream', wrap(async (req, res) => {
    const body = V.parseDream(req.body);
    guard(body.text);
    const f = await paid(req.userId, COSTS.dream, 'Rüya Tabiri', async () =>
      store.saveFortune(req.userId, withNote(await AI.dream(body, profileOf(req.userId)), noteFor(body.text)), { cost: COSTS.dream, readyInMs: pace('dream') }));
    out(res, f, req.userId);
  }));

  // Karmik Dönemeç: önizleme ücretsiz; kilitli bölümler sunucuda saklanır, ödemeden istemciye gitmez.
  const KARMIC_PREVIEWS_PER_DAY = 3;
  F.post('/karmic', wrap(async (req, res) => {
    const body = V.parseKarmic(req.body);
    guard(body.note);
    // Önizleme ücretsiz olduğundan (yapay zekâ maliyeti bize ait) günlük sınır uygulanır.
    if (store.karmicPreviewsToday(req.userId) >= KARMIC_PREVIEWS_PER_DAY) {
      throw new HttpError(429, 'LIMIT', 'Bugünlük ücretsiz ön izleme hakkın doldu. Yarın yeniden deneyebilirsin; açtığın raporlar Geçmişim\'de duruyor.');
    }
    const draft = await AI.karmic(body, profileOf(req.userId));
    out(res, store.saveFortune(req.userId, draft, { unlocked: false, readyInMs: pace('karmic') }), req.userId);
  }));

  F.post('/karmic/:id/unlock', wrap((req, res) => {
    const fid = String(req.params.id);
    const f = tx(db, () => {
      const row = store.rawFortuneRow(req.userId, fid);
      if (!row || row.kind !== 'karmic') throw notFound('Rapor bulunamadı.');
      if (row.ready_at && new Date(row.ready_at).getTime() > Date.now()) throw new HttpError(409, 'NOT_READY', 'Rapor henüz hazır değil.');
      if (!row.unlocked) {
        store.spendCredits(req.userId, COSTS.karmicUnlock, 'Kader Senaryosu Kilidi');
        store.unlockFortune(req.userId, fid);
      }
      return store.getFortune(req.userId, fid)!;
    });
    out(res, f, req.userId);
  }));

  F.post('/couple', wrap(async (req, res) => {
    const body = V.parseCouple(req.body);
    const partnerId = store.savePartner(req.userId, body.partner);
    const f = await paid(req.userId, COSTS.couple, 'Partner Analizi', async () =>
      store.saveFortune(req.userId, await AI.couple(body, profileOf(req.userId)), { cost: COSTS.couple, partnerId, readyInMs: pace('couple') }));
    out(res, f, req.userId);
  }));

  F.get('/', wrap((req, res) => { res.json({ fortunes: store.listFortunes(req.userId) }); }));
  F.get('/:id', wrap((req, res) => {
    const f = store.getFortune(req.userId, String(req.params.id));
    if (!f) throw notFound('Fal bulunamadı.');
    res.json({ fortune: f });
  }));
  F.delete('/:id', wrap((req, res) => {
    if (!store.deleteFortune(req.userId, String(req.params.id))) throw notFound('Fal bulunamadı.');
    res.json({ ok: true });
  }));
  api.use('/fortunes', F);

  // ───────── Soru-Cevap Odası + Sesli Falcı ─────────
  api.get('/chat', requireAuth, wrap((req, res) => { res.json({ messages: store.chat(req.userId) }); }));
  api.post('/chat', requireAuth, aiLimit, needConsent, wrap(async (req, res) => {
    const { text, voice, tone } = V.parseChat(req.body);
    const uid = req.userId;
    guard(text); // kriz belirtisinde soru hakkı düşmez, destek mesajı gösterilir
    const spent = store.spendQuestion(uid, voice ? 'Sesli Falcı' : 'Falcı Sorusu');
    try {
      const history = store.chat(uid, 12).map((m) => ({ role: m.role, text: m.text }));
      const turn = history.filter((m) => m.role === 'user').length + 1;
      const r = await AI.chatReply(history, text, profileOf(uid), voice, turn, tone);
      const note = noteFor(text);
      store.addChat(uid, 'user', text);
      const reply = store.addChat(uid, 'assistant', note ? `${r.text}\n\n${note}` : r.text);
      const audioUrl = voice ? await AI.speech(r.text, tone) : undefined;
      res.json({ reply, wallet: store.wallet(uid), audioUrl });
    } catch (e) {
      store.refund(uid, spent === 'credit' ? 1 : 0, spent === 'question' ? 1 : 0, voice ? 'Sesli Falcı' : 'Falcı Sorusu');
      throw e;
    }
  }));

  // ───────── Ana sayfa: Nova'nın notu + günlük ritüel ─────────
  const dailyOf = (uid: string): DailyState => {
    const today = dayKeyTR();
    const claimed = store.dailyClaimedToday(uid, today);
    return dailyStateFor(store.getUser(uid)!.profile, today, claimed ? { day: today, streak: claimed.streak } : store.dailyLast(uid), !!claimed);
  };
  api.get('/home', requireAuth, wrap((req, res) => { res.json({ note: memoryOf(req.userId).note, daily: dailyOf(req.userId) }); }));
  api.post('/daily/claim', requireAuth, wrap((req, res) => {
    const r = store.dailyClaim(req.userId, dayKeyTR());
    res.json({ daily: { ...dailyOf(req.userId), reward: r.already ? undefined : r.reward || undefined }, wallet: store.wallet(req.userId) });
  }));

  // ───────── Cüzdan ─────────
  api.get('/wallet', requireAuth, wrap((req, res) => { res.json({ wallet: store.wallet(req.userId) }); }));
  api.get('/wallet/packages', wrap((_req, res) => { res.json({ packages: PACKAGES }); }));
  api.get('/wallet/offers', requireAuth, wrap((req, res) => {
    res.json({ firstPurchaseBonus: store.paidPurchaseCount(req.userId) === 0 ? FIRST_PURCHASE_BONUS : 0, spentToday: store.spentToday(req.userId) });
  }));
  api.get('/wallet/transactions', requireAuth, wrap((req, res) => { res.json({ transactions: store.transactions(req.userId) }); }));
  api.post('/wallet/checkout', requireAuth, rateLimit(10, 60_000), wrap(async (req, res) => {
    const pkg = packageById(String(req.body?.packageId ?? ''));
    if (!pkg) throw notFound('Paket bulunamadı.');
    const r = await startCheckout(store, req.userId, pkg);
    res.json({ transaction: r.transaction, wallet: store.wallet(req.userId), checkoutUrl: r.checkoutUrl });
  }));
  // Mağaza içi satın alma (App Store / Google Play): makbuz Apple/Google'a doğrulatılır, sonra bakiye yüklenir.
  // APPLE_SHARED_SECRET / GOOGLE_SERVICE_ACCOUNT_JSON tanımlı değilse 501 NOT_CONFIGURED döner (bkz. payments.ts).
  api.post('/wallet/iap/verify', requireAuth, rateLimit(10, 60_000), wrap(async (req, res) => {
    const body = V.parseIapVerify(req.body);
    const pkg = packageById(body.packageId);
    if (!pkg) throw notFound('Paket bulunamadı.');
    const tx = await verifyIapPurchase(store, req.userId, body, pkg);
    res.json({ transaction: tx, wallet: store.wallet(req.userId) });
  }));

  // ───────── Nova'nın Sözcük Bulmacası (oyunla kredi kazanma) ─────────
  api.post('/game/start', requireAuth, rateLimit(20, 60_000), wrap((req, res) => {
    res.json(store.gameStart(req.userId));
  }));
  api.post('/game/finish', requireAuth, rateLimit(20, 60_000), wrap((req, res) => {
    const { attemptId, foundWords } = V.parseGameFinish(req.body);
    const r = store.gameFinish(req.userId, attemptId, foundWords);
    res.json({ ...r, wallet: store.wallet(req.userId) });
  }));

  // ───────── Reklam izleyerek kredi kazanma ─────────
  // Gerçek reklam SDK'sı (AdMob rewarded video vb.) istemci tarafında entegre edilene kadar bu uç nokta
  // istemcinin "bir reklam gösterildi" bildirimine güvenir; asıl kötüye kullanım koruması günlük tavandır.
  api.post('/ads/watch', requireAuth, rateLimit(30, 60_000), wrap((req, res) => {
    const r = store.adWatch(req.userId);
    res.json({ ...r, wallet: store.wallet(req.userId) });
  }));

  // ───────── Yönetici paneli ─────────
  // Kullanıcı hesap sisteminden tamamen ayrı: kendi e-posta/şifresi, kendi token türü, kendi arayüzü.
  // Panel dosyaları statik olarak /admin altında sunulur; veri uçları /api/admin altında ayrı bir router'dadır.
  const adminLimit = rateLimit(10, 60_000);
  const adminApi = express.Router();

  adminApi.post('/login', adminLimit, wrap((req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const configured = !!config.admin.email && !!config.admin.passwordHash;
    if (!configured || email !== config.admin.email || !verifyPassword(password, config.admin.passwordHash)) {
      throw new HttpError(401, 'BAD_CREDENTIALS', 'E-posta ya da şifre hatalı.');
    }
    res.json({ token: signAdminToken(email) });
  }));

  adminApi.use(requireAdmin);

  adminApi.get('/stats', wrap((_req, res) => {
    const s = adminStore.stats();
    const status = aiStatus();
    res.json({ ...s, ai: { openai: status.openai, gemini: status.gemini, elevenlabs: status.elevenlabs, payments: status.payments } });
  }));

  adminApi.get('/users', wrap((req, res) => {
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.pageSize ?? 50) || 50;
    const query = typeof req.query.query === 'string' ? req.query.query : undefined;
    res.json(adminStore.listUsers({ page, pageSize, query }));
  }));

  adminApi.get('/users/:id', wrap((req, res) => {
    const u = adminStore.userDetail(String(req.params.id));
    if (!u) throw notFound('Kullanıcı bulunamadı.');
    res.json({ user: u });
  }));

  adminApi.get('/transactions', wrap((req, res) => {
    const page = Number(req.query.page ?? 1) || 1;
    const pageSize = Number(req.query.pageSize ?? 50) || 50;
    const type = typeof req.query.type === 'string' && req.query.type ? req.query.type : undefined;
    const status = typeof req.query.status === 'string' && req.query.status ? req.query.status : undefined;
    res.json(adminStore.listTransactions({ page, pageSize, type, status }));
  }));

  app.use('/api/admin', adminApi);
  app.use('/admin', express.static(path.join(__dirname, 'admin-panel')));

  app.use('/api', api);
  app.use('/api', (_req, _res, next) => next(notFound('Uç nokta bulunamadı.')));

  // ───────── Hata yönetimi ─────────
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as { status?: number; statusCode?: number; code?: string; message?: string; type?: string };
    if (err instanceof HttpError || e.code === 'RATE_LIMIT') {
      res.status(e.status ?? 400).json({ error: { code: e.code, message: e.message } });
    } else if (e.type === 'entity.too.large' || e.status === 413) {
      res.status(413).json({ error: { code: 'TOO_LARGE', message: 'İstek çok büyük.' } });
    } else if (e.type === 'entity.parse.failed') {
      res.status(400).json({ error: { code: 'VALIDATION', message: 'Geçersiz JSON.' } });
    } else {
      console.error('[hata]', err);
      res.status(500).json({ error: { code: 'INTERNAL', message: 'Beklenmeyen bir hata oluştu.' } });
    }
  });

  return app;
}
