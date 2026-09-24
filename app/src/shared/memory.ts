// "Nova seni tanır": kullanıcının GERÇEK geçmişinden (odak konusu, son okumalar) türetilen bağlam.
// Yalnızca kayıtlı veriye dayanır; uydurma anı üretilmez.

import type { FortuneKind, KarmicTopicId, Profile } from './types.ts';
import { KARMIC_TOPICS } from './mock2.ts';
import { KIND_LABEL } from './packages.ts';

export interface MemoryFortune {
  kind: FortuneKind;
  title: string;
  createdAt: string;
  symbols?: string[];
  topic?: string;
}

const focusLabel = (id?: KarmicTopicId) => KARMIC_TOPICS.find((t) => t.id === id)?.label;

function when(iso: string, nowMs: number): string {
  const days = Math.floor((nowMs - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'bugün';
  if (days === 1) return 'dün';
  if (days < 7) return `${days} gün önce`;
  if (days < 14) return 'geçen hafta';
  return `${Math.floor(days / 7)} hafta önce`;
}

/** Sembol adı yapay zekâ istemine girer: yalnızca harf/rakam/boşluk/tire bırakılır, 24 karakterle sınırlanır. */
export const cleanSymbol = (s: string): string =>
  s.normalize('NFC').replace(/[^\p{L}\p{N} \-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 24);

const READABLE: FortuneKind[] = ['coffee', 'tarot', 'dream', 'couple', 'karmic'];
/** Tekrar eden bir sembol/temayı fark etmek için kaç son okumaya bakılır. */
const PATTERN_WINDOW = 6;

/**
 * Son birkaç okuma arasında (tek okumada değil, FARKLI okumalarda) tekrar eden bir sembol var mı?
 * Nova'nın tek bir okumayı değil, kullanıcının gerçek geçmişindeki bir örüntüyü fark etmesini sağlar.
 * Aynı okuma içinde iki kez geçen bir sembol sayılmaz; en az iki AYRI okumada geçmesi gerekir.
 */
function recurringSymbol(list: MemoryFortune[]): { symbol: string; count: number } | null {
  const counts = new Map<string, { display: string; count: number }>();
  for (const f of list.slice(0, PATTERN_WINDOW)) {
    const seenInThisReading = new Set<string>();
    for (const raw of f.symbols ?? []) {
      const cleaned = cleanSymbol(raw);
      const key = cleaned.toLocaleLowerCase('tr-TR');
      if (!cleaned || seenInThisReading.has(key)) continue;
      seenInThisReading.add(key);
      const cur = counts.get(key);
      counts.set(key, { display: cur?.display ?? cleaned, count: (cur?.count ?? 0) + 1 });
    }
  }
  let best: { symbol: string; count: number } | null = null;
  for (const { display, count } of counts.values()) {
    if (count >= 2 && (!best || count > best.count)) best = { symbol: display, count };
  }
  return best;
}

export interface NovaMemory {
  /** Yapay zekâ isteminin sonuna eklenecek bağlam satırı ('' olabilir). */
  promptLine: string;
  /** Kullanıcıya gösterilen kısa "Nova'nın notu" (yoksa null). */
  note: string | null;
}

export function buildMemory(profile: Profile, recent: MemoryFortune[], nowMs = Date.now()): NovaMemory {
  const list = recent.filter((f) => READABLE.includes(f.kind)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const focus = focusLabel(profile.focus);
  const parts: string[] = [];
  if (focus) parts.push(`kullanıcının kendi belirttiği odak konusu: ${focus}`);
  if (list.length) {
    parts.push('son okumaları: ' + list.slice(0, 3).map((f) => {
      const syms = (f.symbols ?? []).map(cleanSymbol).filter(Boolean).slice(0, 4);
      const sym = syms.length ? ` (semboller: ${syms.join(', ')})` : '';
      return `${KIND_LABEL[f.kind]} ${when(f.createdAt, nowMs)}${sym}`;
    }).join('; '));
  }
  const pattern = recurringSymbol(list);
  if (pattern) parts.push(`dikkat: "${pattern.symbol}" sembolü son ${pattern.count} farklı okumada tekrar etti — bu tekrarı fark ettiğini hafifçe belli edebilirsin`);
  const promptLine = parts.length
    ? `Bağlam (kayıtlı gerçek geçmiş; bunu hafifçe an, yeni anı UYDURMA): ${parts.join('. ')}.`
    : '';

  let note: string | null = null;
  const last = list[0];
  if (pattern) {
    // Tek bir okumayı hatırlamaktan daha güçlü bir sinyal: gerçek bir örüntü. Öncelik bunda.
    note = `“${pattern.symbol}” sembolü son ${pattern.count} okumanda da karşıma çıktı. Rastlantı olmayabilir — bu senin için ne ifade ediyor olabilir?`;
  } else if (last) {
    const w = when(last.createdAt, nowMs);
    const sym = last.symbols?.[0] ? cleanSymbol(last.symbols[0]) : '';
    if (last.kind === 'coffee' && sym) note = `${w[0].toUpperCase()}${w.slice(1)} baktığımız fincanda “${sym}” sembolü vardı. Aradan bir şey değişti mi?`;
    else if (last.kind === 'dream' && sym) note = `${w[0].toUpperCase()}${w.slice(1)} anlattığın rüyada “${sym}” öne çıkıyordu. Sana o günden bir şey kalmış mı?`;
    else if (last.kind === 'tarot') note = `${w[0].toUpperCase()}${w.slice(1)} açtığın kartlar hâlâ aklımda. Bugün onlardan hangisi sana daha yakın?`;
    else if (last.kind === 'karmic') note = `${w[0].toUpperCase()}${w.slice(1)} çıkardığımız dönemeç yolunda mı ilerliyor? İstersen konuşalım.`;
    else note = `${KIND_LABEL[last.kind]} ${w} yapmıştık. Ne hissediyorsun, oturdu mu?`;
  } else if (focus) {
    note = `Aklındaki konu “${focus}” demiştin. Fincanla mı, kartlarla mı başlamak istersin?`;
  }
  return { promptLine, note };
}
