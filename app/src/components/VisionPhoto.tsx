import React from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { Text } from '@/components/Text';
import type { FortuneResult } from '@/shared/types.ts';
import { colors } from '@/theme';

/**
 * Fal sonucunun büyük "vizyon" sahnesi — CoffeeVision'daki elle çizilmiş SVG sahnenin yerine,
 * aynı parşömen-çerçeve + altın plaket dilini kullanan, gerçek "mistik realist" bir fotoğraf
 * gösterir. Fotoğraflar Bing Image Creator ile üretildi (orijinal kompozisyonlar, telifli bir
 * deste/marka kopyalanmadı) ve mobil paket boyutu için ~900px genişliğe optimize edildi.
 * Küçük mühür ikonlarından kasıtlı olarak ayrı: burası ekranın vurucu anı.
 */
export function VisionPhoto({
  source, label, width = 210, rotate = -1.6,
}: {
  source: ImageSourcePropType;
  label: string;
  width?: number;
  rotate?: number;
}) {
  const inner = width - 24;
  const photoHeight = Math.round(inner * (2 / 3)); // kaynaklar 3:2 oranında üretildi

  return (
    <View style={{ transform: [{ rotate: `${rotate}deg` }], alignSelf: 'center' }}>
      <View
        style={{
          backgroundColor: colors.paper, padding: 9, borderRadius: 2, alignItems: 'center',
          shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 14 }, elevation: 8,
        }}
      >
        <View style={{ borderWidth: 1, borderColor: colors.gilt, padding: 3 }}>
          <Image source={source} style={{ width: inner, height: photoHeight }} resizeMode="cover" />
        </View>

        <View
          style={{
            marginTop: -6, backgroundColor: colors.giltBright, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 2,
            shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3,
          }}
        >
          <Text style={{ fontSize: 9, letterSpacing: 1.4, color: '#241606', fontWeight: '600' }}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

/** Her fal türünün imza fotoğrafı + varsayılan plaket etiketi + hafif farklı bir eğim.
 * Henüz fotoğrafı üretilmemiş türler burada yer almaz — o ekranlar eski ikon baloncuğuyla kalır. */
export const VISION_META: Partial<Record<FortuneResult['kind'], { source: ImageSourcePropType; label: string; rotate: number }>> = {
  coffee: { source: require('../../assets/images/visions/coffee.jpg'), label: 'KUŞ · HABER İŞARETİ', rotate: -1.6 },
  tarot: { source: require('../../assets/images/visions/tarot.jpg'), label: 'YILDIZ · KADERİN İŞARETİ', rotate: 1.4 },
  horoscope: { source: require('../../assets/images/visions/zodiac.jpg'), label: 'BURÇ REHBERİ', rotate: -1.2 },
  dream: { source: require('../../assets/images/visions/dream.jpg'), label: 'RÜYA TABİRİ', rotate: 1.8 },
  palm: { source: require('../../assets/images/visions/palm.jpg'), label: 'EL FALI', rotate: -1.4 },
  couple: { source: require('../../assets/images/visions/couple.jpg'), label: 'PARTNER ANALİZİ', rotate: 1.3 },
  karmic: { source: require('../../assets/images/visions/karmic.jpg'), label: 'KARMİK DÖNEMEÇ', rotate: -1.7 },
  natal: { source: require('../../assets/images/visions/natal.jpg'), label: 'DOĞUM HARİTASI', rotate: 1.5 },
};
