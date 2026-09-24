// Web: Google Fonts stil dosyasını çalışma anında ekler. (Mobil sürüm için fonts.native.ts kullanılır.)
import { useEffect } from 'react';

const HREF =
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Jost:wght@400;500;600&display=swap';

export function useAppFonts(): boolean {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById('falnova-fonts')) return;
    const link = document.createElement('link');
    link.id = 'falnova-fonts';
    link.rel = 'stylesheet';
    link.href = HREF;
    document.head.appendChild(link);
  }, []);
  return true;
}
