import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  bakeMaterialDetail,
  tangentNormal,
} from "../src/core/material-bake.js";
import { triangleRecord, materialSampler } from "../src/core/surface.js";
const record = () =>
  triangleRecord(
    [
      new THREE.Vector3(),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
    ],
    {
      uvs: [
        new THREE.Vector2(),
        new THREE.Vector2(1, 0),
        new THREE.Vector2(0, 1),
      ],
    },
  );
test("UV-derived tangent normal respects surface orientation and mirrored UV handedness", () => {
  const t = record(),
    normal = tangentNormal(t, [255, 127.5, 127.5]);
  assert.ok(normal.distanceTo(new THREE.Vector3(1, 0, 0)) < 1e-8);
  t.uvs = [
    new THREE.Vector2(),
    new THREE.Vector2(-1, 0),
    new THREE.Vector2(0, 1),
  ];
  assert.ok(tangentNormal(t, [255, 127.5, 127.5]).x < -0.99);
});
test("Static detail bake responds to normal, roughness and metal inputs and keeps finite display colors", () => {
  const args = {
      base: [0.7, 0.5, 0.3],
      geometricNormal: new THREE.Vector3(0, 0, 1),
      light: new THREE.Vector3(0, 0, 1),
      view: new THREE.Vector3(0, 0, 1),
    },
    flat = bakeMaterialDetail(args),
    tilted = bakeMaterialDetail({
      ...args,
      mappedNormal: new THREE.Vector3(1, 0, 0),
    }),
    metal = bakeMaterialDetail({ ...args, metalness: 1, roughness: 0.8 });
  assert.ok(tilted[0] < flat[0]);
  assert.notDeepEqual(flat, metal);
  assert.ok(
    [...flat, ...tilted, ...metal].every(
      (v) => Number.isFinite(v) && v >= 0 && v <= 1,
    ),
  );
});
test("Actual material texture channels drive detail baking; default albedo mode remains unlit", () => {
  const texture = (values) => {
      const t = new THREE.DataTexture(
        new Uint8Array(values),
        1,
        1,
        THREE.RGBAFormat,
      );
      return t;
    },
    m = new THREE.MeshStandardMaterial({ color: 0x808080 });
  m.normalMap = texture([255, 128, 128, 255]);
  m.metalnessMap = texture([0, 0, 255, 255]);
  m.roughnessMap = texture([0, 64, 0, 255]);
  m.metalness = 0.7;
  const t = record();
  t.material = m;
  const hit = { triangle: t, barycentric: new THREE.Vector3(0.2, 0.3, 0.5) },
    albedo = materialSampler(new Set([m]))(hit),
    baked = materialSampler(new Set([m]), { mode: "static-detail" })(hit);
  assert.ok(Math.abs(albedo[0] - 128) < 1);
  assert.notDeepEqual(albedo, baked);
  assert.equal(baked[3], 255);
});
