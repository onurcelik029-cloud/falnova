import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';
import { signFromDate, parseTrDate, zodiacById } from '@/shared/zodiac.ts';
import type { KarmicTopicId, Profile } from '@/shared/types.ts';
import { KARMIC_TOPICS } from '@/shared/mock2.ts';
import { maskDate, maskTime } from '@/lib/format';
import { colors } from '@/theme';
import { Chip, Field } from './ui';
import { ZodiacGlyph } from './ZodiacGlyph';

export interface ProfileDraft {
  name: string;
  birthDate: string; // GG.AA.YYYY
  birthTime: string;
  birthPlace: string;
  /** Şu an en çok meşgul eden konu (isteğe bağlı). Boş = seçilmedi. */
  focus?: KarmicTopicId | '';
}

export const emptyDraft: ProfileDraft = { name: '', birthDate: '', birthTime: '', birthPlace: '', focus: '' };

export function draftFromProfile(p: Profile): ProfileDraft {
  const [y, m, d] = p.birthDate.split('-');
  return { name: p.name, birthDate: `${d}.${m}.${y}`, birthTime: p.birthTime ?? '', birthPlace: p.birthPlace ?? '', focus: p.focus ?? '' };
}

export function draftToProfile(d: ProfileDraft): { profile?: Profile; error?: string } {
  const name = d.name.trim();
  if (name.length < 2) return { error: 'Adını yazar mısın?' };
  const iso = parseTrDate(d.birthDate);
  if (!iso) return { error: 'Doğum tarihini GG.AA.YYYY biçiminde gir (örn. 14.03.1995).' };
  const sign = signFromDate(iso);
  if (!sign) return { error: 'Doğum tarihi okunamadı.' };
  const time = d.birthTime.trim();
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { error: 'Doğum saatini SS:DD biçiminde gir (örn. 08:30) ya da boş bırak.' };
  return { profile: { name, birthDate: iso, birthTime: time || undefined, birthPlace: d.birthPlace.trim() || undefined, sign, focus: d.focus || undefined } };
}

export function ProfileFields({ value, onChange, showFocus = true }: { value: ProfileDraft; onChange: (d: ProfileDraft) => void; showFocus?: boolean }) {
  const iso = parseTrDate(value.birthDate);
  const sign = iso ? signFromDate(iso) : null;
  const z = sign ? zodiacById(sign) : null;
  return (
    <View style={{ gap: 14 }}>
      <Field label="Adın" value={value.name} onChangeText={(t) => onChange({ ...value, name: t })} placeholder="Adın" autoCapitalize="words" testID="f-name" />
      <Field
        label="Doğum tarihin" value={value.birthDate} onChangeText={(t) => onChange({ ...value, birthDate: maskDate(t) })}
        placeholder="GG.AA.YYYY" keyboardType="number-pad" maxLength={10} testID="f-birth"
      />
      {z ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -6 }}>
          <ZodiacGlyph id={z.id} size={22} />
          <Text style={{ color: colors.textDim, fontSize: 13 }}>Burcun: <Text style={{ color: colors.text, fontWeight: '700' }}>{z.name}</Text> · {z.planet} yönetiminde</Text>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Field label="Doğum saati (ops.)" value={value.birthTime} onChangeText={(t) => onChange({ ...value, birthTime: maskTime(t) })} placeholder="SS:DD" keyboardType="number-pad" maxLength={5} />
        </View>
        <View style={{ flex: 1.3 }}>
          <Field label="Doğum yeri (ops.)" value={value.birthPlace} onChangeText={(t) => onChange({ ...value, birthPlace: t })} placeholder="Şehir" autoCapitalize="words" />
        </View>
      </View>
      {showFocus ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.textDim, fontSize: 12.5, letterSpacing: 0.4 }}>Şu sıra seni en çok ne meşgul ediyor? (isteğe bağlı)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {KARMIC_TOPICS.map((t) => (
              <Chip key={t.id} label={t.label} selected={value.focus === t.id} onPress={() => onChange({ ...value, focus: value.focus === t.id ? '' : t.id })} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
