import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const url=process.env.DATABASE_URL||'file:dev.sqlite';
if(!url.startsWith('file:')||url.includes('?'))throw new Error('DATABASE_URL must be a plain SQLite file URL.');
const file=path.resolve(root,'prisma',url.slice(5));
fs.mkdirSync(path.dirname(file),{recursive:true});
// Prisma 6.19 schema-engine reports an empty generic error on this host when a
// SQLite database does not exist. A zero-length SQLite file is valid and lets
// migrate deploy initialize it, including non-ASCII filenames.
fs.closeSync(fs.openSync(file,'a',0o600));
const env={...process.env,DATABASE_URL:url};
for(const args of [['generate'],['migrate','deploy']]){const r=spawnSync(process.execPath,[path.join(root,'node_modules/prisma/build/index.js'),...args],{cwd:root,env,stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);}
