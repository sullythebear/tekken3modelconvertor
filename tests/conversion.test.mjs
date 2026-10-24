import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { convertCharacter, allocateBudget, removeUnusedRenderAttributes } from "../src/core/converter.js";
import { inspectScene } from "../src/core/importer.js";
import {
  semantic,
  analyzeSkeleton,
  inspectWeights,
  deformationProbe,
} from "../src/core/skeleton.js";
test("Reduced-output cleanup retains active UV channels, vertex colours and extra skin sets", () => {
  const source = new THREE.BufferGeometry();
  for (const name of ["position", "color", "uv", "uv1", "uv2", "joints_1", "weights_1"])
    source.setAttribute(name, new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const material = new THREE.MeshStandardMaterial(), texture = new THREE.Texture();
  texture.channel = 2; material.map = texture;
  const reduced = source.clone();
  assert.deepEqual(removeUnusedRenderAttributes(reduced, [material]), ["color", "uv1"]);
  for (const name of ["uv", "uv2", "joints_1", "weights_1"]) assert.ok(reduced.getAttribute(name));
  assert.ok(source.getAttribute("color")); assert.ok(source.getAttribute("uv1"));
  material.vertexColors = true;
  assert.deepEqual(removeUnusedRenderAttributes(source.clone(), [material]), ["uv1"]);
  assert.deepEqual(removeUnusedRenderAttributes(source.clone(), [new THREE.ShaderMaterial()]), []);
});
test("Semantic mapping supports Mixamo and Unreal names without guessing ambiguous aliases", () => {
  assert.equal(semantic("mixamorig:LeftForeArm"), "leftLowerArm");
  assert.equal(semantic("clavicle_l"), "leftShoulder");
  assert.equal(semantic("thigh_r"), "rightUpperLeg");
  assert.equal(semantic("head"), "head");
  assert.equal(semantic("head_accessory"), null);
});
test("Weighted budget prioritizes head and preserves tiny accessories", () => {
  const p = [
      { triangles: 100, importance: 4 },
      { triangles: 100, importance: 1 },
      { triangles: 2, importance: 1 },
    ],
    b = allocateBudget(p, 60);
  assert.equal(
    b.reduce((a, b) => a + b),
    60,
  );
  assert.ok(b[0] > b[1] * 2);
  assert.ok(b[2] >= 1 && b[2] <= 2);
  assert.throws(() => allocateBudget(p, 2), /at least/);
});
test("Anatomical reduction reduces closed geometry and preserves UVs/transforms/source", async () => {
  const root = new THREE.Group(),
    material = new THREE.MeshStandardMaterial({ color: 0xf0b69b });
  material.name = "Body";
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), material);
  mesh.position.set(2, 3, -1);
  root.add(mesh);
  root.updateMatrixWorld(true);
  const source = { root, stats: inspectScene(root), warnings: [] },
    before = mesh.geometry.attributes.position.array.slice(),
    out = await convertCharacter(source, {
      triangles: 350,
      headPriority: 2,
      error: 0.2,
    });
  assert.ok(out.stats.triangles < source.stats.triangles);
  assert.ok(out.stats.triangles > 0);
  assert.equal(out.stats.invalidPositions, 0);
  assert.deepEqual(mesh.geometry.attributes.position.array, before);
  assert.deepEqual(out.root.children[0].position.toArray(), [2, 3, -1]);
  assert.ok(out.root.children[0].geometry.attributes.uv);
  assert.notEqual(out.root.children[0].material, material);
  assert.equal(out.gameVerified, false);
});
test("Hundreds of source bones and their bind inverses survive conversion", async () => {
  const root = new THREE.Group(),
    g = new THREE.BoxGeometry(1, 2, 1, 3, 3, 3),
    n = g.attributes.position.count,
    skinIndex = new Uint16Array(n * 4),
    skinWeight = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) skinWeight[i * 4] = 1;
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(skinIndex, 4));
  g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(skinWeight, 4));
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshStandardMaterial()),
    bones = Array.from({ length: 320 }, (_, i) => {
      const b = new THREE.Bone();
      b.name = i === 0 ? "Hips" : `aux_${i}`;
      return b;
    });
  for (let i = 1; i < bones.length; i++) bones[0].add(bones[i]);
  mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones));
  root.add(mesh);
  root.updateMatrixWorld(true);
  const source = { root, stats: inspectScene(root), warnings: [] },
    out = await convertCharacter(source, {
      triangles: 50,
      headPriority: 2,
      error: 0.1,
    });
  const rig = analyzeSkeleton(out.root);
  assert.equal(rig.bones.length, 320);
  assert.equal(inspectWeights(out.root).invalid, 0);
  assert.equal(out.root.children[0].skeleton.boneInverses.length, 320);
  assert.ok(
    deformationProbe(out.root, rig).every((p) => p.finite && p.samples > 0),
  );
});
test("Pose diagnostics detect extreme skin stretching and restore source rotations", () => {
  const root = new THREE.Group(),
    g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 0.01, 0], 3),
  );
  g.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], 4),
  );
  g.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4),
  );
  const hips = new THREE.Bone(),
    arm = new THREE.Bone();
  hips.name = "Hips";
  arm.name = "LeftArm";
  hips.add(arm);
  const m = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial());
  m.add(hips);
  m.bind(new THREE.Skeleton([hips, arm]));
  root.add(m);
  root.updateMatrixWorld(true);
  const q = arm.quaternion.clone(),
    r = deformationProbe(root, analyzeSkeleton(root));
  assert.ok(r.some((p) => p.extremeEdges > 0 && p.maxEdgeStretch > 4));
  assert.ok(r.every((p) => p.checkedEdges > 0));
  assert.deepEqual(arm.quaternion.toArray(), q.toArray());
});
test("Interleaved position/UV buffers and normalized byte skin weights are read correctly", async () => {
  const root = new THREE.Group(),
    g = new THREE.BufferGeometry(),
    packed = new THREE.InterleavedBuffer(
      new Float32Array([0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
      5,
    );
  g.setAttribute(
    "position",
    new THREE.InterleavedBufferAttribute(packed, 3, 0),
  );
  g.setAttribute("uv", new THREE.InterleavedBufferAttribute(packed, 2, 3));
  g.setIndex([0, 1, 2]);
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial()),
    b = new THREE.Bone();
  b.name = "Hips";
  mesh.add(b);
  g.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(new Uint16Array(12), 4),
  );
  g.setAttribute(
    "skinWeight",
    new THREE.Uint8BufferAttribute(
      [255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0],
      4,
      true,
    ),
  );
  mesh.bind(new THREE.Skeleton([b]));
  root.add(mesh);
  root.updateMatrixWorld(true);
  assert.equal(inspectWeights(root).unnormalized, 0);
  const output = await convertCharacter(
    { root, stats: inspectScene(root), warnings: [] },
    { triangles: 3, headPriority: 2, error: 0.1 },
  );
  assert.equal(output.stats.triangles, 1);
  assert.equal(output.stats.invalidPositions, 0);
  assert.equal(inspectWeights(output.root).unnormalized, 0);
  assert.equal(output.root.children[0].geometry.attributes.uv.count, 3);
  assert.ok(g.attributes.position.isInterleavedBufferAttribute);
});

test("A legitimate multi-segment Mixamo spine is mapped to its base instead of rejected as an ambiguous rig", () => {
  const root = new THREE.Group(),
    hips = new THREE.Bone(),
    spine = new THREE.Bone(),
    upper = new THREE.Bone(),
    chest = new THREE.Bone();
  hips.name = "mixamorig:Hips";
  spine.name = "mixamorig:Spine";
  upper.name = "mixamorig:Spine1";
  chest.name = "Chest";
  root.add(hips);
  hips.add(spine);
  spine.add(upper);
  upper.add(chest);
  const report = analyzeSkeleton(root);
  assert.equal(report.mapping.spine, spine);
  assert.deepEqual(report.report.ambiguous, []);
});
test('Pose preview callback errors restore changed source quaternions',()=>{
 const root=new THREE.Group(),arm=new THREE.Bone();arm.name='LeftArm';root.add(arm);
 const saved=arm.quaternion.clone();
 assert.throws(()=>deformationProbe(root,analyzeSkeleton(root),()=>{throw Error('capture failure');}),/capture failure/);
 assert.deepEqual(arm.quaternion.toArray(),saved.toArray());
});
test('New surface topology honours persisted regional removal and preserves source',async()=>{
 const root=new THREE.Group(),mat=new THREE.MeshStandardMaterial();mat.name='Head';const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2,24,24),mat);mesh.name='FaceChart';root.add(mesh);root.updateMatrixWorld(true);
 const source={root,stats:inspectScene(root),warnings:[]};
 const settings={triangles:100,headPriority:2,error:.2,art:{preset:'authentic',reconstruction:'face',meshRoles:{FaceChart:'head'}}};
 const generated=await convertCharacter(source,settings);
 assert.ok(generated.report.some(p=>p.reconstruction.generatedVertices>0));
 const removed=await convertCharacter(source,{...settings,art:{...settings.art,corrections:{head:{remove:true}}}});
 assert.equal(removed.stats.triangles,0);assert.equal(inspectScene(root).triangles,1152);
});
