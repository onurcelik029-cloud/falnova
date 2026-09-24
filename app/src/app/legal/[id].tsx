import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { useLocalSearchParams } from 'expo-router';
import { Body, Dim, Screen } from '@/components/ui';
import { LEGAL_UPDATED, legalDoc } from '@/legal/texts';
import { colors, serif } from '@/theme';

export default function LegalDocScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const doc = legalDoc(String(id));
  if (!doc) return <Screen title="Yasal" back><Dim>Metin bulunamadı.</Dim></Screen>;

  return (
    <Screen title={doc.title} subtitle={`Son güncelleme: ${LEGAL_UPDATED}`} back>
      <View style={{ gap: 18 }}>
        {doc.sections.map((sec, i) => (
          <View key={i} style={{ gap: 8 }}>
            {sec.h ? <Text style={{ fontFamily: serif, fontSize: 19, color: colors.goldBright, fontWeight: '600' }}>{sec.h}</Text> : null}
            {sec.p.map((line, k) => line.startsWith('• ') ? (
              <View key={k} style={{ flexDirection: 'row', gap: 10, paddingRight: 6 }}>
                <Text style={{ color: colors.gold, fontSize: 14, lineHeight: 22 }}>·</Text>
                <Body style={{ flex: 1, fontSize: 14, lineHeight: 22, color: colors.textDim }}>{line.slice(2)}</Body>
              </View>
            ) : (
              <Body key={k} style={{ fontSize: 14, lineHeight: 22, color: colors.textDim }}>{line}</Body>
            ))}
          </View>
        ))}
      </View>
    </Screen>
  );
}
