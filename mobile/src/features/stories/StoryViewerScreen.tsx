import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Avatar } from '@/components/Avatar';
import { CachedImage } from '@/components/CachedImage';
import { StoryCursor } from '@/data/repositories/story-repository';
import { Story } from '@/domain/models/story';
import { colors } from '@/theme/tokens';
import { activeStories, isStoryActive, nextStoryIndex, storyProgress } from './story-state';
import { rememberStoryView, syncStoryViews } from './story-view-store';
import { useStoryRepository } from './use-story-repository';

function closeViewer() { if (router.canGoBack()) router.back(); else router.replace('/'); }

export function StoryViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { repository, userId } = useStoryRepository();
  const [stories, setStories] = useState<Story[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [readyId, setReadyId] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [held, setHeld] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [focused, setFocused] = useState(false);
  const [progress, setProgress] = useState(0);
  const elapsed = useRef(0);
  const pressStarted = useRef(0);
  const cursor = useRef<StoryCursor | null>(null);
  const fetching = useRef(false);
  const mounted = useRef(true);
  const story = stories[index];

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => { setFocused(false); };
  }, []));

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => setAppActive(state === 'active'));
    return () => listener.remove();
  }, []);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    const load = async () => {
      try {
        if (!repository || !id) throw new Error('Inicia sesión para ver esta historia.');
        const selected = await repository.getStory(id);
        if (!selected) throw new Error('Esta historia expiró o ya no está disponible.');
        let page = await repository.getPage(undefined, selected.author.id);
        let initialIndex = page.stories.findIndex((item) => item.id === id);
        if (initialIndex < 0) {
          page = await repository.getPage({ id: selected.id, createdAt: selected.createdAt }, selected.author.id);
          page = { ...page, stories: [selected, ...page.stories] };
          initialIndex = 0;
        }
        if (!active) return;
        elapsed.current = 0;
        cursor.current = page.next;
        setStories(page.stories);
        setIndex(initialIndex);
        setError(null);
      } catch (failure) {
        if (active) setError(failure instanceof Error ? failure.message : 'No se pudo abrir la historia.');
      } finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; mounted.current = false; };
  }, [id, repository, retry]);

  const advance = useCallback(async (direction: -1 | 1) => {
    if (fetching.current) return;
    let next = nextStoryIndex(index, direction, stories.length);
    if (next === null && direction === 1 && cursor.current && repository && story) {
      fetching.current = true;
      setLoading(true);
      try {
        const page = await repository.getPage(cursor.current, story.author.id);
        if (!mounted.current) return;
        cursor.current = page.next;
        const additional = activeStories(page.stories).filter((item) => !stories.some((old) => old.id === item.id));
        if (additional.length) {
          next = stories.length;
          setStories((previous) => [...previous, ...additional]);
        }
      } catch {
        if (mounted.current) setError('No se pudieron cargar más historias. Reintenta.');
        return;
      } finally { fetching.current = false; if (mounted.current) setLoading(false); }
    }
    if (!mounted.current) return;
    if (next === null) { closeViewer(); return; }
    elapsed.current = 0;
    setProgress(0);
    setImageError(false);
    setIndex(next);
  }, [index, repository, stories, story]);

  useEffect(() => {
    if (!story || !appActive || !focused) return;
    if (!isStoryActive(story)) { void advance(1); return; }
    const timer = setTimeout(() => { void advance(1); }, Math.max(0, Date.parse(story.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [advance, appActive, focused, story]);

  useEffect(() => {
    if (!story || readyId !== story.id || held || !appActive || !focused || loading || error || imageError) return;
    let previous = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      elapsed.current += now - previous;
      previous = now;
      const fraction = storyProgress(elapsed.current);
      setProgress(fraction);
      if (fraction === 1) { clearInterval(timer); void advance(1); }
    }, 50);
    return () => clearInterval(timer);
  }, [advance, appActive, error, focused, held, imageError, loading, readyId, story]);

  const loaded = () => {
    if (!story || !userId || !repository || !isStoryActive(story)) return;
    setReadyId(story.id);
    void rememberStoryView(userId, story.id, story.expiresAt)
      .then(() => syncStoryViews(userId, (storyId, at) => repository.markViewed(storyId, at)))
      .catch(() => undefined); // SQLite retains unsent receipts until the next retry.
  };
  const tap = useCallback((direction: -1 | 1) => {
    if (Date.now() - pressStarted.current < 220) void advance(direction);
  }, [advance]);
  const failImage = useCallback(() => setImageError(true), []);

  return <SafeAreaView style={styles.screen}>
    <StatusBar style="light" />
    {story ? <>
      <View style={styles.segments}>{stories.map((item, position) => <View key={item.id} style={styles.segment}>
        <View style={[styles.fill, { width: `${(position < index ? 1 : position === index ? progress : 0) * 100}%` }]} />
      </View>)}</View>
      <View style={styles.header}>
        <Avatar uri={story.author.avatarUrl} size={36} accessibilityLabel={story.author.username} />
        <View style={styles.identity}><Text style={styles.username}>{story.author.username}</Text><Text style={styles.hint}>Mantén pulsado para pausar</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar historia" hitSlop={12} onPress={closeViewer}><Feather name="x" size={28} color={colors.white} /></Pressable>
      </View>
      <View style={styles.media}>
        <CachedImage key={`${story.id}-${retry}`} uri={story.mediaUrl} style={StyleSheet.absoluteFill} contentFit="contain" onLoad={loaded}
          onError={failImage} accessibilityLabel={`Historia de ${story.author.username}`} />
        <View style={styles.touchZones}>
          {([-1, 1] as const).map((direction) => <Pressable key={direction}
            accessibilityRole="button" accessibilityLabel={direction < 0 ? 'Historia anterior. Mantén para pausar.' : 'Siguiente historia. Mantén para pausar.'}
            style={{ flex: direction < 0 ? 1 : 2 }}
            onPressIn={() => { pressStarted.current = Date.now(); setHeld(true); }}
            onPressOut={() => setHeld(false)} onPress={() => tap(direction)} />)}
        </View>
        {imageError ? <View style={styles.message}><Text style={styles.messageText}>No se pudo cargar la foto.</Text><Pressable style={styles.button} onPress={() => { setImageError(false); setRetry((value) => value + 1); }}><Text style={styles.username}>Reintentar</Text></Pressable></View> : null}
      </View>
    </> : null}
    {loading ? <View pointerEvents="none" style={styles.overlay}><ActivityIndicator color={colors.coral} /></View> : null}
    {error ? <View style={styles.overlay}><Text style={styles.messageText}>{error}</Text><Pressable style={styles.button} onPress={() => { setLoading(true); setError(null); setRetry((value) => value + 1); }}><Text style={styles.username}>Reintentar</Text></Pressable><Pressable style={styles.button} onPress={closeViewer}><Text style={styles.username}>Cerrar</Text></Pressable></View> : null}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  segments: { flexDirection: 'row', gap: 3, margin: 12, height: 3 },
  segment: { flex: 1, borderRadius: 2, overflow: 'hidden', backgroundColor: '#ffffff44' },
  fill: { height: '100%', backgroundColor: colors.white },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  identity: { flex: 1 }, username: { fontFamily: 'Inter_600SemiBold', color: colors.white },
  hint: { color: '#cccccc', fontSize: 11, marginTop: 4 },
  media: { flex: 1 }, touchZones: { position: 'absolute', inset: 0, flexDirection: 'row' },
  overlay: { position: 'absolute', inset: 0, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', padding: 24 },
  message: { position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', padding: 24 },
  messageText: { color: colors.white, textAlign: 'center', fontSize: 16, lineHeight: 24 },
  button: { backgroundColor: colors.coral, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 24, marginTop: 16 },
});
