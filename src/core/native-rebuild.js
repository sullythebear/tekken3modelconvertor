import * as THREE from "three";
import { read3DMK } from "./native.js";
import { decodeDonor, evaluateTerms, blockRanges } from "./donor.js";
const PTR = [0, 1, 2, 12, 13];
function ok(value, message) {
  if (!value) throw Error(message);
}
class Bytes {
  constructor() {
    this.data = [];
  }
  u8(v) {
    this.data.push(v & 255);
  }
  u16(v) {
    this.u8(v);
    this.u8(v >> 8);
  }
  u32(v) {
    this.u16(v);
    this.u16(v >>> 16);
  }
  pad() {
    while (this.data.length % 4) this.u8(0);
  }
  finish() {
    this.pad();
    return new Uint8Array(this.data);
  }
}
export function nativeRelocations(input) {
  const model = read3DMK(input),
    set = new Set(model.pointers),
    ranges = blockRanges(model),
    v = new DataView(
      model.bytes.buffer,
      model.bytes.byteOffset,
      model.bytes.byteLength,
    );
  for (const row of model.rows)
    if (row[13] > 2) {
      const end = ranges.find((p) => p > row[13]);
      for (let p = row[13]; p < end; p += 4) {
        ok(p + 4 <= end, "Unaligned native hand table");
        const target = v.getUint32(p, true);
        ok(
          target >= 1536 && target < model.bytes.length,
          "Native hand table is not a pointer-only table",
        );
        set.add(p);
      }
    }
  return [...set].sort((a, b) => a - b);
}
function normalPalette(vectors, max = 128) {
  const unique = [];
  const index = [];
  for (const v of vectors) {
    let found = unique.findIndex((n) => n.dot(v) > 0.999999);
    if (found < 0) {
      found = unique.length;
      unique.push(v.clone());
    }
    index.push(found);
  }
  if (unique.length <= max)
    return { normals: unique, indices: index, maxAngle: 0 };
  let centers = Array.from({ length: max }, (_, i) =>
    unique[Math.floor((i * unique.length) / max)].clone(),
  );
  let assignments = [];
  for (let iteration = 0; iteration < 10; iteration++) {
    assignments = vectors.map((v) => {
      let best = -Infinity,
        index = 0;
      centers.forEach((c, i) => {
        const d = c.dot(v);
        if (d > best) {
          best = d;
          index = i;
        }
      });
      return index;
    });
    const sums = centers.map(() => new THREE.Vector3());
    vectors.forEach((v, i) => sums[assignments[i]].add(v));
    centers = sums.map((s, i) =>
      s.lengthSq() > 1e-12 ? s.normalize() : centers[i],
    );
  }
  return {
    normals: centers,
    indices: assignments,
    maxAngle: Math.max(
      ...vectors.map((v, i) =>
        Math.acos(THREE.MathUtils.clamp(v.dot(centers[assignments[i]]), -1, 1)),
      ),
    ),
  };
}
export function rebuildNativeNormals(
  input,
  frames,
  {
    maxBytes = input.length,
    maxPacketBytes = 31000,
    maxQuadBendDegrees = 12,
  } = {},
) {
  const decoded = decodeDonor(input),
    model = decoded.model,
    original = model.bytes,
    view = new DataView(
      original.buffer,
      original.byteOffset,
      original.byteLength,
    ),
    ranges = blockRanges(model),
    replacements = new Map(),
    rows = model.rows.map((r) => [...r]);
  let packets = 0,
    splits = 0,
    maxNormalAngle = 0;
  for (const row of decoded.rows) {
    const inv = frames[row.row].clone().invert(),
      primitives = [];
    for (const poly of row.polygons) {
      const world = poly.vertices.map((t) => evaluateTerms(t, frames));
      let split = false;
      if (world.length === 4) {
        const a = new THREE.Triangle(world[0], world[1], world[2]).getNormal(
            new THREE.Vector3(),
          ),
          b = new THREE.Triangle(world[1], world[3], world[2]).getNormal(
            new THREE.Vector3(),
          );
        split = a.angleTo(b) > (maxQuadBendDegrees * Math.PI) / 180;
      }
      const families = split
        ? [
            [0, 1, 2],
            [1, 3, 2],
          ]
        : [Array.from({ length: world.length }, (_, i) => i)];
      if (split) splits++;
      for (const ids of families) {
        const points = ids.map((i) => world[i].clone().applyMatrix4(inv)),
          normal = new THREE.Triangle(points[0], points[1], points[2])
            .getNormal(new THREE.Vector3())
            .negate();
        ok(
          normal.lengthSq() > 0.5,
          "Reconstruction contains degenerate native triangles",
        );
        primitives.push({
          slots: ids.map((i) => poly.slots[i]),
          uvs: ids.map((i) => poly.uvs[i]),
          material: poly.material,
          normal,
        });
      }
    }
    const ordered = [
        ...primitives.filter((p) => p.slots.length === 3),
        ...primitives.filter((p) => p.slots.length === 4),
      ],
      palette = normalPalette(ordered.map((p) => p.normal));
    maxNormalAngle = Math.max(maxNormalAngle, palette.maxAngle);
    const normals = new Bytes();
    normals.u32(4);
    normals.u32(0);
    normals.u32(0);
    normals.u32(palette.normals.length);
    for (const n of palette.normals) {
      for (const x of n.toArray()) normals.u16(Math.round(x * 4096));
      normals.u16(0);
    }
    normals.u32(0);
    normals.u32(0);
    const store = (offset, bytes) => {
      const prior = replacements.get(offset);
      if (
        prior &&
        (prior.length !== bytes.length || prior.some((b, i) => b !== bytes[i]))
      )
        throw Error(
          "Shared native normal/UV/primitive block requires splitting before reconstruction",
        );
      replacements.set(offset, bytes);
    };
    store(rows[row.row][0], normals.finish());
    const polygons = new Bytes();
    let global = 0;
    for (let family = 0; family < 4; family++) {
      const list =
        family < 2
          ? ordered.filter((p) => p.slots.length === (family === 0 ? 3 : 4))
          : [];
      ok(list.length <= 255, "Native primitive family exceeds 255");
      polygons.u32(list.length);
      for (const p of list) {
        const s = p.slots;
        let word = (s[0] * 4) | ((s[1] * 4) << 7) | ((s[2] * 4) << 14);
        if (s.length === 4) word |= (s[3] * 4) << 23;
        polygons.u32(word);
        polygons.u32((palette.indices[global++] + 1) * 4);
        packets += s.length === 4 ? 40 : 32;
      }
    }
    store(rows[row.row][1], polygons.finish());
    const materials = [...new Set(ordered.map((p) => p.material))],
      uvs = [],
      lookup = new Map();
    for (const p of ordered)
      for (const uv of p.uvs) {
        const key = uv.join(",");
        if (!lookup.has(key)) {
          lookup.set(key, uvs.length);
          uvs.push(uv);
        }
      }
    ok(
      materials.length <= 256 && uvs.length <= 256,
      "Native UV/material table overflow",
    );
    const textures = new Bytes();
    textures.u16(2 + materials.length * 2);
    materials.forEach((m) => textures.u16(m));
    textures.u16(2 + uvs.length * 2);
    uvs.forEach((uv) => uv.forEach((x) => textures.u8(x)));
    for (let family = 0; family < 4; family++) {
      const list =
        family < 2
          ? ordered.filter((p) => p.slots.length === (family === 0 ? 3 : 4))
          : [];
      textures.u8(list.length);
      for (const p of list) {
        textures.u8(materials.indexOf(p.material));
        for (const uv of p.uvs) textures.u8(lookup.get(uv.join(",")));
      }
    }
    store(rows[row.row][2], textures.finish());
  }
  ok(
    packets <= maxPacketBytes,
    `Rebuilt GPU packets exceed donor budget (${packets})`,
  );
  // Keep original non-drawing blocks and all hand variants, and remap every pointer, including interior hand pointers.
  const starts = ranges.filter((p) => p < original.length),
    blocks = [],
    mapping = new Map();
  let size = 1536;
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i],
      end = ranges[i + 1],
      bytes = replacements.get(start) ?? original.slice(start, end);
    ok(start > 2, "Invalid block start");
    mapping.set(start, { start, size, end, replaced: replacements.has(start) });
    blocks.push({ old: start, offset: size, bytes });
    size += bytes.length;
  }
  ok(
    size <= maxBytes,
    `Normal rebuild exceeds donor slot (${size} > ${maxBytes})`,
  );
  const out = new Uint8Array(size),
    ov = new DataView(out.buffer);
  out.set(original.slice(0, 1536));
  blocks.forEach((b) => out.set(b.bytes, b.offset));
  const remap = (pointer) => {
    if (pointer <= 2) return pointer;
    const old = starts.findLast((p) => p <= pointer),
      entry = mapping.get(old);
    ok(entry && pointer < entry.end, "Relocation target outside native blocks");
    ok(
      !entry.replaced || pointer === old,
      "Interior pointer into a replaced normal/poly/UV block",
    );
    return entry.size + pointer - old;
  };
  for (let r = 0; r < 27; r++)
    for (const k of PTR)
      ov.setInt32(24 + r * 56 + k * 4, remap(rows[r][k]), true);
  ov.setUint32(16, 1536, true);
  ov.setUint32(20, remap(view.getUint32(20, true)), true);
  for (const row of model.rows)
    if (row[13] > 2) {
      const end = ranges.find((p) => p > row[13]),
        destination = remap(row[13]);
      for (let p = row[13]; p < end; p += 4)
        ov.setUint32(
          destination + p - row[13],
          remap(view.getUint32(p, true)),
          true,
        );
    }
  const relocations = new Uint8Array(nativeRelocations(out).length * 4);
  nativeRelocations(out).forEach((p, i) =>
    new DataView(relocations.buffer).setUint32(i * 4, p, true),
  );
  const checked = decodeDonor(out);
  return {
    model: out,
    relocations,
    decoded: checked,
    report: {
      normalMode: "rebuilt-flat",
      normalQuantizationMaxDegrees: (maxNormalAngle * 180) / Math.PI,
      splitNonplanarQuads: splits,
      packetBytes: packets,
      modelBytes: size,
      handVariantsPreserved: true,
    },
  };
}
