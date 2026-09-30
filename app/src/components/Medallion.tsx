import React from 'react';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import { colors } from '@/theme';

export type MedallionKind = 'coffee' | 'tarot' | 'zodiac' | 'dream' | 'palm' | 'couple' | 'game' | 'natal' | 'voice' | 'karmic';

/**
 * Parşömen kartların üstüne oturan, elle çizilmiş mühür/madalyon ikonu.
 * Tasarım kimliğinin merkezi: doygun mücevher renkleri yok — sadece mürekkep-kahvesi
 * çizgi (ink) + kısık altın (gilt) vurgusu. Küçük boyutlarda (56–96px) net kalması için
 * kasıtlı olarak sade ve çizgisel; "gerçekçi" detay büyük sahne illüstrasyonlarına ayrıldı.
 */
export function Medallion({ kind, size = 72 }: { kind: MedallionKind; size?: number }) {
  const ink = colors.inkText;
  const inkDim = colors.inkDim;
  const gilt = colors.gilt;
  const giltBright = colors.giltBright;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Circle cx={50} cy={50} r={44.5} stroke={ink} strokeWidth={1} opacity={0.35} fill="none" />
      <Path d="M50,2.5 48.7,5.7 45.2,6.3 48.7,6.9 50,10.1 51.3,6.9 54.8,6.3 51.3,5.7 Z" fill={giltBright} />

      {kind === 'coffee' && (
        <G>
          <Path d="M34,50 C33,64 35,74 44,79 C48,81.5 52,81.5 56,79 C65,74 67,64 66,50 Z" stroke={ink} strokeWidth={1.8} fill="none" />
          <Path d="M66,54 C74,54 76,62 70,66 C67,68 65,67 64,65" stroke={ink} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <Ellipse cx={50} cy={80.5} rx={20} ry={3.6} stroke={ink} strokeWidth={1.4} opacity={0.7} fill="none" />
          <Path d="M42,48 C38,40 46,36 42,28" stroke={inkDim} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.85} />
          <Path d="M54,48 C58,40 50,34 51,26" stroke={inkDim} strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.85} />
          <Ellipse cx={49} cy={19} rx={7} ry={3.6} stroke={gilt} strokeWidth={1.6} fill="none" />
          <Circle cx={49} cy={19} r={1.6} fill={gilt} />
        </G>
      )}

      {kind === 'tarot' && (
        <G>
          <Path d="M32,30 L58,30 L58,68 L32,68 Z" stroke={inkDim} strokeWidth={1.4} fill="none" opacity={0.75} transform="rotate(-11 45 49)" />
          <Path d="M40,26 L66,26 L66,64 L40,64 Z" stroke={ink} strokeWidth={1.8} fill="none" transform="rotate(8 53 45)" />
          <Path d="M53,36 51.6,39.4 48,40 51.6,40.6 53,44 54.4,40.6 58,40 54.4,39.4 Z" fill={gilt} transform="rotate(8 53 45)" />
          <Path d="M60,52 A6.5,6.5 0 1,0 60,65 A5,5 0 1,1 60,52 Z" fill={gilt} opacity={0.9} transform="rotate(8 53 45)" />
        </G>
      )}

      {kind === 'zodiac' && (
        <G>
          <Path d="M63,29 A21,21 0 1,0 63,71 A16,16 0 1,1 63,29 Z" stroke={ink} strokeWidth={1.8} fill="none" />
          <Path d="M28,30 26.6,33.4 23,34 26.6,34.6 28,38 29.4,34.6 33,34 29.4,33.4 Z" fill={giltBright} />
          <Path d="M24,50 22.9,52.6 20,53.2 22.9,53.8 24,56.4 25.1,53.8 28,53.2 25.1,52.6 Z" fill={giltBright} />
          <Path d="M31,66 30,68.2 27.6,68.7 30,69.2 31,71.4 32,69.2 34.4,68.7 32,68.2 Z" fill={giltBright} opacity={0.85} />
          <Line x1={28} y1={30} x2={24} y2={50} stroke={inkDim} strokeWidth={0.6} opacity={0.6} />
          <Line x1={24} y1={50} x2={31} y2={66} stroke={inkDim} strokeWidth={0.6} opacity={0.6} />
        </G>
      )}

      {kind === 'dream' && (
        <G>
          <Ellipse cx={42} cy={35} rx={9} ry={6.5} fill={inkDim} opacity={0.14} />
          <Ellipse cx={53} cy={30} rx={11} ry={7.5} fill={inkDim} opacity={0.12} />
          <Ellipse cx={63} cy={36} rx={7.5} ry={5.5} fill={inkDim} opacity={0.1} />
          <Path d="M28,55 Q50,39 72,55" stroke={ink} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M64,58 L69,63" stroke={inkDim} strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
          <Path d="M69,55 L75,58" stroke={inkDim} strokeWidth={1.2} strokeLinecap="round" opacity={0.6} />
          <Circle cx={71} cy={42} r={1.6} fill={gilt} opacity={0.9} />
          <Circle cx={76} cy={48} r={1} fill={gilt} opacity={0.7} />
        </G>
      )}

      {kind === 'palm' && (
        <G>
          <G stroke={ink} strokeWidth={1.6} fill="none">
            <Path d="M33,30 L39,30 L39,51 L33,51 Z" />
            <Path d="M41,23 L47,23 L47,50 L41,50 Z" />
            <Path d="M49,20 L55,20 L55,50 L49,50 Z" />
            <Path d="M57,25 L63,25 L63,49 L57,49 Z" />
            <Path d="M29,52 C24,48 22,55 26,59 C29,61.5 33,59 34,55" />
            <Path d="M30,49 C30,66 35,76 47,80 C55,82.5 63,79.5 67,71 C71,62.5 68,53 63,48 Z" />
          </G>
          <Path d="M35,55 C43,59 51,57 61,51" stroke={gilt} strokeWidth={1} fill="none" opacity={0.8} />
          <Path d="M33,63 C43,65 55,63 65,59" stroke={gilt} strokeWidth={1} fill="none" opacity={0.65} />
          <Path d="M35,71 C45,71 55,69 63,67" stroke={gilt} strokeWidth={1} fill="none" opacity={0.5} />
          <Circle cx={61} cy={51} r={1.4} fill={giltBright} />
        </G>
      )}

      {kind === 'couple' && (
        <G>
          <Path
            d="M50,25 C64,25 72,35 72,49 C72,57 66,63 58,63 C52,63 48,59 48,53 C48,49 51,47 54,47 C57,47 58,49 57,52"
            stroke={ink} strokeWidth={1.7} fill="none"
          />
          <Path
            d="M50,75 C36,75 28,65 28,51 C28,43 34,37 42,37 C48,37 52,41 52,47 C52,51 49,53 46,53 C43,53 42,51 43,48"
            stroke={inkDim} strokeWidth={1.7} fill="none"
          />
          <Path d="M50,47 48.7,49.6 46,50.2 48.7,50.8 50,53.4 51.3,50.8 54,50.2 51.3,49.6 Z" fill={gilt} />
        </G>
      )}

      {kind === 'karmic' && (
        <G>
          <Path
            d="M50,49 C46,42 40,37 33,37 C26,37 21,42.5 21,49 C21,55.5 26,61 33,61 C40,61 46,56 50,49 C54,42 60,37 67,37 C74,37 79,42.5 79,49 C79,55.5 74,61 67,61 C60,61 54,56 50,49 Z"
            stroke={ink} strokeWidth={1.8} fill="none"
          />
          <Circle cx={33} cy={49} r={2.6} fill={inkDim} opacity={0.7} />
          <Circle cx={67} cy={49} r={2.6} fill={gilt} opacity={0.9} />
          <Path d="M50,30 51.3,33.4 55,34 51.3,34.6 50,38 48.7,34.6 45,34 48.7,33.4 Z" fill={giltBright} />
        </G>
      )}

      {kind === 'natal' && (
        <G>
          <Circle cx={50} cy={49} r={17} stroke={ink} strokeWidth={1.7} fill="none" />
          <Circle cx={50} cy={49} r={4.2} fill={gilt} opacity={0.9} />
          <Line x1={50} y1={26} x2={50} y2={33} stroke={inkDim} strokeWidth={1.3} opacity={0.8} />
          <Line x1={50} y1={65} x2={50} y2={72} stroke={inkDim} strokeWidth={1.3} opacity={0.8} />
          <Line x1={27} y1={49} x2={34} y2={49} stroke={inkDim} strokeWidth={1.3} opacity={0.8} />
          <Line x1={66} y1={49} x2={73} y2={49} stroke={inkDim} strokeWidth={1.3} opacity={0.8} />
          <Line x1={34} y1={33} x2={38.5} y2={37.5} stroke={inkDim} strokeWidth={1} opacity={0.6} />
          <Line x1={61.5} y1={60.5} x2={66} y2={65} stroke={inkDim} strokeWidth={1} opacity={0.6} />
          <Line x1={66} y1={33} x2={61.5} y2={37.5} stroke={inkDim} strokeWidth={1} opacity={0.6} />
          <Line x1={38.5} y1={60.5} x2={34} y2={65} stroke={inkDim} strokeWidth={1} opacity={0.6} />
          <Path d="M67,30 68.4,33.4 72,34 68.4,34.6 67,38 65.6,34.6 62,34 65.6,33.4 Z" fill={giltBright} />
        </G>
      )}

      {kind === 'voice' && (
        <G>
          <Path d="M50,31 A9,9 0 0 1 59,40 L59,52 A9,9 0 0 1 41,52 L41,40 A9,9 0 0 1 50,31 Z" stroke={ink} strokeWidth={1.7} fill="none" />
          <Path d="M33,47 A17,17 0 0 0 67,47" stroke={ink} strokeWidth={1.5} fill="none" strokeLinecap="round" />
          <Line x1={50} y1={64} x2={50} y2={71} stroke={inkDim} strokeWidth={1.4} strokeLinecap="round" />
          <Line x1={42} y1={71} x2={58} y2={71} stroke={inkDim} strokeWidth={1.4} strokeLinecap="round" />
          <Path d="M69,26 70.2,28.9 73,30 70.2,31.1 69,34 67.8,31.1 65,30 67.8,28.9 Z" fill={giltBright} />
        </G>
      )}

      {kind === 'game' && (
        <G>
          <Path d="M27,41 L73,41 L73,62 L50,53 L27,62 Z" stroke={ink} strokeWidth={1.7} fill="none" />
          <Path d="M35,47 L42,47 L42,54 L35,54 Z" fill={gilt} opacity={0.9} />
          <Path d="M46.5,47 L53.5,47 L53.5,54 L46.5,54 Z" fill={gilt} opacity={0.9} />
          <Path d="M58,47 L65,47 L65,54 L58,54 Z" fill={gilt} opacity={0.9} />
          <Path d="M79,28 77.6,31.4 74,32 77.6,32.6 79,36 80.4,32.6 84,32 80.4,31.4 Z" fill={giltBright} />
        </G>
      )}
    </Svg>
  );
}

import type { FortuneResult } from '@/shared/types.ts';
/** Fal türünden madalyon türüne eşleme — sohbet (chat) için özel bir mühür yok, o ekranlar eski ikonla kalır. */
export const KIND_MEDALLION: Partial<Record<FortuneResult['kind'], MedallionKind>> = {
  coffee: 'coffee', tarot: 'tarot', horoscope: 'zodiac', dream: 'dream', karmic: 'karmic',
  couple: 'couple', voice: 'voice', natal: 'natal', palm: 'palm',
};
