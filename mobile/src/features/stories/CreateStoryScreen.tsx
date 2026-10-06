import Feather from '@expo/vector-icons/Feather';
import { randomUUID } from 'expo-crypto';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pickPhoto } from '@/services/media/pick-photo';
import { uploadPhoto } from '@/services/media/upload-photo';
import { colors } from '@/theme/tokens';
import { useStoryRepository } from './use-story-repository';

type Photo = { uri: string; width: number; height: number };

export function CreateStoryScreen() {
  const { repository, userId } = useStoryRepository();
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draft = useRef<{ id: string; uploaded: boolean }>({ id: randomUUID(), uploaded: false });
  const lock = useRef(false);

  const choose = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const selected = await pickPhoto();
      if (selected) { setPhoto(selected); draft.current = { id: randomUUID(), uploaded: false }; setError(null); }
    } catch { setError('No se pudo abrir la foto. Revisa el permiso de tu galería.'); }
    finally { lock.current = false; setBusy(false); }
  };

  const publish = async () => {
    if (!photo || !userId || !repository || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const storagePath = `${userId}/${draft.current.id}.jpg`;
      if (!draft.current.uploaded) {
        await uploadPhoto('story-media', storagePath, photo.uri);
        draft.current.uploaded = true;
      }
      await repository.create(draft.current.id, storagePath, photo.width, photo.height);
      router.replace({ pathname: '/story/[id]', params: { id: draft.current.id } });
    } catch { setError('No se pudo publicar. Conservamos tu foto para reintentar cuando tengas conexión.'); }
    finally { lock.current = false; setBusy(false); }
  };

  return <SafeAreaView style={styles.screen}>
    <View style={styles.header}><Text style={styles.title}>Tu historia</Text><Pressable disabled={busy} accessibilityRole="button" accessibilityLabel="Cerrar" onPress={() => router.back()}><Feather name="x" size={28} color={colors.white} /></Pressable></View>
    <View style={styles.preview}>
      {photo ? <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="contain" cachePolicy="none" accessibilityLabel="Vista previa de tu historia" /> : <><Feather name="image" size={52} color={colors.coral} /><Text style={styles.description}>Un momento para compartir. Tu foto estará visible durante 24 horas.</Text></>}
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <View style={styles.actions}>
      <Pressable disabled={busy} style={styles.secondary} onPress={() => { void choose(); }}><Text style={styles.label}>{photo ? 'Cambiar foto' : 'Elegir foto'}</Text></Pressable>
      {photo ? <Pressable disabled={busy} style={[styles.primary, busy && styles.disabled]} onPress={() => { void publish(); }}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.label}>Publicar historia</Text>}</Pressable> : null}
      <Text style={styles.privacy}>La privacidad de tu cuenta también se aplica a tus historias.</Text>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.ink },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: colors.white, fontFamily: 'Inter_700Bold', fontSize: 23 },
  preview: { flex: 1, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16 },
  description: { color: colors.white, fontSize: 17, lineHeight: 25, textAlign: 'center', padding: 32 },
  error: { color: '#ffb8ac', paddingHorizontal: 24, paddingTop: 16, lineHeight: 20 },
  actions: { padding: 20, gap: 12 },
  primary: { borderRadius: 28, backgroundColor: colors.coral, alignItems: 'center', padding: 17 },
  secondary: { borderRadius: 28, borderWidth: 1, borderColor: '#ffffff66', alignItems: 'center', padding: 17 },
  label: { color: colors.white, fontFamily: 'Inter_600SemiBold' },
  disabled: { opacity: 0.6 },
  privacy: { textAlign: 'center', color: '#cccccc', fontSize: 11, lineHeight: 16 },
});
