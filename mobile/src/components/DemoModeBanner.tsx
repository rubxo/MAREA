import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, Text, View } from 'react-native';

import { appEnvironment } from '@/core/config/env';
import { colors, radii, spacing } from '@/theme/tokens';

export function DemoModeBanner() {
  if (appEnvironment.mode !== 'demo') return null;

  return (
    <View style={styles.banner} accessibilityRole="summary">
      <Feather name="wifi-off" size={14} color={colors.deepBlue} />
      <Text style={styles.text}>Demo local · conecta Supabase para sincronizar</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#E8EEF9',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  text: {
    color: colors.deepBlue,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
});
