import test from 'node:test';import assert from 'node:assert/strict';import{readbackCache}from'../src/core/readback-cache.js';
test('Unique readbacks are not retained; shared data is read once and released on its last consumer',()=>{
 const shared={image:{}},unique={image:{}},calls=[],read=(t,size,data)=>{calls.push([t,size,data]);return {data:new Uint8Array(16)};},cache=readbackCache([{texture:shared,size:2},{texture:unique,size:2},{texture:shared,size:2}],read),first=cache.read(shared,2);assert.equal(cache.stats.retainedBytes,16);cache.read(unique,2);assert.equal(cache.stats.retainedBytes,16,'Unique image must not remain in the cache');assert.equal(cache.read(shared,2),first);assert.equal(calls.length,2);assert.equal(cache.stats.hits,1);assert.equal(cache.stats.retainedBytes,0);
});
test('Readback caching separates resolution and data/colour semantics even for one source image',()=>{
 const t={image:{}},cache=readbackCache([{texture:t,size:2},{texture:t,size:2,data:true},{texture:t,size:4},{texture:t,size:2}],(_,size,data)=>({data:new Uint8Array(size*size*4),role:!!data}));const color=cache.read(t,2),data=cache.read(t,2,true),larger=cache.read(t,4);assert.notEqual(color,data);assert.equal(data.role,true);assert.equal(larger.data.length,64);assert.equal(cache.read(t,2),color);assert.equal(cache.stats.reads,3);assert.equal(cache.stats.retainedBytes,0);cache.clear();assert.equal(cache.stats.retainedBytes,0);
});
test('Different magnification samplers on a shared image cannot reuse a differently filtered readback',()=>{
 const image={},nearest={image,magFilter:1003},linear={image,magFilter:1006};const cache=readbackCache([{texture:nearest,size:2},{texture:linear,size:2},{texture:nearest,size:2}],t=>({data:new Uint8Array(16),filter:t.magFilter}));const a=cache.read(nearest,2),b=cache.read(linear,2);assert.notEqual(a,b);assert.equal(b.filter,1006);assert.equal(cache.read(nearest,2),a);assert.equal(cache.stats.reads,2);assert.equal(cache.stats.retainedBytes,0);
});
