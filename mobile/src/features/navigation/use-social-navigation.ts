import { router, useSegments, type Href } from 'expo-router';
export function useSocialNavigation(){
 const segments: readonly string[]=useSegments();
 const group=segments[0]==='(tabs)'?segments[1]:null;
 return {
  post:(id:string)=>router.push((group?'/(tabs)/'+group+'/post/'+encodeURIComponent(id):'/post/'+encodeURIComponent(id)) as Href),
  profile:(username:string)=>router.push((group?'/(tabs)/'+group+'/person/'+encodeURIComponent(username):'/profile/'+encodeURIComponent(username)) as Href)
 };
}
