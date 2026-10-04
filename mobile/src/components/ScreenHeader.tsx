import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

type ScreenHeaderProps = Readonly<{
  title: string;
  eyebrow?: string;
  actionIcon?: React.ComponentProps<typeof Feather>['name'];
  actionLabel?: string;
  onAction?: () => void;
}>;

export function ScreenHeader({ title, eyebrow, actionIcon, actionLabel, onAction }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {actionIcon && actionLabel ? (
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          hitSlop={8}
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
          <Feather name={actionIcon} size={22} color={colors.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  eyebrow: {
    color: colors.coral,
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ink,
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 28,
    letterSpacing: -1.1,
  },
  action: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  pressed: { opacity: 0.5 },
});
