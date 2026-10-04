import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { FlatList, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { demoGallery } from '@/features/demo/demo-session';
import { colors, radii, spacing } from '@/theme/tokens';

export default function ExploreScreen() {
  const { width } = useWindowDimensions();
  const cell = (width - 4) / 3;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader title="Explorar" eyebrow="Descubre" />
      <View style={styles.search}>
        <Feather name="search" size={18} color={colors.mutedInk} />
        <TextInput
          accessibilityLabel="Buscar personas o lugares"
          placeholder="Personas, lugares, historias"
          placeholderTextColor={colors.mutedInk}
          style={styles.input}
        />
      </View>
      <FlatList
        data={demoGallery}
        numColumns={3}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item }}
            style={{ height: cell, width: cell, margin: 0.5 }}
            contentFit="cover"
            cachePolicy="memory-disk"
            accessibilityLabel="Fotografía en Explorar"
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  search: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.hairline,
    borderRadius: radii.medium,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginHorizontal: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  input: { color: colors.ink, flex: 1, fontFamily: 'Inter_400Regular', fontSize: 14 },
});
