import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { openDb } from '../src/db.ts';
import { createApp } from '../src/app.ts';
import { hashPassword } from '../src/auth.ts';

import { config } from '../src/config.ts';
config.authRatePerMin = 10_000;
config.readingDelayScale = 0;
config.admin.email = 'admin@test.com';
config.admin.passwordHash = hashPassword('cok-gizli-123');

let server: Server;
let apiBase = '';
let adminBase = '';
const db = openDb(':memory:');

before(async () => {
  server = createApp(db).listen(0);
  await new Promise((r) => server.once('listening', r));
  const port = (server.address() as { port: number }).port;
  apiBase = `http://127.0.0.1:${port}/api`;
  adminBase = `http://127.0.0.1:${port}/api/admin`;
});
after(() => { server.close(); });

async function call(base: string, method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as any };
}
const admin = (method: string, path: string, body?: unknown, token?: string) => call(adminBase, method, path, body, token);
const api = (method: string, path: string, body?: unknown, token?: string) => call(apiBase, method, path, body, token);

const profile = { name: 'Onur', birthDate: '1995-03-14', sign: 'koc' };

test('yönetici girişi: yanlış e-posta ya da şifre 401, doğru bilgiyle token döner', async () => {
  assert.equal((await admin('POST', '/login', { email: 'baska@test.com', password: 'cok-gizli-123' })).status, 401);
  assert.equal((await admin('POST', '/login', { email: 'admin@test.com', password: 'yanlis' })).status, 401);
  const ok = await admin('POST', '/login', { email: 'ADMIN@test.com', password: 'cok-gizli-123' }); // e-posta büyük/küçük harfe duyarsız
  assert.equal(ok.status, 200);
  assert.ok(ok.json.token);
});

test('yönetici tokeni normal kullanıcı uçlarını açmaz, normal kullanıcı tokeni yönetici uçlarını açmaz', async () => {
  const { json: login } = await admin('POST', '/login', { email: 'admin@test.com', password: 'cok-gizli-123' });
  const adminToken = login.token as string;
  assert.equal((await api('GET', '/me', undefined, adminToken)).status, 401);

  const reg = await api('POST', '/auth/register', { email: 'x@t.com', password: 'secret123', profile });
  const userToken = reg.json.token as string;
  assert.equal((await admin('GET', '/stats', undefined, userToken)).status, 401);
  assert.equal((await admin('GET', '/stats')).status, 401); // token yok
});

test('istatistikler: kullanıcı/gelir/kredi toplamları gerçek verilerle tutarlı', async () => {
  const { json: login } = await admin('POST', '/login', { email: 'admin@test.com', password: 'cok-gizli-123' });
  const t = login.token as string;
  await api('POST', '/auth/register', { email: 'y@t.com', password: 'secret123', profile });
  await api('POST', '/auth/register', { email: 'z@t.com', password: 'secret123', profile });

  const stats = (await admin('GET', '/stats', undefined, t)).json;
  assert.ok(stats.users.total >= 3); // bu test dosyasında şimdiye dek açılan hesaplar
  assert.ok(stats.users.registered >= 3);
  assert.equal(typeof stats.revenue.totalTry, 'number');
  assert.ok(Array.isArray(stats.fortunes.byKind));
});

test('kullanıcı listesi: e-postaya göre arama filtreler, sayfalama çalışır', async () => {
  const { json: login } = await admin('POST', '/login', { email: 'admin@test.com', password: 'cok-gizli-123' });
  const t = login.token as string;
  const all = await admin('GET', '/users?page=1&pageSize=1', undefined, t);
  assert.equal(all.status, 200);
  assert.equal(all.json.rows.length, 1);
  assert.ok(all.json.total >= 3);

  const found = await admin('GET', '/users?query=y@t.com', undefined, t);
  assert.equal(found.json.rows.length, 1);
  assert.equal(found.json.rows[0].email, 'y@t.com');
});

test('kullanıcı detayı: bakiye ve işlem geçmişini döner; olmayan id 404', async () => {
  const { json: login } = await admin('POST', '/login', { email: 'admin@test.com', password: 'cok-gizli-123' });
  const t = login.token as string;
  const reg = await api('POST', '/auth/register', { email: 'detay@t.com', password: 'secret123', profile });
  const uid = reg.json.user.id as string;

  const detail = await admin('GET', `/users/${uid}`, undefined, t);
  assert.equal(detail.status, 200);
  assert.equal(detail.json.user.email, 'detay@t.com');
  assert.equal(detail.json.user.wallet.credits, 1); // kayıt hediyesi
  assert.equal(detail.json.user.transactions[0].title, 'Hoş geldin hediyesi');

  assert.equal((await admin('GET', '/users/usr_yok', undefined, t)).status, 404);
});

test('işlem listesi: tür/durum filtreleri uygulanır', async () => {
  const { json: login } = await admin('POST', '/login', { email: 'admin@test.com', password: 'cok-gizli-123' });
  const t = login.token as string;
  const grants = await admin('GET', '/transactions?type=grant&status=paid', undefined, t);
  assert.equal(grants.status, 200);
  assert.ok(grants.json.rows.every((r: any) => r.type === 'grant' && r.status === 'paid'));

  const none = await admin('GET', '/transactions?type=purchase', undefined, t);
  assert.equal(none.json.rows.length, 0); // bu test dosyasında hiç gerçek satın alma yok
});

test('/admin statik panel dosyasını sunar', async () => {
  const res = await fetch(adminBase.replace('/api/admin', '/admin/'));
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Yönetici Paneli/);
});
