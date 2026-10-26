import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  edgeConnectedSurfaces,
  uvChartLabels,
  optimizationSheetIds,
} from "../src/core/surface-components.js";

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
  assert.equal(
    edgeConnectedSurfaces(g, g.index.array, { respectUV: true }).length,
    2,
  );
  assert.equal(uvChartLabels(g).count, 2);
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

test('Optimization preserves source UV sheets but releases replaced physical UV charts without merging materials',()=>{
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,0,1,0,1,0,0,1,1,0,0,1,0],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1,0,1,1],2));g.setIndex([0,1,2,3,4,5]);const source=optimizationSheetIds(g,[2,2,2,2,2,2],Array(6).fill(false));assert.equal(source.count,2);assert.notEqual(source.labels[0],source.labels[3]);const rebaked=optimizationSheetIds(g,[2,2,2,2,2,2],Array(6).fill(true));assert.equal(rebaked.count,1);const materials=optimizationSheetIds(g,[2,2,2,3,3,3],Array(6).fill(true));assert.equal(materials.count,2);
});
