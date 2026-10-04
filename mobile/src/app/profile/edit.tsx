import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, spacing } from '@/theme/tokens';
import { FormField, FormMessage, PrimaryButton } from '@/features/auth/AuthScaffold';
import { useAuthSession } from '@/features/auth/auth-session-provider';
import { getErrorMessage } from '@/features/auth/error-message';

const usernamePattern = /^[a-z0-9_]{3,24}$/;

export default function EditProfileScreen() {
  const { state, updateProfile, signOut } = useAuthSession();
  const profile = state.status === 'authenticated' ? state.session.profile : null;
  const isDemo = state.status === 'authenticated' && state.mode === 'demo';
  const [username, setUsername] = useState(profile?.username ?? '');
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [isPrivate, setIsPrivate] = useState(profile?.isPrivate ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = usernamePattern.test(username.trim().toLowerCase()) && displayName.trim().length > 0 && bio.length <= 160;

  async function save() {
    setLoading(true);
    setError(null);
    try {
      await updateProfile({ username, displayName, bio, isPrivate });
      router.back();
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  async function exit() {
    setLoading(true);
    try {
      await signOut();
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Volver" accessibilityRole="button" hitSlop={8} onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-left" size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Configuración</Text>
          <Text style={styles.title}>Editar perfil</Text>
        </View>
        <View style={styles.iconButton} />
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        {isDemo ? <FormMessage tone="success">El modo demo es de solo lectura. Conecta Supabase para guardar cambios.</FormMessage> : null}
        <FormField label="Nombre" value={displayName} onChangeText={setDisplayName} maxLength={50} />
        <FormField label="Usuario" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} maxLength={24} hint="Minúsculas, números y guion bajo." />
        <FormField label="Biografía" value={bio} onChangeText={setBio} multiline maxLength={160} hint={`${bio.length}/160`} />
        <View style={styles.privacyCard}>
          <View style={styles.privacyIcon}><Feather name={isPrivate ? 'lock' : 'globe'} size={20} color={colors.deepBlue} /></View>
          <View style={styles.privacyCopy}>
            <Text style={styles.privacyTitle}>Cuenta privada</Text>
            <Text style={styles.privacyText}>Solo seguidores aprobados verán tus publicaciones, stories y lista social.</Text>
          </View>
          <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ false: colors.hairline, true: colors.seaGlass }} thumbColor={colors.white} accessibilityLabel="Cuenta privada" />
        </View>
        <PrimaryButton label="Guardar cambios" loading={loading} disabled={!valid || isDemo} onPress={() => void save()} />
        {!isDemo ? (
          <Pressable accessibilityRole="button" disabled={loading} onPress={() => void exit()} style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
            <Feather name="log-out" size={17} color={colors.danger} />
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  header: { alignItems: 'center', borderBottomColor: colors.hairline, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  headerCopy: { alignItems: 'center', flex: 1 },
  eyebrow: { color: colors.coral, fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { color: colors.ink, fontFamily: 'Inter_700Bold', fontSize: 18 },
  content: { gap: spacing.md, padding: spacing.lg },
  privacyCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.hairline, borderRadius: radii.card, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  privacyIcon: { alignItems: 'center', backgroundColor: '#E8EEF9', borderRadius: radii.pill, height: 40, justifyContent: 'center', width: 40 },
  privacyCopy: { flex: 1 },
  privacyTitle: { color: colors.ink, fontFamily: 'Inter_700Bold', fontSize: 14 },
  privacyText: { color: colors.mutedInk, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 2 },
  signOut: { alignItems: 'center', borderColor: '#E7B9B2', borderRadius: radii.medium, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', minHeight: 48 },
  signOutText: { color: colors.danger, fontFamily: 'Inter_700Bold', fontSize: 13 },
  pressed: { opacity: 0.65 },
});
