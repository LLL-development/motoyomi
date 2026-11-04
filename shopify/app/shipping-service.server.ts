import type {PrismaClient} from '@prisma/client';
import {compileFreeRule} from './rules.server';
import {LIST_DELIVERY,CREATE_DELIVERY,UPDATE_DELIVERY,SET_METAFIELDS} from './graphql/delivery-operations';
export interface RuleDraft {normal:string;island:string;ranges:string;enabled:boolean}
export class RuleError extends Error {}
const empty:RuleDraft={normal:'',island:'',ranges:'',enabled:true};
function validShop(shop:string){if(!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop))throw new RuleError('店舗の認証を確認してください。');}
function canonicalDraft(input:RuleDraft):RuleDraft {
 if(typeof input.normal!=='string'||typeof input.island!=='string'||typeof input.ranges!=='string'||typeof input.enabled!=='boolean'||input.ranges.length>20000)throw new RuleError('入力内容を確認してください。');
 return {normal:input.normal.trim(),island:input.island.trim(),ranges:input.ranges.replace(/\r\n/g,'\n').trim(),enabled:input.enabled};
}
export async function loadDraft(db:PrismaClient,shop:string){
 validShop(shop);const row=await db.shippingShop.findUnique({where:{shop}});let draft=empty;
 if(row){try{draft={...empty,...JSON.parse(row.draft)};}catch{throw new RuleError('保存した設定を読み込めませんでした。サポートへお問い合わせください。');}}
 return {draft,revision:row?.revision??0,appliedRevision:row?.appliedRevision??0,customizationId:row?.customizationId??null,appliedAt:row?.appliedAt?.toISOString()??null};
}
export async function saveDraft(db:PrismaClient,shop:string,input:RuleDraft,expectedRevision?:number){
 validShop(shop);const draft=canonicalDraft(input);const compiled=compileFreeRule(draft);
 return db.$transaction(async(tx)=>{
 const current=await tx.shippingShop.findUnique({where:{shop}});
 if(expectedRevision!==undefined&&expectedRevision!==(current?.revision??0))throw new RuleError('別の画面で設定が更新されました。再読み込みして確認してください。');
 const data={draft:JSON.stringify(draft),rules:compiled.rules,zoneChunks:JSON.stringify(compiled.zones),revision:(current?.revision??0)+1};
 return current?tx.shippingShop.update({where:{shop},data}):tx.shippingShop.create({data:{shop,...data}});
 });
}
export type Graphql = (query:string,options:{variables:Record<string,unknown>;signal?:AbortSignal})=>Promise<Response>;
async function request(graphql:Graphql,query:string,variables:Record<string,unknown>){
 let response:Response;try{response=await graphql(query,{variables});}catch{throw new RuleError('Shopifyに接続できませんでした。保存済みの設定は残っています。再度反映してください。');}
 if(!response.ok)throw new RuleError('Shopifyに接続できませんでした。権限と接続状態を確認して再度反映してください。');
 let json;try{json=await response.json();}catch{throw new RuleError('Shopifyからの応答を読み込めませんでした。再度反映してください。');}if(json.errors?.length||!json.data)throw new RuleError('ShopifyのAPIが設定を受け付けませんでした。権限とFunctionの公開状態を確認してください。');return json.data;
}
export async function applySavedRule(db:PrismaClient,shop:string,graphql:Graphql,appKey:string){
 validShop(shop);if(!appKey)throw new RuleError('Shopifyアプリの接続設定がありません。');
 const now=new Date();const leaseUntil=new Date(now.getTime()+60000);const acquired=await db.shippingShop.updateMany({where:{shop,OR:[{applyLeaseUntil:null},{applyLeaseUntil:{lt:now}}]},data:{applyLeaseUntil:leaseUntil}});
 if(acquired.count!==1)throw new RuleError('反映中です。しばらくして再読み込みしてください。未保存の場合は先に保存してください。');
 const execute=graphql;const signal=AbortSignal.timeout(45000);graphql=(query,options)=>execute(query,{...options,signal});
 try{
 const row=await db.shippingShop.findUniqueOrThrow({where:{shop}});const draft=canonicalDraft(JSON.parse(row.draft));const compiled=compileFreeRule(draft);
 let after:string|null=null;let found:string|null=null;const cursors=new Set<string>();
 for(let pages=0;pages<100;pages++){
 const data=await request(graphql,LIST_DELIVERY,{after});const connection=data.deliveryCustomizations;
 if(!connection||!Array.isArray(connection.nodes))throw new RuleError('Shopifyの設定一覧を読み込めませんでした。');
 const matches=connection.nodes.filter((n:any)=>n.shopifyFunction?.handle==='motoyomi-delivery'&&n.shopifyFunction?.appKey===appKey);
 if(matches.length>1||(matches.length&&found))throw new RuleError('同じ配送Functionの設定が重複しています。Shopifyの配送カスタマイズ設定で1件に整理してください。');
 if(matches.length)found=matches[0].id;
 if(!connection.pageInfo?.hasNextPage)break;
 after=connection.pageInfo.endCursor;if(!after||cursors.has(after)||pages===99)throw new RuleError('Shopifyの設定一覧を最後まで確認できませんでした。');cursors.add(after);
 }
 const baseInput={title:'Motoyomi 配送ルール',functionHandle:'motoyomi-delivery'};
 function check(result:any){
 if(!result||result.userErrors?.length||!result.deliveryCustomization?.id){const codes=result?.userErrors?.map((x:any)=>String(x.code??'')).join(' ')??'';throw new RuleError(/MAXIMUM|LIMIT/.test(codes)?'Shopifyの有効な配送Function数の上限です。不要な配送カスタマイズを無効にして再度反映してください。':'Shopifyが設定を反映できませんでした。配送Functionの配備と必要な権限を確認してください。');}return result.deliveryCustomization;
 }
 // Create disabled; configuration is written atomically before activation.
 if(!found){const data=await request(graphql,CREATE_DELIVERY,{input:{...baseInput,enabled:false}});found=check(data.deliveryCustomizationCreate).id;}
 const metafields=[{ownerId:found,namespace:'$app',key:'rules',type:'json',value:compiled.rules},{ownerId:found,namespace:'$app',key:'zones_0',type:'multi_line_text_field',value:compiled.zones[0]}];
 const configuration=await request(graphql,SET_METAFIELDS,{metafields});
 if(!configuration.metafieldsSet||configuration.metafieldsSet.userErrors?.length||!['rules','zones_0'].every(key=>configuration.metafieldsSet.metafields?.some((m:any)=>m.key===key)))throw new RuleError('Shopifyへのルール設定の保存に失敗しました。以前の設定は変わっていません。再度反映してください。');
 const data=await request(graphql,UPDATE_DELIVERY,{id:found,input:{...baseInput,enabled:draft.enabled}});const customization=check(data.deliveryCustomizationUpdate);

 await db.shippingShop.update({where:{shop},data:{customizationId:customization.id,appliedRevision:row.revision,appliedAt:new Date()}});
 return {id:customization.id as string,revision:row.revision,enabled:draft.enabled};
 }finally{await db.shippingShop.updateMany({where:{shop,applyLeaseUntil:leaseUntil},data:{applyLeaseUntil:null}});}
}
