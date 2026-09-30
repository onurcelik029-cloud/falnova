import React from 'react';
import { Platform, View } from 'react-native';
import { Text } from '@/components/Text';
import { colors, serif } from '@/theme';

/**
 * Uygulama genelinde son çare: bir ekran render sırasında beklenmedik biçimde patlarsa (örn. web'de
 * React'in DOM reconciliation'ında nadir görülen bir yarış durumu — bkz. tarot/kahve/rüya "yorumla"
 * sonrası sonuç ekranına geçiş), kullanıcı boş/beyaz bir sayfayla baş başa kalmasın diye burada
 * yakalanır. Alttaki veriler her zaman güvende: okuma zaten backend'de kaydedilmiştir (Geçmişim'den
 * erişilebilir), kaybolan yalnızca o anki geçiş animasyonudur.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] yakalanan render hatası:', error);
  }

  private reset = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/';
      return;
    }
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 18 }}>
        <Text style={{ fontFamily: serif, fontSize: 40, color: colors.gold }}>✦</Text>
        <Text style={{ fontFamily: serif, fontSize: 22, color: colors.text, textAlign: 'center' }}>Bir sis perdesi düştü</Text>
        <Text style={{ fontSize: 14, color: colors.textDim, textAlign: 'center', lineHeight: 20 }}>
          Ekran beklenmedik şekilde takıldı; merak etme, okuman güvende — Geçmişim bölümünde seni bekliyor. Devam etmek için yeniden dene.
        </Text>
        <View
          onTouchEnd={this.reset}
          // @ts-expect-error web-only onClick kısayolu; native'de onTouchEnd çalışır
          onClick={this.reset}
          style={{ marginTop: 8, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 999, backgroundColor: colors.gold }}
        >
          <Text style={{ color: colors.bgDeep, fontWeight: '700', fontSize: 15 }}>Yeniden Dene</Text>
        </View>
      </View>
    );
  }
}
