import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  type TextProps,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function useColors() {
  const dark = useColorScheme() === 'dark';
  return {
    bg: dark ? '#0b0b0d' : '#f6f6f8',
    card: dark ? '#17171b' : '#ffffff',
    text: dark ? '#f2f2f5' : '#101014',
    muted: dark ? '#8e8e96' : '#6b6b74',
    border: dark ? '#2a2a31' : '#e2e2e8',
    accent: '#3ecf8e', // Supabase green
    danger: '#e5484d',
  };
}

export function Screen({ children, style, ...rest }: ViewProps) {
  const c = useColors();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: c.bg }]}>
      <View style={[styles.screenInner, style]} {...rest}>
        {children}
      </View>
    </SafeAreaView>
  );
}

export function Card({ children, style, ...rest }: ViewProps) {
  const c = useColors();
  return (
    <View
      style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}
      {...rest}>
      {children}
    </View>
  );
}

export function Title({ style, ...rest }: TextProps) {
  const c = useColors();
  return <Text style={[styles.title, { color: c.text }, style]} {...rest} />;
}

export function Body({ style, ...rest }: TextProps) {
  const c = useColors();
  return <Text style={[styles.body, { color: c.text }, style]} {...rest} />;
}

export function Muted({ style, ...rest }: TextProps) {
  const c = useColors();
  return <Text style={[styles.muted, { color: c.muted }, style]} {...rest} />;
}

export function Mono({ style, ...rest }: TextProps) {
  const c = useColors();
  return <Text selectable style={[styles.mono, { color: c.text }, style]} {...rest} />;
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const c = useColors();
  const background =
    variant === 'primary' ? c.accent : variant === 'danger' ? c.danger : 'transparent';
  const color = variant === 'secondary' ? c.text : '#08130d';
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: background,
          borderColor: variant === 'secondary' ? c.border : background,
          opacity: pressed || disabled || loading ? 0.6 : 1,
        },
      ]}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.buttonText, { color: variant === 'danger' ? '#fff' : color }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function ErrorText({ children }: { children?: string | null }) {
  const c = useColors();
  if (!children) return null;
  return <Text style={[styles.body, { color: c.danger }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  screenInner: {
    flex: 1,
    gap: 16,
    padding: 20,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  title: { fontSize: 26, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 21 },
  muted: { fontSize: 13, lineHeight: 18 },
  mono: { fontSize: 13, fontFamily: 'monospace' },
  button: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
});
