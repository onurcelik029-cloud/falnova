// Veri erişim katmanı: kullanıcı, cüzdan, fal defteri, sohbet.
import type { DatabaseSync } from 'node:sqlite';
import type {
  ChatMessage, FortuneResult, KarmicTopicId, PartnerInfo, Profile, ReferralInfo, TransactionRecord, User, Wallet, ZodiacId,
} from '../../app/src/shared/types.ts';
import {
  AD_CREDIT_DAILY_LIMIT, AD_WATCH_PER_CREDIT, FIRST_PURCHASE_BONUS, FREE_SIGNUP_CREDITS,
  GAME_DAILY_LIMIT, GAME_REWARD_CREDITS, REFERRAL_REWARD_CREDITS, REFERRAL_WELCOME_CREDITS,
} from '../../app/src/shared/packages.ts';
import { nextStreak, rewardForStreak } from '../../app/src/shared/daily.ts';
import type { MemoryFortune } from '../../app/src/shared/memory.ts';
import type { Draft } from '../../app/src/shared/mock.ts';
import { buildWordPuzzle, WORDS_TO_COMPLETE, type WordPuzzle } from '../../app/src/shared/wordgame.ts';
import { makeRng } from '../../app/src/shared/rng.ts';
import { id, now, tx } from './db.ts';
import { config } from './config.ts';
import { badRequest } from './errors.ts';
import { noCredits, noQuestions } from './errors.ts';

type Row = Record<string, any>;

export function createStore(db: DatabaseSync) {
  // ── Kullanıcı ──
  const toUser = (r: Row): User => ({
    id: r.id,
    email: r.email,
    createdAt: r.created_at,
    consentAt: r.consent_at ?? undefined,
    referralCode: r.referral_code,
    profile: {
      name: r.name, birthDate: r.birth_date, birthTime: r.birth_time ?? undefined,
      birthPlace: r.birth_place ?? undefined, sign: r.sign as ZodiacId, focus: (r.focus ?? undefined) as KarmicTopicId | undefined,
    },
  });

  // ── Arkadaşını Davet Et ──
  const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0/O, 1/I gibi karıştırılabilecek karakterler hariç
  const genReferralCode = (): string => Array.from({ length: 6 }, () => REF_ALPHABET[Math.floor(Math.random() * REF_ALPHABET.length)]).join('');
  function uniqueReferralCode(): string {
    for (let i = 0; i < 25; i++) {
      const c = genReferralCode();
      if (!db.prepare('SELECT 1 FROM users WHERE referral_code=?').get(c)) return c;
    }
    return `${genReferralCode()}${Date.now().toString(36).slice(-3).toUpperCase()}`;
  }
  /** Davet edilenin ilk (ödenmiş) alışverişinde davet edeni ödüllendirir; her davet edilen için yalnızca bir kez. */
  function rewardReferrerIfAny(referredId: string) {
    const r = db.prepare('SELECT referrer_id FROM referrals WHERE referred_id=? AND rewarded_at IS NULL').get(referredId) as Row | undefined;
    if (!r) return;
    db.prepare('UPDATE referrals SET rewarded_at=? WHERE referred_id=?').run(now(), referredId);
    db.prepare('UPDATE credits SET credits = credits + ?, updated_at=? WHERE user_id=?').run(REFERRAL_REWARD_CREDITS, now(), r.referrer_id);
    logTx(r.referrer_id, 'grant', 'Arkadaşını getirdin hediyesi', REFERRAL_REWARD_CREDITS, 0);
  }
  function referralInfo(uid: string): ReferralInfo {
    const u = getUser(uid)!;
    const rows = db.prepare('SELECT rewarded_at FROM referrals WHERE referrer_id=?').all(uid) as Row[];
    const rewarded = rows.filter((r) => !!r.rewarded_at).length;
    const usedCode = !!db.prepare('SELECT 1 FROM referrals WHERE referred_id=?').get(uid);
    return { code: u.referralCode, invited: rows.length, rewarded, earnedCredits: rewarded * REFERRAL_REWARD_CREDITS, usedCode };
  }

  function createUser(email: string, passwordHash: string | null, profile: Profile, isGuest: boolean, refCode?: string): User {
    const uid = id('usr');
    return tx(db, () => {
      const code = uniqueReferralCode();
      db.prepare(`INSERT INTO users (id,email,password_hash,name,birth_date,birth_time,birth_place,sign,focus,is_guest,referral_code,created_at)
                  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
        .run(uid, email, passwordHash, profile.name, profile.birthDate, profile.birthTime ?? null, profile.birthPlace ?? null, profile.sign, profile.focus ?? null, isGuest ? 1 : 0, code, now());
      db.prepare('INSERT INTO credits (user_id, credits, questions, updated_at) VALUES (?,?,?,?)').run(uid, FREE_SIGNUP_CREDITS, 0, now());
      db.prepare(`INSERT INTO transactions (id,user_id,type,title,credits,questions,amount_try,status,provider,created_at)
                  VALUES (?,?,?,?,?,?,?,?,?,?)`).run(id('trx'), uid, 'grant', 'Hoş geldin hediyesi', FREE_SIGNUP_CREDITS, 0, 0, 'paid', 'system', now());
      if (refCode) {
        const referrer = db.prepare('SELECT id FROM users WHERE referral_code=?').get(refCode.toUpperCase()) as Row | undefined;
        if (referrer && referrer.id !== uid) {
          db.prepare('INSERT INTO referrals (referred_id, referrer_id, created_at) VALUES (?,?,?)').run(uid, referrer.id, now());
          db.prepare('UPDATE credits SET credits = credits + ?, updated_at=? WHERE user_id=?').run(REFERRAL_WELCOME_CREDITS, now(), uid);
          logTx(uid, 'grant', 'Arkadaş kodu hediyesi', REFERRAL_WELCOME_CREDITS, 0);
        }
      }
      return toUser(db.prepare('SELECT * FROM users WHERE id=?').get(uid) as Row);
    });
  }

  /** Açık rıza kaydı (zaman + metin sürümü). null verilirse rıza geri alınır. */
  function setConsent(uid: string, version: string | null): User {
    db.prepare('UPDATE users SET consent_at=?, consent_version=? WHERE id=?').run(version ? now() : null, version, uid);
    return getUser(uid)!;
  }

  const getUser = (uid: string): User | null => {
    const r = db.prepare('SELECT * FROM users WHERE id=?').get(uid) as Row | undefined;
    return r ? toUser(r) : null;
  };

  const getUserAuth = (email: string): (User & { passwordHash: string | null }) | null => {
    const r = db.prepare('SELECT * FROM users WHERE email=?').get(email) as Row | undefined;
    return r ? { ...toUser(r), passwordHash: r.password_hash } : null;
  };

  function updateProfile(uid: string, p: Profile): User {
    db.prepare('UPDATE users SET name=?, birth_date=?, birth_time=?, birth_place=?, sign=?, focus=? WHERE id=?')
      .run(p.name, p.birthDate, p.birthTime ?? null, p.birthPlace ?? null, p.sign, p.focus ?? null, uid);
    return getUser(uid)!;
  }

  // ── Cüzdan ──
  function wallet(uid: string): Wallet {
    const r = db.prepare('SELECT credits, questions FROM credits WHERE user_id=?').get(uid) as Row | undefined;
    return { credits: r?.credits ?? 0, questions: r?.questions ?? 0 };
  }

  const logTx = (uid: string, type: string, title: string, credits: number, questions: number, extra: Partial<{ amountTry: number; status: string; provider: string; providerRef: string | null; packageId: string | null }> = {}): TransactionRecord => {
    const rec: TransactionRecord = {
      id: id('trx'), type: type as never, title, credits, questions, amountTry: extra.amountTry ?? 0,
      status: (extra.status ?? 'paid') as never, provider: extra.provider ?? 'system', createdAt: now(),
    };
    db.prepare(`INSERT INTO transactions (id,user_id,type,title,credits,questions,amount_try,status,provider,provider_ref,package_id,created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(rec.id, uid, type, title, credits, questions, rec.amountTry, rec.status, rec.provider, extra.providerRef ?? null, extra.packageId ?? null, rec.createdAt);
    return rec;
  };

  /** Kredi harcar (atomik). Yetersizse noCredits fırlatır. */
  function spendCredits(uid: string, amount: number, title: string) {
    if (amount <= 0) return;
    tx(db, () => {
      const res = db.prepare('UPDATE credits SET credits = credits - ?, updated_at=? WHERE user_id=? AND credits >= ?').run(amount, now(), uid, amount);
      if (Number(res.changes) === 0) throw noCredits(amount);
      logTx(uid, 'spend', title, -amount, 0);
    });
  }

  /** Bir soru harcar: önce soru hakkı, yoksa 1 kredi. */
  function spendQuestion(uid: string, title: string): 'question' | 'credit' {
    return tx(db, () => {
      const q = db.prepare('UPDATE credits SET questions = questions - 1, updated_at=? WHERE user_id=? AND questions >= 1').run(now(), uid);
      if (Number(q.changes) > 0) { logTx(uid, 'spend', title, 0, -1); return 'question' as const; }
      const c = db.prepare('UPDATE credits SET credits = credits - 1, updated_at=? WHERE user_id=? AND credits >= 1').run(now(), uid);
      if (Number(c.changes) > 0) { logTx(uid, 'spend', title, -1, 0); return 'credit' as const; }
      throw noQuestions();
    });
  }

  function refund(uid: string, credits: number, questions: number, title: string) {
    tx(db, () => {
      db.prepare('UPDATE credits SET credits = credits + ?, questions = questions + ?, updated_at=? WHERE user_id=?').run(credits, questions, now(), uid);
      logTx(uid, 'refund', `İade: ${title}`, credits, questions);
    });
  }

  /** Ödeme onaylandığında bakiyeyi yükler. providerRef tekrarına karşı idempotent. */
  function creditPurchase(uid: string, pkg: { id: string; title: string; kind: 'credit' | 'question'; amount: number; priceTry: number }, provider: string, providerRef: string | null): TransactionRecord {
    return tx(db, () => {
      if (providerRef) {
        const dup = db.prepare('SELECT * FROM transactions WHERE provider=? AND provider_ref=? AND status=?').get(provider, providerRef, 'paid') as Row | undefined;
        if (dup) return rowToTx(dup);
        // bekleyen kayıt varsa onu tamamla
        const pending = db.prepare('SELECT * FROM transactions WHERE provider=? AND provider_ref=? AND status=?').get(provider, providerRef, 'pending') as Row | undefined;
        if (pending) db.prepare('DELETE FROM transactions WHERE id=?').run(pending.id);
      }
      const first = paidPurchaseCount(uid) === 0;
      const c = pkg.kind === 'credit' ? pkg.amount : 0;
      const q = pkg.kind === 'question' ? pkg.amount : 0;
      db.prepare('UPDATE credits SET credits = credits + ?, questions = questions + ?, updated_at=? WHERE user_id=?').run(c, q, now(), uid);
      const rec = logTx(uid, 'purchase', pkg.title, c, q, { amountTry: pkg.priceTry, provider, providerRef, packageId: pkg.id });
      if (first) {
        // İlk alışveriş hediyesi: gerçek ve ayrı bir kayıt olarak cüzdana işlenir.
        db.prepare('UPDATE credits SET credits = credits + ?, updated_at=? WHERE user_id=?').run(FIRST_PURCHASE_BONUS, now(), uid);
        logTx(uid, 'grant', 'İlk alışveriş hediyesi', FIRST_PURCHASE_BONUS, 0);
        rewardReferrerIfAny(uid);
      }
      return rec;
    });
  }

  /** Tamamlanmış (ödenmiş) satın alma sayısı. */
  const paidPurchaseCount = (uid: string): number =>
    Number((db.prepare("SELECT COUNT(*) AS n FROM transactions WHERE user_id=? AND type='purchase' AND status='paid'").get(uid) as Row).n);

  /** Bugün (UTC gün) harcanan toplam kredi. Yumuşak mola hatırlatması için. */
  const spentToday = (uid: string): number => {
    const day = now().slice(0, 10);
    const r = db.prepare("SELECT COALESCE(-SUM(credits),0) AS n FROM transactions WHERE user_id=? AND type='spend' AND substr(created_at,1,10)=?").get(uid, day) as Row;
    return Number(r.n);
  };

  function createPendingPurchase(uid: string, pkg: { id: string; title: string; priceTry: number }, provider: string, providerRef: string): TransactionRecord {
    return logTx(uid, 'purchase', pkg.title, 0, 0, { amountTry: pkg.priceTry, status: 'pending', provider, providerRef, packageId: pkg.id });
  }

  const rowToTx = (r: Row): TransactionRecord => ({
    id: r.id, type: r.type, title: r.title, credits: r.credits, questions: r.questions,
    amountTry: r.amount_try, status: r.status, provider: r.provider, createdAt: r.created_at,
  });

  const transactions = (uid: string): TransactionRecord[] =>
    (db.prepare('SELECT * FROM transactions WHERE user_id=? ORDER BY created_at DESC, rowid DESC LIMIT 100').all(uid) as Row[]).map(rowToTx);

  const findPendingByRef = (provider: string, ref: string): { userId: string; packageId: string } | null => {
    const r = db.prepare('SELECT user_id, package_id FROM transactions WHERE provider=? AND provider_ref=? AND status=?').get(provider, ref, 'pending') as Row | undefined;
    return r ? { userId: r.user_id, packageId: r.package_id } : null;
  };

  // ── Partnerler ──
  function savePartner(uid: string, p: PartnerInfo): string {
    const existing = db.prepare('SELECT id FROM partners WHERE user_id=? AND lower(name)=lower(?) AND birth_date=?').get(uid, p.name, p.birthDate) as Row | undefined;
    if (existing) return existing.id;
    const pid = id('prt');
    db.prepare('INSERT INTO partners (id,user_id,name,birth_date,birth_time,sign,created_at) VALUES (?,?,?,?,?,?,?)')
      .run(pid, uid, p.name, p.birthDate, p.birthTime ?? null, p.sign, now());
    return pid;
  }

  // ── Fal defteri ──
  const toFortune = (r: Row, revealLocked = false): FortuneResult => {
    const all = JSON.parse(r.sections_json) as FortuneResult['sections'];
    const lock = r.lock_json ? (JSON.parse(r.lock_json) as NonNullable<FortuneResult['lock']>) : undefined;
    const unlocked = !!r.unlocked;
    const meta = r.meta_json ? (JSON.parse(r.meta_json) as FortuneResult['meta']) : undefined;
    // Paywall: kilitliyken ücretli bölümleri ve türevi meta alanlarını asla istemciye göndermeyiz.
    const hidden = new Set(lock?.lockedTitles ?? []);
    const sections = unlocked || revealLocked ? all : all.filter((s) => !hidden.has(s.title));
    const safeMeta = !unlocked && meta ? { ...meta, timeline: undefined, posterQuote: undefined } : meta;
    // Bekleme ritüeli: hazır olana dek içerik hiç gönderilmez (istemci sürenin dolmasını beklemek zorunda).
    const readyIn = r.ready_at ? new Date(r.ready_at).getTime() - Date.now() : 0;
    if (readyIn > 0) {
      return {
        id: r.id, kind: r.kind, title: r.title, summary: '', sections: [], unlocked, provider: r.provider, createdAt: r.created_at,
        pending: { readyInMs: readyIn, totalMs: Math.max(readyIn, new Date(r.ready_at).getTime() - new Date(r.created_at).getTime()) },
      };
    }
    return {
      id: r.id, kind: r.kind, title: r.title, summary: r.summary, sections, unlocked, lock: unlocked ? undefined : lock,
      meta: safeMeta, provider: r.provider, createdAt: r.created_at,
    };
  };

  function saveFortune(uid: string, draft: Draft, opts: { partnerId?: string; cost?: number; unlocked?: boolean; readyInMs?: number } = {}): FortuneResult {
    const fid = id('frt');
    const unlocked = opts.unlocked ?? draft.unlocked;
    const readyAt = opts.readyInMs && opts.readyInMs > 0 ? new Date(Date.now() + opts.readyInMs).toISOString() : null;
    db.prepare(`INSERT INTO fortunes (id,user_id,kind,title,summary,sections_json,meta_json,unlocked,lock_json,provider,partner_id,cost_credits,ready_at,created_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(fid, uid, draft.kind, draft.title, draft.summary, JSON.stringify(draft.sections), draft.meta ? JSON.stringify(draft.meta) : null,
        unlocked ? 1 : 0, draft.lock ? JSON.stringify(draft.lock) : null, draft.provider, opts.partnerId ?? null, opts.cost ?? 0, readyAt, now());
    return getFortune(uid, fid)!;
  }

  const getFortune = (uid: string, fid: string): FortuneResult | null => {
    const r = db.prepare('SELECT * FROM fortunes WHERE id=? AND user_id=?').get(fid, uid) as Row | undefined;
    return r ? toFortune(r) : null;
  };

  const listFortunes = (uid: string): FortuneResult[] =>
    (db.prepare('SELECT * FROM fortunes WHERE user_id=? ORDER BY created_at DESC, rowid DESC LIMIT 200').all(uid) as Row[]).map((r) => toFortune(r));

  const deleteFortune = (uid: string, fid: string) => Number(db.prepare('DELETE FROM fortunes WHERE id=? AND user_id=?').run(fid, uid).changes) > 0;

  function unlockFortune(uid: string, fid: string): FortuneResult | null {
    db.prepare('UPDATE fortunes SET unlocked=1 WHERE id=? AND user_id=?').run(fid, uid);
    return getFortune(uid, fid);
  }

  const rawFortuneRow = (uid: string, fid: string): Row | undefined =>
    db.prepare('SELECT * FROM fortunes WHERE id=? AND user_id=?').get(fid, uid) as Row | undefined;

  const todaysHoroscope = (uid: string, title: string): FortuneResult | null => {
    const day = now().slice(0, 10);
    const r = db.prepare("SELECT * FROM fortunes WHERE user_id=? AND kind='horoscope' AND title=? AND substr(created_at,1,10)=? LIMIT 1").get(uid, title, day) as Row | undefined;
    return r ? toFortune(r) : null;
  };

  /** Doğum haritası profile bağlı olarak değişmez — günlük değil, "profil aynıysa" önbelleklenir. summary anahtar olarak kullanılır (Güneş/Ay/Yükselen değişmediği sürece aynı kalır). */
  const latestNatal = (uid: string, summary: string): FortuneResult | null => {
    const r = db.prepare("SELECT * FROM fortunes WHERE user_id=? AND kind='natal' AND summary=? ORDER BY created_at DESC LIMIT 1").get(uid, summary) as Row | undefined;
    return r ? toFortune(r) : null;
  };

  /** Nova'nın hafızası için son okumalar (hazır olanlar; semboller meta'dan). */
  function recentForMemory(uid: string): MemoryFortune[] {
    const rows = db.prepare(`SELECT kind, title, created_at, meta_json FROM fortunes
      WHERE user_id=? AND kind IN ('coffee','tarot','dream','couple','karmic') AND (ready_at IS NULL OR ready_at <= ?)
      ORDER BY created_at DESC, rowid DESC LIMIT 6`).all(uid, now()) as Row[];
    return rows.map((r) => {
      const meta = r.meta_json ? (JSON.parse(r.meta_json) as { symbols?: string[]; topic?: string }) : {};
      return { kind: r.kind, title: r.title, createdAt: r.created_at, symbols: Array.isArray(meta.symbols) ? meta.symbols : undefined, topic: meta.topic };
    });
  }

  /** Bugün (UTC gün) üretilen karmik önizleme sayısı; ücretsiz olduğundan günlük sınır uygulanır. */
  const karmicPreviewsToday = (uid: string): number =>
    Number((db.prepare("SELECT COUNT(*) AS n FROM fortunes WHERE user_id=? AND kind='karmic' AND substr(created_at,1,10)=?").get(uid, now().slice(0, 10)) as Row).n);

  // ── Günlük ritüel ──
  const dailyLast = (uid: string): { day: string; streak: number } | null => {
    const r = db.prepare('SELECT day, streak FROM daily_ritual WHERE user_id=? ORDER BY day DESC LIMIT 1').get(uid) as Row | undefined;
    return r ? { day: r.day, streak: r.streak } : null;
  };
  const dailyClaimedToday = (uid: string, today: string): { streak: number; reward: number } | null => {
    const r = db.prepare('SELECT streak, reward FROM daily_ritual WHERE user_id=? AND day=?').get(uid, today) as Row | undefined;
    return r ? { streak: r.streak, reward: r.reward } : null;
  };
  /** Bugünkü ritüeli açar (günde bir kez; tekrar çağrı aynı sonucu döner). 7. günde 1 kredi ödül. */
  function dailyClaim(uid: string, today: string): { streak: number; reward: number; already: boolean } {
    return tx(db, () => {
      const done = dailyClaimedToday(uid, today);
      if (done) return { ...done, already: true };
      const last = dailyLast(uid);
      const streak = nextStreak(last?.day ?? null, last?.streak ?? 0, today);
      const reward = rewardForStreak(streak);
      db.prepare('INSERT INTO daily_ritual (user_id, day, streak, reward, created_at) VALUES (?,?,?,?,?)').run(uid, today, streak, reward, now());
      if (reward > 0) {
        db.prepare('UPDATE credits SET credits = credits + ?, updated_at=? WHERE user_id=?').run(reward, now(), uid);
        logTx(uid, 'grant', `${streak} günlük seri hediyesi`, reward, 0);
      }
      return { streak, reward, already: false };
    });
  }

  // ── Nova'nın Sözcük Bulmacası (oyunla kredi kazanma) ──
  /** Yeni bir deneme üretir ve saklar (tek kullanımlık); gerçek kelime listesi yalnızca sunucuda tutulur. */
  function gameStart(uid: string): { attemptId: string; puzzle: WordPuzzle } {
    // Her deneme farklı çıksın diye gerçek zamanlı bir tuz kullanılır (günlük tekrar eden bir bulmaca değil).
    const rng = makeRng('game', uid, Date.now(), Math.random());
    const puzzle = buildWordPuzzle(rng);
    const attemptId = id('gm');
    db.prepare('INSERT INTO game_attempts (id, user_id, words_json, used, created_at) VALUES (?,?,?,0,?)')
      .run(attemptId, uid, JSON.stringify(puzzle.words), now());
    return { attemptId, puzzle: { grid: puzzle.grid, words: puzzle.words } };
  }

  /** Bugün oyundan kaç kez kredi kazanıldığı — günlük tavan için. */
  const gameRewardsToday = (uid: string, today: string): number =>
    Number((db.prepare('SELECT count FROM game_rewards_daily WHERE user_id=? AND day=?').get(uid, today) as Row | undefined)?.count ?? 0);

  /**
   * Denemeyi kapatır. Deneme gerçek, kullanılmamış, süresi (config.game.minPlayMs) geçmiş ve bildirilen kelimeler
   * bulmacanın gerçek listesiyle tam eşleşiyorsa (hepsi bulunmuşsa) — günlük tavanı aşmadığı sürece — 1 kredi verir.
   */
  function gameFinish(uid: string, attemptId: string, foundWords: string[]): { rewarded: boolean; alreadyMaxedToday: boolean } {
    return tx(db, () => {
      const a = db.prepare('SELECT * FROM game_attempts WHERE id=? AND user_id=?').get(attemptId, uid) as Row | undefined;
      if (!a) throw badRequest('Böyle bir oyun denemesi bulunamadı.');
      if (a.used) throw badRequest('Bu deneme zaten kapatıldı.');
      db.prepare('UPDATE game_attempts SET used=1 WHERE id=?').run(attemptId);
      const words: string[] = JSON.parse(a.words_json);
      const elapsed = Date.now() - new Date(a.created_at).getTime();
      const found = new Set((Array.isArray(foundWords) ? foundWords : []).map((w) => String(w).toUpperCase()));
      const complete = words.length >= WORDS_TO_COMPLETE && words.every((w) => found.has(w));
      if (!complete || elapsed < config.game.minPlayMs) return { rewarded: false, alreadyMaxedToday: false };

      const today = now().slice(0, 10);
      const already = gameRewardsToday(uid, today);
      if (already >= GAME_DAILY_LIMIT) return { rewarded: false, alreadyMaxedToday: true };

      db.prepare(`INSERT INTO game_rewards_daily (user_id, day, count) VALUES (?,?,1)
                  ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1`).run(uid, today);
      db.prepare('UPDATE credits SET credits = credits + ?, updated_at=? WHERE user_id=?').run(GAME_REWARD_CREDITS, now(), uid);
      logTx(uid, 'grant', 'Sözcük Bulmacası ödülü', GAME_REWARD_CREDITS, 0);
      return { rewarded: true, alreadyMaxedToday: false };
    });
  }

  // ── Reklam izleyerek kredi kazanma ──
  /** Bir reklam izleme kaydeder; her AD_WATCH_PER_CREDIT izlemede (günlük tavana kadar) 1 kredi verir. */
  function adWatch(uid: string): { watched: number; rewarded: boolean; nextCreditIn: number } {
    return tx(db, () => {
      const today = now().slice(0, 10);
      db.prepare(`INSERT INTO ad_watch_daily (user_id, day, watched, credits_paid) VALUES (?,?,1,0)
                  ON CONFLICT(user_id, day) DO UPDATE SET watched = watched + 1`).run(uid, today);
      const row = db.prepare('SELECT watched, credits_paid FROM ad_watch_daily WHERE user_id=? AND day=?').get(uid, today) as Row;
      const eligible = Math.floor(row.watched / AD_WATCH_PER_CREDIT);
      const owed = Math.min(eligible, AD_CREDIT_DAILY_LIMIT) - row.credits_paid;
      if (owed > 0) {
        db.prepare('UPDATE ad_watch_daily SET credits_paid = credits_paid + ? WHERE user_id=? AND day=?').run(owed, uid, today);
        db.prepare('UPDATE credits SET credits = credits + ?, updated_at=? WHERE user_id=?').run(owed, now(), uid);
        logTx(uid, 'grant', 'Reklam izleme ödülü', owed, 0);
      }
      const nextCreditIn = row.credits_paid + owed >= AD_CREDIT_DAILY_LIMIT ? 0 : AD_WATCH_PER_CREDIT - (row.watched % AD_WATCH_PER_CREDIT || AD_WATCH_PER_CREDIT);
      return { watched: row.watched, rewarded: owed > 0, nextCreditIn };
    });
  }

  // ── Push bildirimleri (Expo) ──
  function savePushToken(uid: string, token: string, platform: string): void {
    db.prepare(`INSERT INTO push_tokens (token, user_id, platform, created_at, updated_at) VALUES (?,?,?,?,?)
                ON CONFLICT(token) DO UPDATE SET user_id=excluded.user_id, platform=excluded.platform, updated_at=excluded.updated_at`)
      .run(token, uid, platform, now(), now());
  }
  const removePushToken = (token: string): void => { db.prepare('DELETE FROM push_tokens WHERE token=?').run(token); };
  const pushTokens = (uid: string): string[] =>
    (db.prepare('SELECT token FROM push_tokens WHERE user_id=?').all(uid) as Row[]).map((r) => r.token);
  /** Push jetonu kayıtlı ama bugünün ritüelini henüz açmamış kullanıcılar — günlük hatırlatmanın hedef kitlesi. */
  const usersAwaitingDailyRitual = (today: string): string[] =>
    (db.prepare(`SELECT DISTINCT pt.user_id AS uid FROM push_tokens pt
                 WHERE NOT EXISTS (SELECT 1 FROM daily_ritual d WHERE d.user_id = pt.user_id AND d.day = ?)`).all(today) as Row[])
      .map((r) => r.uid);

  /** Hesabı ve bağlı tüm verileri (fallar, sohbet, partnerler, cüzdan, işlemler) kalıcı olarak siler. */
  const deleteUser = (uid: string): boolean => Number(db.prepare('DELETE FROM users WHERE id=?').run(uid).changes) > 0;

  // ── Sohbet ──
  function addChat(uid: string, role: 'user' | 'assistant', text: string): ChatMessage {
    const m: ChatMessage = { id: id('msg'), role, text, createdAt: now() };
    db.prepare('INSERT INTO chat_messages (id,user_id,role,text,created_at) VALUES (?,?,?,?,?)').run(m.id, uid, role, text, m.createdAt);
    return m;
  }
  const chat = (uid: string, limit = 200): ChatMessage[] =>
    (db.prepare('SELECT * FROM (SELECT *, rowid AS rid FROM chat_messages WHERE user_id=? ORDER BY created_at DESC, rowid DESC LIMIT ?) ORDER BY created_at ASC, rid ASC').all(uid, limit) as Row[])
      .map((r) => ({ id: r.id, role: r.role, text: r.text, createdAt: r.created_at }));

  return {
    createUser, getUser, getUserAuth, updateProfile, deleteUser, setConsent,
    wallet, spendCredits, spendQuestion, refund, creditPurchase, createPendingPurchase, transactions, findPendingByRef,
    paidPurchaseCount, spentToday, recentForMemory, karmicPreviewsToday, dailyLast, dailyClaimedToday, dailyClaim, referralInfo,
    savePartner, saveFortune, getFortune, listFortunes, deleteFortune, unlockFortune, rawFortuneRow, todaysHoroscope, latestNatal,
    addChat, chat,
    savePushToken, removePushToken, pushTokens, usersAwaitingDailyRitual,
    gameStart, gameFinish, adWatch,
  };
}

export type Store = ReturnType<typeof createStore>;
