import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DemoModeBanner } from '@/components/DemoModeBanner';
import { PostCard } from '@/components/PostCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StoryRail } from '@/components/StoryRail';
import { demoPosts } from '@/features/demo/demo-session';
import { colors } from '@/theme/tokens';

export default function FeedScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <FlatList
        data={demoPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <ScreenHeader title="marea" eyebrow="Tu mundo visual" actionIcon="message-square" actionLabel="Abrir mensajes" />
            <DemoModeBanner />
            <StoryRail />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safeArea: { backgroundColor: colors.paper, flex: 1 } });
