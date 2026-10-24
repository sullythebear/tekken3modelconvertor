import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {reconstructUVSurface} from '../src/core/uv-reconstruction.js';
function plane(z=0){const g=new THREE.PlaneGeometry(2,2,20,20);g.translate(0,0,z);const n=g.attributes.position.count;g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(n*4).fill(3),4));const w=new Float32Array(n*4);for(let i=0;i<n;i++)w[i*4]=1;g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(w,4));return g;}
test('New chart topology lies on the original surface with exact UV correspondence and categorical joints',()=>{
 const g=plane(),original=g.attributes.position.array.slice(),r=reconstructUVSurface(g,{target:160,anchors:[{vertex:220}]});
 assert.ok(r.geometry,r.reason);assert.ok(r.generatedVertices<g.attributes.position.count);assert.equal(r.semanticAnchors,1);
 const p=r.geometry.attributes.position,u=r.geometry.attributes.uv;
 let newlyPlaced=0;for(let i=0;i<p.count;i++){assert.ok(Math.abs(p.getX(i)-(2*u.getX(i)-1))<1e-6);assert.ok(Math.abs(p.getY(i)-(2*u.getY(i)-1))<1e-6);assert.equal(p.getZ(i),0);assert.equal(r.geometry.attributes.skinIndex.getX(i),3);assert.equal(r.geometry.attributes.skinWeight.getX(i),1);if(Math.abs(p.getX(i)*10-Math.round(p.getX(i)*10))>1e-4)newlyPlaced++;}
 assert.ok(newlyPlaced>0,'Must generate positions, not select old vertices');assert.deepEqual(g.attributes.position.array,original);
});
test('Overlapping UVs on separate physical layers rebuild independently without bridging',()=>{
 const a=plane(),b=plane(.1),g=new THREE.BufferGeometry();for(const name of Object.keys(a.attributes)){const aa=a.attributes[name],bb=b.attributes[name],data=new aa.array.constructor(aa.array.length+bb.array.length);data.set(aa.array);data.set(bb.array,aa.array.length);g.setAttribute(name,new THREE.BufferAttribute(data,aa.itemSize));}g.setIndex([...a.index.array,...Array.from(b.index.array,i=>i+a.attributes.position.count)]);
 const r=reconstructUVSurface(g,{target:100});assert.ok(r.geometry);assert.equal(r.charts.length,2);const pos=r.geometry.attributes.position,idx=r.geometry.index;for(let t=0;t<idx.count;t+=3){const z=[0,1,2].map(k=>pos.getZ(idx.getX(t+k)));assert.ok(Math.max(...z)-Math.min(...z)<1e-6);}
});
test('Missing UVs and empty charts retain the fallback path',()=>{const g=plane();g.deleteAttribute('uv');assert.equal(reconstructUVSurface(g).geometry,null);});
test('Nonfinite UVs and invalid target counts cannot hang the sampling loop',()=>{const g=plane();g.attributes.uv.setX(0,NaN);assert.match(reconstructUVSurface(g).reason,/Non-finite/);assert.throws(()=>reconstructUVSurface(plane(),{target:Infinity}),/target/);});
test('Additional influence sets and normalized weights survive chart reconstruction',()=>{const g=plane(),n=g.attributes.position.count;g.attributes.skinWeight.array.fill(0);g.setAttribute('joints_1',new THREE.Uint16BufferAttribute(new Uint16Array(n*4).fill(400),4));const weights=new Uint8Array(n*4);for(let i=0;i<n;i++)weights[i*4]=255;g.setAttribute('weights_1',new THREE.Uint8BufferAttribute(weights,4,true));const r=reconstructUVSurface(g,{target:120});assert.ok(r.geometry,r.reason);for(let i=0;i<r.geometry.attributes.position.count;i++){assert.equal(r.geometry.attributes.skinIndex.getX(i),400);assert.equal(r.geometry.attributes.skinWeight.getX(i),1);assert.ok(r.geometry.attributes.weights_1.normalized);}});
