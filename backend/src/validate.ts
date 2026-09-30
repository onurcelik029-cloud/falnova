import type {
  CoffeeRequest, CoupleRequest, DreamRequest, IapVerifyRequest, KarmicRequest, KarmicTopicId, PalmRequest, PartnerInfo, Profile, TarotRequest, VoiceTone,
} from '../../app/src/shared/types.ts';
import { signFromDate } from '../../app/src/shared/zodiac.ts';
import { SPREADS } from '../../app/src/shared/tarot.ts';
import { badRequest } from './errors.ts';

type Obj = Record<string, unknown>;
const obj = (v: unknown, name = 'gövde'): Obj => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw badRequest(`Geçersiz ${name}.`);
  return v as Obj;
};

// eslint-disable-next-line no-control-regex
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();

export function text(v: unknown, field: string, min: number, max: number, optional = false): string {
  if ((v === undefined || v === null || v === '') && optional) return '';
  if (typeof v !== 'string') throw badRequest(`${field} metin olmalı.`);
  const t = clean(v);
  if (t.length < min) throw badRequest(`${field} en az ${min} karakter olmalı.`);
  if (t.length > max) throw badRequest(`${field} en fazla ${max} karakter olabilir.`);
  return t;
}

function isoDate(v: unknown, field: string): string {
  const t = text(v, field, 10, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (!m || !d || d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3] || +m[1] < 1900 || d > new Date()) {
    throw badRequest(`${field} geçerli bir tarih olmalı (YYYY-AA-GG).`);
  }
  return t;
}

function optTime(v: unknown): string | undefined {
  const t = text(v, 'Doğum saati', 0, 5, true);
  if (!t) return undefined;
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)) throw badRequest('Doğum saati SS:DD biçiminde olmalı.');
  return t;
}

const TOPICS: KarmicTopicId[] = ['ask', 'kariyer', 'para', 'aile', 'kendini', 'saglik'];

export function parseProfile(v: unknown): Profile {
  const o = obj(v, 'profil');
  const birthDate = isoDate(o.birthDate, 'Doğum tarihi');
  return {
    name: text(o.name, 'Ad', 2, 40),
    birthDate,
    birthTime: optTime(o.birthTime),
    birthPlace: text(o.birthPlace, 'Doğum yeri', 0, 60, true) || undefined,
    sign: signFromDate(birthDate)!, // burç istemciye güvenilmeden hesaplanır
    focus: TOPICS.includes(o.focus as KarmicTopicId) ? (o.focus as KarmicTopicId) : undefined,
  };
}

export function parsePartner(v: unknown): PartnerInfo {
  const o = obj(v, 'partner');
  const birthDate = isoDate(o.birthDate, 'Partnerin doğum tarihi');
  return { name: text(o.name, 'Partner adı', 2, 40), birthDate, birthTime: optTime(o.birthTime), sign: signFromDate(birthDate)! };
}

export function parseCredentials(o: Obj) {
  const email = text(o.email, 'E-posta', 5, 120).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw badRequest('Geçerli bir e-posta gir.');
  const password = typeof o.password === 'string' ? o.password : '';
  if (password.length < 6 || password.length > 128) throw badRequest('Şifre 6-128 karakter olmalı.');
  return { email, password };
}

/** Kayıt sırasında girilen arkadaş kodu: isteğe bağlı, biçimi hatalıysa sessizce yok sayılır (kayıt engellenmez). */
export function parseRefCode(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = clean(v).toUpperCase();
  return /^[A-Z0-9]{4,10}$/.test(t) ? t : undefined;
}

const MAX_IMAGE_CHARS = 7_000_000; // ~5 MB ikili veri

export function parseCoffee(v: unknown): CoffeeRequest {
  const o = obj(v);
  const virtual = o.virtual === true;
  if (virtual) {
    return {
      images: [],
      question: text(o.question, 'Soru', 0, 300, true) || undefined,
      depth: o.depth === 'deep' ? 'deep' : 'standard',
      virtual: true,
    };
  }
  if (!Array.isArray(o.images) || o.images.length < 1 || o.images.length > 3) throw badRequest('1-3 fotoğraf gerekli.');
  const images = o.images.map((i) => {
    const head = typeof i === 'string' ? /^data:image\/(jpeg|png|webp);base64,/.exec(i) : null;
    if (typeof i !== 'string' || !head || !/^[A-Za-z0-9+/]+={0,2}$/.test(i.slice(head[0].length))) {
      throw badRequest('Fotoğraflar JPEG, PNG veya WebP (base64) olmalı.');
    }
    if (i.length > MAX_IMAGE_CHARS) throw badRequest('Fotoğraf çok büyük (en fazla ~5 MB).');
    return i;
  });
  return { images, question: text(o.question, 'Soru', 0, 300, true) || undefined, depth: o.depth === 'deep' ? 'deep' : 'standard' };
}

export function parseGameFinish(v: unknown): { attemptId: string; foundWords: string[] } {
  const o = obj(v);
  const attemptId = text(o.attemptId, 'Deneme kimliği', 1, 40);
  if (!Array.isArray(o.foundWords) || o.foundWords.length > 20) throw badRequest('Geçersiz kelime listesi.');
  const foundWords = o.foundWords.map((w) => text(w, 'Kelime', 1, 20));
  return { attemptId, foundWords };
}

export function parsePalm(v: unknown): PalmRequest {
  const o = obj(v);
  if (!Array.isArray(o.images) || o.images.length < 1 || o.images.length > 2) throw badRequest('1-2 fotoğraf gerekli.');
  const images = o.images.map((i) => {
    const head = typeof i === 'string' ? /^data:image\/(jpeg|png|webp);base64,/.exec(i) : null;
    if (typeof i !== 'string' || !head || !/^[A-Za-z0-9+/]+={0,2}$/.test(i.slice(head[0].length))) {
      throw badRequest('Fotoğraflar JPEG, PNG veya WebP (base64) olmalı.');
    }
    if (i.length > MAX_IMAGE_CHARS) throw badRequest('Fotoğraf çok büyük (en fazla ~5 MB).');
    return i;
  });
  return { images, question: text(o.question, 'Soru', 0, 300, true) || undefined };
}

export function parseTarot(v: unknown): TarotRequest {
  const o = obj(v);
  const spread = o.spread as TarotRequest['spread'];
  if (!(spread in SPREADS)) throw badRequest('Geçersiz açılım.');
  const need = SPREADS[spread].positions.length;
  const ids = o.cardIds;
  if (!Array.isArray(ids) || ids.length !== need || !ids.every((x) => Number.isInteger(x) && x >= 0 && x <= 21) || new Set(ids).size !== need) {
    throw badRequest(`${need} farklı kart gerekli.`);
  }
  const flags = Array.isArray(o.reversedFlags) ? o.reversedFlags.map(Boolean).slice(0, need) : [];
  while (flags.length < need) flags.push(false);
  return { spread, cardIds: ids as number[], reversedFlags: flags, question: text(o.question, 'Soru', 0, 300, true) || undefined };
}

export function parseDream(v: unknown): DreamRequest {
  return { text: text(obj(v).text, 'Rüya', 15, 1200) };
}

export function parseKarmic(v: unknown): KarmicRequest {
  const o = obj(v);
  if (!TOPICS.includes(o.topic as KarmicTopicId)) throw badRequest('Geçersiz konu.');
  return { topic: o.topic as KarmicTopicId, note: text(o.note, 'Not', 0, 300, true) || undefined };
}

const RELS = ['sevgili', 'evli', 'flort', 'eski', 'arkadas'] as const;
export function parseCouple(v: unknown): CoupleRequest {
  const o = obj(v);
  if (!RELS.includes(o.relationship as never)) throw badRequest('Geçersiz ilişki türü.');
  return { partner: parsePartner(o.partner), relationship: o.relationship as CoupleRequest['relationship'] };
}

const PLATFORMS = ['ios', 'android'] as const;
export function parseIapVerify(v: unknown): IapVerifyRequest {
  const o = obj(v);
  if (!PLATFORMS.includes(o.platform as never)) throw badRequest('Geçersiz platform (ios veya android olmalı).');
  return {
    platform: o.platform as 'ios' | 'android',
    packageId: text(o.packageId, 'Paket', 1, 40),
    receipt: text(o.receipt, 'Makbuz', 10, 20000),
    productId: text(o.productId, 'Ürün kimliği', 0, 200, true) || undefined,
  };
}

const PUSH_PLATFORMS = ['ios', 'android', 'web'] as const;
export function parsePushToken(v: unknown): { token: string; platform: 'ios' | 'android' | 'web' } {
  const o = obj(v);
  if (!PUSH_PLATFORMS.includes(o.platform as never)) throw badRequest('Geçersiz platform (ios, android veya web olmalı).');
  return { token: text(o.token, 'Jeton', 8, 400), platform: o.platform as 'ios' | 'android' | 'web' };
}

export function parseChat(v: unknown): { text: string; voice: boolean; tone: VoiceTone } {
  const o = obj(v);
  const tone = (['bilge', 'gizemli', 'fisilti'] as const).includes(o.tone as never) ? (o.tone as VoiceTone) : 'bilge';
  return { text: text(o.text, 'Soru', 1, 500), voice: o.voice === true, tone };
}
