import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { demoStories, DemoStory } from '@/features/demo/demo-session';
import { colors, spacing } from '@/theme/tokens';

function StoryItem({ story }: Readonly<{ story: DemoStory }>) {
  return (
    <Pressable
      accessibilityLabel={`Abrir historia de ${story.username}`}
      accessibilityRole="button"
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
      <Avatar
        uri={story.avatarUrl}
        size={68}
        highlighted={!story.seen}
        accessibilityLabel={`Avatar de ${story.username}`}
      />
      <Text numberOfLines={1} style={[styles.label, story.seen && styles.seen]}>
        {story.username}
      </Text>
    </Pressable>
  );
}

export function StoryRail() {
  return (
    <View style={styles.container}>
      <FlatList
        data={demoStories}
        horizontal
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <StoryItem story={item} />}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.content}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderBottomColor: colors.hairline, borderBottomWidth: StyleSheet.hairlineWidth },
  content: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  item: { alignItems: 'center', width: 72 },
  pressed: { opacity: 0.62 },
  label: { color: colors.ink, fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 5, maxWidth: 72 },
  seen: { color: colors.mutedInk },
});
