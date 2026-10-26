import test from 'node:test';
import assert from 'node:assert/strict';
import {reuseExactProjectAssets} from '../src/core/project-assets.js';

test('Reopened assets reuse storage only after comparing every byte, including the non-word tail',()=>{
 const old={name:'source.fbx',data:new Uint8Array([1,2,3,4,5])},incoming={...old,data:old.data.slice(),note:'new record'};
 const r=reuseExactProjectAssets([incoming],[old]);assert.equal(r.reusedFiles,1);assert.equal(r.reusedBytes,5);assert.equal(r.records[0].data,old.data);assert.equal(r.records[0].note,'new record');assert.notEqual(r.records[0],old);assert.notEqual(incoming.data,old.data);
 incoming.data[4]=6;const changed=reuseExactProjectAssets([incoming],[old]);assert.equal(changed.reusedFiles,0);assert.equal(changed.records[0],incoming);assert.equal(old.data[4],5);
});
test('Asset identity respects subarray boundaries, lengths, names and ambiguous duplicates',()=>{
 const old={name:'a',data:new Uint8Array([9,1,2,3,8]).subarray(1,4)},incoming={name:'a',data:new Uint8Array([7,1,2,3,4,5]).subarray(1,4)};
 assert.equal(reuseExactProjectAssets([incoming],[old]).records[0].data,old.data);
 for(const source of [[{...incoming,name:'b'}],[{...incoming,data:new Uint8Array([1,2])}],[incoming,incoming]])assert.equal(reuseExactProjectAssets(source,[old]).reusedFiles,0);
 assert.equal(reuseExactProjectAssets([incoming],[old,old]).reusedFiles,0);
});
test('ArrayBuffer assets are compared without changing their type or sharing changed data',()=>{
 const a={name:'a',data:new Uint8Array([1,2,3,4]).buffer},b={...a,data:a.data.slice(0)};
 assert.equal(reuseExactProjectAssets([b],[a]).records[0].data,a.data);
 assert.equal(reuseExactProjectAssets([{...b,data:'not binary'}],[a]).reusedFiles,0);
});
