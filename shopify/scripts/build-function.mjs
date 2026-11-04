import {spawnSync} from 'node:child_process';import path from 'node:path';import {fileURLToPath} from 'node:url';import fs from 'node:fs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function run(cmd,args){const r=spawnSync(cmd,args,{cwd:root,stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);}
run('cargo',['build','--locked','--target','wasm32-wasip1','--release','-p','motoyomi-delivery']);
const wasm=path.join(root,'target/wasm32-wasip1/release/motoyomi-delivery.wasm');
run(process.execPath,[path.join(root,'node_modules/binaryen/bin/wasm-opt'),'-Oz','--enable-bulk-memory','--enable-sign-ext',wasm,'-o',wasm+'.tmp']);fs.renameSync(wasm+'.tmp',wasm);
if(fs.statSync(wasm).size>256*1024)throw new Error('Function exceeds 256 KiB');
