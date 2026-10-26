import test from "node:test";
import { authoredHand } from "./fixtures/authored-hand.mjs";
import assert from "node:assert/strict";
import * as THREE from "three";
import { MeshoptSimplifier } from "meshoptimizer";
import { reconstructAnatomicalHand } from "../src/core/hand-reconstruction.js";
import { skinSets, configureSkinning } from "../src/core/skinning.js";

test("New articulated finger topology uses unnamed bone curves, retains interfaces and all influence sets", async () => {
  await MeshoptSimplifier.ready;
  const fixture = authoredHand(),
    before = fixture.g.toJSON();
  const result = reconstructAnatomicalHand(fixture.g, fixture.material, {
    ...fixture,
    simplifier: MeshoptSimplifier,
    textureSize: 32,
  });
  assert.ok(result.geometry, result.reason);
  assert.equal(result.fingers, 5);
  assert.equal(result.preservationPoints.length, 20);
  assert.equal(
    Object.getOwnPropertyDescriptor(result, "preservationPoints").enumerable,
    false,
  );
  assert.ok(result.triangles < fixture.g.index.count / 3);
  assert.equal(result.integrity.unexpectedOpenEdges, 0);
  assert.equal(result.integrity.inconsistentWinding, 0);
  assert.deepEqual(fixture.g.toJSON(), before);
  const g = result.geometry;
  assert.equal(skinSets(g).length, 2);
  for (let v = 0; v < g.attributes.position.count; v++) {
    let sum = 0;
    for (const [j, w] of skinSets(g))
      for (let k = 0; k < 4; k++) {
        assert.ok(Number.isInteger(j.getComponent(v, k)));
        sum += w.getComponent(v, k);
      }
    assert.ok(Math.abs(sum - 1) < 1e-5);
  }
  fixture.mesh.geometry = g;
  fixture.mesh.material = result.material;
  configureSkinning(fixture.mesh);
  fixture.hand.children[2].rotation.x = 0.8;
  fixture.mesh.updateMatrixWorld(true);
  fixture.mesh.skeleton.update();
  for (let v = 0; v < g.attributes.position.count; v++)
    assert.ok(
      fixture.mesh
        .getVertexPosition(v, new THREE.Vector3())
        .toArray()
        .every(Number.isFinite),
    );
});
test("Unknown hand rigs return a reason and preserve the reliable source fallback", () => {
  const g = new THREE.BoxGeometry();
  const r = reconstructAnatomicalHand(g, new THREE.MeshBasicMaterial());
  assert.equal(r.geometry, null);
  assert.match(r.reason, /rig/);
});

test("Closed source finger accessories survive as separate geometry rather than being absorbed into a skin tube", async () => {
  await MeshoptSimplifier.ready;
  const fixture = authoredHand(true),
    result = reconstructAnatomicalHand(fixture.g, fixture.material, {
      ...fixture,
      simplifier: MeshoptSimplifier,
      textureSize: 32,
    });
  assert.ok(result.geometry, result.reason);
  assert.equal(result.accessories.length, 1);
  assert.equal(result.accessories[0].before, 288);
  assert.ok(result.accessories[0].after > 0);
  assert.equal(result.integrity.unexpectedOpenEdges, 0);
  assert.ok(
    result.surfaceQuality.every(
      (q) => q.reversedAreaFraction <= 0.1 && q.relativeDeviation <= 0.06,
    ),
  );
});

test('Unreferenced clothing texels never enter an anatomically baked hand or its gutters',async()=>{
 await MeshoptSimplifier.ready;const fixture=authoredHand(),data=new Uint8Array(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++)data.set(x<8?[180,140,100,255]:[255,0,0,255],(y*16+x)*4);fixture.material.color.set(0xffffff);fixture.material.map=new THREE.DataTexture(data,16,16);for(let v=0;v<fixture.g.attributes.uv.count;v++)fixture.g.attributes.uv.setXY(v,fixture.g.attributes.uv.getX(v)*.4,fixture.g.attributes.uv.getY(v)*.4);const before=data.slice(),r=reconstructAnatomicalHand(fixture.g,fixture.material,{...fixture,simplifier:MeshoptSimplifier,textureSize:64});assert.ok(r.geometry,r.reason);const pixels=r.material.map.image.data;for(let i=0;i<pixels.length;i+=4)assert.deepEqual(Array.from(pixels.slice(i,i+4)),[180,140,100,255]);assert.equal(r.material.userData.t3csSkinBake.coverage.unfilledTexels,0);assert.deepEqual(data,before);
});

test('Constant source UVs seed real source color instead of becoming an empty black hand chart',async()=>{
 await MeshoptSimplifier.ready;const fixture=authoredHand();fixture.g.attributes.uv.array.fill(0);fixture.material.color.set(0xffffff);const r=reconstructAnatomicalHand(fixture.g,fixture.material,{...fixture,simplifier:MeshoptSimplifier,textureSize:32});assert.ok(r.geometry,r.reason);assert.equal(r.material.userData.t3csSkinBake.coverage.unfilledTexels,0);assert.ok(r.material.userData.t3csSkinBake.coverage.undersampledSeeds>0);assert.ok(r.material.map.image.data.every(v=>v===255));
});
test('A measured nearby closed accessory transfers its true source color onto the underlying finger without extra geometry',async()=>{
 await MeshoptSimplifier.ready;const fixture=authoredHand(true),data=new Uint8Array(16*16*4);for(let y=0;y<16;y++)for(let x=0;x<16;x++)data.set(x<8?[180,140,100,255]:x>=14&&y>=14?[240,240,240,255]:[255,0,0,255],(y*16+x)*4);fixture.material.color.set(0xffffff);fixture.material.map=new THREE.DataTexture(data,16,16);for(let v=0;v<fixture.g.attributes.uv.count;v++)fixture.g.attributes.uv.setXY(v,v<fixture.accessoryStart?fixture.g.attributes.uv.getX(v)*.4:.95,v<fixture.accessoryStart?fixture.g.attributes.uv.getY(v)*.4:.95);
 const r=reconstructAnatomicalHand(fixture.g,fixture.material,{...fixture,simplifier:MeshoptSimplifier,textureSize:128});assert.ok(r.geometry,r.reason);const transfer=r.material.userData.t3csSkinBake.accessoryTextureTransfer;assert.ok(transfer.components.some(c=>c.projected));assert.ok(transfer.paintedTexels>0);const pixels=r.material.map.image.data;let silver=0;for(let row=0;row<Math.floor(128*.495);row++)for(let col=0;col<128;col++){const i=(row*128+col)*4;if(pixels[i]>220&&pixels[i+1]>220&&pixels[i+2]>220)silver++;assert.ok(pixels[i+1]>80,'Unreferenced clothing red must not enter a finger');}assert.ok(silver>0);assert.equal(r.accessories.length,1);
});

test('An unnamed outward thumb in a rotated nonuniform bind reconstructs without forcing parallel fingers',async()=>{
 await MeshoptSimplifier.ready;const f=authoredHand(),thumb=f.hand.children[0],pivot=thumb.position.clone(),q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),.8),p=f.g.attributes.position,j=f.g.attributes.skinIndex;
 for(let v=0;v<p.count;v++)if(j.getX(v)>=1&&j.getX(v)<=3){const point=new THREE.Vector3().fromBufferAttribute(p,v).sub(pivot).applyQuaternion(q).add(pivot);p.setXYZ(v,...point.toArray());}
 thumb.quaternion.copy(q);f.g.computeVertexNormals();f.mesh.rotation.y=.4;f.mesh.scale.set(1.2,.9,1.1);f.mesh.updateMatrixWorld(true);f.mesh.bind(new THREE.Skeleton(f.mesh.skeleton.bones));const before=f.g.toJSON(),rotation=thumb.quaternion.toArray(),result=reconstructAnatomicalHand(f.g,f.material,{...f,simplifier:MeshoptSimplifier,textureSize:32});
 assert.ok(result.geometry,result.reason);assert.equal(result.fingers,5);assert.equal(result.integrity.unexpectedOpenEdges,0);assert.equal(result.integrity.inconsistentWinding,0);assert.deepEqual(f.g.toJSON(),before);assert.deepEqual(thumb.quaternion.toArray(),rotation);assert.ok(result.surfaceQuality.every(q=>q.relativeDeviation<=.06&&q.reversedAreaFraction<=.1));
 f.mesh.geometry=result.geometry;f.mesh.material=result.material;configureSkinning(f.mesh);thumb.children[0].rotation.x=1.1;f.hand.rotation.z=.6;f.mesh.updateMatrixWorld(true);f.mesh.skeleton.update();for(let v=0;v<result.geometry.attributes.position.count;v++)assert.ok(f.mesh.getVertexPosition(v,new THREE.Vector3()).toArray().every(Number.isFinite));
});
