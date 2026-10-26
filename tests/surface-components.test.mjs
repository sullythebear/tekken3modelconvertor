import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { edgeConnectedSurfaces } from "../src/core/surface-components.js";

test("Measured shared edges connect UV-split faces without welding their attributes", () => {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
      3,
    ),
  );
  g.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1], 2),
  );
  g.setIndex([0, 1, 2, 3, 4, 5]);
  const before = g.toJSON();
  assert.deepEqual(edgeConnectedSurfaces(g), [[0, 1, 2, 3, 4, 5]]);
  assert.deepEqual(g.toJSON(), before);
});
test("A point contact and a detached accessory remain separate surfaces", () => {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [
        0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 4, 0, 0, 5, 0, 0,
        4, 1, 0,
      ],
      3,
    ),
  );
  g.setIndex([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  assert.deepEqual(edgeConnectedSurfaces(g), [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
  ]);
});
