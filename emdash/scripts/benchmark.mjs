import {performance} from 'node:perf_hooks';
import {tokenize,makeDoc,suggest,defaults} from '../src/engine.ts';
const entry=(i)=>({id:String(i),type:'posts',status:'published',updatedAt:'2026-11-04',data:{title:`日本語製品 AB-${1200+i} 使用方法`,content:Array.from({length:20},(_,j)=>({_type:'block',style:'h2',children:[{text:`日本語製品の設置方法その${j}`}]}))}});
const report={runtime:process.version,platform:process.platform,measurement:'local wall clock, not Cloudflare CPU',samples:100};
for(const count of [500,2000]){
 const docs=Array.from({length:count},(_,i)=>makeDoc(entry(i),`/posts/${i}`,defaults));const source=makeDoc(entry(-1),'/source',defaults);const body='ＡＢ－１２００と日本語製品の設置方法を確認します。'.repeat(50);
 for(let i=0;i<10;i++)suggest(source,body,docs,defaults);
 const times=[];for(let i=0;i<100;i++){const start=performance.now();suggest(source,body,docs,defaults);times.push(performance.now()-start);}times.sort((a,b)=>a-b);
 report[count]={medianMs:times[50],p95Ms:times[95],maxMs:times[99]};
}
console.log(JSON.stringify(report,null,2));
