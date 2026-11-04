import limits from "../config/free-limits.json";
export {limits};
/** Free plan compiles one ds rule; data is merchant-supplied, never customer data. */
export function compileFreeRule(input:{normal:string;island:string;ranges:string}) {
 const normal=input.normal.trim(), island=input.island.trim();
 if(!normal||!island||normal===island||normal.length>limits.maxMethodChars||island.length>limits.maxMethodChars)throw new Error('異なる配送方法名をそれぞれ100文字以内で入力してください。');
 const lines=input.ranges.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 if(!lines.length||lines.length>limits.maxRanges)throw new Error(`無料版の郵便番号範囲は1〜${limits.maxRanges}行で入力してください。`);
 const normalized=lines.map((line,i)=>{const parts=line.normalize('NFKC').split(/\s*-\s*/);if(parts.length>2||parts.some(x=>!/^\d{7}$/.test(x)))throw new Error(`${i+1}行目: 7桁または7桁-7桁で入力してください。`);if(parts.length===2&&parts[0]>parts[1])throw new Error(`${i+1}行目: 開始が終了を超えています。`);return parts.join('-');});
 const zones:string[]=[];let bucket='1=';for(const range of normalized){if(Buffer.byteLength(bucket+range+',')>9000){zones.push(bucket.slice(0,-1));bucket='1=';}bucket+=range+',';}zones.push(bucket.slice(0,-1));if(zones.length>5)throw new Error('設定の容量を超えています。');
 const rules=JSON.stringify({v:1,rules:[{i:'free-1',k:'ds',w:{z:[1]},h:{e:[normal]},o:{e:[island]}}]});
 if(Buffer.byteLength(rules)>limits.maxRulesBytes)throw new Error("設定の容量を超えています。");
 return {rules,zones};
}
