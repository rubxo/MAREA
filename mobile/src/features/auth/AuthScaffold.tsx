import Feather from '@expo/vector-icons/Feather';
import { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '@/theme/tokens';

type AuthScaffoldProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  description: string;
}>;

export function AuthScaffold({ eyebrow, title, description, children }: AuthScaffoldProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Feather name="aperture" size={22} color={colors.white} />
            </View>
            <Text style={styles.brand}>marea</Text>
          </View>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
          <View style={styles.card}>{children}</View>
          <Text style={styles.privacy}>Tus fotos y conversaciones están protegidas por permisos en la base de datos.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FormFieldProps = TextInputProps & Readonly<{ label: string; hint?: string }>;

export function FormField({ label, hint, ...props }: FormFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.mutedInk}
        selectionColor={colors.coral}
        style={styles.input}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  label,
  loading,
  disabled,
  onPress,
}: Readonly<{
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress(): void;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.primaryButton,
        (disabled || loading) && styles.primaryButtonDisabled,
        pressed && styles.pressed,
      ]}>
      {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryLabel}>{label}</Text>}
    </Pressable>
  );
}

export function FormMessage({ tone, children }: PropsWithChildren<{ tone: 'error' | 'success' }>) {
  return (
    <View style={[styles.message, tone === 'error' ? styles.errorMessage : styles.successMessage]}>
      <Feather
        name={tone === 'error' ? 'alert-circle' : 'check-circle'}
        size={16}
        color={tone === 'error' ? colors.danger : colors.success}
      />
      <Text style={[styles.messageText, tone === 'error' ? styles.errorText : styles.successText]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  brandRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  brandMark: { alignItems: 'center', backgroundColor: colors.coral, borderRadius: 16, height: 44, justifyContent: 'center', transform: [{ rotate: '-8deg' }], width: 44 },
  brand: { color: colors.ink, fontFamily: 'Inter_800ExtraBold', fontSize: 25, letterSpacing: -1 },
  eyebrow: { color: colors.deepBlue, fontFamily: 'Inter_700Bold', fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: colors.ink, fontFamily: 'Inter_800ExtraBold', fontSize: 34, letterSpacing: -1.2, lineHeight: 39, marginTop: spacing.xs },
  description: { color: colors.mutedInk, fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, marginTop: spacing.sm, maxWidth: 420 },
  card: { backgroundColor: colors.surface, borderColor: colors.hairline, borderRadius: 24, borderWidth: 1, gap: spacing.md, marginTop: spacing.xl, padding: spacing.lg },
  fieldGroup: { gap: 6 },
  label: { color: colors.ink, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  input: { backgroundColor: colors.paper, borderColor: colors.hairline, borderRadius: radii.medium, borderWidth: 1, color: colors.ink, fontFamily: 'Inter_400Regular', fontSize: 15, minHeight: 50, paddingHorizontal: spacing.md },
  hint: { color: colors.mutedInk, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 15 },
  primaryButton: { alignItems: 'center', backgroundColor: colors.ink, borderRadius: radii.medium, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.md },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryLabel: { color: colors.white, fontFamily: 'Inter_700Bold', fontSize: 15 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  message: { alignItems: 'flex-start', borderRadius: radii.medium, flexDirection: 'row', gap: spacing.xs, padding: spacing.sm },
  errorMessage: { backgroundColor: '#FCEAE7' },
  successMessage: { backgroundColor: '#E8F5EF' },
  messageText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17 },
  errorText: { color: colors.danger },
  successText: { color: colors.success },
  privacy: { alignSelf: 'center', color: colors.mutedInk, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: spacing.lg, maxWidth: 330, textAlign: 'center' },
});

