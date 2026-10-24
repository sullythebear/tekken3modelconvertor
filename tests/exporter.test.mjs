import test from "node:test";
import assert from "node:assert/strict";
import { write3DMK } from "../src/core/native.js";
import {
  writeT3CM,
  readT3CM,
  buildNativeCandidate,
} from "../src/core/exporter.js";
import { writeTIM } from "../src/core/ps1.js";
function donor() {
  const b = new Uint8Array(8192),
    v = new DataView(b.buffer);
  v.setUint32(0, 27, true);
  v.setUint32(4, 100, true);
  v.setUint32(8, 0x4b4d4433, true);
  v.setUint32(16, 1536, true);
  return b;
}
const parts = [
  {
    row: 19,
    positions: [
      [0, 0, 0],
      [100, 0, 0],
      [0, 100, 0],
    ],
    triangles: [[0, 1, 2]],
    uvs: [
      [0, 0],
      [15, 0],
      [0, 15],
    ],
    material: 64,
  },
];
function texture(clutX = 0, x = 0) {
  const p = new Uint16Array(16);
  p[1] = 31;
  return writeTIM({
    width: 16,
    height: 16,
    indices: new Uint8Array(256).fill(1),
    palette: p,
    clutX,
    clutY: 1,
    x,
  });
}
test("Native candidate serializes actual 3DMK and T3CM/T3TX, with correct texture-band indices", () => {
  const r = buildNativeCandidate({
      donor: donor(),
      modelId: 10,
      parts,
      textureTiles: [texture()],
      maxBytes: 8192,
    }),
    parsed = readT3CM(r.container.bytes);
  assert.equal(parsed.version, 2);
  assert.equal(parsed.modelId, 10);
  assert.deepEqual(parsed.model, r.native.model);
  assert.deepEqual(parsed.relocations, r.native.relocations);
  assert.equal(parsed.texture.band[0], 0x11);
  assert.equal(parsed.texture.band[1], 0x11);
  assert.equal(parsed.texture.band[8], 0);
  assert.equal(parsed.texture.runs[0].id, 64);
  assert.equal(r.manifest.gameCompatible, false);
});
test("T3CM rejects malformed lengths, outside relocations and overlapping texture tiles", () => {
  const native = write3DMK({ donor: donor(), parts, maxBytes: 8192 });
  assert.throws(
    () =>
      writeT3CM({
        donor: donor(),
        modelId: 10,
        native,
        textureTiles: [texture(), texture(16)],
      }),
    /Overlapping/,
  );
  const bytes = writeT3CM({ donor: donor(), modelId: 10, native }).bytes;
  assert.throws(() => readT3CM(bytes.slice(0, -1)), /sizes/);
  const relocations = new Uint8Array(4);
  new DataView(relocations.buffer).setUint32(0, 500000, true);
  assert.throws(
    () =>
      writeT3CM({
        donor: donor(),
        modelId: 10,
        native: { ...native, relocations },
      }),
    /Relocation/,
  );
});
test('T3TX packs an 8-bit face and 4-bit clothing with shared palettes without truncating colors', () => {
  const palette = new Uint16Array(256); palette[200] = 0x7c1f;
  const face = writeTIM({width:16,height:16,indices:new Uint8Array(256).fill(200),palette,clutX:0,clutY:0,x:0});
  const native = write3DMK({donor:donor(),parts,maxBytes:8192});
  const parsed = readT3CM(writeT3CM({donor:donor(),modelId:10,native,textureTiles:[face,texture(0,8),texture(0,12)]}).bytes);
  assert.equal(parsed.texture.runs.length,2);
  assert.equal(parsed.texture.runs[0].id,0);
  assert.equal(parsed.texture.runs[0].colors.length,512);
  assert.equal(new DataView(parsed.texture.runs[0].colors.buffer).getUint16(400,true),0x7c1f);
  assert.equal(parsed.texture.band[0],200);
  assert.equal(parsed.texture.band[1],200);
  assert.equal(parsed.texture.band[16],0x11);
  assert.equal(parsed.texture.band[24],0x11);
});
test('T3CM requires a complete relocation set and rejects conflicting shared palette data', () => {
  const native = write3DMK({donor:donor(),parts,maxBytes:8192});
  assert.throws(()=>writeT3CM({donor:donor(),modelId:10,native:{...native,relocations:native.relocations.slice(4)}}),/every native pointer/);
  const palette=new Uint16Array(16);palette[1]=123;
  const conflict=writeTIM({width:16,height:16,indices:new Uint8Array(256).fill(1),palette,clutX:0,clutY:1,x:4});
  assert.throws(()=>writeT3CM({donor:donor(),modelId:10,native,textureTiles:[texture(),conflict]}),/Conflicting/);
});
test('Expanded container refuses uncovered UVs and missing palette allocations', () => {
  const native = write3DMK({donor:donor(),parts,maxBytes:8192});
  assert.throws(()=>writeT3CM({donor:donor(),modelId:10,native,textureTiles:[texture(0,8)]}),/UV points outside/);
  assert.throws(()=>writeT3CM({donor:donor(),modelId:10,native,textureTiles:[texture(16,0)]}),/matching exported CLUT/);
});
