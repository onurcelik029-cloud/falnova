// Nova'nın Sözcük Bulmacası: fal/mistik temalı kelime bulma oyunu.
// Bulmaca sunucu tarafında (ya da demo modunda cihazda) üretilir; istemci yalnızca hangi kelimeleri
// bulduğunu bildirir — gerçek çözüm (harf ızgarası + kelime listesi) zaten kullanıcıya gösterilir
// (klasik kelime bulmaca formatı budur), asıl sahtekârlık koruması sunucu tarafındaki deneme kaydı,
// tek kullanımlık jeton, minimum oynama süresi ve günlük ödül tavanıdır (bkz. backend/src/store.ts).

import { type Rng, int, pick, pickN } from './rng.ts';

export const GRID_SIZE = 9;
export const WORDS_PER_PUZZLE = 6;
/** Bir bulmacayı bitirmek için gereken en az bulunmuş kelime sayısı (WORDS_PER_PUZZLE'a eşit = tam tamamlama). */
export const WORDS_TO_COMPLETE = WORDS_PER_PUZZLE;

export const WORD_POOL = [
  'FAL', 'KART', 'KADER', 'BURÇ', 'TELVE', 'RÜYA', 'YILDIZ', 'KISMET',
  'NAZAR', 'UĞUR', 'AŞK', 'YOL', 'KALP', 'MELEK', 'IŞIK', 'ANAHTAR', 'SIR', 'YOLCU',
] as const;

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
const FILLER = Array.from('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ');

export interface WordPlacement { word: string; cells: [number, number][] }
export interface WordPuzzle { grid: string[][]; words: string[] }

/** Deterministik değildir (her deneme farklı çıksın diye rng'ye gerçek zamanlı bir tuz katılmalı — çağıran taraf sorumludur). */
export function buildWordPuzzle(rng: Rng, size = GRID_SIZE, wordCount = WORDS_PER_PUZZLE): WordPuzzle & { placements: WordPlacement[] } {
  const candidates = pickN(rng, WORD_POOL, Math.min(wordCount, WORD_POOL.length)).filter((w) => w.length <= size);
  const grid: (string | null)[][] = Array.from({ length: size }, () => Array<string | null>(size).fill(null));
  const placements: WordPlacement[] = [];

  for (const word of candidates) {
    const letters = Array.from(word);
    const L = letters.length;
    for (let attempt = 0; attempt < 200; attempt++) {
      const [dr, dc] = pick(rng, DIRS);
      const minR = dr >= 0 ? 0 : (L - 1) * -dr;
      const maxR = dr >= 0 ? size - 1 - (L - 1) * dr : size - 1;
      const minC = dc >= 0 ? 0 : (L - 1) * -dc;
      const maxC = dc >= 0 ? size - 1 - (L - 1) * dc : size - 1;
      if (minR > maxR || minC > maxC) continue;
      const r0 = int(rng, minR, maxR);
      const c0 = int(rng, minC, maxC);
      const cells: [number, number][] = [];
      let ok = true;
      for (let i = 0; i < L; i++) {
        const r = r0 + dr * i;
        const c = c0 + dc * i;
        const cur = grid[r][c];
        if (cur !== null && cur !== letters[i]) { ok = false; break; }
        cells.push([r, c]);
      }
      if (!ok) continue;
      cells.forEach(([r, c], i) => { grid[r][c] = letters[i]; });
      placements.push({ word, cells });
      break;
    }
    // 200 denemede yerleşmezse (çok nadir, küçük ızgarada uzun kelime) o kelime bu bulmacada atlanır.
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === null) grid[r][c] = pick(rng, FILLER);
    }
  }

  return { grid: grid as string[][], words: placements.map((p) => p.word), placements };
}
