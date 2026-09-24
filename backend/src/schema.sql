-- FalNova veritabanı şeması (SQLite). Postgres'e taşımak için tipler birebir karşılanabilir.

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,                       -- misafirde NULL
  name          TEXT NOT NULL,
  birth_date    TEXT NOT NULL,              -- YYYY-MM-DD
  birth_time    TEXT,                       -- HH:MM
  birth_place   TEXT,
  sign          TEXT NOT NULL,              -- koc, boga, ...
  focus         TEXT,                       -- odak konusu (ask, kariyer, ...)
  consent_at    TEXT,                       -- açık rıza zamanı (KVKK ispat yükümlülüğü)
  consent_version TEXT,                     -- rızanın verildiği metin sürümü
  is_guest      INTEGER NOT NULL DEFAULT 0,
  referral_code TEXT,                       -- Arkadaşını Davet Et: kullanıcının kendi paylaşılabilir kodu
  created_at    TEXT NOT NULL
);

-- Kullanıcının partner analizi için girdiği kişiler
CREATE TABLE IF NOT EXISTS partners (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  birth_date TEXT NOT NULL,
  birth_time TEXT,
  sign       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_partners_user ON partners(user_id);

-- Geçmişim defteri: kahve, tarot, burç, rüya, karmik rapor, partner analizi
CREATE TABLE IF NOT EXISTS fortunes (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,              -- coffee|tarot|horoscope|dream|karmic|couple
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL,
  sections_json TEXT NOT NULL,              -- tüm bölümler (kilitliler dahil, API kilitliyken ayıklar)
  meta_json     TEXT,
  unlocked      INTEGER NOT NULL DEFAULT 1, -- karmik raporda paywall durumu
  lock_json     TEXT,
  provider      TEXT NOT NULL,              -- openai|gemini|mock
  partner_id    TEXT REFERENCES partners(id) ON DELETE SET NULL,
  cost_credits  INTEGER NOT NULL DEFAULT 0,
  ready_at      TEXT,                       -- bekleme ritüeli: bu ana dek içerik istemciye verilmez
  created_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_fortunes_user ON fortunes(user_id, created_at DESC);

-- Bakiye: kullanıcı başına tek satır
CREATE TABLE IF NOT EXISTS credits (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  credits    INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  questions  INTEGER NOT NULL DEFAULT 0 CHECK (questions >= 0),
  updated_at TEXT NOT NULL
);

-- Bakiye hareketleri (hediye, satın alma, harcama, iade). Denetim ve mutabakat için.
CREATE TABLE IF NOT EXISTS transactions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,               -- grant|purchase|spend|refund
  title        TEXT NOT NULL,
  credits      INTEGER NOT NULL DEFAULT 0,  -- +/-
  questions    INTEGER NOT NULL DEFAULT 0,  -- +/-
  amount_try   REAL NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'paid',-- pending|paid|failed
  provider     TEXT NOT NULL DEFAULT 'system', -- system|stripe|iyzico|apple|google|mock
  provider_ref TEXT,                        -- ödeme/oturum/makbuz kimliği
  package_id   TEXT,
  created_at   TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_provider_ref ON transactions(provider, provider_ref) WHERE provider_ref IS NOT NULL;

-- Soru-Cevap Odası / Sesli Falcı konuşma geçmişi
CREATE TABLE IF NOT EXISTS chat_messages (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,                 -- user|assistant
  text       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id, created_at);

-- Arkadaşını Davet Et: kim kimin koduyla katıldı, ödül verildi mi (yalnızca davet edilenin ilk alışverişinde, tekrar ödemez)
CREATE TABLE IF NOT EXISTS referrals (
  referred_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  referrer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rewarded_at TEXT,
  created_at  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

-- Push bildirim jetonları (Expo Push): bir kullanıcının birden çok cihazı olabilir.
CREATE TABLE IF NOT EXISTS push_tokens (
  token      TEXT PRIMARY KEY,              -- ExponentPushToken[...]
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform   TEXT NOT NULL,                 -- ios|android|web
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

-- Günlük ritüel: kullanıcı başına gün başına tek satır (seri ve ödül burada izlenir)
CREATE TABLE IF NOT EXISTS daily_ritual (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day        TEXT NOT NULL,                 -- YYYY-MM-DD (Türkiye saati)
  streak     INTEGER NOT NULL,
  reward     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, day)
);
