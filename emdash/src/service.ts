import type {PluginContext} from 'emdash/plugin';
import {defaults,makeDoc,type Options,type Doc} from './engine.js';
export interface Progress{generation:string;status:'building'|'failed'|'complete';collectionIndex:number;cursor?:string;processed:number;startedAt:string;updatedAt:string;error?:string}
export async function options(ctx:PluginContext):Promise<Options>{return{...defaults,...await ctx.kv.get<Options>('options')};}
export async function allDocs(ctx:PluginContext):Promise<Doc[]>{
 const docs:Doc[]=[];let cursor:string|undefined;do{const page=await ctx.storage.docs.query({limit:100,cursor});for(const item of page.items)docs.push(item.data as Doc);cursor=page.hasMore?page.cursor:undefined;}while(cursor);return docs;
}
export async function startRebuild(ctx:PluginContext){
 const now=new Date().toISOString();await ctx.kv.set('progress',{generation:crypto.randomUUID(),status:'building',collectionIndex:0,processed:0,startedAt:now,updatedAt:now} satisfies Progress);
 await ctx.cron!.schedule('rebuild',{schedule:'* * * * *'});
}
export async function updateEntry(ctx:PluginContext,collection:string,id:string){
 const opts=await options(ctx);const key=`${collection}:${id}`;
 const item=await ctx.content!.get(collection,id);
 const url=item?.status==='published'?await ctx.content!.getPublicUrl!(collection,id):null;
 const doc=item&&url?makeDoc(item,url,opts):null;
 if(doc){doc.generation=(await ctx.kv.get<Progress>('progress'))?.generation;await ctx.storage.docs.put(key,doc);}else await ctx.storage.docs.delete(key);
}
export async function rebuild(ctx:PluginContext){
 const progress=await ctx.kv.get<Progress>('progress');if(!progress||progress.status==='complete')return;
 const opts=await options(ctx);const collection=opts.collections[progress.collectionIndex];
 try{
  if(collection){
   const page=await ctx.content!.list(collection,{limit:50,cursor:progress.cursor});
   const docs:Array<{id:string;data:Doc}>=[];
   for(const item of page.items){const url=item.status==='published'?await ctx.content!.getPublicUrl!(collection,item.id):null;const doc=url?makeDoc(item,url,opts):null;
    if(doc){doc.generation=progress.generation;docs.push({id:`${collection}:${item.id}`,data:doc});}else await ctx.storage.docs.delete(`${collection}:${item.id}`);
   }
   if(docs.length)await ctx.storage.docs.putMany(docs);
   progress.processed+=page.items.length;
   if(page.hasMore){progress.cursor=page.cursor;}else{progress.collectionIndex++;delete progress.cursor;}
  }
  if(progress.collectionIndex>=opts.collections.length){
   // A final pass removes paths or collections excluded since the last successful run.
   const stale=(await allDocs(ctx)).filter(doc=>doc.generation!==progress.generation||!opts.collections.includes(doc.collection)||opts.excluded.some(p=>doc.url===p||doc.url.startsWith(p+'/')));
   if(stale.length)await ctx.storage.docs.deleteMany(stale.slice(0,50).map(d=>`${d.collection}:${d.id}`));
   if(stale.length>50){progress.status='building';progress.updatedAt=new Date().toISOString();await ctx.kv.set('progress',progress);return;}
   progress.status='complete';await ctx.cron!.cancel('rebuild');
  }else progress.status='building';
  delete progress.error;
 }catch{progress.status='failed';progress.error='記事の読み取りまたは索引の保存に失敗しました。再開してください。';}
 progress.updatedAt=new Date().toISOString();await ctx.kv.set('progress',progress);
}
