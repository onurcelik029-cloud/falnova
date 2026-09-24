import type { Element, ZodiacId } from './types.ts';

export interface ZodiacInfo {
  id: ZodiacId;
  name: string;
  symbol: string;
  element: Element;
  planet: string;
  range: string;
  trait: string;
}

export const ELEMENT_LABEL: Record<Element, string> = {
  ates: 'Ateş',
  toprak: 'Toprak',
  hava: 'Hava',
  su: 'Su',
};

export const ZODIAC: ZodiacInfo[] = [
  { id: 'koc', name: 'Koç', symbol: '♈', element: 'ates', planet: 'Mars', range: '21 Mar – 19 Nis', trait: 'cesur ve öncü' },
  { id: 'boga', name: 'Boğa', symbol: '♉', element: 'toprak', planet: 'Venüs', range: '20 Nis – 20 May', trait: 'kararlı ve sadık' },
  { id: 'ikizler', name: 'İkizler', symbol: '♊', element: 'hava', planet: 'Merkür', range: '21 May – 20 Haz', trait: 'meraklı ve çevik' },
  { id: 'yengec', name: 'Yengeç', symbol: '♋', element: 'su', planet: 'Ay', range: '21 Haz – 22 Tem', trait: 'sezgisel ve koruyucu' },
  { id: 'aslan', name: 'Aslan', symbol: '♌', element: 'ates', planet: 'Güneş', range: '23 Tem – 22 Ağu', trait: 'ışıltılı ve cömert' },
  { id: 'basak', name: 'Başak', symbol: '♍', element: 'toprak', planet: 'Merkür', range: '23 Ağu – 22 Eyl', trait: 'titiz ve şifacı' },
  { id: 'terazi', name: 'Terazi', symbol: '♎', element: 'hava', planet: 'Venüs', range: '23 Eyl – 22 Eki', trait: 'zarif ve dengeli' },
  { id: 'akrep', name: 'Akrep', symbol: '♏', element: 'su', planet: 'Plüton', range: '23 Eki – 21 Kas', trait: 'derin ve dönüştürücü' },
  { id: 'yay', name: 'Yay', symbol: '♐', element: 'ates', planet: 'Jüpiter', range: '22 Kas – 21 Ara', trait: 'özgür ve iyimser' },
  { id: 'oglak', name: 'Oğlak', symbol: '♑', element: 'toprak', planet: 'Satürn', range: '22 Ara – 19 Oca', trait: 'disiplinli ve hırslı' },
  { id: 'kova', name: 'Kova', symbol: '♒', element: 'hava', planet: 'Uranüs', range: '20 Oca – 18 Şub', trait: 'özgün ve vizyoner' },
  { id: 'balik', name: 'Balık', symbol: '♓', element: 'su', planet: 'Neptün', range: '19 Şub – 20 Mar', trait: 'hayalperest ve şefkatli' },
];

export function zodiacById(id: ZodiacId): ZodiacInfo {
  return ZODIAC.find((z) => z.id === id) ?? ZODIAC[0];
}

/** month: 1-12, day: 1-31 */
export function signFromMonthDay(month: number, day: number): ZodiacId {
  const md = month * 100 + day;
  if (md >= 321 && md <= 419) return 'koc';
  if (md >= 420 && md <= 520) return 'boga';
  if (md >= 521 && md <= 620) return 'ikizler';
  if (md >= 621 && md <= 722) return 'yengec';
  if (md >= 723 && md <= 822) return 'aslan';
  if (md >= 823 && md <= 922) return 'basak';
  if (md >= 923 && md <= 1022) return 'terazi';
  if (md >= 1023 && md <= 1121) return 'akrep';
  if (md >= 1122 && md <= 1221) return 'yay';
  if (md >= 1222 || md <= 119) return 'oglak';
  if (md >= 120 && md <= 218) return 'kova';
  return 'balik';
}

/** "YYYY-MM-DD" -> burç. Geçersizse null. */
export function signFromDate(iso: string): ZodiacId | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return signFromMonthDay(month, day);
}

/** "GG.AA.YYYY" (kullanıcı girişi) -> "YYYY-MM-DD" ya da null. */
export function parseTrDate(input: string): string | null {
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(input.trim());
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (y < 1900 || y > new Date().getFullYear()) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function formatTrDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

/** Element uyum matrisi (0-100 taban puan). */
const ELEMENT_BASE: Record<Element, Record<Element, number>> = {
  ates: { ates: 82, hava: 88, toprak: 55, su: 48 },
  hava: { ates: 88, hava: 78, toprak: 52, su: 60 },
  toprak: { ates: 55, hava: 52, toprak: 84, su: 86 },
  su: { ates: 48, hava: 60, toprak: 86, su: 82 },
};

export function elementCompatibility(a: Element, b: Element): number {
  return ELEMENT_BASE[a][b];
}
