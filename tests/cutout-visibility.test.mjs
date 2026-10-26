import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { cutoutOpacityBound } from "../src/core/cutout-visibility.js";
import { materialSampler, triangleRecord } from "../src/core/surface.js";

test("A strict opacity upper bound proves every normalized alpha sample invisible under binary cutout", () => {
  const bytes = new Uint8Array([
      255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 255, 255, 255, 255,
    ]),
    texture = new THREE.DataTexture(bytes, 2, 2),
    material = new THREE.MeshBasicMaterial({
      map: texture,
      opacity: 0.08,
      transparent: true,
    });
  const proof = cutoutOpacityBound(material);
  assert.equal(proof.invisible, true);
  assert.equal(proof.maxAlpha, 0.08);
  const sample = materialSampler([material]);
  for (let y = 0; y < 4; y++)
    for (let x = 0; x < 4; x++) {
      const uv = new THREE.Vector2(x / 4, y / 4),
        triangle = triangleRecord(
          [
            new THREE.Vector3(),
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 1, 0),
          ],
          { material, uvs: [uv, uv, uv] },
        );
      assert.equal(
        sample({ triangle, barycentric: new THREE.Vector3(1, 0, 0) })[3],
        0,
      );
    }
  assert.deepEqual(texture.image.data, bytes);
});
test("Opacity at the cutoff is retained, including imported custom thresholds", () => {
  const material = new THREE.MeshBasicMaterial({
    opacity: 0.2,
    alphaTest: 0.2,
  });
  assert.equal(cutoutOpacityBound(material).invisible, false);
  material.opacity = 0.199;
  assert.equal(cutoutOpacityBound(material).invisible, true);
  material.opacity = 0.5;
  material.alphaTest = 0;
  assert.equal(cutoutOpacityBound(material).invisible, false);
});
test("Unknown float alpha ranges, missing images and malformed values retain geometry safely", () => {
  const material = new THREE.MeshBasicMaterial({
    opacity: 0.08,
    transparent: true,
    map: new THREE.DataTexture(
      new Float32Array([1, 1, 1, 100]),
      1,
      1,
      THREE.RGBAFormat,
      THREE.FloatType,
    ),
  });
  assert.equal(cutoutOpacityBound(material).invisible, false);
  material.map = new THREE.Texture();
  assert.equal(cutoutOpacityBound(material).invisible, false);
  material.map = null;
  material.opacity = NaN;
  assert.equal(cutoutOpacityBound(material).invisible, false);
  material.opacity = -0.1;
  assert.equal(cutoutOpacityBound(material).invisible, false);
});
test("Imported userData and names cannot forge a visibility proof for opaque geometry", () => {
  const material = new THREE.MeshBasicMaterial();
  material.name = "Invisible_Eyeshell";
  material.userData = {
    invisible: true,
    cutoutVisibility: { invisible: true },
  };
  assert.equal(cutoutOpacityBound(material).invisible, false);
});

test("Empty render primitives become transform containers without changing bone world transforms or child order", async () => {
  const { stripEmptyRenderMeshes } =
    await import("../src/core/cutout-visibility.js");
  const root = new THREE.Group(),
    before = new THREE.Object3D(),
    empty = new THREE.SkinnedMesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial(),
    ),
    after = new THREE.Object3D(),
    bone = new THREE.Bone(),
    child = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial(),
    );
  empty.geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([], 3),
  );
  empty.geometry.setIndex([]);
  empty.name = "rig-container";
  empty.position.set(1, 2, 3);
  empty.rotation.y = 0.4;
  bone.position.y = 0.3;
  empty.add(bone, child);
  root.add(before, empty, after);
  root.updateMatrixWorld(true);
  const matrix = bone.matrixWorld.toArray(),
    result = stripEmptyRenderMeshes(root);
  assert.equal(result.removed, 1);
  assert.equal(root.children[0], before);
  assert.equal(root.children[2], after);
  assert.equal(root.children[1].name, "rig-container");
  assert.ok(!root.children[1].isMesh);
  assert.deepEqual(bone.matrixWorld.toArray(), matrix);
  assert.equal(child.parent, root.children[1]);
});
test("Candidate optimization removes only proven cutout-invisible faces and keeps the original blended source intact", async () => {
  const { optimizeGameCandidate } =
      await import("../src/core/game-optimization.js"),
    { inspectScene } = await import("../src/core/importer.js");
  const root = new THREE.Group(),
    visible = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial(),
    ),
    soft = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial({ opacity: 0.08, transparent: true }),
    );
  soft.position.x = 2;
  root.add(visible, soft);
  const sourceTriangles = inspectScene(root).triangles,
    result = await optimizeGameCandidate(
      {
        root,
        stats: inspectScene(root),
        settings: { triangles: 900 },
        warnings: [],
        quality: {},
      },
      { triangles: 100 },
    );
  assert.equal(inspectScene(root).triangles, sourceTriangles);
  assert.equal(soft.material.opacity, 0.08);
  assert.equal(result.stats.triangles, 12);
  assert.equal(result.optimization.removedEmptyRenderNodes, 1);
  assert.equal(
    result.report
      .filter((r) => r.cutoutVisibility.invisible)
      .reduce((n, r) => n + r.before, 0),
    12,
  );
  assert.ok(
    result.report
      .filter((r) => r.cutoutVisibility.invisible)
      .every((r) => r.after === 0),
  );
  assert.equal(result.quality.integrity.unexpectedEdges, 0);
  assert.equal(result.gameVerified, false);
});
