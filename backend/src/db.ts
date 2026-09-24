import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { config } from './config.ts';

export function openDb(path = config.dbPath): DatabaseSync {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  migrate(db);
  return db;
}

/** Eski veritabanlarına sonradan eklenen sütunlar (CREATE TABLE IF NOT EXISTS mevcut tabloyu değiştirmez). */
function migrate(db: DatabaseSync) {
  const ensure = (table: string, column: string, ddl: string) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  };
  ensure('users', 'focus', 'TEXT');
  ensure('users', 'consent_at', 'TEXT');
  ensure('users', 'consent_version', 'TEXT');
  ensure('fortunes', 'ready_at', 'TEXT');
  ensure('users', 'referral_code', 'TEXT');
  // Sütun eklendikten SONRA: schema.sql'de tanımlanırsa eski veritabanlarında sütun henüz yokken çalışıp hata verirdi.
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code) WHERE referral_code IS NOT NULL');
}

export const id = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
export const now = () => new Date().toISOString();

const depth = new WeakMap<DatabaseSync, number>();

/** Tek transaction içinde çalıştırır; hata olursa geri alır. İç içe çağrılabilir (en dıştaki commit/rollback yapar). */
export function tx<T>(db: DatabaseSync, fn: () => T): T {
  const d = depth.get(db) ?? 0;
  if (d > 0) return fn();
  db.exec('BEGIN IMMEDIATE');
  depth.set(db, 1);
  try {
    const out = fn();
    db.exec('COMMIT');
    return out;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  } finally {
    depth.set(db, 0);
  }
}
