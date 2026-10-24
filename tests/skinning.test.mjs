import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {configureSkinning, skinSets} from '../src/core/skinning.js';
import {inspectWeights} from '../src/core/skeleton.js';
import {retargetSourceVertex} from '../src/core/bind.js';
function fixture() {
  const root = new THREE.Group(), bones = Array.from({length: 12}, () => new THREE.Bone());
  root.add(...bones);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([1,0,0], 3));
  for (let s = 0; s < 3; s++) {
    g.setAttribute(s ? `joints_${s}` : 'skinIndex', new THREE.Uint16BufferAttribute([4*s,4*s+1,4*s+2,4*s+3],4));
    g.setAttribute(s ? `weights_${s}` : 'skinWeight',new THREE.Float32BufferAttribute([1,1,1,1],4));
  }
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial());
  root.add(mesh);root.updateMatrixWorld(true);mesh.bind(new THREE.Skeleton(bones));
  configureSkinning(root, {normalize: true});
  return {root, mesh, bones};
}
test('All twelve skin influences normalize jointly and contribute to CPU deformation across cloned skeletons', () => {
  const f = fixture();
  assert.equal(skinSets(f.mesh.geometry).length,3);
  assert.deepEqual(inspectWeights(f.root), {vertices:1, invalid:0, unnormalized:0});
  f.bones[11].position.x = 12;
  f.root.updateMatrixWorld(true);
  assert.ok(f.mesh.getVertexPosition(0,new THREE.Vector3()).distanceTo(new THREE.Vector3(2,0,0)) < 1e-6);
  const c=clone(f.root);configureSkinning(c);
  const m=c.children.find(o=>o.isSkinnedMesh);
  assert.ok(m.getVertexPosition(0,new THREE.Vector3()).distanceTo(new THREE.Vector3(2,0,0)) < 1e-6);
});
test('Donor retargeting includes influences beyond the first joint set', () => {
  const {root,mesh,bones}=fixture();
  const mapping=Object.fromEntries(bones.map((b,i)=>[`role${i}`,b]));
  const frames=Object.fromEntries(bones.map((b,i)=>[`role${i}`, new THREE.Matrix4()]));
  const scales=Object.fromEntries(bones.map((b,i)=>[`role${i}`,1]));
  const profile={roleRows:Object.fromEntries(bones.map((b,i)=>[`role${i}`,i])),frames:Object.fromEntries(bones.map((b,i)=>[i,new THREE.Matrix4().makeTranslation(i===11?12:0,0,0)]))};
  const out=retargetSourceVertex(mesh,0,{rig:{mapping},frames,scales},profile);
  assert.ok(out.point.distanceTo(new THREE.Vector3(2,0,0)) < 1e-6);
});
test('Missing influence sets and invalid weights are rejected rather than silently discarded', () => {
  const {root,mesh}=fixture();
  mesh.geometry.deleteAttribute('weights_1');
  assert.throws(()=>configureSkinning(root), /Incomplete/);
  mesh.geometry.setAttribute('weights_1', new THREE.Float32BufferAttribute([-1,1,1,1],4));
  assert.throws(()=>configureSkinning(root), /Invalid skin/);
});
