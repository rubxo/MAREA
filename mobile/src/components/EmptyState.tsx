import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: Readonly<{
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}>) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}><Feather name={icon} size={26} color={colors.deepBlue} /></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  icon: { alignItems: 'center', backgroundColor: '#E8EEF9', borderRadius: radii.pill, height: 56, justifyContent: 'center', width: 56 },
  title: { color: colors.ink, fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: spacing.md, textAlign: 'center' },
  description: { color: colors.mutedInk, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: spacing.xs, maxWidth: 320, textAlign: 'center' },
  action: { backgroundColor: colors.ink, borderRadius: radii.pill, marginTop: spacing.md, minHeight: 44, paddingHorizontal: spacing.lg, paddingVertical: 12 },
  actionText: { color: colors.white, fontFamily: 'Inter_700Bold', fontSize: 13 },
  pressed: { opacity: 0.7 },
});
