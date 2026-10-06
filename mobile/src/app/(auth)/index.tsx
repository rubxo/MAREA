import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthScaffold, FormField, FormMessage, PrimaryButton } from '@/features/auth/AuthScaffold';
import { getErrorMessage } from '@/features/auth/error-message';
import { useAuthSession } from '@/features/auth/auth-session-provider';
import { colors, spacing } from '@/theme/tokens';
import { GoogleButton } from '@/features/auth/GoogleButton';

export default function SignInScreen() {
  const { signIn } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScaffold
      eyebrow="Tu comunidad visual"
      title="Qué bueno verte de nuevo."
      description="Entra y conecta con las miradas que te inspiran.">
      <GoogleButton />
      <View style={{flexDirection:'row',alignItems:'center',gap:12}}><View style={{flex:1,height:1,backgroundColor:colors.hairline}}/><Text style={{fontSize:11,color:colors.mutedInk}}>o entra con tu correo</Text><View style={{flex:1,height:1,backgroundColor:colors.hairline}}/></View>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <FormField
        label="Correo"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      <FormField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        placeholder="Tu contraseña"
        secureTextEntry
        autoComplete="current-password"
      />
      <PrimaryButton
        label="Entrar a Marea"
        loading={loading}
        disabled={!email.trim() || password.length < 8}
        onPress={() => void submit()}
      />
      <Link href="/recovery" style={{color:colors.deepBlue,textAlign:'center',padding:10,fontSize:12}}>¿Olvidaste tu contraseña?</Link>
      <View style={styles.switchRow}>
        <Text style={styles.switchText}>¿Primera vez aquí?</Text>
        <Link href="/sign-up" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Text style={styles.link}>Crear cuenta</Text>
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
