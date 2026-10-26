import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { MeshoptSimplifier } from "meshoptimizer";
import { reduceBodySurface } from "../src/core/body-surface.js";
import { reduceSourceLimb } from "../src/core/source-chart-reduction.js";
import {
  uvChartLabels,
  mixedUVSheetTriangles,
} from "../src/core/surface-components.js";

test("Overlapping source clothing sheets with nearby UVs cannot become mixed-color triangles during limb reconstruction", async () => {
  await MeshoptSimplifier.ready;
  const a = new THREE.PlaneGeometry(0.5, 1, 10, 10).translate(-0.25, 0, 0),
    b = new THREE.PlaneGeometry(0.5, 1, 10, 10);
  for (const [g, offset] of [
    [a, 0],
    [b, 0.051],
  ])
    for (let v = 0; v < g.attributes.uv.count; v++)
      g.attributes.uv.setX(v, g.attributes.uv.getX(v) * 0.05 + offset);
  const g = mergeGeometries([a, b]),
    before = g.toJSON(),
    charts = uvChartLabels(g),
    plain = reduceBodySurface(g, "leftLowerArm", MeshoptSimplifier, {
      target: 24,
    }),
    r = reduceSourceLimb(g, "leftLowerArm", MeshoptSimplifier, { target: 24 });
  assert.equal(charts.count, 2);
  assert.ok(mixedUVSheetTriangles(plain.indices, charts) > 0);
  assert.equal(r.sourceUVChartValidation.retried, true);
  assert.equal(r.sourceUVChartValidation.finalMixedTriangles, 0);
  assert.equal(r.sourceUVChartValidation.fallback, false);
  assert.equal(mixedUVSheetTriangles(r.indices, charts), 0);
  assert.ok(r.indices.length < g.index.count);
  assert.equal(r.integrity.unexpectedOpenEdges, 0);
  assert.deepEqual(
    g.toJSON(),
    before,
    "No positions, UVs, weights or original connectivity welded or overwritten",
  );
});
test("Already valid source UV topology uses exactly one reduction and retains the established result", async () => {
  await MeshoptSimplifier.ready;
  const g = new THREE.PlaneGeometry(1, 1, 12, 12),
    plain = reduceBodySurface(g, "leftUpperArm", MeshoptSimplifier, {
      target: 100,
    });
  let calls = 0;
  const simplifier = {
    simplifyWithAttributes(...args) {
      calls++;
      return MeshoptSimplifier.simplifyWithAttributes(...args);
    },
  };
  const r = reduceSourceLimb(g, "leftUpperArm", simplifier, { target: 100 });
  assert.equal(calls, 1);
  assert.equal(r.sourceUVChartValidation.retried, false);
  assert.equal(r.sourceUVChartValidation.finalMixedTriangles, 0);
  assert.deepEqual(r.indices, plain.indices);
  assert.equal(r.error, plain.error);
});
