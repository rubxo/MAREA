import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

import { CachedImage } from './CachedImage';

type AvatarProps = Readonly<{
  uri: string | null;
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
      {uri ? (
        <CachedImage
          uri={uri}
          style={{ width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }}
          contentFit="cover"
          accessibilityLabel={accessibilityLabel}
        />
      ) : (
        <Feather name="user" size={Math.round(size * 0.42)} color={colors.mutedInk} />
      )}
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
