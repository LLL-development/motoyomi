import type {SandboxedPlugin} from 'emdash/plugin';
import {admin,related} from './ui.js';
import {rebuild,startRebuild,updateEntry,allDocs} from './service.js';
const plugin:SandboxedPlugin={
 hooks:{
  'plugin:install':async(_event,ctx)=>{await startRebuild(ctx);await rebuild(ctx);},
  'plugin:activate':async(_event,ctx)=>{if(!await ctx.kv.get('progress')){await startRebuild(ctx);await rebuild(ctx);}},
  'plugin:uninstall':async(event,ctx)=>{if(event.deleteData){for(const doc of await allDocs(ctx))await ctx.storage.docs.delete(`${doc.collection}:${doc.id}`);for(const entry of await ctx.kv.list())await ctx.kv.delete(entry.key);await ctx.cron!.cancel('rebuild');}},
  'content:afterPublish':{errorPolicy:'continue',handler:async(event,ctx)=>{await updateEntry(ctx,event.collection,String(event.content.id));}},
  'content:afterSave':{errorPolicy:'continue',handler:async(event,ctx)=>{await updateEntry(ctx,event.collection,String(event.content.id));}},
  'content:afterUnpublish':{errorPolicy:'continue',handler:async(event,ctx)=>{await ctx.storage.docs.delete(`${event.collection}:${event.content.id}`);}},
  'content:afterDelete':{errorPolicy:'continue',handler:async(event,ctx)=>{await ctx.storage.docs.delete(`${event.collection}:${event.id}`);}},
  cron:async(event,ctx)=>{if(event.name==='rebuild')await rebuild(ctx);}
 },
 routes:{admin:{permission:'plugins:manage',handler:admin},related:{permission:'content:edit_own_drafts',handler:related}}
};export default plugin;
