import { useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { AuthScaffold, FormField, FormMessage, PrimaryButton } from '@/features/auth/AuthScaffold';
import { getSupabaseClient } from '@/data/remote/supabase-client';
import { colors } from '@/theme/tokens';

export default function RecoveryScreen(){
 const [email,setEmail]=useState(''),[token,setToken]=useState(''),[password,setPassword]=useState('');
 const [sent,setSent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState<string|null>(null);
 async function submit(){
  const client=getSupabaseClient();if(!client)return;setBusy(true);setMessage(null);
  try{
   if(!sent){const result=await client.auth.resetPasswordForEmail(email.trim().toLowerCase());if(result.error)throw result.error;setSent(true);}
   else {
    const verify=await client.auth.verifyOtp({email:email.trim().toLowerCase(),token:token.trim(),type:'recovery'});if(verify.error)throw verify.error;
    const update=await client.auth.updateUser({password});if(update.error)throw update.error;
    router.replace('/');
   }
  }catch(error){setMessage(error instanceof Error?error.message:'No se pudo recuperar el acceso.');}finally{setBusy(false);}
 }
 return <AuthScaffold compact eyebrow="Recupera tu espacio" title={sent?'Revisa tu correo.':'Volvamos a conectar.'} description={sent?'Escribe el código de recuperación y elige una contraseña nueva.':'Te enviaremos un código para recuperar el acceso a tu cuenta.'}>
 {message?<FormMessage tone="error">{message}</FormMessage>:null}
 <FormField label="Correo de tu cuenta" value={email} onChangeText={setEmail} editable={!sent} autoCapitalize="none" keyboardType="email-address"/>
 {sent?<><FormField label="Código de recuperación" value={token} onChangeText={setToken} autoComplete="one-time-code" keyboardType="number-pad" maxLength={8}/><FormField label="Nueva contraseña" value={password} onChangeText={setPassword} secureTextEntry hint="Al menos 8 caracteres, una letra y un número."/></>:null}
 <PrimaryButton label={sent?'Guardar nueva contraseña':'Enviar código'} loading={busy} disabled={!email.includes('@')||(sent&&(token.length<6||password.length<8||!/[A-Za-z]/.test(password)||!/\d/.test(password)))} onPress={()=>void submit()}/>
 {sent?<Pressable onPress={()=>{setSent(false);setToken('');}}><Text style={{color:colors.deepBlue,padding:12,textAlign:'center'}}>Cambiar correo o reenviar</Text></Pressable>:null}
 <Pressable onPress={()=>router.canGoBack()?router.back():router.replace('/')}><Text style={{color:colors.mutedInk,padding:12,textAlign:'center'}}>Volver al inicio</Text></Pressable>
 </AuthScaffold>;
}
