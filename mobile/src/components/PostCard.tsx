import Feather from '@expo/vector-icons/Feather';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { DemoPost } from '@/features/demo/demo-session';
import { colors, spacing } from '@/theme/tokens';

import { Avatar } from './Avatar';

type PostCardProps = Readonly<{ post: DemoPost }>;

function ActionIcon({
  name,
  label,
  active = false,
  onPress,
}: Readonly<{
  name: React.ComponentProps<typeof Feather>['name'];
  label: string;
  active?: boolean;
  onPress?: () => void;
}>) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Feather name={name} size={23} color={active ? colors.coral : colors.ink} />
    </Pressable>
  );
}

export function PostCard({ post }: PostCardProps) {
  const [liked, setLiked] = useState(false);
  const { width } = useWindowDimensions();

  return (
    <View style={styles.card}>
      <View style={styles.authorRow}>
        <Avatar
          uri={post.avatarUrl}
          size={42}
          accessibilityLabel={`Foto de ${post.displayName}`}
        />
        <View style={styles.authorText}>
          <Text style={styles.username}>{post.username}</Text>
          <Text style={styles.location}>{post.location}</Text>
        </View>
        <ActionIcon name="more-horizontal" label="Más opciones" />
      </View>

      <Image
        source={{ uri: post.imageUrl }}
        style={{ width, height: Math.min(width * 1.12, 540) }}
        contentFit="cover"
        transition={180}
        cachePolicy="memory-disk"
        accessibilityLabel={`Publicación de ${post.displayName}: ${post.caption}`}
      />

      <View style={styles.content}>
        <View style={styles.actionsRow}>
          <View style={styles.leftActions}>
            <ActionIcon
              name="heart"
              label={liked ? 'Quitar Me gusta' : 'Dar Me gusta'}
              active={liked}
              onPress={() => setLiked((value) => !value)}
            />
            <ActionIcon name="message-circle" label="Comentar" />
            <ActionIcon name="send" label="Compartir" />
          </View>
          <ActionIcon name="bookmark" label="Guardar" />
        </View>
        <Text style={styles.likes}>{(post.likes + (liked ? 1 : 0)).toLocaleString()} Me gusta</Text>
        <Text style={styles.caption}>
          <Text style={styles.username}>{post.username} </Text>
          {post.caption}
        </Text>
        <Pressable accessibilityRole="button" style={styles.commentsButton}>
          <Text style={styles.comments}>Ver los {post.comments} comentarios</Text>
        </Pressable>
        <Text style={styles.time}>{post.createdLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.paper, marginBottom: spacing.lg },
  authorRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 62,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  authorText: { flex: 1, marginLeft: spacing.sm },
  username: { color: colors.ink, fontFamily: 'Inter_700Bold', fontSize: 13 },
  location: { color: colors.mutedInk, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  actionsRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  leftActions: { flexDirection: 'row', gap: spacing.xs },
  action: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  pressed: { opacity: 0.48, transform: [{ scale: 0.94 }] },
  likes: { color: colors.ink, fontFamily: 'Inter_700Bold', fontSize: 13, marginTop: 2 },
  caption: { color: colors.ink, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, marginTop: 5 },
  commentsButton: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  comments: { color: colors.mutedInk, fontFamily: 'Inter_400Regular', fontSize: 13 },
  time: { color: colors.mutedInk, fontFamily: 'Inter_500Medium', fontSize: 10, textTransform: 'uppercase' },
});
