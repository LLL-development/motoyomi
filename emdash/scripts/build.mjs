import {build} from 'esbuild';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
await build({entryPoints:['src/index.ts','src/plugin.ts'],outdir:'dist',bundle:true,format:'esm',platform:'neutral',target:'es2022',outExtension:{'.js':'.mjs'}});
await writeFile('dist/index.d.mts','import type {PluginDescriptor} from "emdash";\ndeclare const descriptor:PluginDescriptor;\nexport default descriptor;\n');
console.log('Built real EmDash standard descriptor and sandbox runtime (no publisher identity required).');
