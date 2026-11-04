import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,readFileSync,rmSync} from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
test('fresh SQLite migration and independent process restart persist merchant settings',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'motoyomi-db-'));const db='file:'+path.join(dir,'店舗.sqlite');const env={...process.env,DATABASE_URL:db};
 try{let setup=spawnSync(process.execPath,['scripts/setup-database.mjs'],{env,encoding:'utf8'});assert.equal(setup.status,0,setup.stdout+setup.stderr);
 const write=`const{PrismaClient}=require('@prisma/client');const d=new PrismaClient();d.shippingShop.create({data:{shop:'persist-test.myshopify.com',rules:'{"v":1,"rules":[{"k":"ds"}]}',zoneChunks:'["1=1000001"]'}}).then(()=>d.$disconnect());`;
 let a=spawnSync(process.execPath,['-e',write],{env,encoding:'utf8'});assert.equal(a.status,0,a.stderr);
 let b=spawnSync(process.execPath,['-e',`const{PrismaClient}=require('@prisma/client');const d=new PrismaClient();d.shippingShop.findUnique({where:{shop:'persist-test.myshopify.com'}}).then(x=>{console.log(x.rules);return d.$disconnect()});`],{env,encoding:'utf8'});assert.equal(b.status,0,b.stderr);assert.equal(b.stdout.trim(),'{"v":1,"rules":[{"k":"ds"}]}');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
