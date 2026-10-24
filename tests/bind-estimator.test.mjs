import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { write3DMK } from "../src/core/native.js";
import { decodeDonor } from "../src/core/donor.js";
import { estimateDonorBind } from "../src/core/bind-estimator.js";
function fieldGroup(bytes, row, group, fields) {
  const d = decodeDonor(bytes),
    list = d.rows.find((r) => r.row === row).list,
    start = list.own.at(-1).offset + 8 + group * 4,
    extra = Math.ceil(fields.length / 3) * 4,
    out = new Uint8Array(bytes.length + extra);
  out.set(bytes.slice(0, start + 4));
  out.set(bytes.slice(start + 4), start + 4 + extra);
  const v = new DataView(out.buffer);
  v.setUint32(start, fields.length, true);
  for (let i = 0; i < fields.length; i++)
    v.setUint32(
      start + 4 + Math.floor(i / 3) * 4,
      v.getUint32(start + 4 + Math.floor(i / 3) * 4, true) |
        (fields[i] << (9 * (i % 3))),
      true,
    );
  for (let r = 0; r < 27; r++)
    for (const k of [0, 1, 2, 12, 13]) {
      const p = 24 + r * 56 + k * 4,
        o = v.getInt32(p, true);
      if (o >= start + 4) v.setInt32(p, o + extra, true);
    }
  return out;
}
test("Automatic bind estimator reduces three independent seam-copy errors without claiming runtime validation", async () => {
  const donor = new Uint8Array(16000),
    v = new DataView(donor.buffer);
  v.setUint32(0, 27, true);
  v.setUint32(4, 100, true);
  v.setUint32(8, 0x4b4d4433, true);
  v.setUint32(16, 1536, true);
  const basis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(1, 0, 0),
    ),
    pelvis = new THREE.Matrix4()
      .makeBasis(
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(-1, 0, 0),
      )
      .multiply(new THREE.Matrix4().makeRotationX(0.4)),
    points = [
      [10, 0, 0],
      [0, 20, 0],
      [0, 0, 30],
    ],
    other = points.map((p) =>
      new THREE.Vector3()
        .fromArray(p)
        .applyMatrix4(basis)
        .applyMatrix4(pelvis.clone().invert())
        .toArray()
        .map(Math.round),
    ),
    base = {
      triangles: [[0, 1, 2]],
      uvs: [
        [0, 0],
        [15, 0],
        [0, 15],
      ],
      material: 64,
    };
  let bytes = write3DMK({
    donor,
    parts: [
      { ...base, row: 1, positions: points },
      { ...base, row: 3, positions: other },
    ],
    maxBytes: 16000,
  }).model;
  bytes = fieldGroup(bytes, 1, 3, [0, 2, 4]);
  bytes = fieldGroup(bytes, 3, 0, [256, 258, 260]);
  const profile = await estimateDonorBind(decodeDonor(bytes));
  assert.equal(profile.estimation.constraints, 3);
  assert.ok(
    profile.estimation.after.rms < profile.estimation.before.rms * 0.15,
  );
  assert.equal(profile.estimation.gameVerified, false);
  assert.match(profile.provenance, /ESTIMATE/);
});
