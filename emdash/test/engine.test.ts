import {describe,it,expect} from 'vitest';
import {tokenize, makeDoc, suggest, defaults} from '../src/engine.js';
const item=(id:string,title:string,body:unknown='',status='published')=>({id,collection:'posts',status,slug:id,data:{title,content:body},updatedAt:'2026-11-04'});
describe('local link suggestions',()=>{
 it('normalizes Japanese bigrams and model numbers within the 60 term bound',()=>{
  expect(tokenize('日本語 ＡＢ－１２００')).toEqual(expect.arrayContaining(['日本','本語','ab-1200','ab1200']));
  expect(tokenize('日本語'.repeat(100))).toHaveLength(3);
 });
 it.each(['AB1200','ＡＢ－１２００','ab-1200'])('retains exact original anchor for %s',anchor=>{
  const source=makeDoc(item('s','製品の使い方',`${anchor}を使います`),'/s',defaults)!;
  const target=makeDoc(item('t','AB-1200'),'/t',defaults)!;
  expect(suggest(source,`${anchor}を使います`,[target],defaults).links[0].anchor_text).toBe(anchor);
 });
 it('extracts only headings and title, caps headings and terms, and collects Portable Text links',()=>{
  const doc=makeDoc(item('s','題名',[{_type:'block',style:'h2',children:[{text:'製品説明'}],markDefs:[{_type:'link',href:'/already'}]},{_type:'block',style:'normal',children:[{text:'本文の秘密'}]}]),'/s',defaults)!;
  expect(doc.headings).toEqual(['製品説明']); expect(doc.linked).toEqual(['/already']); expect(doc.grams).not.toContain('秘密');
 });
 it('excludes unpublished, self, linked, excluded paths and collection mismatches',()=>{
  const source=makeDoc(item('s','製品説明','製品説明'),'/s',defaults)!; source.linked=['/linked'];
  const docs=['s','linked','excluded','ok'].map(id=>makeDoc(item(id,'製品説明'),'/'+id,defaults)!);
  expect(makeDoc(item('draft','製品説明','','draft'),'/draft',defaults)).toBeNull();
  const options={...defaults,excluded:['/excluded']};
  expect(suggest(source,'製品説明',docs,options).links.map(x=>x.id)).toEqual(['ok']);
  expect(suggest(source,'製品説明',docs,{...options,collections:['pages']}).links).toEqual([]);
 });
 it('prefers the longest heading match and one anchor per article',()=>{
  const source=makeDoc(item('s','日本語','製品説明と製品説明の詳細'),'/s',defaults)!;
  const target=makeDoc(item('t','製品説明',[{_type:'block',style:'h2',children:[{text:'製品説明の詳細'}]}]),'/t',defaults)!;
  const result=suggest(source,'製品説明と製品説明の詳細',[target],defaults);
  expect(result.links).toHaveLength(1);expect(result.links[0].anchor_text).toBe('製品説明の詳細');
 });
 it('ranks title and heading overlap and returns no unrelated result',()=>{
  const source=makeDoc(item('s','日本語 製品マニュアル'),'/s',defaults)!;
  const docs=[makeDoc(item('a','日本語 製品マニュアル'),'/a',defaults)!,makeDoc(item('b','料理レシピ'),'/b',defaults)!];
  expect(suggest(source,'',docs,defaults).related.map(x=>x.id)).toEqual(['a']);
 });
});
it.each(['AB-12000','XAB1200','AB 1200'])('does not link a different model %s',body=>{
 const source=makeDoc(item('s','製品',body),'/s',defaults)!;
 const target=makeDoc(item('t','AB-1200'),'/t',defaults)!;
 expect(suggest(source,body,[target],defaults).links).toHaveLength(0);
});
it('allows a model adjacent to Japanese text',()=>{
 const source=makeDoc(item('s','製品','AB1200用'),'/s',defaults)!;
 const target=makeDoc(item('t','AB-1200'),'/t',defaults)!;
 expect(suggest(source,'AB1200用',[target],defaults).links[0].anchor_text).toBe('AB1200');
});
