import * as WebBrowser from 'expo-web-browser';
import { AppState } from 'react-native';
import { getSupabaseClient } from '@/data/remote/supabase-client';

export const googleRelayUrl = process.env.EXPO_PUBLIC_OAUTH_RELAY_URL?.replace(/\/$/,'') ?? '';
let running = false;
type RelayFlow={id:string;reader:string;writer:string;expiresAt:number};
export async function signInWithGoogle(signal:AbortSignal,onStatus:(message:string)=>void):Promise<void>{
 if(running)throw new Error('Ya hay un acceso con Google en curso.');
 if(!googleRelayUrl)throw new Error('Google necesita el servicio de acceso configurado. Puedes entrar con tu correo mientras tanto.');
 const client=getSupabaseClient();if(!client)throw new Error('Falta la conexión a Supabase.');
 running=true;
 let flow:RelayFlow|null=null;
 try{
  const response=await fetch(googleRelayUrl+'/flows',{method:'POST',signal});
  if(!response.ok)throw new Error('No pudimos conectar con Google. Inténtalo en un momento.');
  flow=await response.json() as RelayFlow;
  if(!flow)throw new Error('Respuesta inválida.');
  const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{
   skipBrowserRedirect:true,redirectTo:googleRelayUrl+'/callback?id='+flow.id+'&proof='+flow.writer,
   queryParams:{prompt:'select_account'}
  }});
  if(error)throw error;if(!data.url)throw new Error('Google no está disponible.');
  onStatus('Completa el acceso en el navegador y vuelve a Marea.');
  let browserError:unknown;
  const browser=WebBrowser.openBrowserAsync(data.url).catch(error=>{browserError=error;});
  while(Date.now()<flow.expiresAt&&!signal.aborted){
   if(browserError)throw browserError;
   if(AppState.currentState==='active'){
    const status=await fetch(googleRelayUrl+'/flows/'+flow.id,{headers:{Authorization:'Bearer '+flow.reader},signal});
    if(!status.ok)throw new Error('El acceso expiró. Vuelve a intentarlo.');
    const result=await status.json() as {code:string|null;error:string|null};
    if(result.error)throw new Error(result.error);
    if(result.code){
     const exchange=await client.auth.exchangeCodeForSession(result.code);
     if(exchange.error)throw exchange.error;
     void WebBrowser.dismissBrowser().catch(()=>{});
     void browser;return;
    }
   }
   await new Promise<void>(resolve=>{const timer=setTimeout(done,1000);function done(){clearTimeout(timer);signal.removeEventListener('abort',done);resolve();}signal.addEventListener('abort',done,{once:true});});
  }
  throw new Error(signal.aborted?'Acceso cancelado.':'El acceso expiró. Vuelve a intentarlo.');
 }finally{
  running=false;
  if(flow)void fetch(googleRelayUrl+'/flows/'+flow.id,{method:'DELETE',headers:{Authorization:'Bearer '+flow.reader}}).catch(()=>{});
 }
}
