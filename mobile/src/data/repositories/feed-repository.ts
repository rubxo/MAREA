import type { Post, Comment, ProfileSummary } from '@/domain/models';
import type { MareaSupabaseClient } from '@/data/remote/supabase-client';
import type { Page } from '@/domain/repositories/feed-repository';

type RemotePost = Omit<Post, 'author' | 'media'> & {
 author: Omit<ProfileSummary,'avatarUrl'> & {avatarPath:string|null};
 media: {path:string;width:number;height:number};
};
export type PostQuery = { kind: 'feed'|'explore'|'profile'; authorId?: string; search?: string };
export class SupabaseFeedRepository {
 constructor(private readonly client: MareaSupabaseClient) {}
 async signed(bucket:string,path:string|null):Promise<string|null> {
   if(!path) return null;
   const {data,error}=await this.client.storage.from(bucket).createSignedUrl(path,3600);
   if(error) throw error; return data.signedUrl;
 }
 private async map(row:RemotePost):Promise<Post> {
   const [url,avatarUrl]=await Promise.all([this.signed('post-media',row.media.path),this.signed('avatars',row.author.avatarPath)]);
   if(!url) throw new Error('Imagen no disponible');
   return {...row,author:{...row.author,avatarUrl},media:{url,width:row.media.width,height:row.media.height}};
 }
 async list(query:PostQuery,cursor:string|null=null):Promise<Page<Post>> {
   const boundary=cursor ? JSON.parse(cursor) as {time:string;id:string} : null;
   const {data,error}=await this.client.rpc('list_posts',{
     page_size:20,feed_only:query.kind==='feed',search_text:query.search??'',
     ...(query.authorId?{author_filter:query.authorId}:{}),
     ...(boundary?{before_time:boundary.time,before_id:boundary.id}:{})
   });
   if(error) throw error;
   if(!Array.isArray(data)) throw new Error('Respuesta de publicaciones inválida');
   const rows=data as unknown as RemotePost[];
   const items=await Promise.all(rows.map(row=>this.map(row)));
   const last=items.at(-1);
   return {items,nextCursor:items.length===20&&last?JSON.stringify({time:last.createdAt,id:last.id}):null};
 }
 async getPost(id:string):Promise<Post|null> {
   const {data,error}=await this.client.rpc('get_post',{target_id:id});
   if(error) throw error;
   return data ? this.map(data as unknown as RemotePost) : null;
 }
 async comments(postId:string,cursor:string|null=null):Promise<Page<Comment>> {
   const boundary=cursor?JSON.parse(cursor) as {time:string;id:string}:null;
   let query=this.client.from('comments').select('*, profiles!comments_author_id_fkey(*)')
      .eq('post_id',postId).order('created_at').order('id').limit(30);
   if(boundary) query=query.or('created_at.gt.'+boundary.time+',and(created_at.eq.'+boundary.time+',id.gt.'+boundary.id+')');
   const {data,error}=await query;
   if(error) throw error;
   const items=await Promise.all(data.map(async row=>({
     id:row.id,postId:row.post_id,authorId:row.author_id,body:row.body,parentId:row.parent_id,
     createdAt:row.created_at,status:'synced' as const,author:{
       id:row.profiles.id,username:row.profiles.username,displayName:row.profiles.display_name,
       isPrivate:row.profiles.is_private,avatarUrl:await this.signed('avatars',row.profiles.avatar_path)
     }
   })));
   const last=items.at(-1);
   return {items,nextCursor:items.length===30&&last?JSON.stringify({time:last.createdAt,id:last.id}):null};
 }
 async searchPeople(search:string):Promise<ProfileSummary[]> {
   const value=search.trim().replace(/[^a-zA-Z0-9_]/g,'').slice(0,24);
   if(!value) return [];
   const {data,error}=await this.client.from('profiles').select('*').ilike('username',value+'%').limit(20);
   if(error) throw error;
   return Promise.all(data.map(async p=>({id:p.id,username:p.username,displayName:p.display_name,isPrivate:p.is_private,avatarUrl:await this.signed('avatars',p.avatar_path)})));
 }
}

