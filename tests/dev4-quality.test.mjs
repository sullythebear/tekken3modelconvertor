import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {filteredRGBA,cutoutThreshold} from '../src/core/texture-filter.js';
import {simplifyHairSupport} from '../src/core/hair-volume.js';import {MeshoptSimplifier} from 'meshoptimizer';
test('Cutout area filtering keeps the visible colour instead of mixing transparent black halos',()=>{
 const image={width:2,height:1,data:new Uint8Array([200,120,60,255,0,0,0,0])};
 assert.deepEqual(filteredRGBA(image,[[.5,.5]]),[200,120,60,127.5]);
 assert.deepEqual(filteredRGBA(image,[[1,.5]]),[0,0,0,0]);
 assert.equal(cutoutThreshold({alphaTest:.01}),.5);assert.equal(cutoutThreshold({alphaTest:.8}),.8);
});
test('Subpixel cutout integration is stable under source resolution changes',()=>{
 const image={width:2,height:2,data:new Uint8Array([60,80,100,255,60,80,100,255,60,80,100,255,60,80,100,255])};
 assert.deepEqual(filteredRGBA(image,[[.25,.25],[.75,.75],[.25,.75],[.75,.25]]),[60,80,100,255]);
});
test('Hair support reduction retains every open boundary and bounds surface error',async()=>{
 await MeshoptSimplifier.ready;const g=new THREE.CylinderGeometry(1,.7,3,24,20,true),result=simplifyHairSupport(g,MeshoptSimplifier);
 assert.ok(result.report.after<result.report.before);assert.ok(result.report.error<=.008+1e-7);
 const positions=result.geometry.attributes.position,points=new Set(Array.from({length:positions.count},(_,i)=>[positions.getX(i),positions.getY(i),positions.getZ(i)].join(','))),p=g.attributes.position;
 for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i))===1.5)assert.ok(points.has([p.getX(i),p.getY(i),p.getZ(i)].join(',')),'Open top/bottom boundary moved');
 assert.equal(g.index.count/3,result.report.before,'Source must remain intact');
});
test('Small support meshes are neither inflated nor passed to an invalid simplification target',async()=>{
 await MeshoptSimplifier.ready;const g=new THREE.PlaneGeometry(),result=simplifyHairSupport(g,MeshoptSimplifier);assert.equal(result.report.after,2);assert.equal(result.report.error,0);assert.notEqual(result.geometry,g);
});

test('Dark opaque fabric is not made colourful by ordered dither while midtones still respond',async()=>{
 const {pixelateRGBA}=await import('../src/core/art-atlas.js');const black=new Uint8Array(16*4);for(let i=3;i<black.length;i+=4)black[i]=255;
 assert.deepEqual(pixelateRGBA(black,90,true,4),black);
 const middle=new Uint8Array(black);for(let i=0;i<middle.length;i+=4)middle.set([127,127,127],i);
 assert.notDeepEqual(pixelateRGBA(middle,90,true,4),pixelateRGBA(middle,90,false,4));
});
test('Front/back rebaked garments retain useful texel width without taking the face tile away',async()=>{
 const {artAtlasLayout}=await import('../src/core/art-atlas.js');const materials=['Head_anatomical','Hair_cards','Hair_volume','Body_torso_rebaked','Body_torso_rebaked','Body_left_envelope','Body_right_envelope','Eyelashes','Iris','Sclera','Teeth','Eyeshell','Body_arms_left','Body_arms_right'].map(name=>({name}));
 const l=artAtlasLayout(materials,512,{face:90,hair:90,pixelation:55});assert.equal(l[0].side,128);assert.equal(l[3].side,256);assert.equal(l[4].side,256);
 for(let i=0;i<l.length;i++)for(let j=i+1;j<l.length;j++){const a=l[i],b=l[j];assert.ok(a.x+a.side<=b.x||b.x+b.side<=a.x||a.y+a.side<=b.y||b.y+b.side<=a.y,'Atlas tiles overlap');}
});
