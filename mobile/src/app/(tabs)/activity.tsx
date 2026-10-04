import Feather from '@expo/vector-icons/Feather';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuthSession } from '@/features/auth/auth-session-provider';
import { useFollowRequests } from '@/features/social/use-follow-requests';
import { FollowRequest } from '@/domain/models';
import { useState } from 'react';
import { colors, spacing } from '@/theme/tokens';

const activities = [
  { id: 'a1', user: 'santi.r', text: 'solicitó seguirte', time: 'Ahora', image: 'https://i.pravatar.cc/200?img=12', unread: true },
  { id: 'a2', user: 'linafilm', text: 'comentó: “Ese cielo está increíble”', time: '12 min', image: 'https://i.pravatar.cc/200?img=32', unread: true },
  { id: 'a3', user: 'ines.c', text: 'indicó que le gusta tu publicación', time: '1 h', image: 'https://i.pravatar.cc/200?img=25', unread: false },
  { id: 'a4', user: 'mateo.jpg', text: 'empezó a seguirte', time: 'Ayer', image: 'https://i.pravatar.cc/200?img=15', unread: false },
] as const;

export default function ActivityScreen() {
  const { state } = useAuthSession();
  const remote = state.status === 'authenticated' && state.mode === 'remote';
  const { requests, status, reload, respond } = useFollowRequests(remote);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(request: FollowRequest, accept: boolean) {
    setBusyId(request.id);
    setError(null);
    try {
      await respond(request.id, accept);
    } catch {
      setError('No pudimos responder la solicitud.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader title="Actividad" eyebrow="Lo más reciente" />
      {remote ? (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, requests.length === 0 && styles.grow]}
          ListHeaderComponent={error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          ListEmptyComponent={
            status === 'error' ? (
              <EmptyState icon="wifi-off" title="No pudimos cargar tu actividad" description="Revisa la conexión e inténtalo nuevamente." actionLabel="Reintentar" onAction={() => void reload()} />
            ) : status === 'loading' ? (
              <EmptyState icon="loader" title="Buscando novedades" description="Estamos actualizando tus solicitudes." />
            ) : (
              <EmptyState icon="heart" title="Todo al día" description="Las nuevas solicitudes de seguimiento aparecerán aquí." />
            )
          }
          renderItem={({ item }) => (
            <View style={styles.requestRow}>
              <Avatar uri={item.requester.avatarUrl} accessibilityLabel={`Foto de ${item.requester.displayName}`} />
              <View style={styles.copy}>
                <Text style={styles.text}><Text style={styles.user}>{item.requester.username} </Text>solicitó seguirte</Text>
                <Text style={styles.time}>Pendiente</Text>
              </View>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" disabled={busyId === item.id} onPress={() => void decide(item, true)} style={({ pressed }) => [styles.accept, pressed && styles.pressed]}><Feather name="check" size={17} color={colors.white} /></Pressable>
                <Pressable accessibilityRole="button" disabled={busyId === item.id} onPress={() => void decide(item, false)} style={({ pressed }) => [styles.reject, pressed && styles.pressed]}><Feather name="x" size={17} color={colors.mutedInk} /></Pressable>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.image} accessibilityLabel={`Foto de ${item.user}`} />
            <View style={styles.copy}>
              <Text style={styles.text}><Text style={styles.user}>{item.user} </Text>{item.text}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>
            {item.unread ? <View accessibilityLabel="Sin leer" style={styles.dot} /> : <Feather name="chevron-right" size={18} color={colors.mutedInk} />}
          </View>
        )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  list: { paddingHorizontal: spacing.md },
  grow: { flexGrow: 1 },
  row: { alignItems: 'center', borderBottomColor: colors.hairline, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 78, paddingVertical: spacing.sm },
  requestRow: { alignItems: 'center', borderBottomColor: colors.hairline, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 86, paddingVertical: spacing.sm },
  copy: { flex: 1, marginHorizontal: spacing.sm },
  text: { color: colors.ink, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  user: { fontFamily: 'Inter_700Bold' },
  time: { color: colors.mutedInk, fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 3 },
  dot: { backgroundColor: colors.coral, borderRadius: 5, height: 10, width: 10 },
  actions: { flexDirection: 'row', gap: spacing.xs },
  accept: { alignItems: 'center', backgroundColor: colors.coral, borderRadius: 18, height: 36, justifyContent: 'center', width: 44 },
  reject: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.hairline, borderRadius: 18, borderWidth: 1, height: 36, justifyContent: 'center', width: 44 },
  pressed: { opacity: 0.6 },
  error: { color: colors.danger, fontFamily: 'Inter_500Medium', fontSize: 12, paddingVertical: spacing.sm, textAlign: 'center' },
});
