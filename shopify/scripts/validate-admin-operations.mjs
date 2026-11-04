import {spawnSync} from 'node:child_process';import * as operations from '../app/graphql/delivery-operations.ts';
const validator=process.argv[2];if(!validator)throw new Error('Pass the installed Shopify AI Toolkit validate.mjs path.');
for(const [name,code] of Object.entries(operations)){console.log(name);const r=spawnSync(process.execPath,[validator,'--api','admin','--version','2026-10','--code',code,'--model','gpt-6','--client-name','codex','--client-version','1'],{env:{...process.env,OPT_OUT_INSTRUMENTATION:'true'},stdio:'inherit'});if(r.status!==0)process.exit(r.status??1);}
