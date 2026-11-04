export interface Options {collections:string[];field:string;excluded:string[];relatedLimit:number;linkLimit:number;minLength:number}
export const defaults:Options={collections:['posts'],field:'content',excluded:[],relatedLimit:5,linkLimit:10,minLength:3};
export interface Doc {generation?:string;id:string;collection:string;url:string;title:string;headings:string[];grams:string[];weights:Record<string,number>;linked:string[];updated_at:string}
export interface Entry {id:string;collection?:string;type?:string;status:string;data:Record<string,unknown>;updatedAt:string}
const normalized=(text:string)=>text.normalize('NFKC').toLowerCase().replace(/[‐‑‒–—−－]/g,'-');
export function tokenize(text:string):string[]{
 const terms=new Set<string>();
 for(const word of normalized(text).match(/[a-z0-9]+(?:-[a-z0-9]+)*|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー]+/gu)??[]){
  if(/^[a-z0-9]/.test(word)){terms.add(word);terms.add(word.replaceAll('-',''));}
  else {const chars=[...word];for(let i=0;i<chars.length-1;i++)terms.add(chars[i]+chars[i+1]);}
  if(terms.size>=60)break;
 }
 return [...terms].slice(0,60);
}
export function pathOf(url:string):string|null{
 try{const parsed=new URL(url,'https://local.invalid');return parsed.pathname.replace(/\/$/,'')||'/';}catch{return null;}
}
export function excluded(url:string,options:Options):boolean{return options.excluded.some(p=>url===p||url.startsWith(p.replace(/\/$/,'')+'/'));}
export function portable(value:unknown):{text:string;headings:string[];linked:string[]}{
 const headings:string[]=[],linked:string[]=[],lines:string[]=[];
 if(typeof value==='string')return{text:value.slice(0,200000),headings,linked};
 if(!Array.isArray(value))return{text:'',headings,linked};
 for(const raw of value.slice(0,10000)){
  if(!raw||typeof raw!=='object')continue;
  const block=raw as Record<string,unknown>;
  const text=Array.isArray(block.children)?block.children.map(c=>c&&typeof c==='object'&&'text'in c?String(c.text):'').join(''):'';
  lines.push(text);if(['h2','h3','h4'].includes(String(block.style))&&headings.length<20)headings.push(text);
  if(Array.isArray(block.markDefs))for(const mark of block.markDefs){if(mark&&typeof mark==='object'&&typeof mark.href==='string'){const path=pathOf(mark.href);if(path)linked.push(path);}}
 }
 return{text:lines.join('\n').slice(0,200000),headings,linked:[...new Set(linked)]};
}
export function makeDoc(entry:Entry,url:string,options:Options):Doc|null{
 const collection=entry.collection??entry.type??'';const path=pathOf(url);
 if(entry.status!=='published'||!path||!options.collections.includes(collection)||excluded(path,options))return null;
 const title=String(entry.data.title??'').slice(0,1000), body=portable(entry.data[options.field]);
 const weights:Record<string,number>={};for(const gram of tokenize(title))weights[gram]=2;
 for(const gram of tokenize(body.headings.join(' ')))if(Object.keys(weights).length<60||weights[gram])weights[gram]=Math.max(weights[gram]??0,1);
 return{id:entry.id,collection,url:path,title,headings:body.headings,grams:Object.keys(weights),weights,linked:body.linked,updated_at:entry.updatedAt};
}
// Map normalized code units back to the untouched saved body so anchors keep fullwidth and hyphens.
function mapped(text:string):{value:string;starts:number[];ends:number[]}{
 let value='';const starts:number[]=[],ends:number[]=[];let offset=0;
 for(const char of text){const n=normalized(char);for(const c of n){value+=c;for(let j=0;j<c.length;j++){starts.push(offset);ends.push(offset+char.length);}}offset+=char.length;}
 const kept:number[]=[];for(let i=0;i<value.length;i++)if(!(value[i]==='-'&&/[a-z0-9]/.test(value[i-1]??'')&&/[a-z0-9]/.test(value[i+1]??'')))kept.push(i);
 return{value:kept.map(i=>value[i]).join(''),starts:kept.map(i=>starts[i]),ends:kept.map(i=>ends[i])};
}
export function suggest(source:Doc,body:string,docs:Doc[],options:Options){
 const candidates=docs.filter(d=>!(d.id===source.id&&d.collection===source.collection)&&d.url!==source.url&&!source.linked.includes(d.url)&&options.collections.includes(d.collection)&&!excluded(d.url,options));
 const frequencies=new Map<string,number>();for(const d of docs)for(const g of d.grams)frequencies.set(g,(frequencies.get(g)??0)+1);
 const idf=(g:string)=>1+Math.log((docs.length+1)/((frequencies.get(g)??0)+1));
 const related=candidates.map(d=>{
  let numerator=0,denominator=0;const grams=new Set([...source.grams,...d.grams]);
  for(const g of grams){const a=source.weights[g]??0,b=d.weights[g]??0,w=idf(g);numerator+=Math.min(a,b)*w;denominator+=Math.max(a,b)*w;}
  return{...d,score:denominator?numerator/denominator:0};
 }).filter(d=>d.score>0).sort((a,b)=>b.score-a.score||a.url.localeCompare(b.url)).slice(0,options.relatedLimit).map(d=>({...d,closeness:d.score>=0.6?'高':d.score>=0.25?'中':'低'}));
 const normalizedBody=mapped(body.slice(0,20000));
 const links:Array<Doc & {anchor_text:string;position:number}>=[];
 for(const d of candidates){
  const phrases=[d.title,...d.headings].filter(s=>[...s].length>=options.minLength).sort((a,b)=>b.length-a.length);
  for(const phrase of phrases){const needle=mapped(phrase).value;if(!needle)continue;let i=normalizedBody.value.indexOf(needle);
   while(i>=0&&((/^[a-z0-9]/.test(needle)&&/[a-z0-9]/.test(normalizedBody.value[i-1]??''))||(/[a-z0-9]$/.test(needle)&&/[a-z0-9]/.test(normalizedBody.value[i+needle.length]??''))))i=normalizedBody.value.indexOf(needle,i+1);
   if(i<0)continue;
   const start=normalizedBody.starts[i],end=normalizedBody.ends[i+needle.length-1];links.push({...d,anchor_text:body.slice(start,end),position:start});break;
  }
 }
 links.sort((a,b)=>b.anchor_text.length-a.anchor_text.length||a.position-b.position||a.url.localeCompare(b.url));
 return{links:links.slice(0,options.linkLimit),related};
}
