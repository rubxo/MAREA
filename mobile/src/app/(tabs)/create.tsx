import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, radii, spacing } from '@/theme/tokens';

export default function CreateScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader title="Crear" eyebrow="Nueva publicación" />
      <View style={styles.content}>
        <View style={styles.preview}>
          <View style={styles.iconBubble}>
            <Feather name="image" size={28} color={colors.coral} />
          </View>
          <Text style={styles.title}>Comparte una mirada</Text>
          <Text style={styles.body}>
            Elige una fotografía, escribe lo que significa para ti y publícala en Marea.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Feather name="camera" size={18} color={colors.white} />
            <Text style={styles.primaryLabel}>Elegir fotografía</Text>
          </Pressable>
        </View>
        <View style={styles.tip}>
          <Feather name="info" size={17} color={colors.deepBlue} />
          <Text style={styles.tipText}>Las publicaciones pendientes se guardarán si pierdes conexión.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: spacing.lg },
  preview: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderRadius: radii.card,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  iconBubble: {
    alignItems: 'center',
    backgroundColor: '#FFF0EC',
    borderRadius: radii.pill,
    height: 64,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 64,
  },
  title: { color: colors.ink, fontFamily: 'Inter_700Bold', fontSize: 22 },
  body: { color: colors.mutedInk, fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, marginTop: spacing.xs, textAlign: 'center' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.coral,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
  },
  primaryLabel: { color: colors.white, fontFamily: 'Inter_700Bold', fontSize: 14 },
  pressed: { opacity: 0.7, transform: [{ scale: 0.98 }] },
  tip: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.sm },
  tipText: { color: colors.deepBlue, flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17 },
});
