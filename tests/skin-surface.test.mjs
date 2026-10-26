import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  prepareSkinFields,
  sourceSkinLighting,
  copySkinField,
  sourceDiffuse,
  sourceSkinCoverage,
} from "../src/core/skin-surface.js";
import {
  handDiagnosticChannels,
  deformationProbe,
} from "../src/core/skeleton.js";
function field(normal) {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
  );
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
  g.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute([...normal, ...normal, ...normal], 3),
  );
  const material = new THREE.MeshBasicMaterial();
  material.userData.t3csSkinSurface = true;
  const mesh = new THREE.Mesh(g, material);
  mesh.updateMatrixWorld();
  prepareSkinFields(
    [
      {
        g,
        mesh,
        material,
        indices: [0, 1, 2],
        uvCrop: { minU: 0, minV: 0, spanU: 1, spanV: 1 },
      },
    ],
    { size: 16 },
  );
  return material;
}
test("Skin diffuse variation is driven by the measured source surface normal, without random noise", () => {
  const front = field([0, 0, 1]),
    back = field([0, 0, -1]);
  assert.ok(
    sourceSkinLighting(front, 0.2, 0.2) > sourceSkinLighting(back, 0.2, 0.2),
  );
  assert.equal(
    sourceSkinLighting(front, 0.2, 0.2),
    sourceSkinLighting(front, 0.2, 0.2),
  );
  assert.ok(front.userData.t3csSkinBake.measuredTexels > 0);
  assert.equal(sourceSkinLighting(new THREE.MeshBasicMaterial(), 0.2, 0.2), 1);
});
test("Skin source-lighting fields survive candidate material clones without serialized float buffers", () => {
  const source = field([0, 0, 1]),
    copy = source.clone();
  copySkinField(source, copy);
  assert.equal(
    sourceSkinLighting(source, 0.2, 0.2),
    sourceSkinLighting(copy, 0.2, 0.2),
  );
  assert.ok(JSON.stringify(copy.userData).length < 500);
});
test("Structural finger diagnostic uses unnamed chains, respects source pose and restores quaternions", () => {
  const root = new THREE.Group(),
    hand = new THREE.Bone();
  root.add(hand);
  const bones = [];
  for (let i = 0; i < 5; i++) {
    const a = new THREE.Bone(),
      b = new THREE.Bone(),
      c = new THREE.Bone();
    a.position.set(i * 0.02, 0.02, 0);
    b.position.y = 0.02;
    c.position.y = 0.02;
    a.add(b);
    b.add(c);
    hand.add(a);
    a.rotation.x = 0.4;
    bones.push(a, b, c);
  }
  root.updateMatrixWorld(true);
  const analysis = { mapping: { leftHand: hand } },
    before = bones.map((b) => b.quaternion.toArray()),
    channels = handDiagnosticChannels(analysis);
  assert.equal(channels.length, 10);
  let observed = false;
  deformationProbe(
    root,
    analysis,
    (pose) => {
      if (pose === "hand-flex") {
        observed = true;
        assert.notDeepEqual(bones[0].quaternion.toArray(), before[0]);
      }
    },
    { extended: true },
  );
  assert.ok(observed);
  assert.deepEqual(
    bones.map((b) => b.quaternion.toArray()),
    before,
  );
});

test("Invalid source normals preserve albedo instead of baking NaNs or black skin", () => {
  assert.equal(sourceDiffuse(new THREE.Vector3(NaN, 0, 1)), 1);
  assert.equal(sourceDiffuse(new THREE.Vector3()), 1);
  assert.equal(sourceSkinLighting(field([NaN, 0, 1]), 0.2, 0.2), 1);
});

test("Full-influence GPU material configuration preserves the actual transient skin field", async () => {
  const { configureSkinning } = await import("../src/core/skinning.js");
  const material = field([0, 0, -1]),
    before = sourceSkinLighting(material, 0.2, 0.2);
  assert.ok(before < 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
  );
  g.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute(new Uint16Array(12), 4),
  );
  g.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(
      [0.75, 0, 0, 0, 0.75, 0, 0, 0, 0.75, 0, 0, 0],
      4,
    ),
  );
  g.setAttribute(
    "joints_1",
    new THREE.Uint16BufferAttribute(new Uint16Array(12), 4),
  );
  g.setAttribute(
    "weights_1",
    new THREE.Float32BufferAttribute(
      [0.25, 0, 0, 0, 0.25, 0, 0, 0, 0.25, 0, 0, 0],
      4,
    ),
  );
  const mesh = new THREE.SkinnedMesh(g, material),
    bone = new THREE.Bone();
  mesh.add(bone);
  mesh.bind(new THREE.Skeleton([bone]));
  for (let i = 0; i < 3; i++) {
    configureSkinning(mesh);
    assert.notEqual(mesh.material, material);
    assert.equal(sourceSkinLighting(mesh.material, 0.2, 0.2), before);
    assert.ok(JSON.stringify(mesh.material.userData).length < 500);
  }
});

test("Measured source UV coverage excludes unused cloth atlas regions and survives material clones without publishing arrays", () => {
  const m = field([0, 0, 1]),
    before = JSON.stringify(m.userData),
    coverage = sourceSkinCoverage(m, 32, 16, 2);
  assert.ok(coverage.valid.reduce((a, b) => a + b, 0) > 20);
  assert.equal(coverage.valid[0], 0);
  assert.equal(coverage.valid[31], 0);
  assert.equal(coverage.valid[2 * 32 + 29], 0);
  assert.ok(coverage.valid[10 * 32 + 4]);
  const clone = m.clone();
  copySkinField(m, clone);
  assert.deepEqual(sourceSkinCoverage(clone, 32, 16, 2).valid, coverage.valid);
  assert.equal(JSON.stringify(m.userData), before);
  assert.equal(sourceSkinCoverage(new THREE.MeshBasicMaterial(), 32, 16), null);
});

test("Subpixel source skin charts seed their actual UV centroid rather than a neighboring atlas pixel", () => {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
  );
  g.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3),
  );
  g.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([0.2, 0.3, 0.2, 0.3, 0.2, 0.3], 2),
  );
  const material = new THREE.MeshBasicMaterial();
  material.userData.t3csSkinSurface = true;
  const mesh = new THREE.Mesh(g, material);
  mesh.updateMatrixWorld();
  prepareSkinFields(
    [
      {
        g,
        mesh,
        material,
        indices: [0, 1, 2],
        uvCrop: { minU: 0, minV: 0, spanU: 1, spanV: 1 },
      },
    ],
    { size: 16 },
  );
  const c = sourceSkinCoverage(material, 16, 16);
  assert.equal(
    c.valid.reduce((a, b) => a + b, 0),
    1,
  );
  assert.equal(c.seeds.size, 1);
  const seed = [...c.seeds.values()][0];
  assert.ok(Math.abs(seed.u - 0.2) < 1e-6 && Math.abs(seed.v - 0.3) < 1e-6);
  assert.equal(sourceSkinLighting(material, 0.2, 0.3), 1);
});
test("Wrapped or invalid skin UVs retain the reliable sampler instead of inventing coverage", () => {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3),
  );
  g.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3),
  );
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 2, 0, 0, 1], 2));
  const material = new THREE.MeshBasicMaterial();
  material.userData.t3csSkinSurface = true;
  const mesh = new THREE.Mesh(g, material);
  mesh.updateMatrixWorld();
  prepareSkinFields(
    [
      {
        g,
        mesh,
        material,
        indices: [0, 1, 2],
        uvCrop: { minU: 0, minV: 0, spanU: 1, spanV: 1 },
      },
    ],
    { size: 16 },
  );
  assert.equal(sourceSkinCoverage(material, 32, 32), null);
});
