import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type { Server } from 'node:http';
import { openDb } from '../src/db.ts';
import { createApp } from '../src/app.ts';
import { createStore } from '../src/store.ts';
import { handleStripeEvent, verifyStripeSignature } from '../src/payments.ts';
import { PACKAGES, FIRST_PURCHASE_BONUS } from '../../app/src/shared/packages.ts';
import { dayKeyTR, addDays } from '../../app/src/shared/daily.ts';

import { config } from '../src/config.ts';
config.authRatePerMin = 10_000; // testlerde çok sayıda kayıt açılır
config.readingDelayScale = 0; // testlerde bekleme ritüeli kapalı; bekleme testi kendi ayarını yapar
let server: Server;
let base = '';
const db = openDb(':memory:');

before(async () => {
  server = createApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as { port: number }).port}/api`;
});
after(() => { server.close(); });

async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}

const profile = { name: 'Onur', birthDate: '1995-03-14', sign: 'koc' /* sunucu yok sayar */ };
let n = 0;
async function newUser(consent = true) {
  const r = await call('POST', '/auth/register', { email: `u${++n}@t.com`, password: 'secret123', profile });
  assert.equal(r.status, 201);
  const token = r.json.token as string;
  if (consent) assert.equal((await call('POST', '/me/consent', { version: 'v1' }, token)).status, 200);
  return { token, id: r.json.user.id as string };
}
// Geçerli küçük bir PNG (1x1)
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

test('kayıt: 1 ücretsiz kredi, burç sunucuda hesaplanır, tekrar kayıt reddedilir', async () => {
  const r = await call('POST', '/auth/register', { email: 'a@t.com', password: 'secret123', profile });
  assert.equal(r.status, 201);
  assert.equal(r.json.wallet.credits, 1);
  assert.equal(r.json.user.profile.sign, 'balik'); // 14 Mart = Balık, istemcinin "koc"u yok sayıldı
  const dup = await call('POST', '/auth/register', { email: 'a@t.com', password: 'secret123', profile });
  assert.equal(dup.status, 409);
});

test('giriş: yanlış şifre 401, doğru şifre token verir', async () => {
  assert.equal((await call('POST', '/auth/login', { email: 'a@t.com', password: 'yanlis123' })).status, 401);
  const ok = await call('POST', '/auth/login', { email: 'a@t.com', password: 'secret123' });
  assert.equal(ok.status, 200);
  assert.ok(ok.json.token);
});

test('token olmadan korumalı uçlar 401 döner', async () => {
  assert.equal((await call('GET', '/me')).status, 401);
  assert.equal((await call('GET', '/fortunes')).status, 401);
  assert.equal((await call('POST', '/fortunes/dream', { text: 'x'.repeat(20) }, 'sahte.token')).status, 401);
});

test('doğrulama: kötü giriş 400', async () => {
  assert.equal((await call('POST', '/auth/register', { email: 'bozuk', password: '123456', profile })).status, 400);
  assert.equal((await call('POST', '/auth/register', { email: 'b@t.com', password: '123', profile })).status, 400);
  assert.equal((await call('POST', '/auth/register', { email: 'c@t.com', password: '123456', profile: { ...profile, birthDate: '2999-01-01' } })).status, 400);
  const { token } = await newUser();
  assert.equal((await call('POST', '/fortunes/dream', { text: 'kısa' }, token)).status, 400);
  assert.equal((await call('POST', '/fortunes/coffee', { images: ['http://evil/x.png'] }, token)).status, 400);
  assert.equal((await call('POST', '/fortunes/tarot', { spread: 'three', cardIds: [1, 1, 2], reversedFlags: [] }, token)).status, 400);
});

test('kahve falı 1 kredi harcar, ikincisi 402 ve bakiye negatife düşmez', async () => {
  const { token } = await newUser();
  const a = await call('POST', '/fortunes/coffee', { images: [PNG], question: 'İş?' }, token);
  assert.equal(a.status, 200);
  assert.equal(a.json.wallet.credits, 0);
  assert.equal(a.json.fortune.kind, 'coffee');
  assert.equal(a.json.fortune.provider, 'mock'); // test ortamında anahtar yok
  const b = await call('POST', '/fortunes/coffee', { images: [PNG] }, token);
  assert.equal(b.status, 402);
  assert.equal(b.json.error.code, 'NO_CREDITS');
  assert.equal((await call('GET', '/wallet', undefined, token)).json.wallet.credits, 0);
});

test('paywall: kilitli bölümler sunucudan çıkmaz; kilit açma 2 kredi ve tek sefer ücretlendirilir', async () => {
  const { token } = await newUser();
  const c = await call('POST', '/fortunes/karmic', { topic: 'ask' }, token);
  assert.equal(c.status, 200);
  const f = c.json.fortune;
  assert.equal(f.unlocked, false);
  assert.equal(f.sections.length, 2);
  assert.equal(f.meta.timeline, undefined);
  assert.equal(f.meta.posterQuote, undefined);
  assert.ok(f.lock.teaser);
  // Kilitli bölümlerin gövde metni yanıtın hiçbir yerinde bulunmamalı
  const full = db.prepare('SELECT sections_json FROM fortunes WHERE id=?').get(f.id) as { sections_json: string };
  const lockedBodies = (JSON.parse(full.sections_json) as { title: string; body: string }[]).slice(2).map((s) => s.body);
  assert.equal(lockedBodies.length, 3);
  const leaks = (payload: unknown) => lockedBodies.some((b) => JSON.stringify(payload).includes(JSON.stringify(b).slice(1, 40)));
  assert.equal(leaks(c.json), false);
  // Detay ve liste uçları da kilitli veriyi sızdırmamalı
  const d = await call('GET', `/fortunes/${f.id}`, undefined, token);
  assert.equal(d.json.fortune.sections.length, 2);
  assert.equal(leaks(d.json), false);
  const list = await call('GET', '/fortunes', undefined, token);
  assert.equal(list.json.fortunes[0].sections.length, 2);
  assert.equal(list.json.fortunes[0].meta.posterQuote, undefined);
  assert.equal(leaks(list.json), false);

  // 1 kredi var, 2 gerekli
  assert.equal((await call('POST', `/fortunes/karmic/${f.id}/unlock`, undefined, token)).status, 402);
  // kredi al ve paralel iki kez aç → yalnızca bir kez ücret
  await call('POST', '/wallet/checkout', { packageId: 'credit_5' }, token);
  const [x, y] = await Promise.all([
    call('POST', `/fortunes/karmic/${f.id}/unlock`, undefined, token),
    call('POST', `/fortunes/karmic/${f.id}/unlock`, undefined, token),
  ]);
  assert.equal(x.status, 200);
  assert.equal(y.status, 200);
  assert.equal(x.json.fortune.unlocked, true);
  assert.equal(x.json.fortune.sections.length, 5);
  assert.ok(x.json.fortune.meta.posterQuote);
  assert.equal((await call('GET', '/wallet', undefined, token)).json.wallet.credits, 1 + 5 + FIRST_PURCHASE_BONUS - 2);
});

test('başka kullanıcının falına erişilemez', async () => {
  const u1 = await newUser();
  const u2 = await newUser();
  const f = (await call('POST', '/fortunes/karmic', { topic: 'para' }, u1.token)).json.fortune;
  assert.equal((await call('GET', `/fortunes/${f.id}`, undefined, u2.token)).status, 404);
  assert.equal((await call('POST', `/fortunes/karmic/${f.id}/unlock`, undefined, u2.token)).status, 404);
  assert.equal((await call('DELETE', `/fortunes/${f.id}`, undefined, u2.token)).status, 404);
});

test('partner analizi 2 kredi harcar, partner kaydedilir, uyum puanı döner', async () => {
  const { token } = await newUser();
  const req = { relationship: 'sevgili', partner: { name: 'Elif', birthDate: '1996-08-02' } };
  assert.equal((await call('POST', '/fortunes/couple', req, token)).status, 402); // 1 kredi < 2
  await call('POST', '/wallet/checkout', { packageId: 'credit_5' }, token);
  const r = await call('POST', '/fortunes/couple', req, token);
  assert.equal(r.status, 200);
  assert.equal(r.json.wallet.credits, 1 + 5 + FIRST_PURCHASE_BONUS - 2);
  assert.ok(r.json.fortune.meta.score >= 30 && r.json.fortune.meta.score <= 99);
  const rows = db.prepare('SELECT COUNT(*) c FROM partners').get() as { c: number };
  assert.ok(rows.c >= 1);
});

test('burç ücretsizdir ve aynı gün önbellekten döner', async () => {
  const { token } = await newUser();
  const a = await call('POST', '/fortunes/horoscope', { sign: 'aslan', period: 'daily' }, token);
  const b = await call('POST', '/fortunes/horoscope', { sign: 'aslan', period: 'daily' }, token);
  assert.equal(a.json.wallet.credits, 1);
  assert.equal(a.json.fortune.id, b.json.fortune.id);
  assert.equal((await call('POST', '/fortunes/horoscope', { sign: 'yok' }, token)).status, 400);
});

test('sohbet: soru hakkı yoksa 1 kredi, ikisi de yoksa 402; geçmiş sıralı', async () => {
  const { token } = await newUser();
  const a = await call('POST', '/chat', { text: 'Aşk hayatım nasıl olacak?' }, token);
  assert.equal(a.status, 200);
  assert.equal(a.json.wallet.credits, 0);
  assert.ok(a.json.reply.text.length > 20);
  assert.equal((await call('POST', '/chat', { text: 'Bir daha?' }, token)).status, 402);
  await call('POST', '/wallet/checkout', { packageId: 'question_5' }, token);
  const b = await call('POST', '/chat', { text: 'İş değişikliği?', voice: true, tone: 'gizemli' }, token);
  assert.equal(b.status, 200);
  assert.equal(b.json.wallet.questions, 4);
  assert.equal(b.json.audioUrl, undefined); // ElevenLabs anahtarı yok → cihaz TTS
  const hist = await call('GET', '/chat', undefined, token);
  assert.deepEqual(hist.json.messages.map((m: any) => m.role), ['user', 'assistant', 'user', 'assistant']);
});

test('cüzdan: paket satın alma bakiye ve hareket kaydı oluşturur; bilinmeyen paket 404', async () => {
  const { token } = await newUser();
  const r = await call('POST', '/wallet/checkout', { packageId: 'credit_15' }, token);
  assert.equal(r.json.wallet.credits, 1 + 15 + FIRST_PURCHASE_BONUS); // ilk alışverişe hediye kredi
  assert.equal(r.json.transaction.amountTry, PACKAGES.find((p) => p.id === 'credit_15')!.priceTry);
  const txs = await call('GET', '/wallet/transactions', undefined, token);
  assert.deepEqual(txs.json.transactions.map((t: any) => t.type), ['grant', 'purchase', 'grant']);
  assert.equal(txs.json.transactions[0].title, 'İlk alışveriş hediyesi');
  // ikinci alışverişte hediye yok
  const again = await call('POST', '/wallet/checkout', { packageId: 'credit_5' }, token);
  assert.equal(again.json.wallet.credits, 1 + 15 + FIRST_PURCHASE_BONUS + 5);
  assert.equal((await call('GET', '/wallet/offers', undefined, token)).json.firstPurchaseBonus, 0);
  assert.equal((await call('POST', '/wallet/checkout', { packageId: 'credit_999999' }, token)).status, 404);
  assert.equal((await call('POST', '/wallet/iap/verify', {}, token)).status, 400); // gövde doğrulaması
  const iap = await call('POST', '/wallet/iap/verify', { platform: 'ios', packageId: 'credit_5', receipt: 'x'.repeat(20) }, token);
  assert.equal(iap.status, 501); // APPLE_SHARED_SECRET tanımlı değil
  assert.equal(iap.json.error.code, 'NOT_CONFIGURED');
});

test('Stripe: imza doğrulama ve webhook tek sefer bakiye yükler (idempotent)', async () => {
  const store = createStore(db);
  const { id } = await newUser();
  const pkg = PACKAGES.find((p) => p.id === 'credit_5')!;
  store.createPendingPurchase(id, pkg, 'stripe', 'cs_test_123');
  const event = { type: 'checkout.session.completed', data: { object: { id: 'cs_test_123', payment_status: 'paid' } } };
  const raw = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', 'whsec_x').update(`${t}.${raw}`).digest('hex');
  assert.equal(verifyStripeSignature(raw, `t=${t},v1=${sig}`, 'whsec_x'), true);
  assert.equal(verifyStripeSignature(raw, `t=${t},v1=${sig}`, 'baska_secret'), false);
  assert.equal(verifyStripeSignature(raw + ' ', `t=${t},v1=${sig}`, 'whsec_x'), false);
  assert.equal(verifyStripeSignature(raw, `t=${t - 4000},v1=${sig}`, 'whsec_x'), false); // eski zaman damgası
  const before = store.wallet(id).credits;
  assert.equal(handleStripeEvent(store, event), true);
  assert.equal(handleStripeEvent(store, event), false); // ikinci teslimat: bekleyen kayıt kalmadı
  assert.equal(store.wallet(id).credits, before + 5 + FIRST_PURCHASE_BONUS);
});

test('rüya: kredi düşer, fal geçmişe yazılır; silme çalışır', async () => {
  const { token } = await newUser();
  const r = await call('POST', '/fortunes/dream', { text: 'Denizin ortasında yüzüyordum, sular berraktı.' }, token);
  assert.equal(r.status, 200);
  assert.equal(r.json.wallet.credits, 0);
  const list = await call('GET', '/fortunes', undefined, token);
  assert.equal(list.json.fortunes.length, 1);
  assert.equal((await call('DELETE', `/fortunes/${r.json.fortune.id}`, undefined, token)).status, 200);
  assert.equal((await call('GET', '/fortunes', undefined, token)).json.fortunes.length, 0);
});

test('hesap silme: kullanıcı ve bağlı tüm veriler kalıcı olarak silinir, token geçersizleşir', async () => {
  const { token, id } = await newUser();
  await call('POST', '/fortunes/dream', { text: 'Denizin ortasında yüzüyordum, sular berraktı.' }, token);
  await call('POST', '/me/push-token', { token: 'ExponentPushToken[silinecek]', platform: 'ios' }, token);
  assert.equal((await call('DELETE', '/me', undefined, token)).status, 200);
  assert.equal((await call('GET', '/me', undefined, token)).status, 401);
  const rows = (t: string) => (db.prepare(`SELECT COUNT(*) AS c FROM ${t} WHERE user_id=?`).get(id) as { c: number }).c;
  for (const t of ['fortunes', 'credits', 'transactions', 'chat_messages', 'daily_ritual', 'push_tokens']) assert.equal(rows(t), 0, t);
});

test('push jetonu: kayıt/güncelleme/silme; hesap başka kullanıcıya taşınabilir (yeniden kurulum); doğrulama', async () => {
  const store = createStore(db);
  const a = await newUser();
  const b = await newUser();
  assert.equal((await call('POST', '/me/push-token', {}, a.token)).status, 400); // gövde doğrulaması
  assert.equal((await call('POST', '/me/push-token', { token: 'kısa', platform: 'ios' }, a.token)).status, 400); // çok kısa
  assert.equal((await call('POST', '/me/push-token', { token: 'ExponentPushToken[abc123]', platform: 'masaüstü' }, a.token)).status, 400); // geçersiz platform

  const reg = await call('POST', '/me/push-token', { token: 'ExponentPushToken[abc123]', platform: 'ios' }, a.token);
  assert.equal(reg.status, 200);
  assert.deepEqual(store.pushTokens(a.id), ['ExponentPushToken[abc123]']);

  // Aynı jeton başka bir hesapta kaydedilirse (cihaz değişti/yeniden kuruldu) sahibi güncellenir, mükerrer satır oluşmaz
  await call('POST', '/me/push-token', { token: 'ExponentPushToken[abc123]', platform: 'android' }, b.token);
  assert.deepEqual(store.pushTokens(a.id), []);
  assert.deepEqual(store.pushTokens(b.id), ['ExponentPushToken[abc123]']);

  const del = await call('DELETE', '/me/push-token', { token: 'ExponentPushToken[abc123]' }, b.token);
  assert.equal(del.status, 200);
  assert.deepEqual(store.pushTokens(b.id), []);
});

test('günlük hatırlatma hedefi: yalnızca push jetonu olan VE bugünün ritüelini henüz açmamış kullanıcılar listelenir', async () => {
  const store = createStore(db);
  const today = dayKeyTR();
  const withToken = await newUser();
  const withoutToken = await newUser();
  await call('POST', '/me/push-token', { token: `ExponentPushToken[${withToken.id}]`, platform: 'ios' }, withToken.token);
  const before = store.usersAwaitingDailyRitual(today);
  assert.ok(before.includes(withToken.id));
  assert.ok(!before.includes(withoutToken.id)); // jetonu yok → hedef kitlede değil
  await call('POST', '/daily/claim', undefined, withToken.token);
  const after = store.usersAwaitingDailyRitual(today);
  assert.ok(!after.includes(withToken.id)); // bugünü zaten açtı → artık hatırlatma hedefinde değil
});

// ───────── Bekleme ritüeli ─────────
test('bekleme ritüeli: hazır olana dek içerik sunucudan çıkmaz; süre dolunca açılır', async () => {
  const { token } = await newUser();
  const saved = config.readingDelayScale;
  config.readingDelayScale = 1;
  try {
    const r = await call('POST', '/fortunes/tarot', { spread: 'one', cardIds: [3], reversedFlags: [false] }, token); // ücretsiz krediyle
    assert.equal(r.status, 200);
    const f = r.json.fortune;
    assert.ok(f.pending && f.pending.readyInMs > 20_000 && f.pending.totalMs >= f.pending.readyInMs);
    assert.equal(f.sections.length, 0);
    assert.equal(f.summary, '');
    const full = db.prepare('SELECT sections_json FROM fortunes WHERE id=?').get(f.id) as { sections_json: string };
    const firstBody = (JSON.parse(full.sections_json) as { body: string }[])[0].body.slice(0, 40);
    // detay ve liste uçları da içeriği sızdırmamalı
    const d = await call('GET', `/fortunes/${f.id}`, undefined, token);
    assert.ok(d.json.fortune.pending);
    assert.equal(JSON.stringify(d.json).includes(firstBody), false);
    const list = await call('GET', '/fortunes', undefined, token);
    assert.equal(JSON.stringify(list.json).includes(firstBody), false);
    // süre dolunca içerik gelir
    db.prepare('UPDATE fortunes SET ready_at=? WHERE id=?').run(new Date(Date.now() - 1000).toISOString(), f.id);
    const ready = await call('GET', `/fortunes/${f.id}`, undefined, token);
    assert.equal(ready.json.fortune.pending, undefined);
    assert.ok(ready.json.fortune.sections.length >= 2);
  } finally {
    config.readingDelayScale = saved;
  }
});

test('bekleme ritüeli: hazır olmayan kader raporunun kilidi açılamaz (kredi düşmez)', async () => {
  const { token } = await newUser();
  await call('POST', '/wallet/checkout', { packageId: 'credit_5' }, token);
  const saved = config.readingDelayScale;
  config.readingDelayScale = 1;
  try {
    const c = await call('POST', '/fortunes/karmic', { topic: 'kariyer' }, token);
    assert.ok(c.json.fortune.pending);
    const before = (await call('GET', '/wallet', undefined, token)).json.wallet.credits;
    const u = await call('POST', `/fortunes/karmic/${c.json.fortune.id}/unlock`, undefined, token);
    assert.equal(u.status, 409);
    assert.equal(u.json.error.code, 'NOT_READY');
    assert.equal((await call('GET', '/wallet', undefined, token)).json.wallet.credits, before);
  } finally {
    config.readingDelayScale = saved;
  }
});

test('kahve: derin okuma 2 kredi, ek bölümler içerir; kredi yetmezse 402', async () => {
  const { token } = await newUser();
  const deep = { images: [PNG], depth: 'deep' };
  assert.equal((await call('POST', '/fortunes/coffee', deep, token)).status, 402); // 1 kredi < 2
  await call('POST', '/wallet/checkout', { packageId: 'credit_5' }, token);
  const r = await call('POST', '/fortunes/coffee', deep, token);
  assert.equal(r.status, 200);
  assert.equal(r.json.wallet.credits, 1 + 5 + FIRST_PURCHASE_BONUS - 2);
  const titles = r.json.fortune.sections.map((s: any) => s.title);
  assert.ok(titles.includes('Gönül Alanı') && titles.includes('Önümüzdeki 30 Gün'));
  const std = await call('POST', '/fortunes/coffee', { images: [PNG] }, token);
  assert.ok(std.json.fortune.sections.length < r.json.fortune.sections.length);
});

// ───────── Güvenlik ─────────
test('güvenlik: kriz belirtisinde fal yapılmaz, kredi düşmez, destek mesajı döner', async () => {
  const { token } = await newUser();
  const before = (await call('GET', '/wallet', undefined, token)).json.wallet;
  for (const [path, body] of [
    ['/fortunes/dream', { text: 'Rüyamda hayatıma son vermek istiyordum ve uyandım.' }],
    ['/fortunes/tarot', { spread: 'one', cardIds: [1], reversedFlags: [false], question: 'Kendime zarar vermeyi düşünüyorum' }],
    ['/fortunes/coffee', { images: [PNG], question: 'artık yaşamak istemiyorum' }],
    ['/fortunes/karmic', { topic: 'ask', note: 'intihar etmek istiyorum' }],
    ['/chat', { text: 'kendimi öldürmek istiyorum' }],
  ] as const) {
    const r = await call('POST', path, body, token);
    assert.equal(r.status, 422, path);
    assert.equal(r.json.error.code, 'SAFETY');
    assert.match(r.json.error.message, /112/);
  }
  assert.deepEqual((await call('GET', '/wallet', undefined, token)).json.wallet, before);
  assert.equal((await call('GET', '/fortunes', undefined, token)).json.fortunes.length, 0);
});

test('güvenlik: sağlık sorusunda fal yapılır ama nazik bir not eklenir', async () => {
  const { token } = await newUser();
  const r = await call('POST', '/fortunes/tarot', { spread: 'one', cardIds: [2], reversedFlags: [false], question: 'Hamile miyim?' }, token);
  assert.equal(r.status, 200);
  const last = r.json.fortune.sections.at(-1);
  assert.equal(last.title, 'Küçük Bir Not');
  assert.match(last.body, /sağlık uzmanı/);
});

test('karmik ücretsiz ön izleme günde 3 ile sınırlı', async () => {
  const { token } = await newUser();
  for (let i = 0; i < 3; i++) assert.equal((await call('POST', '/fortunes/karmic', { topic: 'ask' }, token)).status, 200);
  const r = await call('POST', '/fortunes/karmic', { topic: 'para' }, token);
  assert.equal(r.status, 429);
  assert.equal(r.json.error.code, 'LIMIT');
});

// ───────── Bağ kurma ─────────
test('günlük ritüel: günde bir kez, 7. ardışık günde 1 kredi; kopan seri 1\'den başlar', async () => {
  const { token, id } = await newUser();
  const store = createStore(db);
  const h0 = await call('GET', '/home', undefined, token);
  assert.equal(h0.json.daily.claimed, false);
  const c1 = await call('POST', '/daily/claim', undefined, token);
  assert.equal(c1.json.daily.claimed, true);
  assert.equal(c1.json.daily.streak, 1);
  assert.ok(c1.json.daily.message.includes('Onur'));
  const c2 = await call('POST', '/daily/claim', undefined, token); // aynı gün tekrar
  assert.equal(c2.json.daily.streak, 1);
  assert.equal(c2.json.wallet.credits, 1);
  // 6 günlük geçmişi elle kur: dünden geriye 6 gün → bugün 7. gün olur
  const today = dayKeyTR();
  db.prepare('DELETE FROM daily_ritual WHERE user_id=?').run(id);
  for (let i = 6; i >= 1; i--) db.prepare('INSERT INTO daily_ritual (user_id, day, streak, reward, created_at) VALUES (?,?,?,0,?)').run(id, addDays(today, -i), 7 - i, new Date().toISOString());
  const c7 = await call('POST', '/daily/claim', undefined, token);
  assert.equal(c7.json.daily.streak, 7);
  assert.equal(c7.json.daily.reward, 1);
  assert.equal(c7.json.wallet.credits, 2);
  // seri kopması: yeni kullanıcı, 3 gün önce açmış
  const u2 = await newUser();
  db.prepare('INSERT INTO daily_ritual (user_id, day, streak, reward, created_at) VALUES (?,?,?,0,?)').run(u2.id, addDays(today, -3), 5, new Date().toISOString());
  assert.equal((await call('POST', '/daily/claim', undefined, u2.token)).json.daily.streak, 1);
  assert.equal(store.wallet(u2.id).credits, 1);
});

test('Nova notu: gerçek geçmişten türer; odak konusu profilden gelir', async () => {
  const r0 = await call('POST', '/auth/register', { email: `focus${++n}@t.com`, password: 'secret123', profile: { ...profile, focus: 'kariyer' } });
  const token = r0.json.token as string;
  await call('POST', '/me/consent', { version: 'v1' }, token);
  assert.equal(r0.json.user.profile.focus, 'kariyer');
  const n0 = (await call('GET', '/home', undefined, token)).json.note as string;
  assert.match(n0, /Kariyer ve Amaç/);
  await call('POST', '/fortunes/dream', { text: 'Rüyamda uzun bir yolda yürüyordum ve kapılar açılıyordu.' }, token);
  const n1 = (await call('GET', '/home', undefined, token)).json.note as string;
  assert.match(n1, /rüya/);
  // yeni kullanıcı, geçmişi yok, odak yok → not yok
  const u = await newUser();
  assert.equal((await call('GET', '/home', undefined, u.token)).json.note, null);
});

// ───────── Açık rıza ─────────
test('açık rıza: verilmeden AI uçları 403; verilince çalışır; geri alınınca yeniden kapanır, geçmiş erişilebilir kalır', async () => {
  const { token } = await newUser(false);
  const dream = { text: 'Rüyamda uzun bir yolda yürüyordum ve kapılar açılıyordu.' };
  for (const [path, body] of [['/fortunes/dream', dream], ['/fortunes/horoscope', { sign: 'koc' }], ['/chat', { text: 'merhaba' }]] as const) {
    const r = await call('POST', path, body, token);
    assert.equal(r.status, 403, path);
    assert.equal(r.json.error.code, 'CONSENT_REQUIRED');
  }
  assert.equal((await call('GET', '/wallet', undefined, token)).json.wallet.credits, 1); // kredi düşmedi
  const c = await call('POST', '/me/consent', { version: 'riza-2026-09' }, token);
  assert.ok(c.json.user.consentAt);
  const row = db.prepare('SELECT consent_version FROM users WHERE email=?').get(c.json.user.email) as { consent_version: string };
  assert.equal(row.consent_version, 'riza-2026-09');
  const ok = await call('POST', '/fortunes/dream', dream, token);
  assert.equal(ok.status, 200);
  const off = await call('DELETE', '/me/consent', undefined, token);
  assert.equal(off.json.user.consentAt, undefined);
  assert.equal((await call('POST', '/fortunes/dream', dream, token)).status, 403);
  assert.equal((await call('GET', '/fortunes', undefined, token)).json.fortunes.length, 1); // geçmiş görülebilir
  assert.equal((await call('DELETE', `/fortunes/${ok.json.fortune.id}`, undefined, token)).status, 200);
});

test('veritabanı geçişi: eski şemaya yeni sütunlar eklenir', async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { DatabaseSync } = await import('node:sqlite');
  const path = join(mkdtempSync(join(tmpdir(), 'falnova-mig-')), 'old.db');
  const old = new DatabaseSync(path);
  old.exec(`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT, name TEXT NOT NULL, birth_date TEXT NOT NULL, birth_time TEXT, birth_place TEXT, sign TEXT NOT NULL, is_guest INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
            CREATE TABLE fortunes (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, summary TEXT NOT NULL, sections_json TEXT NOT NULL, meta_json TEXT, unlocked INTEGER NOT NULL DEFAULT 1, lock_json TEXT, provider TEXT NOT NULL, partner_id TEXT, cost_credits INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);`);
  old.close();
  const migrated = openDb(path);
  const cols = (t: string) => (migrated.prepare(`PRAGMA table_info(${t})`).all() as { name: string }[]).map((c) => c.name);
  assert.ok(cols('users').includes('focus') && cols('users').includes('consent_at') && cols('users').includes('consent_version'));
  assert.ok(cols('users').includes('referral_code'));
  assert.ok(cols('fortunes').includes('ready_at'));
  migrated.close();
});

test('doğum haritası: ücretsizdir, kredi düşmez; profil değişmediği sürece aynı rapor önbellekten döner', async () => {
  const { token } = await newUser();
  const before = (await call('GET', '/wallet', undefined, token)).json.wallet.credits;
  const a = await call('POST', '/fortunes/natal', undefined, token);
  assert.equal(a.status, 200);
  assert.equal(a.json.fortune.kind, 'natal');
  assert.equal((await call('GET', '/wallet', undefined, token)).json.wallet.credits, before);
  const b = await call('POST', '/fortunes/natal', undefined, token);
  assert.equal(b.json.fortune.id, a.json.fortune.id); // aynı özet → önbellek
  assert.ok(a.json.fortune.meta.natal);
  assert.equal(a.json.fortune.meta.natal.ascendant, null); // doğum saati verilmedi
  // doğum saati eklenince profil değişir → yeni (farklı) rapor üretilir
  await call('PUT', '/me/profile', { profile: { name: 'Onur', birthDate: '1995-03-14', birthTime: '09:15', birthPlace: 'Bursa' } }, token);
  const c = await call('POST', '/fortunes/natal', undefined, token);
  assert.notEqual(c.json.fortune.id, a.json.fortune.id);
  assert.notEqual(c.json.fortune.meta.natal.ascendant, null);
});

test('el falı 1 kredi harcar, dört çizgi meta olarak döner; fotoğraf yoksa 400', async () => {
  const { token } = await newUser();
  const a = await call('POST', '/fortunes/palm', { images: [PNG], question: 'Aşk hayatım?' }, token);
  assert.equal(a.status, 200);
  assert.equal(a.json.wallet.credits, 0);
  assert.equal(a.json.fortune.kind, 'palm');
  assert.equal(a.json.fortune.meta.palmLines.length, 4);
  assert.equal((await call('POST', '/fortunes/palm', { images: [PNG] }, token)).status, 402);
  const bad = await call('POST', '/fortunes/palm', { images: [] }, token);
  assert.equal(bad.status, 400);
});

test('arkadaşını davet et: kod ile katılana hoş geldin hediyesi, davet edene ilk alışverişte ödül', async () => {
  const a = await newUser();
  const before = await call('GET', '/me/referral', undefined, a.token);
  assert.equal(before.status, 200);
  assert.match(before.json.code, /^[A-Z0-9]{6}$/);
  assert.deepEqual([before.json.invited, before.json.rewarded, before.json.usedCode], [0, 0, false]);

  // geçersiz/rastgele kod: kayıt engellenmez, hediye verilmez
  const junk = await call('POST', '/auth/register', { email: `junk${n}@t.com`, password: 'secret123', profile, refCode: 'ZZZZZZ' });
  assert.equal(junk.status, 201);
  assert.equal(junk.json.wallet.credits, 1);

  // geçerli kod: davet edilen anında +1 hediye kredi alır
  const bReg = await call('POST', '/auth/register', { email: `friend${++n}@t.com`, password: 'secret123', profile, refCode: before.json.code });
  assert.equal(bReg.status, 201);
  assert.equal(bReg.json.wallet.credits, 1 + 1); // hoş geldin + arkadaş kodu hediyesi
  const bToken = bReg.json.token as string;
  await call('POST', '/me/consent', { version: 'v1' }, bToken);
  assert.equal((await call('GET', '/me/referral', undefined, bToken)).json.usedCode, true);

  const afterInvite = await call('GET', '/me/referral', undefined, a.token);
  assert.deepEqual([afterInvite.json.invited, afterInvite.json.rewarded], [1, 0]); // henüz alışveriş yapmadı

  // davet edilen ilk alışverişini yapınca davet eden ödüllenir
  await call('POST', '/wallet/checkout', { packageId: 'credit_5' }, bToken);
  const afterPurchase = await call('GET', '/me/referral', undefined, a.token);
  assert.deepEqual([afterPurchase.json.invited, afterPurchase.json.rewarded, afterPurchase.json.earnedCredits], [1, 1, 3]);
  assert.equal((await call('GET', '/wallet', undefined, a.token)).json.wallet.credits, 1 + 3);

  // aynı kişi ikinci kez alışveriş yapsa tekrar ödül verilmez
  await call('POST', '/wallet/checkout', { packageId: 'credit_5' }, bToken);
  assert.equal((await call('GET', '/me/referral', undefined, a.token)).json.rewarded, 1);
});
