import Feather from '@expo/vector-icons/Feather';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors, spacing } from '@/theme/tokens';

const activities = [
  { id: 'a1', user: 'santi.r', text: 'solicitó seguirte', time: 'Ahora', image: 'https://i.pravatar.cc/200?img=12', unread: true },
  { id: 'a2', user: 'linafilm', text: 'comentó: “Ese cielo está increíble”', time: '12 min', image: 'https://i.pravatar.cc/200?img=32', unread: true },
  { id: 'a3', user: 'ines.c', text: 'indicó que le gusta tu publicación', time: '1 h', image: 'https://i.pravatar.cc/200?img=25', unread: false },
  { id: 'a4', user: 'mateo.jpg', text: 'empezó a seguirte', time: 'Ayer', image: 'https://i.pravatar.cc/200?img=15', unread: false },
] as const;

export default function ActivityScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScreenHeader title="Actividad" eyebrow="Lo más reciente" />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper, flex: 1 },
  list: { paddingHorizontal: spacing.md },
  row: { alignItems: 'center', borderBottomColor: colors.hairline, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 78, paddingVertical: spacing.sm },
  copy: { flex: 1, marginHorizontal: spacing.sm },
  text: { color: colors.ink, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19 },
  user: { fontFamily: 'Inter_700Bold' },
  time: { color: colors.mutedInk, fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: 3 },
  dot: { backgroundColor: colors.coral, borderRadius: 5, height: 10, width: 10 },
});
