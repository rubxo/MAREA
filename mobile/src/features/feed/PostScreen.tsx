import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Post, Comment } from '@/domain/models';
import { getSupabaseClient } from '@/data/remote/supabase-client';
import { SupabaseFeedRepository } from '@/data/repositories/feed-repository';
import { getSocialRuntime } from '@/services/sync/social-runtime';
import { overlayPendingComments, overlayPendingPost, setOptimisticLike } from '@/services/sync/reconciliation';
import { useAuthSession } from '@/features/auth/auth-session-provider';
import { PostCard } from '@/components/PostCard';
import { Avatar } from '@/components/Avatar';
import { ScreenHeader } from '@/components/ScreenHeader';
import { EmptyState } from '@/components/EmptyState';
import { colors } from '@/theme/tokens';

export default function PostScreen(){
 const {id}=useLocalSearchParams<{id:string}>();
 const {state}=useAuthSession();
 const session=state.status==='authenticated'?state.session:null;
 const userId=session?.userId;
 const repository=useMemo(()=>{const c=getSupabaseClient();return c?new SupabaseFeedRepository(c):null;},[]);
 const [post,setPost]=useState<Post|null>(null);
 const [comments,setComments]=useState<Comment[]>([]);
 const [text,setText]=useState('');
 const [reply,setReply]=useState<Comment|null>(null);
 const [error,setError]=useState<string|null>(null);
 const [loading,setLoading]=useState(true);
 const [sending,setSending]=useState(false);
 const cursor=useRef<string|null>(null);
 const busy=useRef(false);
 const input=useRef<TextInput>(null);
 const alive=useRef(true);
 const load=useCallback(async(more=false)=>{
   if(!repository||!userId||!id||busy.current||(more&&!cursor.current))return;
   busy.current=true;
   try {
    const runtime=await getSocialRuntime(userId);
    const savedOperations=await runtime.pendingOperations();
    if(!more){const cached=await runtime.readCache<{post:Post;comments:Comment[]}>('post:'+id);if(cached&&alive.current){setPost(overlayPendingPost(cached.post,savedOperations));setComments(overlayPendingComments(id,cached.comments,savedOperations));}}
    const [remote,page]=await Promise.all([repository.getPost(id),repository.comments(id,more?cursor.current:null)]);
    const ops=await runtime.pendingOperations();
    const resolved=remote?overlayPendingPost(remote,ops):null;
    const merged=overlayPendingComments(id,page.items,ops);
    if(!alive.current)return;
    setPost(resolved);setComments(current=>more?[...current,...merged.filter(c=>!current.some(old=>old.id===c.id))]:merged);
    cursor.current=page.nextCursor;setError(null);
    if(remote&&!more)await runtime.writeCache('post:'+id,{post:remote,comments:page.items});
   }catch{if(alive.current)setError('No se pudo actualizar. Revisa tu conexión.');}
   finally{busy.current=false;if(alive.current)setLoading(false);}
 },[repository,userId,id]);
 useEffect(()=>{
   alive.current=true;const timer=setTimeout(()=>void load(),0);
   let unsubscribe:(()=>void)|undefined;let active=true;let previous=-1;let failed=0;
   if(userId)void getSocialRuntime(userId).then(r=>{if(!active)return;unsubscribe=r.subscribe(()=>{if((previous>0&&r.snapshot.pending<previous)||r.snapshot.failed>failed)void load();previous=r.snapshot.pending;failed=r.snapshot.failed;});}).catch(()=>{if(active)setError('No se pudo abrir el almacenamiento local.');});
   return()=>{clearTimeout(timer);active=false;alive.current=false;unsubscribe?.();};
 },[load,userId]);
 async function like(){
   if(!post||!userId)return;const previous=post;const liked=!post.viewerHasLiked;setPost(setOptimisticLike(post,liked));
   try{const r=await getSocialRuntime(userId);await r.enqueue('set_post_like',{postId:id,liked});void r.sync();}catch{setPost(previous);setError('No se pudo guardar el Me gusta.');}
 }
 async function send(){
   if(!text.trim()||!session?.profile||sending)return;
   setSending(true);const body=text.trim();const comment:Comment={id:randomUUID(),postId:id,authorId:session.userId,author:session.profile,body,parentId:reply?.id??null,status:'pending',createdAt:new Date().toISOString()};
   try{
    const runtime=await getSocialRuntime(session.userId);
    await runtime.enqueue('create_comment',{id:comment.id,postId:id,body,parentId:comment.parentId,comment},comment.id);
    setComments(current=>[...current,comment]);setText('');setReply(null);void runtime.sync();
   }catch{setError('No se pudo guardar el comentario.');}finally{setSending(false);}
 }
 return <SafeAreaView style={{flex:1,backgroundColor:colors.paper}}>
 <ScreenHeader title="Publicación" actionIcon="x" actionLabel="Cerrar publicación" onAction={()=>router.canGoBack()?router.back():router.replace('/')}/>
 <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}>
 <FlatList data={comments} keyExtractor={c=>c.id} onEndReached={()=>void load(true)}
 ListHeaderComponent={<View>{post?<PostCard post={post} onLike={()=>void like()} onComments={()=>input.current?.focus()}/>:loading?<ActivityIndicator color={colors.coral}/>:<EmptyState icon="lock" title="Publicación no disponible" description="Puede ser privada o haber sido eliminada."/>}{error?<Pressable onPress={()=>void load()}><Text style={{padding:16,color:colors.danger}}>{error} Toca para reintentar.</Text></Pressable>:null}</View>}
 renderItem={({item})=><View style={{flexDirection:'row',gap:10,padding:16,marginLeft:item.parentId?24:0}}><Avatar uri={item.author.avatarUrl} size={34} accessibilityLabel={item.author.username}/><View style={{flex:1}}><Text style={{color:colors.ink,fontFamily:'Inter_700Bold'}}>{item.author.username}</Text><Text style={{color:colors.ink,lineHeight:21}}>{item.body}</Text><Pressable accessibilityRole="button" onPress={()=>{setReply(item);input.current?.focus();}} style={{minHeight:32,justifyContent:'center'}}><Text style={{color:colors.mutedInk,fontSize:11}}>{item.status==='pending'?'Pendiente · ':item.status==='failed'?'No se pudo enviar · ':''}Responder</Text></Pressable></View></View>}/>
 {post?<View style={{padding:12,borderTopWidth:1,borderTopColor:colors.hairline}}>
 {reply?<Pressable onPress={()=>setReply(null)}><Text style={{color:colors.mutedInk,padding:8}}>Respondiendo a @{reply.author.username} · Cancelar</Text></Pressable>:null}
 <View style={{flexDirection:'row',alignItems:'center',gap:8}}><TextInput ref={input} accessibilityLabel="Escribir comentario" value={text} onChangeText={setText} maxLength={1000} placeholder="Suma a la conversación…" placeholderTextColor={colors.mutedInk} style={{flex:1,minHeight:48,padding:12,borderRadius:18,backgroundColor:colors.surface,color:colors.ink}}/><Pressable accessibilityRole="button" disabled={!text.trim()||sending} onPress={()=>void send()} style={{padding:12,opacity:!text.trim()||sending?0.4:1}}><Text style={{color:colors.coral,fontFamily:'Inter_700Bold'}}>Enviar</Text></Pressable></View></View>:null}
 </KeyboardAvoidingView></SafeAreaView>;
}
