import { useSocialNavigation } from '@/features/navigation/use-social-navigation';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, TextInput, Text, View, useWindowDimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ProfileSummary } from '@/domain/models';
import { Avatar } from '@/components/Avatar';
import { CachedImage } from '@/components/CachedImage';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { usePosts } from '@/features/feed/use-posts';
import { colors } from '@/theme/tokens';
export default function ExploreScreen(){
 const navigation=useSocialNavigation();
 const [search,setSearch]=useState('');
 const [debounced,setDebounced]=useState('');
 const [people,setPeople]=useState<ProfileSummary[]>([]);
 const feed=usePosts('explore',undefined,debounced);
 const cell=(useWindowDimensions().width-4)/3;
 useEffect(()=>{const timer=setTimeout(()=>setDebounced(search.trim()),350);return()=>clearTimeout(timer);},[search]);
 useEffect(()=>{
   let active=true;
   void feed.repository?.searchPeople(debounced).then(rows=>{if(active)setPeople(rows);}).catch(()=>{if(active)setPeople([]);});
   return()=>{active=false;};
 },[debounced,feed.repository]);
 return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:colors.paper}}>
 <ScreenHeader title="Explorar" eyebrow="Otras formas de mirar"/>
 <TextInput accessibilityLabel="Buscar personas o fotografías" value={search} onChangeText={setSearch} placeholder="Busca personas o descripciones" placeholderTextColor={colors.mutedInk}
 style={{margin:16,padding:16,borderRadius:16,backgroundColor:colors.surface,color:colors.ink}}/>
 <FlatList data={feed.posts} numColumns={3} keyExtractor={p=>p.id} initialNumToRender={15} windowSize={5}
 onEndReached={()=>void feed.loadMore()} refreshing={feed.loading&&feed.posts.length>0} onRefresh={()=>void feed.refresh()}
 ListHeaderComponent={<View>{people.map(person=><Pressable key={person.id} accessibilityRole="button" onPress={()=>navigation.profile(person.username)} style={{padding:12,flexDirection:'row',alignItems:'center',gap:12}}><Avatar uri={person.avatarUrl} accessibilityLabel={person.displayName}/><View><Text style={{color:colors.ink,fontFamily:'Inter_700Bold'}}>@{person.username}</Text><Text style={{color:colors.mutedInk}}>{person.displayName}</Text></View></Pressable>)}{feed.error?<Text style={{padding:16,color:colors.mutedInk}}>{feed.error}</Text>:null}</View>}
 ListEmptyComponent={feed.loading?<ActivityIndicator color={colors.coral}/>:<EmptyState icon="search" title="Un mundo por descubrir" description={search?'Prueba otra búsqueda.':'Las fotografías públicas aparecerán aquí.'}/>}
 renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={'Abrir foto de '+item.author.username} onPress={()=>navigation.post(item.id)}><CachedImage uri={item.media.url} style={{height:cell,width:cell,margin:0.5}} contentFit="cover"/></Pressable>}/>
 </SafeAreaView>;
}



