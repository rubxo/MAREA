import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { CachedImage } from '@/components/CachedImage';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { demoGallery } from '@/features/demo/demo-session';
import { useAuthSession } from '@/features/auth/auth-session-provider';
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
  const { state } = useAuthSession();
  const { width } = useWindowDimensions();
  const cell = (width - 4) / 3;
  const session = state.status === 'authenticated' ? state.session : null;
  const profile = session?.profile;
  const gallery = state.status === 'authenticated' && state.mode === 'demo' ? demoGallery : [];

  if (!profile) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScreenHeader title="Tu perfil" eyebrow="Marea" />
        <EmptyState icon="user-x" title="Perfil no disponible" description="Vuelve a iniciar sesión para recuperar tu perfil." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader title={profile.username} eyebrow="Tu perfil" actionIcon="settings" actionLabel="Configurar perfil" onAction={() => router.push('/profile/edit')} />
      <FlatList
        data={gallery}
        numColumns={3}
        keyExtractor={(item) => item}
        ListHeaderComponent={
          <View>
            <View style={styles.profileRow}>
              <Avatar uri={profile.avatarUrl} size={88} accessibilityLabel={`Foto de ${profile.displayName}`} highlighted />
              <View style={styles.stats}>
                <Stat value={profile.postCount} label="Posts" />
                <Stat value={profile.followerCount} label="Seguidores" />
                <Stat value={profile.followingCount} label="Siguiendo" />
              </View>
            </View>
            <View style={styles.bioBlock}>
              <Text style={styles.name}>{profile.displayName}</Text>
              <Text style={styles.bio}>{profile.bio || 'Tu historia empieza aquí.'}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => router.push('/profile/edit')} style={({ pressed }) => [styles.edit, pressed && styles.pressed]}>
              <Feather name="edit-3" size={16} color={colors.ink} />
              <Text style={styles.editText}>Editar perfil</Text>
            </Pressable>
            <View style={styles.galleryHeader}>
              <Feather name="grid" size={18} color={colors.ink} />
              <Text style={styles.galleryTitle}>Publicaciones</Text>
            </View>
            {gallery.length === 0 ? (
              <EmptyState icon="camera" title="Aún no hay publicaciones" description="Tu primera foto aparecerá aquí cuando la compartas." />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <CachedImage uri={item} style={{ height: cell, width: cell, margin: 0.5 }} contentFit="cover" accessibilityLabel="Publicación del perfil" />
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
