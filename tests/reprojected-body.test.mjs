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
