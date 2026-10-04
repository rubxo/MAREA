import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

type AvatarProps = Readonly<{
  uri: string;
  size?: number;
  highlighted?: boolean;
  accessibilityLabel: string;
}>;

export function Avatar({
  uri,
  size = 44,
  highlighted = false,
  accessibilityLabel,
}: AvatarProps) {
  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: size / 2 },
        highlighted && styles.highlighted,
      ]}>
      <Image
        source={{ uri }}
        style={{ width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderColor: colors.hairline,
    borderWidth: 1,
  },
  highlighted: { borderColor: colors.coral, borderWidth: 2 },
});
