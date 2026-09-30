import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput,
  View, type KeyboardTypeOptions, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { Text } from '@/components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, gradients, radius, sans, serif } from '@/theme';
import { Icon, type IconName } from '@/components/Icon';
import { CurtainReveal } from '@/components/Curtain';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path as RGPath, RadialGradient, Rect, Stop } from 'react-native-svg';

// ───────── Atmosferik ışık: her ekranın arkasında, üstten süzülen soluk bir altın hâle ─────────
// Düz tek renk zemini "hızlıca boyanmış" hissinden çıkarır; ışık kaynağı hep aynı yerde (üst-orta),
// tutarlı bir "mum ışığıyla aydınlanan oda" atmosferi verir.
function Vignette() {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill as never} pointerEvents="none">
      <Defs>
        <RadialGradient id="vgTop" cx="50%" cy="-6%" r="62%">
          <Stop offset="0" stopColor={colors.gold} stopOpacity={0.16} />
          <Stop offset="0.5" stopColor={colors.primaryDeep} stopOpacity={0.06} />
          <Stop offset="1" stopColor={colors.bg} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="vgEdge" cx="50%" cy="105%" r="70%">
          <Stop offset="0" stopColor={colors.bgDeep} stopOpacity={0.55} />
          <Stop offset="1" stopColor={colors.bgDeep} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#vgTop)" />
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#vgEdge)" />
    </Svg>
  );
}

const inputFamily = Platform.OS === 'web' ? sans : 'Jost_400Regular';

// ───────── Yıldızlı arka plan (ölçülü) ─────────
function Stars() {
  const stars = useMemo(() => {
    let s = 11;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 34 }, () => ({
      left: `${rnd() * 100}%`, top: `${rnd() * 100}%`, size: 0.8 + rnd() * 1.6, opacity: 0.1 + rnd() * 0.42,
    }));
  }, []);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {stars.map((st, i) => (
        <View
          key={i}
          style={{
            position: 'absolute', left: st.left as never, top: st.top as never, width: st.size, height: st.size,
            borderRadius: 4, backgroundColor: i % 4 === 0 ? colors.gold : '#F4ECDD', opacity: st.opacity,
          }}
        />
      ))}
    </View>
  );
}

// ───────── Ekran iskeleti ─────────
interface ScreenProps {
  title?: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
  scroll?: boolean;
  bottomInset?: boolean;
  /** Başlığın arkasına, o fal/ekran türüne özgü, soluk ve büyük bir su damgası ikonu yerleştirir —
   * her ekranın birbirinin aynı görünmesini engelleyen, o ekrana özel imza. */
  mark?: IconName;
  children: React.ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ title, subtitle, back, right, scroll = true, bottomInset = true, mark, children, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const header = (title || back) ? (
    <View style={[s.header, { paddingTop: insets.top + 10 }]}>
      {mark ? (
        <View pointerEvents="none" style={{ position: 'absolute', right: -16, top: -20, opacity: 0.1, transform: [{ rotate: '-7deg' }] }}>
          <Icon name={mark} size={112} color={colors.gold} stroke={0.6} />
        </View>
      ) : null}
      {back ? (
        <Pressable accessibilityLabel="Geri" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))} style={s.backBtn}>
          <Icon name="back" size={20} color={colors.text} stroke={1.5} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        {title ? <Text style={s.title}>{title}</Text> : null}
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  ) : <View style={{ height: insets.top }} />;

  return (
    <View style={s.root}>
      <LinearGradient colors={gradients.bg} style={StyleSheet.absoluteFill} />
      <Vignette />
      <Stars />
      <CurtainReveal>
        {header}
        {scroll ? (
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={[{ padding: 20, paddingBottom: (bottomInset ? insets.bottom : 0) + 32, gap: 16 }, contentStyle]}
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          </KeyboardAvoidingView>
        ) : (
          <View style={[{ flex: 1 }, contentStyle]}>{children}</View>
        )}
      </CurtainReveal>
    </View>
  );
}

// ───────── Buton ─────────
interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'gold' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, small, style, testID }: ButtonProps) {
  const inactive = disabled || loading;
  const filled = variant === 'gold' || variant === 'primary';
  const textColor = filled ? colors.ink : variant === 'danger' ? colors.danger : colors.text;
  const native = Platform.OS !== 'web';
  const press = useRef(new Animated.Value(0)).current;
  const onPressIn = () => { if (!inactive) Animated.spring(press, { toValue: 1, useNativeDriver: native, speed: 46, bounciness: 4 }).start(); };
  const onPressOut = () => Animated.spring(press, { toValue: 0, useNativeDriver: native, speed: 26, bounciness: 5 }).start();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={inactive ? undefined : onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={inactive}
    >
      <Animated.View
        style={[
          {
            opacity: inactive ? 0.5 : press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }),
            transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.965] }) }],
          },
          style,
        ]}
      >
        {filled ? (
          <LinearGradient colors={gradients.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.btn, small && s.btnSmall]}>
            {loading ? <ActivityIndicator color={textColor} /> : <Text style={[s.btnText, { color: textColor }, small && s.btnTextSmall]}>{title}</Text>}
          </LinearGradient>
        ) : (
          <View style={[s.btn, s.btnGhost, small && s.btnSmall, variant === 'danger' && { borderColor: 'rgba(231,120,143,0.4)' }]}>
            {loading ? <ActivityIndicator color={textColor} /> : <Text style={[s.btnText, { color: textColor }, small && s.btnTextSmall]}>{title}</Text>}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// ───────── Kart ─────────
/** İnce, kart genişliğinin ortasında parlayan bir "üst hat" — cam/mücevher yüzeyinin ışığı
 * yakaladığı hissi verir; her kartta sessizce tekrar eden, markaya ait bir imza çizgisi. */
function CardSheen() {
  return (
    <LinearGradient
      colors={['transparent', colors.goldTintStrong, 'transparent']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={{ position: 'absolute', top: 0, left: '14%', right: '14%', height: 1 }}
      pointerEvents="none"
    />
  );
}

/** Seçili/öne çıkan kartların köşesine iliştirilen minik çerçeve işareti — bir tablo etiketi ya da
 * mühür köşesi gibi; "bu kart özenle çerçevelendi" hissi verir. */
function CornerMark({ color = colors.gold }: { color?: string }) {
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', top: 9, left: 9, opacity: 0.55 }}>
        <Svg width={13} height={13} viewBox="0 0 13 13">
          <RGPath d="M0.6 8.5V0.6H8.5" stroke={color} strokeWidth={0.9} fill="none" strokeLinecap="round" />
        </Svg>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', top: 9, right: 9, opacity: 0.55 }}>
        <Svg width={13} height={13} viewBox="0 0 13 13">
          <RGPath d="M12.4 8.5V0.6H4.5" stroke={color} strokeWidth={0.9} fill="none" strokeLinecap="round" />
        </Svg>
      </View>
    </>
  );
}

export function Card({ children, style, gold, onPress, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gold?: boolean; onPress?: () => void; testID?: string }) {
  const body = (
    <LinearGradient colors={gold ? gradients.cardGold : gradients.card} style={[s.card, gold && { borderColor: colors.borderStrong }, style]} testID={onPress ? undefined : testID}>
      <CardSheen />
      {gold ? <CornerMark /> : null}
      {children}
    </LinearGradient>
  );
  if (!onPress) return body;
  return <PressableCard onPress={onPress} testID={testID}>{body}</PressableCard>;
}

function PressableCard({ children, onPress, testID }: { children: React.ReactNode; onPress: () => void; testID?: string }) {
  const native = Platform.OS !== 'web';
  const press = useRef(new Animated.Value(0)).current;
  const onPressIn = () => Animated.spring(press, { toValue: 1, useNativeDriver: native, speed: 46, bounciness: 4 }).start();
  const onPressOut = () => Animated.spring(press, { toValue: 0, useNativeDriver: native, speed: 26, bounciness: 5 }).start();
  return (
    <Pressable onPress={onPress} testID={testID} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View
        style={{
          opacity: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.92] }),
          transform: [{ scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.99] }) }],
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ───────── Parşömen kart ─────────
// Kategori kartları ve öne çıkan kartlar için: doygun mücevher renkleri yerine tek malzeme —
// koyu mürekkep zemin üstünde, hafifçe döndürülmüş, düzensiz (yırtık) kenarlı bir kağıt parçası.
// RN'de CSS clip-path yok; kenar bir SVG path olarak çiziliyor (0–100 birimlik viewBox,
// preserveAspectRatio="none" ile kartın gerçek boyutuna gerilir).
const TORN_EDGE = 'M1.5,0.5 L98.5,0 L100,3 L99.3,97.5 L97,100 L2.8,99.3 L0,96.5 L0.8,3.2 Z';

function PaperCorners() {
  return (
    <>
      <View pointerEvents="none" style={{ position: 'absolute', top: 9, left: 10, opacity: 0.4 }}>
        <Svg width={11} height={11} viewBox="0 0 11 11"><RGPath d="M0.5 7.2V0.5H7.2" stroke={colors.inkDim} strokeWidth={0.9} fill="none" strokeLinecap="round" /></Svg>
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', top: 9, right: 10, opacity: 0.4 }}>
        <Svg width={11} height={11} viewBox="0 0 11 11"><RGPath d="M10.5 7.2V0.5H3.8" stroke={colors.inkDim} strokeWidth={0.9} fill="none" strokeLinecap="round" /></Svg>
      </View>
    </>
  );
}

/** Tek bir bordo "mühür" — sayfada sadece bir yerde, seyrek kullanılan tek doygun renk vurgusu. */
function WaxSeal({ size = 34 }: { size?: number }) {
  return (
    <View
      style={{
        position: 'absolute', right: -size * 0.22, top: -size * 0.22, width: size, height: size, borderRadius: size / 2,
        backgroundColor: colors.wine, alignItems: 'center', justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
        transform: [{ rotate: '8deg' }],
      }}
    >
      <Svg width={size * 0.42} height={size * 0.42} viewBox="0 0 24 24">
        <RGPath d="M12,3 13.6,10.4 21,12 13.6,13.6 12,21 10.4,13.6 3,12 10.4,10.4 Z" fill={colors.giltBright} />
      </Svg>
    </View>
  );
}

export function ParchmentCard({
  children, style, contentStyle, rotate = 0, seal, onPress, testID,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Derece cinsinden hafif eğim — "elle bırakılmış kağıt" hissi için (örn. -2, 1.5). */
  rotate?: number;
  /** Tek, seyrek kullanılan bordo mühür vurgusu (örn. öne çıkan tek bir kart). */
  seal?: boolean;
  onPress?: () => void;
  testID?: string;
}) {
  const body = (
    <View style={[{ transform: [{ rotate: `${rotate}deg` }] }, style]} testID={onPress ? undefined : testID}>
      <View style={s.paperShadow}>
        <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill as never}>
          <Defs>
            <SvgLinearGradient id="paperFill" x1="15%" y1="0%" x2="85%" y2="100%">
              <Stop offset="0" stopColor={colors.paper} />
              <Stop offset="1" stopColor={colors.paper2} />
            </SvgLinearGradient>
          </Defs>
          <RGPath d={TORN_EDGE} fill="url(#paperFill)" stroke={colors.gilt} strokeWidth={0.5} strokeOpacity={0.5} />
        </Svg>
        <PaperCorners />
        {seal ? <WaxSeal /> : null}
        <View style={[s.paperContent, contentStyle]}>{children}</View>
      </View>
    </View>
  );
  if (!onPress) return body;
  return <PressableCard onPress={onPress} testID={testID}>{body}</PressableCard>;
}

// ───────── Yazı öğeleri ─────────
export function H1({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: serif, fontSize: 30, color: colors.text, fontWeight: '600', lineHeight: 35 }, style]}>{children}</Text>;
}
export function H2({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontFamily: serif, fontSize: 21, color: colors.goldBright, fontWeight: '600', lineHeight: 26 }, style]}>{children}</Text>;
}
export function Body({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontSize: 15, color: colors.text, lineHeight: 24 }, style]}>{children}</Text>;
}
export function Dim({ children, style, numberOfLines }: { children: React.ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  return <Text numberOfLines={numberOfLines} style={[{ fontSize: 13, color: colors.textDim, lineHeight: 20 }, style]}>{children}</Text>;
}
/** Küçük, geniş harf aralıklı üst etiket. */
export function Eyebrow({ children, style, color }: { children: string; style?: StyleProp<TextStyle>; color?: string }) {
  return <Text style={[{ fontSize: 11, letterSpacing: 2.2, color: color ?? colors.gold, fontWeight: '500' }, style]}>{children.toLocaleUpperCase('tr-TR')}</Text>;
}

// ───────── Form ─────────
interface FieldProps {
  label?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  hint?: string;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words';
  testID?: string;
  onSubmitEditing?: () => void;
}

export function Field({ label, value, onChangeText, placeholder, multiline, secure, keyboardType, maxLength, hint, error, autoCapitalize, testID, onSubmitEditing }: FieldProps) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 7 }}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.gold}
        multiline={multiline}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
        onSubmitEditing={onSubmitEditing}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[s.input, focus && { borderColor: colors.borderGold }, multiline && { minHeight: 110, textAlignVertical: 'top' }, error ? { borderColor: colors.danger } : null]}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text> : hint ? <Text style={{ color: colors.textFaint, fontSize: 12 }}>{hint}</Text> : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, glyph }: { label: string; selected?: boolean; onPress?: () => void; glyph?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, selected && { backgroundColor: 'rgba(221,187,122,0.12)', borderColor: colors.borderGold }]}
    >
      <Text style={{ color: selected ? colors.goldBright : colors.textDim, fontSize: 14, fontWeight: selected ? '500' : '400' }}>
        {glyph ? `${glyph}  ` : ''}{label}
      </Text>
    </Pressable>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />;
}

export function Badge({ text, tone = 'gold' }: { text: string; tone?: 'gold' | 'violet' | 'amber' }) {
  const bg = tone === 'gold' ? 'rgba(221,187,122,0.1)' : tone === 'amber' ? 'rgba(227,160,92,0.16)' : 'rgba(255,255,255,0.05)';
  const fg = tone === 'gold' ? colors.gold : tone === 'amber' ? '#F0BE85' : colors.textDim;
  const bd = tone === 'gold' ? 'rgba(221,187,122,0.28)' : tone === 'amber' ? 'rgba(227,160,92,0.38)' : colors.border;
  return (
    <View style={{ backgroundColor: bg, borderColor: bd, borderWidth: 1, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: 10.5, fontWeight: '500', letterSpacing: 1.1 }}>{text.toLocaleUpperCase('tr-TR')}</Text>
    </View>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return <Text style={{ color: colors.danger, fontSize: 13, lineHeight: 19 }}>{children}</Text>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 10, position: 'relative', overflow: 'hidden' },
  backBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: serif, fontSize: 27, color: colors.text, fontWeight: '600', lineHeight: 31 },
  subtitle: { fontSize: 13, color: colors.textDim, marginTop: 1 },
  btn: { borderRadius: radius.md, paddingVertical: 15, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  btnSmall: { paddingVertical: 10, minHeight: 42, borderRadius: 11, paddingHorizontal: 16 },
  btnGhost: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(255,255,255,0.02)' },
  btnText: { fontSize: 15.5, fontWeight: '600', letterSpacing: 0.5 },
  btnTextSmall: { fontSize: 13.5 },
  card: {
    borderRadius: radius.lg, padding: 18, borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
    shadowColor: '#000000', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3,
  },
  label: { color: colors.textDim, fontSize: 12, fontWeight: '500', letterSpacing: 0.8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 15, paddingVertical: 13, color: colors.text, fontSize: 16, fontFamily: inputFamily,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : {}),
  },
  chip: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 22, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.02)' },
  paperShadow: {
    position: 'relative', borderRadius: 3,
    shadowColor: '#000000', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 6,
  },
  paperContent: { padding: 16 },
});
