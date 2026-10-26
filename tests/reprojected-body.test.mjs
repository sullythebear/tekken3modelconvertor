import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { MeshoptSimplifier } from "meshoptimizer";
import { reduceBodySurface } from "../src/core/body-surface.js";
import { rebakeTorso } from "../src/core/torso-bake.js";

test("Geometry destined for physical texture reprojection is not constrained by discarded source UV islands", async () => {
  await MeshoptSimplifier.ready;
  const a = new THREE.PlaneGeometry(2, 2, 14, 14),
    b = a.clone();
  for (let i = 0; i < b.attributes.uv.count; i++)
    b.attributes.uv.setXY(i, ((i * 37) % 101) / 100, ((i * 61) % 103) / 102);
  const x = reduceBodySurface(a, "spine", MeshoptSimplifier, {
      target: 60,
      reprojectUV: true,
    }),
    y = reduceBodySurface(b, "spine", MeshoptSimplifier, {
      target: 60,
      reprojectUV: true,
    });
  assert.deepEqual(x.indices, y.indices);
  assert.equal(x.integrity.unexpectedOpenEdges, 0);
  assert.ok(x.indices.length < a.index.count);
});
test("Physical garment rebaking samples the full source and gives identical real texels across different low-poly topology", () => {
  const source = new THREE.BoxGeometry(1, 2, 0.5),
    a = new THREE.BoxGeometry(1, 2, 0.5),
    b = new THREE.BoxGeometry(1, 2, 0.5, 2, 2, 1),
    texture = new THREE.DataTexture(
      new Uint8Array([
        255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255,
      ]),
      2,
      2,
    ),
    material = new THREE.MeshBasicMaterial({ map: texture }),
    before = source.toJSON();
  const x = rebakeTorso(source, a, material, { side: 16 }),
    y = rebakeTorso(source, b, material, { side: 16 });
  assert.ok(x && y);
  assert.deepEqual(x.material.map.image.data, y.material.map.image.data);
  assert.notEqual(x.geometry.index.count, y.geometry.index.count);
  assert.deepEqual(source.toJSON(), before);
  assert.ok(x.material.map.image.data.some((v, i) => i % 4 !== 3 && v > 0));
});

test('Body bake uses the full destination height without changing geometry, source UVs or source image bytes',()=>{
 const source=new THREE.BoxGeometry(1,2,.5),bytes=new Uint8Array([100,80,60,255,120,100,80,255,140,120,100,255,160,140,120,255]),saved=bytes.slice(),material=new THREE.MeshBasicMaterial({map:new THREE.DataTexture(bytes,2,2)}),a=rebakeTorso(source,source,material,{side:16,height:16}),b=rebakeTorso(source,source,material,{side:16,height:32});assert.deepEqual(bytes,saved);assert.equal(b.textureHeight,32);assert.equal(b.material.map.image.data.length,32*32*4);for(const name of ['position','normal','uv'])assert.deepEqual(a.geometry.attributes[name].array,b.geometry.attributes[name].array);assert.throws(()=>rebakeTorso(source,source,material,{height:Infinity}),/dimensions/);
});
test('Real smooth source normals shade the body chart and are not applied twice during candidate rebaking',()=>{
 const source=new THREE.BoxGeometry(1,2,.5),material=new THREE.MeshBasicMaterial({color:0xc0b0a0}),a=rebakeTorso(source,source,material,{side:16,height:32,diffuse:true}),again=rebakeTorso(a.geometry,a.geometry,a.material,{side:16,height:32,diffuse:true}),front=(16*32+8)*4,back=(16*32+24)*4;
 assert.ok(a.material.userData.t3csSurfaceDiffuse.shadedTexels>0);assert.ok(a.material.map.image.data[front]>a.material.map.image.data[back]);for(let k=0;k<3;k++)assert.ok(Math.abs(again.material.map.image.data[front+k]-a.material.map.image.data[front+k])<=1);
 const rotated=rebakeTorso(source,source,material,{side:16,height:32,diffuse:true,normalMatrix:new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationY(Math.PI))});assert.ok(rotated.material.map.image.data[front]<rotated.material.map.image.data[back]);assert.equal(material.userData.t3csSurfaceDiffuse,undefined);
});
test('Missing or invalid source normals preserve albedo rather than creating black skin or a false diffuse-bake claim',()=>{
 const source=new THREE.BoxGeometry(1,2,.5),material=new THREE.MeshBasicMaterial({color:0x997755}),plain=rebakeTorso(source,source,material,{side:8});source.attributes.normal.array.fill(NaN);const result=rebakeTorso(source,source,material,{side:8,diffuse:true});assert.deepEqual(result.material.map.image.data,plain.material.map.image.data);assert.equal(result.material.userData.t3csSurfaceDiffuse,undefined);
});
