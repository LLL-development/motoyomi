import {it,expect} from 'vitest';
import {createPluginRuntimeTestHost} from '@emdash-cms/plugin-test';
import {defaults} from '../src/engine.js';
import {rebuild,startRebuild,updateEntry} from '../src/service.js';
const state=()=>{
 const kv=new Map<string,unknown>(),docs=new Map<string,unknown>();let reads=0,fail=false;
 const items=Array.from({length:51},(_,i)=>({id:String(i),type:'posts',status:'published',slug:String(i),data:{title:`製品${i}`,content:[]},updatedAt:'2026-11-04'}));
 const ctx:any={kv:{get:async(k:string)=>kv.get(k)??null,set:async(k:string,v:unknown)=>{kv.set(k,v)},delete:async(k:string)=>kv.delete(k)},cron:{schedule:async()=>{},cancel:async()=>{}},storage:{docs:{put:async(k:string,v:unknown)=>{docs.set(k,v)},putMany:async(xs:any[])=>{for(const x of xs)docs.set(x.id,x.data)},delete:async(k:string)=>docs.delete(k),query:async()=>({items:[...docs].map(([id,data])=>({id,data})),hasMore:false}),deleteMany:async(ids:string[])=>{ids.forEach(i=>docs.delete(i))}}},content:{get:async(_:string,id:string)=>items.find(i=>i.id===id),getPublicUrl:async(_:string,id:string)=>`/posts/${id}`,list:async(_:string,o:any)=>{reads++;if(fail)throw Error('database unavailable');const start=Number(o.cursor??0);return{items:items.slice(start,start+o.limit),hasMore:start+o.limit<items.length,cursor:start+o.limit<items.length?String(start+o.limit):undefined}}}};
 return{ctx,kv,docs,items,get reads(){return reads},setFail:(v:boolean)=>{fail=v}};
};
it('rebuilds at most 50 entries per invocation and resumes from persisted cursor',async()=>{
 const s=state();await startRebuild(s.ctx);await rebuild(s.ctx);
 expect(s.docs.size).toBe(50);expect(s.reads).toBe(1);expect(s.kv.get('progress')).toMatchObject({status:'building',cursor:'50'});
 await rebuild(s.ctx);expect(s.docs.size).toBe(51);expect(s.kv.get('progress')).toMatchObject({status:'complete',processed:51});
});
it('retains cursor on failure and resumes; unpublished and deleted content disappears',async()=>{
 const s=state();await startRebuild(s.ctx);await rebuild(s.ctx);s.setFail(true);await rebuild(s.ctx);
 expect(s.kv.get('progress')).toMatchObject({status:'failed',cursor:'50'});s.setFail(false);await rebuild(s.ctx);expect(s.docs.size).toBe(51);
 s.items[0].status='draft';await updateEntry(s.ctx,'posts','0');expect(s.docs.has('posts:0')).toBe(false);
});

it('removes stale documents during a full rebuild after missed delete events',async()=>{
 const s=state();s.docs.set('posts:gone',{id:'gone',collection:'posts',url:'/gone',title:'gone',headings:[],grams:[],weights:{},linked:[],updated_at:'2026-01-01'});await startRebuild(s.ctx);await rebuild(s.ctx);await rebuild(s.ctx);expect(s.docs.has('posts:gone')).toBe(false);
});
