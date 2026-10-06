import { useSocialNavigation } from '@/features/navigation/use-social-navigation';
import { useState } from 'react';
import { FlatList, Pressable, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Avatar } from '@/components/Avatar';
import { EmptyState } from '@/components/EmptyState';
import { useFollowRequests } from '@/features/social/use-follow-requests';
import { useActivity, ActivityItem } from '@/features/activity/use-activity';
import { getSupabaseClient } from '@/data/remote/supabase-client';
import { colors } from '@/theme/tokens';
const labels:Record<string,string>={follow:'empezó a seguirte',follow_request:'solicitó seguirte',like:'indicó que le gusta tu fotografía',comment:'comentó tu fotografía',message:'te envió un mensaje'};
export default function ActivityScreen(){
 const navigation=useSocialNavigation();
 const requests=useFollowRequests(true);const activity=useActivity();
 const [busy,setBusy]=useState<string|null>(null);const [error,setError]=useState<string|null>(null);
 async function decide(id:string,accept:boolean){setBusy(id);try{await requests.respond(id,accept);await activity.load();}catch{setError('No se pudo responder. Intenta de nuevo.');}finally{setBusy(null);}}
 async function open(item:ActivityItem){
   await activity.read(item);
   if(item.kind==='like'&&item.entity_id) navigation.post(item.entity_id);
   else if(item.kind==='comment'&&item.entity_id){const client=getSupabaseClient();const result=await client?.from('comments').select('post_id').eq('id',item.entity_id).maybeSingle();if(result?.data)navigation.post(result.data.post_id);}
   else if(item.actor)navigation.profile(item.actor.username);
 }
 return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:colors.paper}}>
 <ScreenHeader title="Actividad" eyebrow="Cerca de tu comunidad"/>
 <FlatList data={activity.items} keyExtractor={item=>item.id} refreshing={activity.loading&&activity.items.length>0} onRefresh={()=>{void activity.load();void requests.reload();}}
 ListHeaderComponent={<View>{error||activity.error||requests.status==='error'?<Text accessibilityRole="alert" style={{padding:16,color:colors.danger}}>{error??'No pudimos actualizar. Desliza para reintentar.'}</Text>:null}
 {requests.requests.map(item=><View key={item.id} style={{flexDirection:'row',alignItems:'center',gap:10,padding:16}}><Avatar uri={item.requester.avatarUrl} accessibilityLabel={item.requester.username}/><Text style={{flex:1,color:colors.ink}}>@{item.requester.username} quiere seguirte</Text><Pressable accessibilityRole="button" accessibilityLabel="Aceptar solicitud" disabled={busy!==null} onPress={()=>void decide(item.id,true)} style={{padding:12,backgroundColor:colors.coral,borderRadius:14}}><Text style={{color:colors.white}}>Aceptar</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Rechazar solicitud" disabled={busy!==null} onPress={()=>void decide(item.id,false)} style={{padding:12}}><Text style={{color:colors.mutedInk}}>×</Text></Pressable></View>)}</View>}
 ListEmptyComponent={activity.loading?<ActivityIndicator color={colors.coral}/>:<EmptyState icon="heart" title="Todo al día" description="Los Me gusta, comentarios y nuevas conexiones aparecerán aquí."/>}
 renderItem={({item})=><Pressable accessibilityRole="button" onPress={()=>void open(item)} style={{padding:20,borderBottomWidth:0.5,borderBottomColor:colors.hairline,backgroundColor:item.read_at?colors.paper:colors.surface}}><Text style={{color:colors.ink,lineHeight:21}}><Text style={{fontFamily:'Inter_700Bold'}}>{item.actor?.username??'Una persona'} </Text>{labels[item.kind]??'interactuó contigo'}</Text><Text style={{marginTop:6,fontSize:11,color:colors.mutedInk}}>{new Date(item.created_at).toLocaleString('es')}</Text></Pressable>}/>
 </SafeAreaView>;
}



