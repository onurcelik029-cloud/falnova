import React from 'react';
import { Platform, StyleSheet, Text as RNText, type TextProps } from 'react-native';
import { sans, serif } from '@/theme';

const SERIF_BY_WEIGHT: Record<string, string> = {
  '400': 'CormorantGaramond_500Medium', '500': 'CormorantGaramond_500Medium', '600': 'CormorantGaramond_600SemiBold',
  '700': 'CormorantGaramond_700Bold', '800': 'CormorantGaramond_700Bold', '900': 'CormorantGaramond_700Bold',
};
const SANS_BY_WEIGHT: Record<string, string> = {
  '400': 'Jost_400Regular', '500': 'Jost_500Medium', '600': 'Jost_600SemiBold',
  '700': 'Jost_600SemiBold', '800': 'Jost_600SemiBold', '900': 'Jost_600SemiBold',
};

/**
 * Uygulamanın Text bileşeni: varsayılan yazı tipi Jost; `fontFamily: serif` verilen yerler Cormorant olur.
 * Web'de fontWeight aynen kalır; mobilde ağırlık, ilgili gerçek yazı ailesine çevrilir.
 */
export const Text = React.forwardRef<RNText, TextProps>(function Text({ style, ...rest }, ref) {
  const flat = (StyleSheet.flatten(style) ?? {}) as { fontFamily?: string; fontWeight?: string | number };
  const isSerif = flat.fontFamily === serif;
  if (Platform.OS === 'web') {
    return <RNText ref={ref} {...rest} style={[{ fontFamily: sans }, style]} />;
  }
  const w = String(flat.fontWeight ?? '400');
  const family = (isSerif ? SERIF_BY_WEIGHT : SANS_BY_WEIGHT)[w] ?? (isSerif ? SERIF_BY_WEIGHT['500'] : SANS_BY_WEIGHT['400']);
  return <RNText ref={ref} {...rest} style={[style, { fontFamily: family, fontWeight: 'normal' }]} />;
});
