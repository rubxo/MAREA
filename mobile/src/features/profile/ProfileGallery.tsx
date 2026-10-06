import { ReactElement } from 'react';
import { FlatList, Pressable, useWindowDimensions, Text, ActivityIndicator } from 'react-native';
import { useSocialNavigation } from '@/features/navigation/use-social-navigation';
import { usePosts } from '@/features/feed/use-posts';
import { CachedImage } from '@/components/CachedImage';
import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/theme/tokens';

export function ProfileGallery({ authorId, header, locked = false }: {
  authorId: string; header?: ReactElement; locked?: boolean;
}) {
  const navigation = useSocialNavigation();
  const feed = usePosts('profile', authorId);
  const cell = (useWindowDimensions().width - 6) / 3;
  return <FlatList
    data={locked ? [] : feed.posts}
    numColumns={3}
    keyExtractor={post => post.id}
    ListHeaderComponent={header}
    contentContainerStyle={{ paddingBottom: 32 }}
    initialNumToRender={9}
    windowSize={5}
    maxToRenderPerBatch={6}
    refreshing={feed.loading}
    onRefresh={() => void feed.refresh()}
    onEndReached={() => { if (!locked && feed.hasMore) void feed.loadMore(); }}
    onEndReachedThreshold={0.5}
    renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel="Abrir publicación" onPress={() => navigation.post(item.id)}>
      <CachedImage uri={item.media.url} style={{ height: cell, width: cell, margin: 1 }} contentFit="cover" />
    </Pressable>}
    ListEmptyComponent={locked
      ? <EmptyState icon="lock" title="Esta cuenta es privada" description="Sigue a esta persona para ver sus publicaciones y stories." />
      : !feed.loading && !feed.error
        ? <EmptyState icon="camera" title="Sin publicaciones todavía" description="Las nuevas fotografías aparecerán aquí." /> : null}
    ListFooterComponent={feed.error
      ? <Text accessibilityRole="alert" style={{ padding: 16, color: colors.mutedInk }}>{feed.error}</Text>
      : feed.loading ? <ActivityIndicator color={colors.coral} /> : null}
  />;
}

