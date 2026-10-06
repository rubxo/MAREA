import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSupabaseClient } from '@/data/remote/supabase-client';
import { useAuthSession } from '@/features/auth/auth-session-provider';
import { getSocialRuntime } from '@/services/sync/social-runtime';

export type ActivityItem={id:string;kind:string;entity_id:string|null;created_at:string;read_at:string|null;actor:{username:string;display_name:string}|null};
export function useActivity(){
 const {state}=useAuthSession();const userId=state.status==='authenticated'?state.session.userId:null;
 const [items,setItems]=useState<ActivityItem[]>([]);
 const [error,setError]=useState(false);const [loading,setLoading]=useState(true);
 const load=useCallback(async()=>{
   if(!userId)return;
   const client=getSupabaseClient();if(!client)return;
   try {
    const r=await getSocialRuntime(userId);const cached=await r.readCache<ActivityItem[]>('activities');if(cached)setItems(cached);
    const {data,error:queryError}=await client.from('activities').select('*, actor:profiles!activities_actor_id_fkey(username,display_name)').eq('recipient_id',userId).order('created_at',{ascending:false}).limit(100);
    if(queryError)throw queryError;setItems(data);await r.writeCache('activities',data);setError(false);
   }catch{setError(true);}finally{setLoading(false);}
 },[userId]);
 useFocusEffect(useCallback(()=>{void load();},[load]));
 useEffect(()=>{
   if(!userId)return;const client=getSupabaseClient();if(!client)return;
   const channel=client.channel('activities:'+userId).on('postgres_changes',{event:'INSERT',schema:'public',table:'activities',filter:'recipient_id=eq.'+userId},()=>void load()).subscribe();
   return()=>{void client.removeChannel(channel);};
 },[userId,load]);
 const read=async(item:ActivityItem)=>{
   const client=getSupabaseClient();if(!client)return;
   const {error}=await client.from('activities').update({read_at:new Date().toISOString()}).eq('id',item.id);
   if(!error)setItems(rows=>rows.map(row=>row.id===item.id?{...row,read_at:new Date().toISOString()}:row));
 };
 return {items,error,loading,load,read};
}

