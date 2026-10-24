// Native 27-row 3DMK codec. Format facts: docs/FORMAT_RESEARCH.md.
// The writer accepts BONE-LOCAL, game-calibrated data. It never guesses a bind pose.
const HEADER = 1536,
  PTR = [0, 1, 2, 12, 13];
function check(ok, msg) {
  if (!ok) throw Error(msg);
}
class Writer {
  constructor() {
    this.bytes = [];
  }
  u8(n) {
    this.bytes.push(n & 255);
  }
  u16(n) {
    this.u8(n);
    this.u8(n >> 8);
  }
  u32(n) {
    this.u16(n);
    this.u16(n >>> 16);
  }
  s16(n) {
    check(Number.isFinite(n) && n >= -32768 && n <= 32767, "s16 overflow");
    this.u16(Math.round(n));
  }
  pad() {
    while (this.bytes.length % 4) this.u8(0);
  }
  done() {
    return new Uint8Array(this.bytes);
  }
}
export function read3DMK(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input);
  check(b.length >= HEADER, "Truncated 3DMK header");
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  check(v.getUint32(0, true) === 27, "Expected 27 PS1 rows");
  check(v.getUint32(8, true) === 0x4b4d4433, "Missing 3DMK magic");
  check(v.getUint32(16, true) === HEADER, "Unexpected header size");
  const rows = Array.from({ length: 27 }, (_, r) =>
    Array.from({ length: 14 }, (_, k) => v.getInt32(24 + r * 56 + k * 4, true)),
  );
  const pointers = [16];
  for (let r = 0; r < 27; r++)
    for (const k of PTR) {
      const p = rows[r][k];
      if (p > 2) {
        check(
          p >= HEADER && p < b.length && p % 4 === 0,
          `Invalid pointer row ${r} word ${k}`,
        );
        pointers.push(24 + r * 56 + k * 4);
      }
    }
  // Header pointers are exposed here. Complete pointer-only hand tables are validated
  // by nativeRelocations() in native-rebuild.js before native container export.
  return {
    bytes: b,
    rows,
    scale: v.getUint32(4, true),
    header: b.slice(0, HEADER),
    pointers,
    hasHandTables: rows.some((r) => r[13] > 2),
    slotBytes: b.length,
  };
}
function listBlock(values, isNormal = false) {
  const w = new Writer();
  w.u32(4);
  w.u32(0);
  w.u32(0);
  w.u32(values.length);
  for (const p of values) {
    for (let k = 0; k < 3; k++) w.s16(p[k]);
    w.s16(0);
  }
  for (let i = 0; i < (isNormal ? 2 : 6); i++) w.u32(0);
  return w.done();
}
export function write3DMK({ donor, parts, maxBytes, maxPacketBytes = 31000 }) {
  const stock = read3DMK(donor);
  check(
    Number.isInteger(maxBytes) && maxBytes <= stock.slotBytes,
    "Use measured donor slot capacity",
  );
  const rows = stock.rows.map((r) => {
      const a = [...r];
      for (const k of PTR) a[k] = 0;
      a[10] = 0;
      return a;
    }),
    blocks = [],
    relocations = [16];
  let size = HEADER,
    packets = 0;
  const add = (r, k, b) => {
    while (size % 4) size++;
    rows[r][k] = size;
    relocations.push(24 + r * 56 + k * 4);
    blocks.push({ offset: size, bytes: b });
    size += b.length;
  };
  const seen = new Set();
  for (const part of parts) {
    const { row, positions, triangles, uvs, material = 64 } = part;
    check(
      Number.isInteger(row) && row >= 1 && row <= 26 && !seen.has(row),
      "Invalid/duplicate row",
    );
    seen.add(row);
    check(
      positions.length > 0 && positions.length <= 128,
      "Native vertex-list limit is 128",
    );
    check(
      triangles.length > 0 && triangles.length <= 128,
      "Flat normal-list limit is 128",
    );
    check(uvs.length <= 255, "UV-table limit is 255");
    check(material >= 0 && material <= 65535, "Material overflow");
    const normals = triangles.map((t) => {
      check(
        t.length === 3 &&
          t.every((i) => Number.isInteger(i) && i >= 0 && i < positions.length),
        "Invalid primitive indices",
      );
      const [a, b, c] = t.map((i) => positions[i]),
        u = b.map((n, k) => n - a[k]),
        v = c.map((n, k) => n - a[k]);
      const n = [
          u[1] * v[2] - u[2] * v[1],
          u[2] * v[0] - u[0] * v[2],
          u[0] * v[1] - u[1] * v[0],
        ],
        length = Math.hypot(...n);
      check(length > 1e-6, "Degenerate native triangle");
      return n.map((v) => (-v / length) * 4096);
    });
    add(row, 0, listBlock(normals, true));
    const poly = new Writer();
    poly.u32(triangles.length);
    triangles.forEach((t, i) => {
      poly.u32((t[0] * 4) | ((t[1] * 4) << 7) | ((t[2] * 4) << 14));
      poly.u32((i + 1) * 4);
    });
    for (let i = 0; i < 3; i++) poly.u32(0);
    add(row, 1, poly.done());
    const uv = new Writer();
    uv.u16(4);
    uv.u16(material);
    uv.u16(2 + uvs.length * 2);
    for (const [u, v] of uvs) {
      check(
        Number.isInteger(u) &&
          Number.isInteger(v) &&
          u >= 0 &&
          u <= 255 &&
          v >= 0 &&
          v <= 255,
        "8-bit UV overflow",
      );
      uv.u8(u);
      uv.u8(v);
    }
    uv.u8(triangles.length);
    for (const t of triangles) {
      uv.u8(0);
      for (const i of t) {
        check(i < uvs.length, "UV index overflow");
        uv.u8(i);
      }
    }
    for (let i = 0; i < 3; i++) uv.u8(0);
    uv.pad();
    add(row, 2, uv.done());
    add(row - 1, 12, listBlock(positions));
    rows[row][10] = 1;
    packets += triangles.length * 32;
  }
  check(packets <= maxPacketBytes, `GPU packet budget exceeded: ${packets}`);
  size = (size + 3) & ~3;
  check(size <= maxBytes, `Donor slot exceeded: ${size} > ${maxBytes}`);
  const out = new Uint8Array(size),
    v = new DataView(out.buffer);
  out.set(stock.header);
  v.setUint32(20, blocks[0]?.offset ?? HEADER, true);
  rows.forEach((r, i) =>
    r.forEach((n, k) => v.setInt32(24 + i * 56 + k * 4, n, true)),
  );
  for (const block of blocks) out.set(block.bytes, block.offset);
  const rel = new Uint8Array(relocations.length * 4);
  relocations
    .sort((a, b) => a - b)
    .forEach((n, i) => new DataView(rel.buffer).setUint32(i * 4, n, true));
  read3DMK(out);
  return {
    model: out,
    relocations: rel,
    packetBytes: packets,
    bytes: size,
    verification: "structural-only",
  };
}
export function validateNativeGeometry(input) {
  const parsed = read3DMK(input),
    { bytes: b, rows } = parsed,
    v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let triangles = 0,
    vertices = 0,
    packetBytes = 0;
  const u32 = (o) => {
    check(o + 4 <= b.length, "Truncated block");
    return v.getUint32(o, true);
  };
  for (let r = 1; r < 27; r++)
    if (rows[r][10] && rows[r][1] > 2) {
      let p = rows[r - 1][12];
      check(p > 2, "Missing preceding vertex pointer");
      p += 4;
      const g1 = u32(p);
      p += 4 + ((g1 + 3) & ~3);
      const g2 = u32(p);
      p += 4 + ((g2 + 3) & ~3);
      const own = u32(p);
      p += 4;
      const slots = g1 + g2 + own;
      check(slots <= 128 && p + own * 8 <= b.length, "Invalid vertex list");
      vertices += own;
      p = rows[r][1];
      for (let k = 0; k < 4; k++) {
        const n = u32(p);
        p += 4;
        const stride = k === 3 ? 12 : 8;
        check(n <= 255 && p + n * stride <= b.length, "Invalid polygon block");
        for (let i = 0; i < n; i++) {
          const w = u32(p + i * stride);
          const ids = [
            (w & 0x1fc) / 4,
            ((w >> 7) & 0x1fc) / 4,
            ((w >> 14) & 0x1fc) / 4,
          ];
          if (k % 2) ids.push(((w >>> 23) & 0x1fc) / 4);
          check(
            ids.every((i) => i < slots),
            "Primitive slot outside list",
          );
        }
        p += n * stride;
        triangles += n * (k % 2 ? 2 : 1);
        packetBytes += n * [32, 40, 40, 52][k];
      }
    }
  return { triangles, vertices, packetBytes, rows: 27 };
}
export const DONORS = [
  {
    id: "nina-p1-us",
    name: "Nina Williams · costume 1 · USA",
    characterId: 5,
    modelId: 10,
    modelRecord: 111,
    textureRecord: 113,
  },
  {
    id: "nina-p2-us",
    name: "Nina Williams · costume 2 · USA",
    characterId: 5,
    modelId: 11,
    modelRecord: 115,
    textureRecord: 117,
  },
];
export function gameExportGate({
  donor,
  bindCalibration,
  runtimeVerified = false,
  animationVerified = false,
}) {
  const errors = [];
  if (!donor)
    errors.push(
      "Load the original Nina 3DMK and texture ARC from your own USA disc.",
    );
  if (!bindCalibration)
    errors.push(
      "Donor bind calibration has not been validated in the game; playability is unverified.",
    );
  if (!runtimeVerified)
    errors.push(
      "No verified Expanded custom-model loader/version. T3CM requires a compatible runtime patch.",
    );
  if (!animationVerified)
    errors.push("Donor animation and in-game deformation tests have not run.");
  return { ready: errors.length === 0, errors };
}
