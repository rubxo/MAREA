import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthScaffold, FormField, FormMessage, PrimaryButton } from '@/features/auth/AuthScaffold';
import { useAuthSession } from '@/features/auth/auth-session-provider';
import { getErrorMessage } from '@/features/auth/error-message';
import { colors, spacing } from '@/theme/tokens';

const usernamePattern = /^[a-z0-9_]{3,24}$/;

export default function SignUpScreen() {
  const { signUp } = useAuthSession();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const normalizedUsername = username.trim().toLowerCase();
  const valid =
    displayName.trim().length > 0 &&
    usernamePattern.test(normalizedUsername) &&
    email.includes('@') &&
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password);

  async function submit() {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await signUp({
        displayName,
        username: normalizedUsername,
        email,
        password,
      });
      if (result.needsEmailVerification) {
        setNotice('Cuenta creada. Revisa tu correo para confirmar y después inicia sesión.');
      }
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScaffold
      eyebrow="Crea tu espacio"
      title="Una identidad para tus mejores momentos."
      description="Empieza con lo esencial. Podrás ajustar tu biografía y privacidad desde tu perfil.">
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      {notice ? <FormMessage tone="success">{notice}</FormMessage> : null}
      <FormField label="Nombre" value={displayName} onChangeText={setDisplayName} placeholder="Luna Márquez" autoComplete="name" />
      <FormField
        label="Usuario"
        value={username}
        onChangeText={setUsername}
        placeholder="luna_marquez"
        autoCapitalize="none"
        autoCorrect={false}
        hint="3–24 caracteres: minúsculas, números y guion bajo."
      />
      <FormField label="Correo" value={email} onChangeText={setEmail} placeholder="tu@correo.com" autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <FormField label="Contraseña" value={password} onChangeText={setPassword} placeholder="Mínimo 8 caracteres" secureTextEntry autoComplete="new-password" hint="Incluye al menos una letra y un número." />
      <PrimaryButton label="Crear mi cuenta" loading={loading} disabled={!valid} onPress={() => void submit()} />
      <View style={styles.switchRow}>
        <Text style={styles.switchText}>¿Ya tienes cuenta?</Text>
        <Link href="/" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Text style={styles.link}>Iniciar sesión</Text>
          </Pressable>
        </Link>
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  switchRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, justifyContent: 'center' },
  switchText: { color: colors.mutedInk, fontFamily: 'Inter_400Regular', fontSize: 13 },
  link: { color: colors.deepBlue, fontFamily: 'Inter_700Bold', fontSize: 13, minHeight: 44, paddingVertical: 13 },
});
