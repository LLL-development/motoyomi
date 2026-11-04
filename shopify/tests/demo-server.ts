// Loopback-only test harness. It is not a production app route or auth bypass.
import {createServer} from 'node:http';import {createServer as createViteServer} from 'vite';import {PrismaClient} from '@prisma/client';import {loadDraft,saveDraft} from '../app/shipping-service.server.ts';
const db=new PrismaClient({datasourceUrl:process.env.DATABASE_URL||'file:/tmp/motoyomi-shipping-demo.sqlite'});const shop='local-demo.myshopify.com';
const vite=await createViteServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
const server=createServer(async(req,res)=>{
 if(req.url==='/demo/api/rule'){
 try{if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>30000)throw new Error('入力が大きすぎます');}let form=new URLSearchParams(raw);await saveDraft(db,shop,{normal:form.get('normal')??'',island:form.get('island')??'',ranges:form.get('ranges')??'',enabled:form.get('enabled')==='on'},Number(form.get('revision')));}
 res.setHeader('Content-Type','application/json');res.end(JSON.stringify(await loadDraft(db,shop)));}catch(error){res.statusCode=400;res.end(JSON.stringify({error:error instanceof Error?error.message:'保存できませんでした。'}));}return;
 }
 if(req.url==='/demo'){
 res.setHeader('Content-Type','text/html;charset=utf-8');res.end(await vite.transformIndexHtml('/demo','<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Motoyomi 配送ルール ローカルデモ</title></head><body><div id="root"></div><script type="module" src="/tests/demo-client.tsx"></script></body></html>'));return;
 }
 vite.middlewares(req,res,()=>{res.statusCode=404;res.end();});
});server.listen(0,'127.0.0.1',()=>console.log('Local test harness: http://127.0.0.1:'+(server.address() as any).port+'/demo (no Shopify connection)'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{server.close();vite.close();db.$disconnect().finally(()=>process.exit(0));});
