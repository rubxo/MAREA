import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { demoGallery, demoUser } from '@/features/demo/demo-session';
import { colors, radii, spacing } from '@/theme/tokens';

function Stat({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const cell = (width - 4) / 3;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader title={demoUser.username} eyebrow="Tu perfil" actionIcon="settings" actionLabel="Configurar perfil" />
      <FlatList
        data={demoGallery}
        numColumns={3}
        keyExtractor={(item) => item}
        ListHeaderComponent={
          <View>
            <View style={styles.profileRow}>
              <Avatar uri={demoUser.avatarUrl} size={88} accessibilityLabel={`Foto de ${demoUser.displayName}`} highlighted />
              <View style={styles.stats}>
                <Stat value={demoUser.posts} label="Posts" />
                <Stat value={demoUser.followers} label="Seguidores" />
                <Stat value={demoUser.following} label="Siguiendo" />
              </View>
            </View>
            <View style={styles.bioBlock}>
              <Text style={styles.name}>{demoUser.displayName}</Text>
              <Text style={styles.bio}>{demoUser.bio}</Text>
            </View>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.edit, pressed && styles.pressed]}>
              <Feather name="edit-3" size={16} color={colors.ink} />
              <Text style={styles.editText}>Editar perfil</Text>
            </Pressable>
            <View style={styles.galleryHeader}>
              <Feather name="grid" size={18} color={colors.ink} />
              <Text style={styles.galleryTitle}>Publicaciones</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={{ height: cell, width: cell, margin: 0.5 }} contentFit="cover" cachePolicy="memory-disk" accessibilityLabel="Publicación del perfil" />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  profileRow: { alignItems: 'center', flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  stats: { flex: 1, flexDirection: 'row', justifyContent: 'space-around', marginLeft: spacing.md },
  stat: { alignItems: 'center' },
  statValue: { color: colors.ink, fontFamily: 'Inter_700Bold', fontSize: 16 },
  statLabel: { color: colors.mutedInk, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2 },
  bioBlock: { paddingHorizontal: spacing.lg },
  name: { color: colors.ink, fontFamily: 'Inter_700Bold', fontSize: 14 },
  bio: { color: colors.ink, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
  edit: { alignItems: 'center', borderColor: colors.hairline, borderRadius: radii.medium, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', margin: spacing.md, minHeight: 44 },
  editText: { color: colors.ink, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  pressed: { backgroundColor: colors.surface, opacity: 0.7 },
  galleryHeader: { alignItems: 'center', borderTopColor: colors.hairline, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: spacing.xs, padding: spacing.md },
  galleryTitle: { color: colors.ink, fontFamily: 'Inter_700Bold', fontSize: 13 },
});
