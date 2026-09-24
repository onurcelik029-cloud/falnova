import { getItem, setItem } from '@/lib/storage.ts';

const KEY = 'falnova.demo.fast';

// Adres çubuğundaki ?fast=1 yönlendirici adresi değiştirmeden ÖNCE, modül yüklenirken okunur.
const URL_FAST = (() => {
  try {
    const g = globalThis as { location?: { search?: string } };
    return !!g.location?.search && /[?&]fast=1\b/.test(g.location.search);
  } catch {
    return false;
  }
})();

/**
 * Yalnızca DEMO modunda: bekleme ritüelini kısaltır (test/tanıtım için).
 * Web'de adrese ?fast=1 eklemek de aynı işi görür. Canlı modda hiçbir etkisi yoktur.
 */
export async function getDemoFast(): Promise<boolean> {
  if (URL_FAST) return true;
  return (await getItem(KEY)) === '1';
}

export async function setDemoFast(on: boolean): Promise<void> {
  await setItem(KEY, on ? '1' : '0');
}
