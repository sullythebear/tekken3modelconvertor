import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  decodeDonor,
  evaluateTerms,
  decodeTextureArchive,
  materialTexel,
} from "../src/core/donor.js";
import { write3DMK } from "../src/core/native.js";
import { writeTIM, writeARC } from "../src/core/ps1.js";
export function stockFixture() {
  const b = new Uint8Array(16384),
    v = new DataView(b.buffer);
  v.setUint32(0, 27, true);
  v.setUint32(4, 100, true);
  v.setUint32(8, 0x4b4d4433, true);
  v.setUint32(16, 1536, true);
  return b;
}
export function simpleDonor() {
  return write3DMK({
    donor: stockFixture(),
    parts: [
      {
        row: 1,
        positions: [
          [4, 0, 0],
          [0, 10, 0],
          [0, 0, 10],
        ],
        triangles: [[0, 1, 2]],
        uvs: [
          [0, 0],
          [15, 0],
          [0, 15],
        ],
        material: 64,
      },
      {
        row: 3,
        positions: [
          [8, 0, 0],
          [0, -10, 0],
          [0, 0, -10],
        ],
        triangles: [[0, 1, 2]],
        uvs: [
          [0, 0],
          [15, 0],
          [0, 15],
        ],
        material: 64,
      },
    ],
    maxBytes: 16384,
  }).model;
}
// Binary fixture transformation: insert one packed nine-bit field into one empty tail group.
function addTail(bytes, row, group, field) {
  const model = decodeDonor(bytes),
    list = model.rows.find((r) => r.row === row).list,
    start = list.own.at(-1).offset + 8 + group * 4,
    insert = start + 4,
    out = new Uint8Array(bytes.length + 4);
  out.set(bytes.slice(0, insert));
  out.set(bytes.slice(insert), insert + 4);
  const v = new DataView(out.buffer);
  v.setUint32(start, 1, true);
  v.setUint32(insert, field, true);
  for (let r = 0; r < 27; r++)
    for (const k of [0, 1, 2, 12, 13]) {
      const p = 24 + r * 56 + k * 4,
        o = v.getInt32(p, true);
      if (o >= insert) v.setInt32(p, o + 4, true);
    }
  if (v.getUint32(20, true) >= insert)
    v.setUint32(20, v.getUint32(20, true) + 4, true);
  return out;
}
test("Native donor decoder recovers own vertices, polygon materials and exact UV corners", () => {
  const d = decodeDonor(simpleDonor());
  assert.equal(d.rows.length, 2);
  assert.equal(d.report.triangles, 2);
  assert.equal(d.report.ownVertices, 6);
  assert.deepEqual(
    d.rows[0].list.own.map((v) => v.position),
    [
      [4, 0, 0],
      [0, 10, 0],
      [0, 0, 10],
    ],
  );
  assert.deepEqual(d.rows[0].polygons[0].uvs, [
    [0, 0],
    [15, 0],
    [0, 15],
  ]);
  assert.equal(d.rows[0].polygons[0].material, 64);
});
test("Half-cache deposits and joint blending produce normalized source provenance and correct coordinates", () => {
  let b = addTail(simpleDonor(), 1, 3, 256);
  b = addTail(b, 3, 0, 256);
  const d = decodeDonor(b),
    p = d.rows[1].polygons[0].vertices[0],
    frames = { 1: new THREE.Matrix4(), 3: new THREE.Matrix4() };
  assert.equal(
    p.reduce((s, t) => s + t.weight, 0),
    1,
  );
  assert.equal(evaluateTerms(p, frames).x, 6);
  assert.equal(d.constraints.length, 1);
  assert.equal(
    d.constraints[0].b.reduce((n, t) => n + t.weight, 0),
    1,
  );
});
test("Decoder fails closed on unresolved cache references and invalid UVs", () => {
  assert.throws(
    () => decodeDonor(addTail(simpleDonor(), 3, 0, 256)),
    /empty native cache/,
  );
  const b = simpleDonor(),
    d = decodeDonor(b),
    v = new DataView(b.buffer),
    row = d.model.rows[1],
    uv = row[2];
  b[uv + 4 + 2 + 3 * 2 + 1 + 1] = 200;
  assert.throws(() => decodeDonor(b), /UV index/);
});
test("Donor ARC decoding preserves nontexture entries and identifies CLUT/page correctly", () => {
  const palette = new Uint16Array(16);
  palette[1] = 31;
  const tim = writeTIM({
      width: 16,
      height: 16,
      indices: new Uint8Array(256).fill(1),
      palette,
      clutX: 0,
      clutY: 1,
    }),
    other = new Uint8Array([99, 34, 5]);
  const arc = decodeTextureArchive(writeARC([other, tim]));
  assert.deepEqual(arc.entries[0], other);
  assert.deepEqual(materialTexel(arc, 64, 7, 8).color, [255, 0, 0, 255]);
  assert.throws(() => materialTexel(arc, 65, 7, 8), /Missing/);
});
