import React from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { colors } from '@/theme';

interface Emblem { paths: string[]; circles?: [number, number, number, boolean?][]; ellipses?: [number, number, number, number][] }

/**
 * Her Majör Arkana kartı için elle tasarlanmış, ince çizgili bir amblem — sistem fontundaki
 * ☀ ✦ ☾ gibi karakterlerin yerini alır. ZodiacGlyph'in "takımyıldız" diliyle aynı aileden:
 * ince çizgiler + yıldız noktaları, kartın geleneksel imgesinden esinlenen soyut bir iz.
 */
const EMBLEMS: Record<number, Emblem> = {
  0: { paths: ['M4,25 L13,12 L20,17 L27,6'], circles: [[27, 6, 2.6, true]] }, // Deli: uçurum kenarı + güneş
  1: { paths: ['M9,11 a3.1,2.6 0 1,0 6.2,0 a3.1,2.6 0 1,0 -6.2,0', 'M19,11 a3.1,2.6 0 1,0 6.2,0 a3.1,2.6 0 1,0 -6.2,0', 'M16,17 L16,27'], circles: [[16, 15, 1.6, true]] }, // Büyücü: sonsuzluk + değnek
  2: { paths: ['M8,7 L8,25', 'M24,7 L24,25', 'M12,17 a4,4 0 1,1 8,0 a4,4 0 0,1 -8,0'], circles: [[16, 17, 1.4, true]] }, // Başrahibe: iki sütun + peçeli daire
  3: { paths: [], circles: [[16, 16, 3, true], [16, 7, 1.6], [23, 11, 1.6], [25, 18, 1.6], [21, 24, 1.6], [11, 24, 1.6], [7, 18, 1.6], [9, 11, 1.6]] }, // İmparatoriçe: bereket çiçeği
  4: { paths: ['M9,14 a7,6 0 0,1 14,0', 'M8,26 L8,14', 'M24,26 L24,14', 'M8,26 L24,26'], circles: [[16, 8, 1.6, true]] }, // İmparator: koç boynuzu + taht
  5: { paths: ['M8,27 L8,9', 'M24,27 L24,9', 'M8,13 L24,13', 'M14,5 L18,5', 'M16,3 L16,9'], circles: [] }, // Başrahip: sütunlar + kutsal kapı
  6: { paths: ['M16,10 a4.5,4.5 0 1,0 -0.01,0 Z', 'M9,10 a4.5,4.5 0 1,1 14,0', 'M9,14 L9,10', 'M23,14 L23,10', 'M9,22 L16,27 L23,22'], circles: [] }, // Âşıklar: birleşen iki yay
  7: { paths: ['M16,7 L16,25', 'M7,16 L25,16', 'M9.5,9.5 L22.5,22.5', 'M22.5,9.5 L9.5,22.5'], circles: [[16, 16, 6, false], [16, 16, 1.6, true]] }, // Savaş Arabası: tekerlek
  8: { paths: ['M6,20 Q10,10 16,14 Q22,18 26,9'], circles: [[16, 14, 1.6, true]] }, // Güç: yumuşayan sonsuzluk eğrisi
  9: { paths: ['M13,13 L11,27', 'M19,13 L21,27', 'M11.5,13 L20.5,13 L18,7 L14,7 Z'], circles: [[16, 10, 1.5, true]] }, // Ermiş: fener + asa
  10: { paths: ['M16,4 L16,28', 'M4,16 L28,16', 'M8,8 L24,24', 'M24,8 L8,24'], circles: [[16, 16, 9, false], [16, 16, 1.7, true]] }, // Kader Çarkı: sekiz kollu çark
  11: { paths: ['M16,4 L16,26', 'M6,28 L26,28', 'M6,12 L26,12', 'M6,12 L4,18 L8,18 Z', 'M26,12 L24,18 L28,18 Z'], circles: [] }, // Adalet: terazi
  12: { paths: ['M5,9 L27,9', 'M16,9 L16,20', 'M16,20 L11,26', 'M16,20 L20,15'], circles: [[16, 23, 2.4, true]] }, // Asılan Adam: dal + baş aşağı figür
  13: { paths: ['M12,27 Q10,17 15,10', 'M15,10 L12,7', 'M15,10 L18,7'], circles: [[15, 8, 1.4], [19, 5, 1.1], [12, 5, 1.1], [15, 10, 1.7, true]] }, // Ölüm: solup yeniden filizlenen sap
  14: { paths: ['M8,10 L12,10 L10,20 L6,20 Z', 'M20,12 L24,12 L26,22 L22,22 Z', 'M12,13 Q17,7 22,15'], circles: [] }, // Denge: iki kap arası akış
  15: { paths: ['M11,12 Q9,5 6,9', 'M21,12 Q23,5 26,9', 'M8,24 L24,24 L20,14 L12,14 Z'], circles: [[16, 18, 1.5, true]] }, // Şeytan: boynuzlar + zincir
  16: { paths: ['M12,4 L12,28', 'M20,4 L20,28', 'M12,4 L20,4', 'M9,17 L18,13 L13,19 L22,15'], circles: [[9, 26, 1, false], [23, 24, 1, false]] }, // Kule: yapı + yıldırım
  17: { paths: ['M16,5 L18,13 L26,13 L19.5,17.5 L22,25 L16,20.5 L10,25 L12.5,17.5 L6,13 L14,13 Z', 'M9,27 Q11,24 9,21', 'M23,27 Q25,24 23,21'], circles: [] }, // Yıldız: büyük yıldız + su akışı
  18: { paths: ['M20,7 a9,9 0 1,0 0,18 a7,7 0 1,1 0,-18 Z', 'M7,27 L7,9', 'M25,27 L25,9'], circles: [[16, 26, 1, false], [12, 24, 0.8, false], [20, 24, 0.8, false]] }, // Ay: hilal + iki kule
  19: { paths: ['M16,5 L16,9', 'M16,23 L16,27', 'M5,16 L9,16', 'M23,16 L27,16', 'M8,8 L11,11', 'M24,8 L21,11', 'M8,24 L11,21', 'M24,24 L21,21'], circles: [[16, 16, 6, false], [16, 16, 1.7, true]] }, // Güneş: ışınlı daire
  20: { paths: ['M10,26 L16,10 L22,26', 'M16,10 L16,4'], circles: [[16, 5, 1.8, true]] }, // Mahşer: yükselen çağrı
  21: { paths: [], ellipses: [[16, 16, 10, 12]], circles: [[16, 5, 1.3], [27, 16, 1.3], [16, 27, 1.3], [5, 16, 1.3], [16, 16, 1.7, true]] }, // Dünya: çelenk + merkez yıldız
};

export function TarotGlyph({ id, size = 40, color = colors.gold, accent }: { id: number; size?: number; color?: string; accent?: string }) {
  const e = EMBLEMS[id] ?? EMBLEMS[0];
  const bright = accent ?? color;
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {e.ellipses?.map((el, i) => (
        <Ellipse key={`e${i}`} cx={el[0]} cy={el[1]} rx={el[2]} ry={el[3]} stroke={color} strokeWidth={1.2} opacity={0.55} fill="none" />
      ))}
      {e.paths.map((p, i) => (
        <Path key={`p${i}`} d={p} stroke={color} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.7} />
      ))}
      {e.circles?.map(([cx, cy, r, isBright], i) => (
        <Circle key={`c${i}`} cx={cx} cy={cy} r={r} stroke={isBright ? undefined : color} strokeWidth={isBright ? 0 : 1.2} fill={isBright ? bright : 'none'} opacity={isBright ? 1 : 0.6} />
      ))}
    </Svg>
  );
}
