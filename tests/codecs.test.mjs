import test from "node:test";
import assert from "node:assert/strict";
import {
  rgb555,
  rgba555,
  quantize,
  writeTIM,
  readTIM,
  writeARC,
  readARC,
} from "../src/core/ps1.js";
import {
  read3DMK,
  write3DMK,
  validateNativeGeometry,
  gameExportGate,
} from "../src/core/native.js";
export function donorFixture() {
  const b = new Uint8Array(8192),
    v = new DataView(b.buffer);
  v.setUint32(0, 27, true);
  v.setUint32(4, 100, true);
  v.setUint32(8, 0x4b4d4433, true);
  v.setUint32(16, 1536, true);
  return b;
}
export const part = {
  row: 1,
  positions: [
    [0, 0, 0],
    [0, 100, 0],
    [0, 0, 100],
  ],
  triangles: [[0, 1, 2]],
  uvs: [
    [0, 0],
    [64, 0],
    [0, 64],
  ],
  material: 64,
};
test("PS1 zero is transparent; opaque black never becomes transparent", () => {
  assert.equal(rgb555(0, 0, 0, 0), 0);
  assert.equal(rgb555(0, 0, 0, 255), 0x8000);
  assert.deepEqual(rgba555(0x8000), [0, 0, 0, 255]);
  assert.deepEqual(rgba555(31), [255, 0, 0, 255]);
});
for (const colors of [16, 256])
  test(`${colors}-color TIM round-trip checks actual pixels, CLUT and VRAM coordinates`, () => {
    const palette = new Uint16Array(colors);
    for (let i = 0; i < colors; i++) palette[i] = i;
    const width = 32,
      height = 8,
      indices = Uint8Array.from(
        { length: width * height },
        (_, i) => i % colors,
      );
    const out = readTIM(
      writeTIM({
        width,
        height,
        indices,
        palette,
        x: 12,
        y: 13,
        clutX: 16,
        clutY: 2,
      }),
    );
    assert.deepEqual(out.indices, indices);
    assert.deepEqual(out.palette, palette);
    assert.equal(out.x, 12);
    assert.equal(out.clutY, 2);
    assert.equal(out.width, width);
    assert.equal(out.height, height);
  });
test("TIM rejects truncated payload, invalid indices and unaligned images", () => {
  const data = {
    width: 4,
    height: 1,
    indices: new Uint8Array([0, 1, 2, 3]),
    palette: new Uint16Array(16),
  };
  const b = writeTIM(data);
  assert.throws(() => readTIM(b.slice(0, -1)), /size/);
  assert.throws(() => writeTIM({ ...data, width: 3 }), /dimensions/);
  assert.throws(
    () => writeTIM({ ...data, indices: new Uint8Array([0, 1, 2, 20]) }),
    /overflow/,
  );
});
test("Palette reduction deterministic, alpha holes preserved and full opaque red exact", () => {
  const data = new Uint8Array([
    255, 0, 0, 255, 0, 0, 0, 0, 0, 0, 0, 255, 255, 0, 0, 255,
  ]);
  const a = quantize(data, 16),
    b = quantize(data, 16);
  assert.deepEqual(a, b);
  assert.equal(a.indices[1], 0);
  assert.notEqual(a.indices[2], 0);
  assert.deepEqual([...a.rgba.slice(0, 4)], [255, 0, 0, 255]);
});
test("ARC roundtrip preserves binary entries and rejects overlapping ranges", () => {
  const entries = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])],
    b = writeARC(entries);
  assert.deepEqual(readARC(b), entries);
  const corrupt = b.slice();
  new DataView(corrupt.buffer).setUint32(12, 20, true);
  assert.throws(() => readARC(corrupt), /Overlapping/);
  assert.throws(() => readARC(new Uint8Array([255, 255, 255, 255])), /table/);
});
test("3DMK writer writes native headers, preceding-row vertex pointer and relocations", () => {
  const result = write3DMK({
    donor: donorFixture(),
    parts: [part],
    maxBytes: 8192,
  });
  const d = read3DMK(result.model);
  assert.equal(d.rows[1][10], 1);
  assert.ok(d.rows[0][12] >= 1536);
  assert.equal(result.packetBytes, 32);
  assert.deepEqual(validateNativeGeometry(result.model), {
    triangles: 1,
    vertices: 3,
    packetBytes: 32,
    rows: 27,
  });
  const v = new DataView(result.relocations.buffer);
  for (let i = 0; i < result.relocations.length; i += 4) {
    const at = v.getUint32(i, true),
      pointer = new DataView(result.model.buffer).getUint32(at, true);
    assert.ok(pointer >= 1536 && pointer < result.model.length);
  }
  assert.notEqual(new TextDecoder().decode(result.model.slice(0, 4)), "glTF");
});
test("Native writer enforces donor size, GPU packet and signed coordinate budgets", () => {
  const donor = donorFixture();
  assert.throws(
    () => write3DMK({ donor, parts: [part], maxBytes: 1536 }),
    /slot/,
  );
  assert.throws(
    () =>
      write3DMK({ donor, parts: [part], maxBytes: 8192, maxPacketBytes: 31 }),
    /GPU/,
  );
  assert.throws(
    () =>
      write3DMK({
        donor,
        parts: [
          {
            ...part,
            positions: [
              [40000, 0, 0],
              [0, 1, 0],
              [0, 0, 1],
            ],
          },
        ],
        maxBytes: 8192,
      }),
    /s16/,
  );
});
test("Native validator catches primitive references outside the vertex list", () => {
  const r = write3DMK({ donor: donorFixture(), parts: [part], maxBytes: 8192 }),
    d = read3DMK(r.model);
  new DataView(r.model.buffer).setUint32(d.rows[1][1] + 4, 127 * 4, true);
  assert.throws(() => validateNativeGeometry(r.model), /outside/);
});
test("Native writer rejects degenerate triangles and slot/UV overflow", () => {
  const donor = donorFixture();
  assert.throws(
    () =>
      write3DMK({
        donor,
        parts: [
          {
            ...part,
            positions: [
              [0, 0, 0],
              [0, 0, 0],
              [0, 0, 0],
            ],
          },
        ],
        maxBytes: 8192,
      }),
    /Degenerate/,
  );
  assert.throws(
    () =>
      write3DMK({
        donor,
        parts: [{ ...part, positions: Array(129).fill([0, 0, 0]) }],
        maxBytes: 8192,
      }),
    /128/,
  );
  assert.throws(
    () =>
      write3DMK({
        donor,
        parts: [{ ...part, uvs: [[300, 0]] }],
        maxBytes: 8192,
      }),
    /UV/,
  );
});
test("Absent calibration, runtime and game tests never pass the export gate", () => {
  const gate = gameExportGate({ donor: donorFixture() });
  assert.equal(gate.ready, false);
  assert.equal(gate.errors.length, 3);
});
