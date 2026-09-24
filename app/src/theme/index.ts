import { Platform } from 'react-native';

// Palet: gece mürekkebi, eski altın, fildişi. Doygun mor/pembe yok; vurgu tek renk: altın.
export const colors = {
  bg: '#0B0710',
  bgDeep: '#06030A',
  card: '#140D1C',
  cardHi: '#1C1327',
  border: 'rgba(226,196,138,0.13)',
  borderStrong: 'rgba(226,196,138,0.26)',
  borderGold: 'rgba(226,196,138,0.5)',
  primary: '#9B7BC0', // seçili durumlar için sönük ametist
  primaryDeep: '#5A3C78',
  gold: '#DDBB7A',
  goldBright: '#F0D9A4',
  goldDeep: '#B18A47',
  rose: '#C76A86', // şarap gülü (uyum/skor göstergesi için; rozetlerde kullanılmaz)
  amber: '#E3A05C', // bakır-kehribar: dikkat çeken rozetler (altınla aynı aile, daha sıcak)
  amberDeep: '#8C5A28',
  text: '#F4ECDD',
  textDim: '#BDB0C2',
  textFaint: '#8C7F94',
  danger: '#E7788F',
  success: '#8FD1AE',
  ink: '#241606', // altın zemin üstünde yazı
  goldTint: 'rgba(221,187,122,0.09)',
  goldTintStrong: 'rgba(221,187,122,0.18)',
  surface: '#191120', // sohbet balonu, yükseltilmiş yüzey
  userBubble: '#3A2250',
};

/**
 * Yazı tipleri. Web'de Google Fonts (lib/fonts.ts yükler), mobilde expo-google-fonts.
 * `serif` ve `sans` sabitleri Text bileşeninde ağırlığa göre gerçek yazı ailesine çevrilir.
 */
export const serif = (Platform.OS === 'web'
  ? '"Cormorant Garamond", "Cormorant", Georgia, "Times New Roman", serif'
  : 'FalSerif') as string;

export const sans = (Platform.OS === 'web'
  ? 'Jost, "Helvetica Neue", system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif'
  : 'FalSans') as string;

export const radius = { sm: 8, md: 12, lg: 16, xl: 24 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const gradients = {
  bg: ['#0B0710', '#130A1A', '#0B0710'] as const,
  primary: ['#EBD3A0', '#C79F55'] as const,
  gold: ['#EBD3A0', '#C79F55'] as const,
  card: ['#1A1223', '#130C1A'] as const,
  cardGold: ['#241A2C', '#170F1F'] as const,
  hero: ['#2A1338', '#1A0C26', '#120A1B'] as const,
  rose: ['#C76A86', '#7B4A9C'] as const,
};
