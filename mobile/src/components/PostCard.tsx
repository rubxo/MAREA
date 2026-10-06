import Feather from '@expo/vector-icons/Feather';
import { memo } from 'react';
import { useSocialNavigation } from '@/features/navigation/use-social-navigation';
import * as Linking from 'expo-linking';
import { Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Post } from '@/domain/models';
import { colors, spacing } from '@/theme/tokens';
import { Avatar } from './Avatar';
import { CachedImage } from './CachedImage';

export const PostCard=memo(function PostCard({post,onLike,onComments,active=true}:{post:Post;onLike:()=>void;onComments?:()=>void;active?:boolean}){
 const {width}=useWindowDimensions();
 const navigation=useSocialNavigation();
 const comments=onComments??(()=>navigation.post(post.id));
 const share=()=>{void Share.share({message:Linking.createURL('post/'+post.id)}).catch(()=>{});};
 return <View style={styles.card}>
   <Pressable accessibilityRole="button" accessibilityLabel={'Ver perfil de '+post.author.username} onPress={()=>navigation.profile(post.author.username)} style={styles.author}>
     <Avatar uri={post.author.avatarUrl} size={42} accessibilityLabel={post.author.displayName}/>
     <View><Text style={styles.name}>{post.author.username}</Text><Text style={styles.muted}>{post.author.displayName}</Text></View>
   </Pressable>
   {active ? <CachedImage uri={post.media.url} style={{width,height:Math.min(width*post.media.height/post.media.width,560)}} contentFit="cover" accessibilityLabel={post.caption||'Fotografía de '+post.author.displayName}/> : <View style={{width,height:Math.min(width*post.media.height/post.media.width,560),backgroundColor:colors.hairline}}/>}
   <View style={styles.copy}>
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={post.viewerHasLiked?'Quitar Me gusta':'Me gusta'} accessibilityState={{selected:post.viewerHasLiked}} style={styles.icon} onPress={onLike}><Feather name="heart" size={25} color={post.viewerHasLiked?colors.coral:colors.ink}/></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Comentar" style={styles.icon} onPress={comments}><Feather name="message-circle" size={24} color={colors.ink}/></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Compartir publicación" style={styles.icon} onPress={share}><Feather name="send" size={23} color={colors.ink}/></Pressable>
    </View>
    <Text style={styles.name}>{post.likeCount.toLocaleString()} Me gusta</Text>
    <Text style={styles.caption}><Text style={styles.name}>{post.author.username} </Text>{post.caption}</Text>
    <Pressable accessibilityRole="button" onPress={comments} style={{minHeight:40,justifyContent:'center'}}><Text style={styles.muted}>Ver comentarios ({post.commentCount})</Text></Pressable>
    <Text style={styles.time}>{new Date(post.createdAt).toLocaleDateString('es',{day:'numeric',month:'long'})}</Text>
   </View>
 </View>;
});
const styles=StyleSheet.create({
 card:{backgroundColor:colors.paper,marginBottom:spacing.lg},
 author:{flexDirection:'row',alignItems:'center',gap:10,padding:16},
 name:{fontFamily:'Inter_700Bold',color:colors.ink,fontSize:13},
 muted:{fontFamily:'Inter_400Regular',color:colors.mutedInk,fontSize:12,marginTop:3},
 copy:{paddingHorizontal:16},actions:{flexDirection:'row',gap:4},icon:{height:48,width:44,justifyContent:'center',alignItems:'center'},
 caption:{fontFamily:'Inter_400Regular',color:colors.ink,fontSize:13,lineHeight:20,marginTop:6},
 time:{fontSize:10,color:colors.mutedInk,textTransform:'uppercase'}
});
