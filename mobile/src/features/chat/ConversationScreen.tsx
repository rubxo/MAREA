import Feather from '@expo/vector-icons/Feather';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import type { MessageStatus } from '@/domain/models/chat';
import { colors, typography } from '@/theme/tokens';

import { useConversation } from './use-chat';

const statusLabel: Record<MessageStatus, string> = { pending: 'Pendiente', sent: 'Enviado', delivered: 'Entregado', read: 'Visto', failed: 'Reintentar' };

export function ConversationScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const { messages, peer, userId, loading, loadingOlder, hasMore, error, connected, typing, send, setTyping, loadOlder, refresh } = useConversation(id);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  async function submit() {
    if (!body.trim() || sending) return;
    const text = body.trim(); setSending(true);
    try { await send(text); setBody(''); setTyping(false); }
    catch { /* The hook exposes the error and the draft stays available. */ }
    finally { setSending(false); }
  }
  return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver a mensajes" onPress={() => router.back()} style={styles.back}><Feather name="arrow-left" size={24} color={colors.ink} /></Pressable>
      <Avatar uri={peer?.avatarUrl ?? null} accessibilityLabel={peer?.displayName ?? 'Perfil'} size={40} />
      <View style={styles.heading}><Text style={styles.name}>{peer?.displayName ?? 'Conversación'}</Text>
        <Text style={styles.subtitle}>{typing ? 'Escribiendo…' : connected ? `@${peer?.username ?? 'usuario'}` : 'Reconectando…'}</Text></View>
    </View>
    {error && <Pressable accessibilityRole="button" onPress={() => void refresh()}><Text style={styles.error}>{error} Toca para reintentar.</Text></Pressable>}
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <FlatList data={messages} keyExtractor={(item) => item.id} inverted contentContainerStyle={styles.messages}
        onEndReached={() => { if (hasMore && !loadingOlder) void loadOlder(); }} onEndReachedThreshold={0.3}
        ListFooterComponent={loadingOlder ? <ActivityIndicator color={colors.coral} /> : null}
        ListEmptyComponent={<Text style={styles.empty}>{loading ? 'Cargando historial…' : 'Escribe el primer mensaje.'}</Text>}
        renderItem={({ item }) => {
          const mine = item.senderId === userId;
          return <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
            <Text style={[styles.body, mine && styles.mineText]}>{item.body}</Text>
            <Text style={[styles.receipt, mine && styles.mineText]}>{new Date(item.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}{mine ? ` · ${statusLabel[item.status]}` : ''}</Text>
          </View>;
        }} />
      <View style={styles.composer}>
        <TextInput value={body} onChangeText={(value) => { setBody(value); setTyping(Boolean(value.trim())); }}
          style={styles.input} placeholder="Mensaje…" placeholderTextColor={colors.mutedInk} multiline maxLength={4000}
          accessibilityLabel="Mensaje" onBlur={() => setTyping(false)} />
        <Pressable accessibilityRole="button" accessibilityLabel="Enviar mensaje" disabled={!body.trim() || sending}
          style={[styles.send, (!body.trim() || sending) && styles.disabled]} onPress={() => void submit()}>
          {sending ? <ActivityIndicator color={colors.white} /> : <Feather name="arrow-up" size={22} color={colors.white} />}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper }, flex: { flex: 1 },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
  back: { width: 32, height: 44, justifyContent: 'center' }, heading: { flex: 1 }, name: { ...typography.label, color: colors.ink }, subtitle: { ...typography.caption, color: colors.mutedInk, marginTop: 3 },
  messages: { padding: 16, gap: 10 }, bubble: { padding: 13, borderRadius: 18, maxWidth: '85%' },
  mine: { backgroundColor: colors.deepBlue, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirs: { backgroundColor: colors.white, alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  body: { ...typography.body, color: colors.ink }, mineText: { color: colors.white },
  receipt: { fontSize: 10, color: colors.mutedInk, alignSelf: 'flex-end', marginTop: 6 },
  empty: { transform: [{ scaleY: -1 }], textAlign: 'center', color: colors.mutedInk, padding: 24 },
  composer: { flexDirection: 'row', padding: 12, gap: 10, alignItems: 'flex-end', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
  input: { flex: 1, maxHeight: 140, minHeight: 46, padding: 13, borderRadius: 22, backgroundColor: colors.white, color: colors.ink },
  send: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 }, error: { color: colors.danger, padding: 12, fontSize: 12 },
});
