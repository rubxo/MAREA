import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSupabaseClient } from '@/data/remote/supabase-client';
import { PostQuery, SupabaseFeedRepository } from '@/data/repositories/feed-repository';
import type { Post } from '@/domain/models';
import { useAuthSession } from '@/features/auth/auth-session-provider';
import { getSocialRuntime } from '@/services/sync/social-runtime';
import { setOptimisticLike } from '@/services/sync/reconciliation';

export function usePosts(kind: PostQuery['kind'], authorId?: string, search = '') {
 const {state}=useAuthSession();
 const userId=state.status==='authenticated'?state.session.userId:null;
 const repository=useMemo(()=>{const client=getSupabaseClient();return client?new SupabaseFeedRepository(client):null;},[]);
 const [posts,setPosts]=useState<Post[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState<string|null>(null);
 const [cursor,setCursor]=useState<string|null>(null);
 const busy=useRef(false);
 const epoch=useRef(0);
 const key='posts:'+kind+':'+(authorId??'')+':'+search;
 const applyPending=useCallback(async (items:readonly Post[])=>{
   if(!userId) return [...items];
   const runtime=await getSocialRuntime(userId);
   const operations=await runtime.pendingOperations();
   let result=[...items];
   for(const op of operations) {
     if(op.type==='set_post_like' && !op.nextAttemptAt.startsWith('9999')) result=result.map(p=>p.id===op.payload.postId?setOptimisticLike(p,op.payload.liked===true):p);
     if(op.type==='create_post' && op.payload.optimisticPost && (kind!=='profile'||authorId===userId)) {
       const post=op.payload.optimisticPost as Post;
       if(!result.some(p=>p.id===post.id)) result=[post,...result];
     }
   }
   return result;
 },[userId,kind,authorId]);
 const load=useCallback(async (more=false)=>{
   if(!repository||!userId||busy.current||(more&&!cursor)) return;
   busy.current=true; const token=epoch.current; setLoading(true);
   try {
     const runtime=await getSocialRuntime(userId);
     if(!more) {
       const cached=await runtime.readCache<Post[]>(key);
       if(cached&&token===epoch.current) setPosts(await applyPending(cached));
     }
     const page=await repository.list({kind,authorId,search},more?cursor:null);
     if(token!==epoch.current) return;
     const updated=await applyPending(page.items);
     setPosts(current=>more?[...current,...updated.filter(p=>!current.some(old=>old.id===p.id))]:updated);
     setCursor(page.nextCursor); setError(null);
     if(!more) await runtime.writeCache(key,page.items);
   } catch { if(token===epoch.current) setError('No se pudo actualizar. Mostramos lo guardado en este teléfono.'); }
   finally {if(token===epoch.current){busy.current=false;setLoading(false);}}
 },[repository,userId,cursor,key,applyPending,kind,authorId,search]);
 const loadRef=useRef(load);
 useEffect(()=>{loadRef.current=load;},[load]);
 useEffect(()=>{
   const token=++epoch.current;
   const timer=setTimeout(()=>{busy.current=false;setPosts([]);setCursor(null);void loadRef.current();},0);
   return()=>{clearTimeout(timer);epoch.current=token+1;};
 },[key,userId]);
 useFocusEffect(useCallback(()=>{void loadRef.current();},[]));
 useEffect(()=>{
   if(!userId)return;
   let active=true;let unsubscribe:(()=>void)|undefined;let previous=-1;let previousFailed=0;
   void getSocialRuntime(userId).then(runtime=>{
     if(!active)return;
     unsubscribe=runtime.subscribe(()=>{
       if((previous>0&&runtime.snapshot.pending<previous)||runtime.snapshot.failed>previousFailed) void loadRef.current();
       previous=runtime.snapshot.pending;
       previousFailed=runtime.snapshot.failed;
     });
   });
   return()=>{active=false;unsubscribe?.();};
 },[userId]);
 const like=useCallback(async(post:Post)=>{
   if(!userId)return;
   const liked=!post.viewerHasLiked;
   setPosts(current=>current.map(p=>p.id===post.id?setOptimisticLike(p,liked):p));
   try {
     const runtime=await getSocialRuntime(userId);
     await runtime.enqueue('set_post_like',{postId:post.id,liked});
     void runtime.sync();
   }catch{setPosts(current=>current.map(p=>p.id===post.id?post:p));setError('No se pudo guardar el cambio.');}
 },[userId]);
 return {posts,loading,error,hasMore:cursor!==null,refresh:()=>load(false),loadMore:()=>load(true),like,repository};
}
