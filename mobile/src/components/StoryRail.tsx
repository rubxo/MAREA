import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '@/components/Avatar';
import { StoryCursor } from '@/data/repositories/story-repository';
import { Story } from '@/domain/models/story';
import { activeStories } from '@/features/stories/story-state';
import { readStoryViews, syncStoryViews } from '@/features/stories/story-view-store';
import { useStoryRepository } from '@/features/stories/use-story-repository';
import { colors, spacing } from '@/theme/tokens';

export function StoryRail() {
  const { repository, userId } = useStoryRepository();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursor = useRef<StoryCursor | null>(null);
  const busy = useRef(false);
  const mounted = useRef(false);
  const generation = useRef(0);

  const load = useCallback(async (more = false) => {
    if (!repository || !userId || busy.current || (more && !cursor.current)) return;
    busy.current = true;
    const request = generation.current;
    setLoading(true);
    try {
      const [page, views] = await Promise.all([repository.getPage(more ? cursor.current ?? undefined : undefined), readStoryViews(userId)]);
      if (!mounted.current || request !== generation.current) return;
      const next = page.stories.map((story) => ({ ...story, viewedAt: views.get(story.id) ?? story.viewedAt }));
      setStories((previous) => activeStories(more ? [...previous, ...next.filter((story) => !previous.some((old) => old.id === story.id))] : next));
      cursor.current = page.next;
      setHasMore(page.next !== null);
      setError(null);
      void syncStoryViews(userId, (id, at) => repository.markViewed(id, at)).catch(() => undefined);
    } catch {
      if (mounted.current && request === generation.current) setError('No se pudieron cargar las historias. Toca para reintentar.');
    } finally {
      if (request === generation.current) { busy.current = false; if (mounted.current) setLoading(false); }
    }
  }, [repository, userId]);

  useFocusEffect(useCallback(() => {
    mounted.current = true;
    generation.current += 1;
    busy.current = false;
    void load();
    const timer = setInterval(() => {
      setStories((previous) => activeStories(previous));
      if (AppState.currentState === 'active' && repository && userId) {
        void syncStoryViews(userId, (id, at) => repository.markViewed(id, at)).catch(() => undefined);
      }
    }, 15_000);
    const listener = AppState.addEventListener('change', (state) => { if (state === 'active') void load(); });
    return () => { mounted.current = false; generation.current += 1; clearInterval(timer); listener.remove(); };
  }, [load, repository, userId]));

  const authors = [...new Map(stories.map((story) => [story.author.id, story.author])).values()];
  return (
    <View style={styles.container}>
      <FlatList
        data={authors} horizontal showsHorizontalScrollIndicator={false}
        keyExtractor={(author) => author.id} contentContainerStyle={styles.content}
        onEndReached={() => { void load(true); }} onEndReachedThreshold={0.5}
        ListHeaderComponent={<Pressable accessibilityRole="button" accessibilityLabel="Crear historia" onPress={() => router.push('/story/create')} style={styles.item}>
          <View style={styles.add}><Feather name="plus" size={28} color={colors.coral} /></View>
          <Text style={styles.label}>Tu historia</Text>
        </Pressable>}
        ListEmptyComponent={!loading && !error ? <Text style={styles.empty}>Las historias aparecen aquí durante 24 horas.</Text> : null}
        ListFooterComponent={loading ? <ActivityIndicator style={styles.spinner} color={colors.coral} /> : hasMore ? <Pressable onPress={() => { void load(true); }} style={styles.spinner}><Text style={styles.label}>Ver más</Text></Pressable> : null}
        renderItem={({ item: author }) => {
          const ownStories = stories.filter((story) => story.author.id === author.id);
          const first = ownStories.find((story) => !story.viewedAt) ?? ownStories[0];
          return <Pressable accessibilityRole="button" accessibilityLabel={`Abrir historia de ${author.username}`} style={styles.item}
            onPress={() => { if (first) router.push({ pathname: '/story/[id]', params: { id: first.id } }); }}>
            <Avatar uri={author.avatarUrl} size={68} highlighted={ownStories.some((story) => !story.viewedAt)} accessibilityLabel={`Avatar de ${author.username}`} />
            <Text numberOfLines={1} style={styles.label}>{author.username}</Text>
          </Pressable>;
        }}
      />
      {error ? <Pressable onPress={() => { void load(); }}><Text style={styles.error}>{error}</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomColor: colors.hairline, borderBottomWidth: StyleSheet.hairlineWidth },
  content: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  item: { alignItems: 'center', width: 72 },
  add: { width: 68, height: 68, borderRadius: 34, borderWidth: 1, borderColor: colors.coral, justifyContent: 'center', alignItems: 'center' },
  label: { color: colors.ink, fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 5, maxWidth: 72 },
  empty: { color: colors.mutedInk, width: 190, alignSelf: 'center', fontSize: 12, lineHeight: 18 },
  error: { color: colors.danger, paddingHorizontal: 16, paddingBottom: 8, fontSize: 12 },
  spinner: { justifyContent: 'center', paddingHorizontal: 16 },
});
