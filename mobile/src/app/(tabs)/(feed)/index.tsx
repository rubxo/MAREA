import { FlatList, View, Text, ActivityIndicator, type ViewToken } from 'react-native';
import { useState } from 'react';
import type { Post } from '@/domain/models';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { PostCard } from '@/components/PostCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StoryRail } from '@/components/StoryRail';
import { EmptyState } from '@/components/EmptyState';
import { usePosts } from '@/features/feed/use-posts';
import { colors } from '@/theme/tokens';
export default function FeedScreen(){
 const feed=usePosts('feed');
 const [visible,setVisible]=useState<Set<string>|null>(null);
 const [viewabilityConfigCallbackPairs]=useState(()=>[{viewabilityConfig:{itemVisiblePercentThreshold:10},onViewableItemsChanged:({viewableItems}:{viewableItems:ViewToken<Post>[]})=>setVisible(new Set(viewableItems.map(token=>token.item.id)))}]);
 return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:colors.paper}}>
   <FlatList data={feed.posts} extraData={visible} viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs} keyExtractor={p=>p.id} renderItem={({item})=><PostCard post={item} active={visible===null||visible.has(item.id)} onLike={()=>void feed.like(item)}/>} 
     initialNumToRender={2} maxToRenderPerBatch={3} windowSize={5}
     refreshing={feed.loading&&feed.posts.length>0} onRefresh={()=>void feed.refresh()}
     onEndReached={()=>void feed.loadMore()} onEndReachedThreshold={0.5}
     ListHeaderComponent={<View><ScreenHeader title="marea" eyebrow="Tu mundo visual" actionIcon="message-square" actionLabel="Abrir mensajes" onAction={()=>router.push('/messages')}/><StoryRail/>{feed.error?<Text accessibilityRole="alert" style={{padding:16,color:colors.mutedInk}}>{feed.error}</Text>:null}</View>}
     ListEmptyComponent={feed.loading?<ActivityIndicator color={colors.coral}/>:<EmptyState icon="camera" title="Tu mundo empieza aquí" description="Sigue a personas en Explorar o comparte tu primera fotografía." actionLabel="Explorar" onAction={()=>router.push('/explore')}/>}
     ListFooterComponent={feed.loading&&feed.posts.length>0?<ActivityIndicator color={colors.coral}/>:null}/>
 </SafeAreaView>;
}
