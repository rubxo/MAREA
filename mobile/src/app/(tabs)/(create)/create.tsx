import { useRef, useState } from 'react';
import { Image, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { randomUUID } from 'expo-crypto';
import { router } from 'expo-router';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PrimaryButton, FormMessage } from '@/features/auth/AuthScaffold';
import { useAuthSession } from '@/features/auth/auth-session-provider';
import { pickPhoto, PickedPhoto } from '@/services/media/pick-photo';
import { getSocialRuntime } from '@/services/sync/social-runtime';
import { colors } from '@/theme/tokens';
import type { Post } from '@/domain/models';
export default function CreateScreen(){
 const {state}=useAuthSession();
 const [photo,setPhoto]=useState<PickedPhoto|null>(null);
 const [caption,setCaption]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const locked=useRef(false);
 async function choose(){try{setPhoto(await pickPhoto());}catch{setError('No se pudo abrir la galería.');}}
 async function publish(){
   if(locked.current||!photo||state.status!=='authenticated'||!state.session.profile)return;
   locked.current=true;setBusy(true);setError(null);
   try{
     const id=randomUUID();const profile=state.session.profile;
     const optimisticPost:Post={id,author:profile,caption,media:{url:photo.uri,width:photo.width,height:photo.height},likeCount:0,commentCount:0,viewerHasLiked:false,createdAt:new Date().toISOString()};
     const runtime=await getSocialRuntime(state.session.userId);
     await runtime.enqueue('create_post',{id,caption,...photo,optimisticPost},id);
     void runtime.sync();setPhoto(null);setCaption('');router.navigate('/');
   }catch{setError('No pudimos guardar la publicación. Tu foto sigue aquí.');}
   finally{locked.current=false;setBusy(false);}
 }
 return <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:colors.paper}}>
  <ScreenHeader title="Una nueva mirada" eyebrow="Crear publicación"/>
  <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,gap:20}}>
   {error?<FormMessage tone="error">{error}</FormMessage>:null}
   {photo?<Image source={{uri:photo.uri}} style={{width:'100%',aspectRatio:1,borderRadius:20}}/>:<View style={{height:260,borderRadius:24,backgroundColor:colors.surface,justifyContent:'center',padding:28}}><Text style={{fontFamily:'Inter_800ExtraBold',fontSize:30,color:colors.ink}}>Cada foto tiene una historia.</Text><Text style={{marginTop:12,color:colors.mutedInk,lineHeight:22}}>Comparte la tuya con las personas que te importan.</Text></View>}
   <PrimaryButton label={photo?'Cambiar fotografía':'Elegir fotografía'} disabled={busy} onPress={()=>void choose()}/>
   <TextInput accessibilityLabel="Descripción de la publicación" placeholder="¿Qué quieres contar?" placeholderTextColor={colors.mutedInk} value={caption} onChangeText={setCaption} multiline maxLength={2200} style={{minHeight:110,padding:16,borderRadius:16,backgroundColor:colors.surface,color:colors.ink,textAlignVertical:'top'}}/>
   <Text style={{textAlign:'right',color:colors.mutedInk}}>{caption.length}/2200</Text>
   <PrimaryButton label="Publicar" loading={busy} disabled={!photo} onPress={()=>void publish()}/>
  </ScrollView>
 </SafeAreaView>;
}


