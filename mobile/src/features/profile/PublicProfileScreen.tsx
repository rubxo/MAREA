import Feather from '@expo/vector-icons/Feather';
import { randomUUID } from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { SupabaseSocialRepository } from '@/data/repositories/social-repository';
import { Profile } from '@/domain/models';
import { colors, radii, spacing } from '@/theme/tokens';
import { useProfile } from '@/features/profile/use-profile';
import { ProfileGallery } from '@/features/profile/ProfileGallery';
import {
  beginFollow,
  beginUnfollow,
  confirmRelationship,
  RelationshipState,
  rollbackRelationship,
} from '@/features/social/relationship-state';

function Stat({ value, label }: Readonly<{ value: number; label: string }>) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value.toLocaleString()}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { state, reload, repository } = useProfile(username ?? '');

  const profile = state.status === 'ready' ? state.profile : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Volver" accessibilityRole="button" onPress={() => router.back()} style={styles.iconButton}><Feather name="arrow-left" size={22} color={colors.ink} /></Pressable>
        <Text style={styles.headerTitle}>{username}</Text>
        <View style={styles.iconButton} />
      </View>
      {state.status === 'loading' ? <View style={styles.center}><ActivityIndicator color={colors.coral} /></View> : null}
      {state.status === 'error' ? <EmptyState icon="wifi-off" title="No pudimos cargar el perfil" description={state.message} actionLabel="Reintentar" onAction={reload} /> : null}
      {state.status === 'empty' ? <EmptyState icon="user-x" title="Perfil no encontrado" description="Puede que el usuario haya cambiado su nombre." /> : null}
      {profile && repository ? <LoadedProfile key={`${profile.id}:${profile.relationship}`} profile={profile} repository={repository} /> : null}
    </SafeAreaView>
  );
}

function LoadedProfile({ profile, repository }: Readonly<{ profile: Profile; repository: SupabaseSocialRepository }>) {
  const [relationship, setRelationship] = useState<RelationshipState | null>(() =>
    profile.relationship === 'self'
      ? null
      : { relationship: profile.relationship, followerCount: profile.followerCount, pending: null },
  );
  const [error, setError] = useState<string | null>(null);

  async function toggleFollow() {
    if (!relationship || relationship.pending) return;
    const operationId = randomUUID();
    const next = relationship.relationship === 'none'
      ? beginFollow(relationship, profile.isPrivate, operationId)
      : beginUnfollow(relationship, operationId);
    setRelationship(next);
    setError(null);

    try {
      if (relationship.relationship === 'none') {
        const confirmed = await repository.follow(profile.id, operationId);
        setRelationship((current) => current ? confirmRelationship(current, operationId, confirmed) : current);
      } else {
        await repository.unfollow(profile.id);
        setRelationship((current) => current ? confirmRelationship(current, operationId, 'none') : current);
      }
    } catch {
      setRelationship((current) => current ? rollbackRelationship(current, operationId) : current);
      setError('No pudimos actualizar la relación. Inténtalo de nuevo.');
    }
  }

  return (
    <ProfileGallery key={relationship?.relationship ?? 'self'} authorId={profile.id}
      locked={profile.isPrivate && relationship?.relationship !== 'following' && profile.relationship !== 'self'}
      header={<View>
          <View style={styles.identity}>
            <Avatar uri={profile.avatarUrl} size={96} highlighted accessibilityLabel={`Foto de ${profile.displayName}`} />
            <Text style={styles.name}>{profile.displayName}</Text>
            <Text style={styles.handle}>@{profile.username}</Text>
            <Text style={styles.bio}>{profile.bio || 'Sin biografía todavía.'}</Text>
          </View>
          <View style={styles.stats}><Stat value={profile.postCount} label="Posts" /><Stat value={relationship?.followerCount ?? profile.followerCount} label="Seguidores" /><Stat value={profile.followingCount} label="Siguiendo" /></View>
          {profile.relationship !== 'self' ? (
            <Pressable accessibilityRole="button" disabled={!relationship || Boolean(relationship.pending)} onPress={() => void toggleFollow()} style={({ pressed }) => [styles.followButton, relationship?.relationship !== 'none' && styles.secondaryButton, pressed && styles.pressed]}>
              <Text style={[styles.followText, relationship?.relationship !== 'none' && styles.secondaryText]}>
                {relationship?.relationship === 'following' ? 'Siguiendo' : relationship?.relationship === 'requested' ? 'Solicitud enviada' : 'Seguir'}
              </Text>
            </Pressable>
          ) : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <View style={styles.contentDivider} />
      </View>} />
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  header: { alignItems: 'center', borderBottomColor: colors.hairline, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', paddingHorizontal: spacing.sm },
  iconButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { color: colors.ink, flex: 1, fontFamily: 'Inter_700Bold', fontSize: 17, textAlign: 'center' },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { paddingBottom: spacing.xxl },
  identity: { alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  name: { color: colors.ink, fontFamily: 'Inter_800ExtraBold', fontSize: 22, marginTop: spacing.md },
  handle: { color: colors.mutedInk, fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 2 },
  bio: { color: colors.ink, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: spacing.sm, maxWidth: 310, textAlign: 'center' },
  stats: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  stat: { alignItems: 'center', minWidth: 82 },
  statValue: { color: colors.ink, fontFamily: 'Inter_700Bold', fontSize: 17 },
  statLabel: { color: colors.mutedInk, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  followButton: { alignItems: 'center', alignSelf: 'center', backgroundColor: colors.coral, borderRadius: radii.pill, justifyContent: 'center', marginTop: spacing.lg, minHeight: 46, minWidth: 180, paddingHorizontal: spacing.lg },
  secondaryButton: { backgroundColor: colors.surface, borderColor: colors.hairline, borderWidth: 1 },
  followText: { color: colors.white, fontFamily: 'Inter_700Bold', fontSize: 14 },
  secondaryText: { color: colors.ink },
  pressed: { opacity: 0.7 },
  error: { color: colors.danger, fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
  contentDivider: { borderTopColor: colors.hairline, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing.xl },
});
