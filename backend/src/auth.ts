import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config.ts';
import { unauthorized } from './errors.ts';

// ── Şifre ──
export function hashPassword(pw: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

export function verifyPassword(pw: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, saltHex, hashHex] = stored.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(pw, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected);
}

// ── Token (HMAC imzalı, JWT benzeri) ──
const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');

export function signToken(userId: string): string {
  const payload = b64(JSON.stringify({ sub: userId, exp: Date.now() + config.tokenTtlDays * 86400000 }));
  const sig = createHmac('sha256', config.jwtSecret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', config.jwtSecret).update(payload).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub: string; exp: number };
    return exp > Date.now() ? sub : null;
  } catch {
    return null;
  }
}

export interface AuthedRequest extends Request {
  userId: string;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization ?? '';
  const userId = h.startsWith('Bearer ') ? verifyToken(h.slice(7)) : null;
  if (!userId) return next(unauthorized());
  (req as AuthedRequest).userId = userId;
  next();
}

// ── Yönetici oturumu (normal kullanıcı tokenlarından tamamen ayrı; role alanı taşır) ──
const ADMIN_TTL_MS = 12 * 3600000; // 12 saat — panel sık kullanılan, ayrıcalıklı bir yüzey; kısa ömürlü tutulur

export function signAdminToken(email: string): string {
  const payload = b64(JSON.stringify({ role: 'admin', email, exp: Date.now() + ADMIN_TTL_MS }));
  const sig = createHmac('sha256', config.jwtSecret).update(`admin:${payload}`).digest('base64url');
  return `${payload}.${sig}`;
}

export function verifyAdminToken(token: string): string | null {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', config.jwtSecret).update(`admin:${payload}`).digest();
  const given = Buffer.from(sig, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { role, email, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { role: string; email: string; exp: number };
    return role === 'admin' && exp > Date.now() ? email : null;
  } catch {
    return null;
  }
}

export interface AdminRequest extends Request {
  adminEmail: string;
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const h = req.headers.authorization ?? '';
  const email = h.startsWith('Bearer ') ? verifyAdminToken(h.slice(7)) : null;
  if (!email) return next(unauthorized());
  (req as AdminRequest).adminEmail = email;
  next();
}

// ── Basit oran sınırlayıcı (bellek içi; çok sunuculu kurulumda Redis'e taşı) ──
export function rateLimit(max: number, windowMs: number) {
  const hits = new Map<string, number[]>();
  return (req: Request, _res: Response, next: NextFunction) => {
    const key = (req as Partial<AuthedRequest>).userId ?? req.ip ?? 'anon';
    const t = Date.now();
    const arr = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
    if (arr.length >= max) return next(Object.assign(new Error('Çok fazla istek. Biraz bekleyip tekrar dene.'), { status: 429, code: 'RATE_LIMIT' }));
    arr.push(t);
    hits.set(key, arr);
    next();
  };
}
