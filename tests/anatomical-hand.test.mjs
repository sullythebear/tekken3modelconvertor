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
