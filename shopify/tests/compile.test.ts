import {test} from 'node:test';import assert from 'node:assert/strict';
import {compileFreeRule} from '../app/rules.server.ts';
test('free tier has exactly one bidirectional rule',()=>{ const result=compileFreeRule({normal:'通常',island:'離島',ranges:'1000001-1000099'});let c=JSON.parse(result.rules);assert.equal(c.rules.length,1);assert.equal(c.rules[0].k,'ds');assert.deepEqual(c.rules[0].h.e,['通常']);assert.deepEqual(c.rules[0].o.e,['離島']);});
test('rejects invalid postal ranges and names',()=>{for(const x of [{normal:'',island:'離島',ranges:'1000001'},{normal:'通常',island:'通常',ranges:'1000001'},{normal:'通常',island:'離島',ranges:'2000000-1000000'},{normal:'通常',island:'離島',ranges:'123'}])assert.throws(()=>compileFreeRule(x));});
test('supports 400 ranges without exceeding any 9000-byte bucket',()=>{let ranges=Array.from({length:400},(_,i)=>`${1000000+i*2}-${1000001+i*2}`).join('\n');let result=compileFreeRule({normal:'通常',island:'離島',ranges});assert.equal(result.zones.length,1);for(const z of result.zones)assert.ok(Buffer.byteLength(z)<=9000);});

test("rejects 401 ranges",()=>assert.throws(()=>compileFreeRule({normal:"通常",island:"離島",ranges:Array.from({length:401},(_,i)=>String(1000000+i)).join("\n")})));
