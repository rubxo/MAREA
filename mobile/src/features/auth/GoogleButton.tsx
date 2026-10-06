import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { signInWithGoogle } from './google-login';
import { colors } from '@/theme/tokens';
export function GoogleButton(){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState<string|null>(null);
 const controller=useRef<AbortController|null>(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();};},[]);
 async function start(){
  if(controller.current)return;
  controller.current=new AbortController();setBusy(true);setMessage(null);
  try{await signInWithGoogle(controller.current.signal,value=>{if(alive.current)setMessage(value);});}
  catch(error){if(alive.current)setMessage(error instanceof Error?error.message:'No se pudo iniciar sesión.');}
  finally{controller.current=null;if(alive.current)setBusy(false);}
 }
 return <View style={{gap:10}}><Pressable accessibilityRole="button" disabled={busy} onPress={()=>void start()} style={{minHeight:54,borderRadius:16,backgroundColor:colors.white,borderWidth:1,borderColor:colors.hairline,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:12}}>
 {busy?<ActivityIndicator color={colors.deepBlue}/>:<Text style={{fontSize:23,fontWeight:'700',color:'#4285F4'}}>G</Text>}
 <Text style={{fontFamily:'Inter_600SemiBold',fontSize:14,color:colors.ink}}>Continuar con Google</Text></Pressable>
 {message?<Text accessibilityLiveRegion="polite" style={{color:colors.mutedInk,fontSize:12,lineHeight:18}}>{message}</Text>:null}
 {busy?<Pressable onPress={()=>controller.current?.abort()} style={{minHeight:44,justifyContent:'center'}}><Text style={{color:colors.deepBlue,textAlign:'center'}}>Cancelar</Text></Pressable>:null}
 </View>;
}

