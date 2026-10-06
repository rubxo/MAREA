import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { colors, typography } from '@/theme/tokens';

import { useInbox } from './use-chat';

export function InboxScreen() {
  const { conversations, loading, error, connected, refresh, startConversation } = useInbox();
  const [username, setUsername] = useState('');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  async function start() {
    if (!username.trim() || starting) return;
    setStarting(true); setStartError(null);
    try {
      const id = await startConversation(username);
      setUsername('');
      router.push({ pathname: '/messages/[id]', params: { id } });
    } catch (cause) { setStartError(cause instanceof Error ? cause.message : 'No se pudo abrir la conversación.'); }
    finally { setStarting(false); }
  }
  return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={() => router.back()} style={styles.back}>
        <Feather name="arrow-left" size={24} color={colors.ink} />
      </Pressable>
      <View><Text style={styles.title}>Mensajes</Text><Text style={styles.subtitle}>{connected ? 'Conectado' : 'Conectando · historial guardado disponible'}</Text></View>
    </View>
    <View style={styles.compose}>
      <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none"
        autoCorrect={false} placeholder="Nombre de usuario" accessibilityLabel="Nombre de usuario para nuevo mensaje"
        placeholderTextColor={colors.mutedInk} onSubmitEditing={() => void start()} returnKeyType="go" />
      <Pressable accessibilityRole="button" accessibilityLabel="Iniciar conversación" disabled={starting || !username.trim()}
        onPress={() => void start()} style={styles.start}>
        {starting ? <ActivityIndicator color={colors.white} /> : <Feather name="edit-3" size={20} color={colors.white} />}
      </Pressable>
    </View>
    {(startError || error) && <Text accessibilityRole="alert" style={styles.error}>{startError || error}</Text>}
    <FlatList data={conversations} keyExtractor={(item) => item.id} refreshing={loading} onRefresh={() => void refresh()}
      contentContainerStyle={conversations.length ? undefined : styles.emptyContainer}
      ListEmptyComponent={<View style={styles.empty}>
        <Feather name="send" size={36} color={colors.coral} />
        <Text style={styles.emptyTitle}>{loading ? 'Cargando conversaciones…' : 'Tu próxima conversación empieza aquí'}</Text>
        <Text style={styles.subtitle}>Escribe un nombre de usuario para enviar un mensaje privado.</Text>
      </View>}
      renderItem={({ item }) => {
        const peer = item.members[0];
        return <Pressable accessibilityRole="button" accessibilityLabel={`Conversación con ${peer?.username ?? 'usuario'}, ${item.unreadCount} sin leer`}
          onPress={() => router.push({ pathname: '/messages/[id]', params: { id: item.id } })} style={styles.row}>
          <Avatar uri={peer?.avatarUrl ?? null} accessibilityLabel={peer?.displayName ?? 'Perfil'} size={54} />
          <View style={styles.rowText}>
            <View style={styles.rowHeading}><Text numberOfLines={1} style={styles.name}>{peer?.displayName ?? 'Conversación'}</Text>
              <Text style={styles.time}>{new Date(item.updatedAt).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</Text></View>
            <Text numberOfLines={1} style={[styles.preview, item.unreadCount > 0 && styles.unreadText]}>{item.lastMessage?.body ?? 'Envía el primer mensaje'}</Text>
          </View>
          {item.unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text></View>}
        </Pressable>;
      }} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  back: { width: 40, height: 44, justifyContent: 'center' }, title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.caption, color: colors.mutedInk },
  compose: { flexDirection: 'row', margin: 16, marginTop: 4, gap: 8 },
  input: { flex: 1, borderRadius: 14, padding: 14, backgroundColor: colors.white, color: colors.ink, borderWidth: 1, borderColor: colors.hairline },
  start: { width: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.coral },
  error: { color: colors.danger, paddingHorizontal: 20, paddingBottom: 12 },
  row: { paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', gap: 12, alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  rowText: { flex: 1, gap: 5 }, rowHeading: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  name: { ...typography.label, color: colors.ink, flex: 1 }, time: { ...typography.caption, color: colors.mutedInk },
  preview: { ...typography.body, color: colors.mutedInk }, unreadText: { fontWeight: '700', color: colors.ink },
  badge: { borderRadius: 14, backgroundColor: colors.coral, minWidth: 22, padding: 4, alignItems: 'center' },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.white },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' }, empty: { alignItems: 'center', padding: 36, gap: 14 },
  emptyTitle: { ...typography.title, color: colors.ink, textAlign: 'center' },
});
