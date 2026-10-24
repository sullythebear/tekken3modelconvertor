import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import {
  analyzeSkeleton, applySkeletonMapping, resetSkeletonMapping,
  exportSkeletonMapping, importSkeletonMapping, vertexRegion,
} from '../src/core/skeleton.js';
function rig() {
  const root = new THREE.Group(), bones = [0, 1, 2].map(i => {
    const b = new THREE.Bone(); b.name = `Bone${i}`; return b;
  });
  root.add(bones[0]); bones[0].add(bones[1]); bones[1].add(bones[2]);
  bones[1].position.y = bones[2].position.y = 1;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 2, 0], 3));
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([2, 0, 0, 0], 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0], 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshBasicMaterial());
  root.add(mesh); root.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(bones));
  return { root, bones, mesh };
}
test('Explicit mappings recover unnamed bones, drive anatomical partitioning, and survive skeleton clones', () => {
  const {root, bones, mesh} = rig();
  assert.equal(analyzeSkeleton(root).report.mapping.length, 0);
  const a = applySkeletonMapping(root, {hips: 0, spine: 1, head: 2});
  assert.equal(a.mapping.head, bones[2]);
  assert.equal(a.report.mapping[2].confidence, 'manual');
  assert.equal(vertexRegion(mesh, 0, new THREE.Box3()), 'head');
  const copied = clone(root), c = analyzeSkeleton(copied);
  assert.notEqual(c.mapping.head, bones[2]);
  assert.equal(c.mapping.head.name, bones[2].name);
  assert.deepEqual(c.report.missing, a.report.missing);
});
test('Source mapping profile round-trips to identical rig and refuses mismatched bind pose without mutation', () => {
  const a = rig(), b = rig();
  applySkeletonMapping(a.root, {hips: 0, spine: 1, head: 2});
  const json = JSON.parse(JSON.stringify(exportSkeletonMapping(a.root)));
  assert.equal(importSkeletonMapping(b.root, json).mapping.head, b.bones[2]);
  b.bones[1].position.y += 0.1;
  assert.throws(() => importSkeletonMapping(b.root, json), /does not match/);
  assert.equal(analyzeSkeleton(b.root).mapping.head, b.bones[2]);
  b.bones[1].position.y -= 0.1;
  b.bones[1].name = 'Different';
  assert.throws(() => importSkeletonMapping(b.root, json), /does not match/);
});
test('Invalid, duplicate and inherited role assignments fail atomically; unmapped is explicit; reset detects names', () => {
  const {root, bones} = rig(); bones[2].name = 'Head';
  applySkeletonMapping(root, {hips: 0});
  assert.equal(analyzeSkeleton(root).mapping.head, undefined);
  for (const roles of [{head: 0, hips: 0}, {head: -1}, {head: 0.5}, {head: 3}, {toString: 1}, [], null])
    assert.throws(() => applySkeletonMapping(root, roles));
  assert.equal(analyzeSkeleton(root).mapping.hips, bones[0]);
  assert.equal(resetSkeletonMapping(root).mapping.head, bones[2]);
});
