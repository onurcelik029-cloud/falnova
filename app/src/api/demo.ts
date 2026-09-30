// Demo altyapısı: backend olmadan, tüm veriyi cihazda saklayarak çalışır.
// EXPO_PUBLIC_API_URL tanımlı değilse uygulama bu moda geçer.
// Backend ile aynı kuralları uygular: bekleme ritüeli, güvenlik koruması, günlük ritüel, ilk alışveriş hediyesi.

import type {
  ChatMessage, CoffeeRequest, CoupleRequest, DreamRequest, FortuneResult, IapVerifyRequest, KarmicRequest,
  PalmRequest, Profile, ReferralInfo, TarotRequest, TransactionRecord, User, VoiceTone, Wallet, ZodiacId,
} from '@/shared/types.ts';
import {
  AD_CREDIT_DAILY_LIMIT, AD_WATCH_PER_CREDIT, COSTS, FIRST_PURCHASE_BONUS, GAME_DAILY_LIMIT, GAME_MIN_PLAY_MS,
  GAME_REWARD_CREDITS, PACKAGES, REFERRAL_WELCOME_CREDITS, packageById,
} from '@/shared/packages.ts';
import { buildWordPuzzle, WORDS_TO_COMPLETE, type WordPuzzle } from '@/shared/wordgame.ts';
import { makeRng } from '@/shared/rng.ts';
import { mockCoffee, mockDream, mockHoroscope, mockNatal, mockPalm, mockTarot, type Draft } from '@/shared/mock.ts';
import { mockChatReply, mockCouple, mockKarmic } from '@/shared/mock2.ts';
import { readingDelayMs } from '@/shared/pacing.ts';
import { detectCrisis, detectSensitive, SENSITIVE_NOTE, SUPPORT_CODE, SUPPORT_MESSAGE } from '@/shared/safety.ts';
import { buildMemory } from '@/shared/memory.ts';
import { dailyStateFor, dayKeyTR, nextStreak, rewardForStreak, type DailyState } from '@/shared/daily.ts';
import { getJson, removeItem, setJson } from '@/lib/storage.ts';
import { getDemoFast } from '@/lib/pace.ts';
import { ApiError, type Api, type AskResult, type FortuneResponse, type HomeInfo, type Offers, type Session } from './types.ts';

const KEY = 'falnova.demo.v3';

/** Demo hesabına tanınan başlangıç bakiyesi (test için). Canlı backend'de hediye kredi FREE_SIGNUP_CREDITS'tir. */
const DEMO_START_CREDITS = 100;
const KARMIC_PREVIEWS_PER_DAY = 3;

/** Demoda saklanan fal: tam içerik + hazır olma zamanı. Hazır olmadan istemciye "gölge" hâli verilir. */
type StoredFortune = FortuneResult & { readyAt?: string };

interface DemoDb {
  user: User | null;
  wallet: Wallet;
  history: StoredFortune[];
  chat: ChatMessage[];
  transactions: TransactionRecord[];
  horoscopeFree: Record<string, boolean>;
  daily: Record<string, { streak: number; reward: number }>;
  /** Kayıt sırasında bir arkadaş kodu girildiyse (demoda gerçek başka kullanıcı yoktur; yalnızca hoş geldin hediyesi simüle edilir). */
  referredCode?: string;
  /** Nova'nın Sözcük Bulmacası: açık denemeler (attemptId → gerçek kelime listesi + başlangıç zamanı). */
  gameAttempts: Record<string, { words: string[]; startedAt: number }>;
  /** Gün başına oyundan kazanılan kredi sayısı (günlük tavan için). */
  gameRewards: Record<string, number>;
  /** Gün başına izlenen reklam sayısı ve bu kanaldan verilen kredi. */
  adWatchDaily: Record<string, { watched: number; creditsPaid: number }>;
}

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0/O, 1/I gibi karıştırılabilecek karakterler hariç
const genReferralCode = () => Array.from({ length: 6 }, () => REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)]).join('');

const empty = (): DemoDb => ({
  user: null,
  wallet: { credits: 0, questions: 0 },
  history: [],
  chat: [],
  transactions: [],
  horoscopeFree: {},
  daily: {},
  gameAttempts: {},
  gameRewards: {},
  adWatchDaily: {},
});

const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();

/** İstemciye giden görünüm: hazır değilse içerik gönderilmez (backend ile aynı davranış). */
function present(f: StoredFortune): FortuneResult {
  const { readyAt, ...rest } = f;
  const left = readyAt ? new Date(readyAt).getTime() - Date.now() : 0;
  if (left > 0) {
    const total = Math.max(left, new Date(readyAt!).getTime() - new Date(f.createdAt).getTime());
    return {
      id: f.id, kind: f.kind, title: f.title, summary: '', sections: [], unlocked: f.unlocked, provider: 'mock',
      createdAt: f.createdAt, pending: { readyInMs: left, totalMs: total },
    };
  }
  return rest;
}

export function createDemoApi(): Api {
  let db: DemoDb | null = null;

  const load = async (): Promise<DemoDb> => {
    if (!db) db = { ...empty(), ...(await getJson<Partial<DemoDb>>(KEY, {})) };
    return db;
  };
  const save = async () => {
    if (db) await setJson(KEY, db);
  };

  const requireUser = async () => {
    const d = await load();
    if (!d.user) throw new ApiError('UNAUTHORIZED', 'Önce giriş yapmalısın.');
    return d as DemoDb & { user: User };
  };

  const session = (d: DemoDb & { user: User }): Session => ({ user: { ...d.user }, wallet: { ...d.wallet } });

  const startUser = async (email: string, profile: Profile, refCode?: string): Promise<Session> => {
    const d = await load();
    d.user = { id: uid('usr'), email, profile, createdAt: nowIso(), referralCode: genReferralCode() }; // rıza yok: ilk AI işleminden önce istenir
    d.wallet = { credits: DEMO_START_CREDITS, questions: 0 };
    d.history = [];
    d.chat = [];
    d.daily = {};
    d.gameAttempts = {};
    d.gameRewards = {};
    d.adWatchDaily = {};
    d.referredCode = undefined;
    d.transactions = [{
      id: uid('trx'), type: 'grant', title: 'Hoş geldin hediyesi', credits: DEMO_START_CREDITS, questions: 0,
      amountTry: 0, status: 'paid', provider: 'system', createdAt: nowIso(),
    }];
    // Demoda gerçek başka kullanıcı yok; girilen kod biçimi doğruysa yalnızca hoş geldin hediyesi simüle edilir.
    const cleaned = refCode?.trim().toUpperCase();
    if (cleaned && /^[A-Z0-9]{4,10}$/.test(cleaned)) {
      d.referredCode = cleaned;
      d.wallet.credits += REFERRAL_WELCOME_CREDITS;
      d.transactions.unshift({
        id: uid('trx'), type: 'grant', title: 'Arkadaş kodu hediyesi', credits: REFERRAL_WELCOME_CREDITS, questions: 0,
        amountTry: 0, status: 'paid', provider: 'system', createdAt: nowIso(),
      });
    }
    await save();
    return session(d as DemoDb & { user: User });
  };

  const logTx = (d: DemoDb, type: TransactionRecord['type'], title: string, credits: number, questions: number, amountTry = 0, provider = 'system') => {
    const rec: TransactionRecord = { id: uid('trx'), type, title, credits, questions, amountTry, status: 'paid', provider, createdAt: nowIso() };
    d.transactions.unshift(rec);
    return rec;
  };

  const spend = async (d: DemoDb, credits: number, title: string) => {
    if (credits <= 0) return;
    if (d.wallet.credits < credits) {
      throw new ApiError('NO_CREDITS', `Bu işlem için ${credits} kredi gerekiyor. Cüzdanından kredi alabilirsin.`);
    }
    d.wallet.credits -= credits;
    logTx(d, 'spend', title, -credits, 0);
  };

  /** Kriz belirtisinde işlem yapılmaz, kredi düşmez. */
  const guard = (...texts: (string | undefined)[]) => {
    if (texts.some((t) => t && detectCrisis(t))) throw new ApiError(SUPPORT_CODE, SUPPORT_MESSAGE);
  };
  const noteFor = (...texts: (string | undefined)[]): string | null => {
    for (const t of texts) { const k = t && detectSensitive(t); if (k) return SENSITIVE_NOTE[k]; }
    return null;
  };
  const withNote = (draft: Draft, note: string | null): Draft =>
    note ? { ...draft, sections: [...draft.sections, { title: 'Küçük Bir Not', body: note }] } : draft;

  const finish = async (d: DemoDb, draft: Draft, opts: { id?: string; readyInMs?: number } = {}): Promise<FortuneResponse> => {
    const createdAt = nowIso();
    const stored: StoredFortune = {
      ...draft, id: opts.id ?? uid('frt'), createdAt,
      readyAt: opts.readyInMs && opts.readyInMs > 0 ? new Date(Date.now() + opts.readyInMs).toISOString() : undefined,
    };
    d.history.unshift(stored);
    await save();
    return { fortune: present(stored), wallet: { ...d.wallet } };
  };

  /** Bekleme süresi: hızlı demo açıkken 0. */
  const pace = async (kind: FortuneResult['kind'], deep = false) =>
    readingDelayMs(kind, { scale: (await getDemoFast()) ? 0 : 1, deep });

  const memoryOf = (d: DemoDb & { user: User }) => buildMemory(d.user.profile, d.history
    .filter((f) => !f.readyAt || new Date(f.readyAt).getTime() <= Date.now())
    .map((f) => ({ kind: f.kind, title: f.title, createdAt: f.createdAt, symbols: f.meta?.symbols, topic: f.meta?.topic })));

  const dailyOf = (d: DemoDb & { user: User }): DailyState => {
    const today = dayKeyTR();
    const days = Object.keys(d.daily).sort();
    const lastDay = days.length ? days[days.length - 1] : null;
    const last = lastDay ? { day: lastDay, streak: d.daily[lastDay].streak } : null;
    return dailyStateFor(d.user.profile, today, last, !!d.daily[today]);
  };

  return {
    mode: 'demo',

    async restore() {
      const d = await load();
      return d.user ? session(d as DemoDb & { user: User }) : null;
    },
    async register(email, _password, profile, refCode) {
      await wait(500);
      return startUser(email, profile, refCode);
    },
    async login(email) {
      await wait(500);
      const d = await load();
      if (d.user && d.user.email === email) return session(d as DemoDb & { user: User });
      throw new ApiError('NOT_FOUND', 'Demo modunda önce üye olmalısın (kayıt sekmesini kullan).');
    },
    async guest(profile, refCode) {
      await wait(300);
      return startUser('misafir@falnova.app', profile, refCode);
    },
    async logout() {
      db = null;
      await removeItem(KEY);
    },
    async deleteAccount() {
      db = null;
      await removeItem(KEY);
    },
    async recordConsent() {
      const d = await requireUser();
      d.user.consentAt = nowIso();
      await save();
      return session(d);
    },
    async revokeConsent() {
      const d = await requireUser();
      d.user.consentAt = undefined;
      await save();
      return session(d);
    },
    async registerPushToken() {
      // Demo modu backend'siz, tek cihazlık bir önizlemedir: kaydedecek bir sunucu yok, sessizce geçilir.
    },
    async unregisterPushToken() {
      // bkz. yukarısı.
    },
    async updateProfile(profile) {
      const d = await requireUser();
      d.user.profile = profile;
      await save();
      return session(d);
    },

    async coffee(req: CoffeeRequest) {
      const d = await requireUser();
      guard(req.question);
      const deep = req.depth === 'deep';
      const cost = deep ? COSTS.coffeeDeep : COSTS.coffee;
      await spend(d, cost, deep ? 'Derin Kahve Okuması' : 'Kahve Falı');
      await wait(1800);
      return finish(d, withNote(mockCoffee(req, d.user.profile), noteFor(req.question)), { readyInMs: await pace('coffee', deep) });
    },
    async tarot(req: TarotRequest) {
      const d = await requireUser();
      guard(req.question);
      await spend(d, COSTS.tarot, 'Tarot Açılımı');
      await wait(1200);
      return finish(d, withNote(mockTarot(req, d.user.profile), noteFor(req.question)), { readyInMs: await pace('tarot') });
    },
    async horoscope(sign: ZodiacId, period) {
      const d = await requireUser();
      await wait(900);
      const draft = mockHoroscope(sign, d.user.profile, undefined, period);
      const today = new Date().toDateString();
      const same = d.history.find((f) => f.kind === 'horoscope' && f.title === draft.title && new Date(f.createdAt).toDateString() === today);
      if (same) return { fortune: present(same), wallet: { ...d.wallet } };
      return finish(d, draft);
    },
    async dream(req: DreamRequest) {
      const d = await requireUser();
      guard(req.text);
      await spend(d, COSTS.dream, 'Rüya Tabiri');
      await wait(1200);
      return finish(d, withNote(mockDream(req, d.user.profile), noteFor(req.text)), { readyInMs: await pace('dream') });
    },
    async karmic(req: KarmicRequest) {
      const d = await requireUser();
      guard(req.note);
      const today = new Date().toDateString();
      const count = d.history.filter((f) => f.kind === 'karmic' && new Date(f.createdAt).toDateString() === today).length;
      if (count >= KARMIC_PREVIEWS_PER_DAY) {
        throw new ApiError('LIMIT', 'Bugünlük ücretsiz ön izleme hakkın doldu. Yarın yeniden deneyebilirsin; açtığın raporlar Geçmişim\'de duruyor.');
      }
      await wait(1200);
      return finish(d, mockKarmic(req, d.user.profile, false), { readyInMs: await pace('karmic') });
    },
    async karmicUnlock(fortuneId: string) {
      const d = await requireUser();
      const existing = d.history.find((f) => f.id === fortuneId);
      if (!existing || existing.kind !== 'karmic') throw new ApiError('NOT_FOUND', 'Rapor bulunamadı.');
      if (existing.readyAt && new Date(existing.readyAt).getTime() > Date.now()) throw new ApiError('NOT_READY', 'Rapor henüz hazır değil.');
      if (existing.unlocked) return { fortune: present(existing), wallet: { ...d.wallet } };
      await spend(d, COSTS.karmicUnlock, 'Kader Senaryosu Kilidi');
      await wait(1000);
      const full = mockKarmic({ topic: existing.meta?.topic as KarmicRequest['topic'] }, d.user.profile, true);
      const idx = d.history.findIndex((f) => f.id === fortuneId);
      const updated: StoredFortune = { ...full, id: fortuneId, createdAt: existing.createdAt };
      d.history[idx] = updated;
      await save();
      return { fortune: present(updated), wallet: { ...d.wallet } };
    },
    async couple(req: CoupleRequest) {
      const d = await requireUser();
      await spend(d, COSTS.couple, 'Partner Analizi');
      await wait(1400);
      return finish(d, mockCouple(req, d.user.profile), { readyInMs: await pace('couple') });
    },
    async natal() {
      const d = await requireUser();
      await wait(700);
      const draft = mockNatal(d.user.profile);
      const same = d.history.find((f) => f.kind === 'natal' && f.summary === draft.summary);
      if (same) return { fortune: present(same), wallet: { ...d.wallet } };
      return finish(d, draft);
    },
    async palm(req: PalmRequest) {
      const d = await requireUser();
      guard(req.question);
      await spend(d, COSTS.palm, 'El Falı');
      await wait(1600);
      return finish(d, withNote(mockPalm(req, d.user.profile), noteFor(req.question)), { readyInMs: await pace('palm') });
    },

    async chatHistory() {
      const d = await requireUser();
      return [...d.chat];
    },
    async chatAsk(text: string, opts?: { voice?: boolean; tone?: VoiceTone }): Promise<AskResult> {
      const d = await requireUser();
      guard(text); // kriz belirtisinde soru hakkı düşmez
      // Önce soru hakkı harcanır; yoksa 1 kredi = 1 soru olarak kullanılır.
      if (d.wallet.questions >= COSTS.question) { d.wallet.questions -= COSTS.question; logTx(d, 'spend', 'Falcı Sorusu', 0, -COSTS.question); }
      else if (d.wallet.credits >= COSTS.question) { d.wallet.credits -= COSTS.question; logTx(d, 'spend', 'Falcı Sorusu', -COSTS.question, 0); }
      else throw new ApiError('NO_QUESTIONS', 'Soru hakkın bitti. Cüzdandan soru paketi alabilirsin.');
      d.chat.push({ id: uid('msg'), role: 'user', text, createdAt: nowIso() });
      const turn = d.chat.filter((m) => m.role === 'user').length;
      const note = noteFor(text);
      const recentReplies = d.chat.filter((m) => m.role === 'assistant').slice(-6).map((m) => m.text);
      const body = mockChatReply(text, d.user.profile, turn, recentReplies, opts?.tone ?? 'bilge');
      const reply: ChatMessage = {
        id: uid('msg'), role: 'assistant', text: note ? `${body}\n\n${note}` : body, createdAt: nowIso(),
      };
      d.chat.push(reply);
      await save();
      return { reply, wallet: { ...d.wallet } };
    },

    async home(): Promise<HomeInfo> {
      const d = await requireUser();
      return { note: memoryOf(d).note, daily: dailyOf(d) };
    },
    async claimDaily() {
      const d = await requireUser();
      const today = dayKeyTR();
      if (d.daily[today]) return { daily: dailyOf(d), wallet: { ...d.wallet } };
      const days = Object.keys(d.daily).sort();
      const lastDay = days.length ? days[days.length - 1] : null;
      const streak = nextStreak(lastDay, lastDay ? d.daily[lastDay].streak : 0, today);
      const reward = rewardForStreak(streak);
      d.daily[today] = { streak, reward };
      if (reward > 0) { d.wallet.credits += reward; logTx(d, 'grant', `${streak} günlük seri hediyesi`, reward, 0); }
      await save();
      return { daily: { ...dailyOf(d), reward: reward || undefined }, wallet: { ...d.wallet } };
    },

    async wallet() {
      const d = await requireUser();
      return { ...d.wallet };
    },
    async offers(): Promise<Offers> {
      const d = await requireUser();
      const day = new Date().toDateString();
      const spent = d.transactions.filter((t) => t.type === 'spend' && new Date(t.createdAt).toDateString() === day).reduce((a, t) => a - t.credits, 0);
      const firstDone = d.transactions.some((t) => t.type === 'purchase' && t.status === 'paid');
      return { firstPurchaseBonus: firstDone ? 0 : FIRST_PURCHASE_BONUS, spentToday: spent };
    },
    async referral(): Promise<ReferralInfo> {
      const d = await requireUser();
      // Demo tek cihazda çalışır, gerçek arkadaş yoktur: sayılar dürüstçe sıfır gösterilir (uydurma değil).
      return { code: d.user.referralCode, invited: 0, rewarded: 0, earnedCredits: 0, usedCode: !!d.referredCode };
    },
    async packages() {
      return PACKAGES;
    },
    async checkout(packageId: string) {
      const d = await requireUser();
      const pkg = packageById(packageId);
      if (!pkg) throw new ApiError('NOT_FOUND', 'Paket bulunamadı.');
      await wait(1200);
      const first = !d.transactions.some((t) => t.type === 'purchase' && t.status === 'paid');
      if (pkg.kind === 'credit') d.wallet.credits += pkg.amount;
      else d.wallet.questions += pkg.amount;
      const transaction = logTx(d, 'purchase', pkg.title, pkg.kind === 'credit' ? pkg.amount : 0, pkg.kind === 'question' ? pkg.amount : 0, pkg.priceTry, 'demo');
      if (first) { d.wallet.credits += FIRST_PURCHASE_BONUS; logTx(d, 'grant', 'İlk alışveriş hediyesi', FIRST_PURCHASE_BONUS, 0); }
      await save();
      return { wallet: { ...d.wallet }, transaction };
    },
    async iapVerify(_req: IapVerifyRequest): Promise<{ wallet: Wallet; transaction: TransactionRecord }> {
      // Demo modu backend'siz, tek cihazlık bir önizlemedir; gerçek bir mağaza makbuzu doğrulanamaz.
      // (Zaten yalnızca native derlemede — iap.native.ts üzerinden — tetiklenebilir, demoda hiç çağrılmaz.)
      throw new ApiError('NOT_AVAILABLE', 'Mağaza içi satın alma demo önizlemesinde kullanılamaz.');
    },
    async transactions() {
      const d = await requireUser();
      return [...d.transactions];
    },

    async history() {
      const d = await requireUser();
      return d.history.map(present);
    },
    async fortune(id: string) {
      const d = await requireUser();
      const f = d.history.find((x) => x.id === id);
      return f ? present(f) : null;
    },
    async removeFortune(id: string) {
      const d = await requireUser();
      d.history = d.history.filter((f) => f.id !== id);
      await save();
    },

    async gameStart(): Promise<{ attemptId: string; puzzle: WordPuzzle }> {
      const d = await requireUser();
      const rng = makeRng('game', d.user.id, Date.now(), Math.random());
      const puzzle = buildWordPuzzle(rng);
      const attemptId = uid('gm');
      d.gameAttempts[attemptId] = { words: puzzle.words, startedAt: Date.now() };
      await save();
      return { attemptId, puzzle: { grid: puzzle.grid, words: puzzle.words } };
    },
    async gameFinish(attemptId: string, foundWords: string[]) {
      const d = await requireUser();
      const a = d.gameAttempts[attemptId];
      if (!a) throw new ApiError('NOT_FOUND', 'Böyle bir oyun denemesi bulunamadı.');
      delete d.gameAttempts[attemptId]; // tek kullanımlık
      const found = new Set(foundWords.map((w) => w.toUpperCase()));
      const complete = a.words.length >= WORDS_TO_COMPLETE && a.words.every((w) => found.has(w));
      const elapsed = Date.now() - a.startedAt;
      let rewarded = false;
      let alreadyMaxedToday = false;
      if (complete && elapsed >= GAME_MIN_PLAY_MS) {
        const today = dayKeyTR();
        const already = d.gameRewards[today] ?? 0;
        if (already >= GAME_DAILY_LIMIT) {
          alreadyMaxedToday = true;
        } else {
          d.gameRewards[today] = already + 1;
          d.wallet.credits += GAME_REWARD_CREDITS;
          logTx(d, 'grant', 'Sözcük Bulmacası ödülü', GAME_REWARD_CREDITS, 0);
          rewarded = true;
        }
      }
      await save();
      return { rewarded, alreadyMaxedToday, wallet: { ...d.wallet } };
    },
    async adWatch() {
      const d = await requireUser();
      const today = dayKeyTR();
      const cur = d.adWatchDaily[today] ?? { watched: 0, creditsPaid: 0 };
      cur.watched += 1;
      const eligible = Math.floor(cur.watched / AD_WATCH_PER_CREDIT);
      const owed = Math.min(eligible, AD_CREDIT_DAILY_LIMIT) - cur.creditsPaid;
      let rewarded = false;
      if (owed > 0) {
        cur.creditsPaid += owed;
        d.wallet.credits += owed;
        logTx(d, 'grant', 'Reklam izleme ödülü', owed, 0);
        rewarded = true;
      }
      d.adWatchDaily[today] = cur;
      const nextCreditIn = cur.creditsPaid >= AD_CREDIT_DAILY_LIMIT ? 0 : AD_WATCH_PER_CREDIT - (cur.watched % AD_WATCH_PER_CREDIT || AD_WATCH_PER_CREDIT);
      await save();
      return { watched: cur.watched, rewarded, nextCreditIn, wallet: { ...d.wallet } };
    },
  };
}
