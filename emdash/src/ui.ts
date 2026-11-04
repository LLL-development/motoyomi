import type {Block,BlockResponse,FormField} from '@emdash-cms/blocks';
import type {PluginContext,SandboxedRouteContext} from 'emdash/plugin';
import {allDocs,options,startRebuild,rebuild,type Progress} from './service.js';
import {makeDoc,portable,suggest,type Options} from './engine.js';
function interaction(input:unknown):Record<string,unknown>{return input&&typeof input==='object'?input as Record<string,unknown>:{};}
const button=(action_id:string,label:string)=>({type:'button' as const,action_id,label});
const notice=(title:string):Block=>({type:'banner',title});
export async function admin(route:SandboxedRouteContext,ctx:PluginContext):Promise<BlockResponse>{
 const input=interaction(route.input);let toast:BlockResponse['toast'];
 const schemas=await ctx.schema!.listCollections();
 if(input.type==='form_submit'&&input.action_id==='save'){
  const v=interaction(input.values), current=await options(ctx);
  const collections=Array.isArray(v.collections)?v.collections.filter((x):x is string=>typeof x==='string'&&schemas.some(s=>s.slug===x)):[];
  const integer=(key:string,min:number,max:number)=>typeof v[key]==='number'&&Number.isInteger(v[key])&&Number(v[key])>=min&&Number(v[key])<=max;
  const field=typeof v.field==='string'?v.field:'';
  if(!collections.length||!schemas.some(s=>collections.includes(s.slug)&&s.fields.some(f=>f.slug===field))||!integer('relatedLimit',1,10)||!integer('linkLimit',1,20)||!integer('minLength',2,10)||typeof v.excluded!=='string'){
   toast={type:'error',message:'対象、本文の項目、件数、長さを確認してください。'};
  }else{
   const excluded=v.excluded.split('\n').map(p=>p.trim()).filter(Boolean);
   if(excluded.some(p=>!p.startsWith('/')||p.startsWith('//')||p.includes('?')||p.includes('#')))toast={type:'error',message:'除外は / で始まるURLのパスを1行に1つ入力してください。'};
   else{const next:Options={...current,collections,field,excluded,relatedLimit:Number(v.relatedLimit),linkLimit:Number(v.linkLimit),minLength:Number(v.minLength)};
    await ctx.kv.set('options',next);await startRebuild(ctx);await rebuild(ctx);toast={type:'success',message:'設定を保存し、索引の作成を開始しました。'};
   }
  }
 }
 if(input.type==='block_action'&&input.action_id==='rebuild'){await startRebuild(ctx);await rebuild(ctx);}
 if(input.type==='block_action'&&input.action_id==='resume')await rebuild(ctx);
 const opts=await options(ctx),progress=await ctx.kv.get<Progress>('progress'),docs=await allDocs(ctx);
 const states={building:'作成中',complete:'完了',failed:'失敗'};
 const blocks:Block[]=[{type:'header',text:'内部リンク'},notice('この版は外部へ何も送りません。題名と見出しだけで候補を探します。'),{type:'fields',fields:[{label:'索引の状態',value:progress?states[progress.status]:'索引なし'},{label:'件数',value:String(docs.length)},{label:'処理済み',value:String(progress?.processed??0)},{label:'最終の更新',value:progress?.updatedAt??'未作成'}]}];
 if(progress?.status==='failed')blocks.push({type:'banner',variant:'error',title:progress.error??'索引の作成に失敗しました。'});
 if(docs.length>500)blocks.push(notice('索引が500件を超えています。処理時間が気になる場合は対象のコレクションを絞ってください。Cloudflare実機CPUは未測定です。'));
 if(!schemas.length)blocks.push({type:'empty',title:'コレクションがありません。記事のコレクションを作成してください。'});
 else{
  const fields=[...new Map(schemas.flatMap(s=>s.fields).map(f=>[f.slug,{label:f.label,value:f.slug}])).values()];
  if(fields.length){const formFields:FormField[]=[{type:'checkbox',action_id:'collections',label:'対象のコレクション',options:schemas.map(s=>({label:s.label,value:s.slug})),initial_value:opts.collections},{type:'select',action_id:'field',label:'本文の項目',options:fields,initial_value:opts.field},{type:'text_input',action_id:'excluded',label:'除外のパス（1行1つ）',multiline:true,initial_value:opts.excluded.join('\n')},{type:'number_input',action_id:'relatedLimit',label:'関連記事の最大数',min:1,max:10,initial_value:opts.relatedLimit},{type:'number_input',action_id:'linkLimit',label:'内部リンクの最大数',min:1,max:20,initial_value:opts.linkLimit},{type:'number_input',action_id:'minLength',label:'語句の最小の長さ',min:2,max:10,initial_value:opts.minLength}];
   blocks.push({type:'form',block_id:'settings',fields:formFields,submit:{action_id:'save',label:'保存して索引を作る'}});
  }
 }
 blocks.push({type:'actions',elements:[button('rebuild','索引を作り直す'),button('resume','続きを進める / 再開'),button('refresh','状態を更新')]},{type:'context',text:'再構築は1回50件です。毎分のcronで続行します。cronが無い環境では「続きを進める」を押してください。'});
 return{blocks,...toast?{toast}:{}};
}
export async function related(route:SandboxedRouteContext,ctx:PluginContext):Promise<BlockResponse>{
 const entry=route.ui?.entry;if(!entry)return{blocks:[notice('保存した記事の編集画面から開いてください。')]};
 const item=await ctx.content!.get(entry.collection,entry.id);if(!item)return{blocks:[notice('記事を読み取れませんでした。保存してから開き直してください。')]};
 const opts=await options(ctx),docs=await allDocs(ctx),progress=await ctx.kv.get<Progress>('progress');
 const body=portable(item.data[opts.field]).text;
 // Drafts can be the source; candidates are always indexed published entries.
 const source=makeDoc({...item,status:'published'},await ctx.content!.getPublicUrl!(entry.collection,entry.id)??`/__draft/${item.id}`,{...opts,collections:[...new Set([...opts.collections,entry.collection])],excluded:[]})!;
 const result=suggest(source,body,docs,opts),input=interaction(route.input);
 const query=input.type==='form_submit'&&input.action_id==='search'&&typeof interaction(input.values).query==='string'?String(interaction(input.values).query).slice(0,100):'';
 const blocks:Block[]=[{type:'context',text:'保存した内容で候補を出しています。題名と見出しだけを比較する簡易版です。本文を自動では書き換えません。'}];
 if(!docs.length)blocks.push(notice('記事の索引をまだ作っていません。設定の「索引を作る」を押してください。'));
 if(progress?.status==='building')blocks.push(notice(`索引を作成中です（処理済み ${progress.processed} 件）。登録済みの記事から候補を出しています。`));
 if(progress?.status==='failed')blocks.push(notice(progress.error??'索引の作成に失敗しました。設定から再開してください。'));
 if(progress&&Date.now()-Date.parse(progress.updatedAt)>86400000)blocks.push(notice(`索引は ${progress.updatedAt} のものです。記事の追加が反映されていない場合は「作り直す」を押してください。`));
 blocks.push({type:'header',text:'張るとよい語句'});
 const links=result.links.filter(d=>!query||`${d.title} ${d.anchor_text}`.includes(query));
 if(!links.length)blocks.push({type:'empty',title:'候補がありません。題名や見出しに同じ語がある記事が見つかりませんでした。'});
 for(const d of links){
  blocks.push({type:'section',text:`語句: ${d.anchor_text}\nリンク先: ${d.title}\n保存本文の文字位置: ${d.position+1}`},{type:'code',code:d.url},{type:'actions',elements:[{type:'button',action_id:'find',label:'語句を探す',value:d.id}]});
 }
 if(input.type==='block_action'&&input.action_id==='find'){
  const found=result.links.find(d=>d.id===input.value);if(found)blocks.unshift(notice(`「${found.anchor_text}」は保存本文の${found.position+1}文字目からです。⌘F / Ctrl+F で語句を検索してください。エディタ内への自動移動には対応していません。`));
 }
 blocks.push({type:'context',text:'URL欄を選択して⌘C / Ctrl+Cでコピーしてください。語句を選んで手動でリンクを付けてください。'},{type:'header',text:'関連記事'},{type:'table',columns:[{key:'title',label:'題名'},{key:'url',label:'公開URL'},{key:'closeness',label:'近さ'}],rows:result.related.map(d=>({title:d.title,url:d.url,closeness:d.closeness})),page_action_id:'related_page',empty_text:'候補がありません。'},{type:'form',block_id:'search',fields:[{type:'text_input',action_id:'query',label:'候補を検索',initial_value:query}],submit:{action_id:'search',label:'検索'}},{type:'actions',elements:[button('refresh','候補を更新')]});
 return{blocks};
}
