import * as THREE from "three";
import { read3DMK } from "./native.js";
import { readARC, readTIM, rgba555 } from "./ps1.js";

function requireValue(ok, message) {
  if (!ok) throw Error(message);
}
class Cursor {
  constructor(bytes, start, end) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    this.position = start;
    this.end = end;
  }
  take(n) {
    requireValue(
      Number.isInteger(n) && n >= 0 && this.position + n <= this.end,
      "Truncated native block",
    );
    const p = this.position;
    this.position += n;
    return p;
  }
  u32() {
    return this.view.getUint32(this.take(4), true);
  }
  u16() {
    return this.view.getUint16(this.take(2), true);
  }
  s16() {
    return this.view.getInt16(this.take(2), true);
  }
  u8() {
    return this.view.getUint8(this.take(1));
  }
  align() {
    this.take(-this.position & 3);
  }
}
export function blockRanges(model) {
  const starts = new Set([model.bytes.length]);
  for (const row of model.rows)
    for (const k of [0, 1, 2, 12, 13]) if (row[k] > 2) starts.add(row[k]);
  return [...starts].sort((a, b) => a - b);
}
function blockCursor(model, offset) {
  const ranges = blockRanges(model),
    end = ranges.find((o) => o > offset);
  requireValue(
    offset >= 1536 && end !== undefined,
    "Invalid native block offset",
  );
  return new Cursor(model.bytes, offset, end);
}
export function vertexLists(model, row) {
  const offset = model.rows[row - 1]?.[12];
  if (!(offset > 2)) return [];
  const c = blockCursor(model, offset),
    lists = [];
  while (c.end - c.position >= 40) {
    const start = c.position,
      head = c.u32(),
      groups = [];
    for (let g = 0; g < 2; g++) {
      const n = c.u32();
      requireValue(n <= 128, "Native borrow list exceeds 128");
      const values = [];
      for (let i = 0; i < n; i++) values.push(c.u8());
      c.align();
      groups.push(values);
    }
    const n = c.u32();
    requireValue(
      n + groups[0].length + groups[1].length <= 128,
      "Native vertex slots exceed 128",
    );
    const own = [];
    for (let i = 0; i < n; i++) {
      const offset = c.position;
      own.push({
        row,
        index: i,
        offset,
        position: [c.s16(), c.s16(), c.s16()],
        pad: c.s16(),
      });
    }
    const tails = [];
    for (const bits of [9, 9, 9, 9, 9, 2]) {
      const count = c.u32(),
        per = bits === 9 ? 3 : 16;
      requireValue(count <= 128, "Native tail count exceeds 128");
      const values = [];
      for (let i = 0; i < Math.ceil(count / per); i++) {
        const word = c.u32();
        for (let j = 0; j < per && values.length < count; j++)
          values.push((word >>> (bits * j)) & ((1 << bits) - 1));
      }
      tails.push(values);
    }
    requireValue(
      tails.slice(0, 5).reduce((s, g) => s + g.length, 0) <= own.length,
      "Tail groups overrun own vertices",
    );
    lists.push({
      start,
      end: c.position,
      head,
      borrowScratch: groups[0],
      borrowCache: groups[1],
      own,
      tails,
    });
    if (c.position === start) throw Error("Invalid native list advance");
  }
  // Alignment bytes are allowed, arbitrary trailing data is not.
  for (let p = c.position; p < c.end; p++)
    requireValue(
      model.bytes[p] === 0,
      "Unexpected bytes after native vertex variants",
    );
  return lists;
}
export function polygonList(model, row) {
  const offset = model.rows[row]?.[1];
  if (!(offset > 2)) return [];
  const c = blockCursor(model, offset),
    out = [];
  for (let family = 0; family < 4; family++) {
    const count = c.u32(),
      stride = family === 3 ? 12 : 8;
    requireValue(count <= 255, "Primitive family exceeds UV count capacity");
    for (let i = 0; i < count; i++) {
      const start = c.take(stride),
        word = c.view.getUint32(start, true),
        slots = [0, 7, 14].map((shift) => ((word >>> shift) & 0x1fc) / 4);
      if (family % 2) slots.push(((word >>> 23) & 0x1fc) / 4);
      out.push({
        family,
        index: i,
        offset: start,
        slots,
        packetBytes: [32, 40, 40, 52][family],
      });
    }
  }
  return out;
}
export function textureList(model, row) {
  const offset = model.rows[row]?.[2];
  if (!(offset > 2)) return [];
  const c = blockCursor(model, offset),
    uvOffset = c.u16();
  requireValue(
    uvOffset >= 2 && uvOffset % 2 === 0 && offset + uvOffset < c.end,
    "Invalid UV-table offset",
  );
  const materials = [];
  while (c.position < offset + uvOffset) materials.push(c.u16());
  const uvStart = c.position,
    primitivesOffset = c.u16();
  requireValue(
    primitivesOffset >= 2 &&
      primitivesOffset % 2 === 0 &&
      uvStart + primitivesOffset <= c.end,
    "Invalid UV source offset",
  );
  const uvs = [];
  while (c.position < uvStart + primitivesOffset) uvs.push([c.u8(), c.u8()]);
  const out = [];
  for (let family = 0; family < 4; family++) {
    const count = c.u8();
    for (let i = 0; i < count; i++) {
      const materialIndex = c.u8();
      requireValue(
        materialIndex < materials.length,
        "UV material index outside table",
      );
      const corners = [];
      for (let k = 0; k < (family % 2 ? 4 : 3); k++) {
        const index = c.u8();
        requireValue(index < uvs.length, "UV index outside table");
        corners.push(uvs[index]);
      }
      out.push({
        family,
        index: i,
        material: materials[materialIndex],
        uvs: corners,
      });
    }
  }
  return out;
}
function sourceTerm(vertex) {
  return [{ vertex, weight: 1 }];
}
function combine(a, b, wa = 0.5, wb = 0.5) {
  const byOffset = new Map();
  for (const [terms, factor] of [
    [a, wa],
    [b, wb],
  ])
    for (const t of terms ?? []) {
      const key = t.vertex.offset,
        entry = byOffset.get(key) ?? { vertex: t.vertex, weight: 0 };
      entry.weight += t.weight * factor;
      byOffset.set(key, entry);
    }
  return [...byOffset.values()];
}
export function decodeDonor(input, { rowOrder, variants = {} } = {}) {
  const model = read3DMK(input),
    order = rowOrder ?? Array.from({ length: 26 }, (_, i) => i + 1),
    scratch = Array(128).fill(null),
    cache = new Map(),
    rows = [],
    constraints = [],
    allOwn = new Map(),
    owners = new Map();
  requireValue(
    new Set(order).size === order.length &&
      order.every((r) => Number.isInteger(r) && r >= 1 && r < 27),
    "Invalid native row order",
  );
  for (const row of order) {
    const geometry = polygonList(model, row);
    if (!model.rows[row][10] || !geometry.length) continue;
    const lists = vertexLists(model, row);
    requireValue(lists.length > 0, `Missing vertex list for row ${row}`);
    const variant = variants[row] ?? 0;
    requireValue(
      Number.isInteger(variant) && variant >= 0 && variant < lists.length,
      "Invalid hand variant",
    );
    const list = lists[variant],
      before = [...scratch],
      beforeCache = new Map(cache);
    for (const l of lists)
      for (const v of l.own) {
        if (!owners.has(v.offset)) owners.set(v.offset, new Set());
        owners.get(v.offset).add(v.row);
        allOwn.set(v.offset, v);
      }
    const slots = list.borrowScratch.map((b) => {
      requireValue(b % 2 === 0 && b >= 2 && b <= 256, "Invalid scratch borrow");
      const value = before[b / 2 - 1];
      requireValue(value, `Unresolved scratch borrow in row ${row}`);
      return value;
    });
    for (const b of list.borrowCache) {
      requireValue(b % 2 === 0, "Invalid cache borrow");
      const value = cache.get(b / 2);
      requireValue(value, `Unresolved cache borrow in row ${row}`);
      slots.push(value);
    }
    slots.push(...list.own.map(sourceTerm));
    let slot = list.borrowScratch.length + list.borrowCache.length;
    const copies = [];
    for (let g = 0; g < 5; g++)
      for (const field of list.tails[g]) {
        const raw = slots[slot],
          index = (field & 255) / 2,
          blend = Boolean(field & 256);
        requireValue(Number.isInteger(index), "Odd native cache/tail index");
        if (g === 0 || g === 1) {
          const old = beforeCache.get(index);
          if (blend) {
            requireValue(old, "Blend references empty native cache");
            const total = old.reduce((n, t) => n + t.weight, 0);
            requireValue(total > 0.0, "Zero-weight native cache entry");
            constraints.push({
              a: raw,
              b: old.map((t) => ({ ...t, weight: t.weight / total })),
              row,
              kind: "cache-half",
            });
            slots[slot] = combine(raw, old, 0.5, total < 0.75 ? 1 : 0.5);
          }
          if (g === 0) cache.set(index, slots[slot]);
        } else if (g === 2 && blend) {
          const old = before[index - 1];
          requireValue(old, "Blend references empty scratch slot");
          constraints.push({ a: raw, b: old, row, kind: "scratch-half" });
          slots[slot] = combine(raw, old);
        } else if (g === 3) {
          const stored = blend
            ? raw.map((t) => ({ ...t, weight: t.weight * 0.5 }))
            : raw;
          cache.set(index, stored);
          if (blend) slots[slot] = stored;
        } else if (g === 4) {
          requireValue(
            index >= 1 && index <= 128,
            "Scratch copy outside buffer",
          );
          copies.push([index - 1, slots[slot]]);
        }
        slot++;
      }
    slots.forEach((s, i) => (scratch[i] = s));
    for (const [i, s] of copies) scratch[i] = s;
    const textures = textureList(model, row);
    requireValue(
      textures.length === geometry.length,
      `UV/geometry primitive count differs in row ${row}`,
    );
    const polygons = geometry.map((p, i) => {
      requireValue(
        p.family === textures[i].family,
        "UV primitive families differ",
      );
      requireValue(
        p.slots.every((s) => s < slots.length && slots[s]),
        `Unresolved primitive in row ${row}`,
      );
      return { ...p, ...textures[i], vertices: p.slots.map((s) => slots[s]) };
    });
    rows.push({ row, list, variants: lists, slots, polygons });
  }
  return {
    model,
    rows,
    ownVertices: [...allOwn.values()],
    sharedVertexOwners: [...owners]
      .filter(([, rows]) => rows.size > 1)
      .map(([offset, rows]) => ({ offset, rows: [...rows] })),
    constraints,
    order,
    report: {
      drawnRows: rows.length,
      ownVertices: allOwn.size,
      variants: rows.reduce((n, r) => n + r.variants.length, 0),
      triangles: rows.reduce(
        (s, r) =>
          s +
          r.polygons.reduce((n, p) => n + (p.slots.length === 4 ? 2 : 1), 0),
        0,
      ),
      packetBytes: rows.reduce(
        (s, r) => s + r.polygons.reduce((n, p) => n + p.packetBytes, 0),
        0,
      ),
      seamConstraints: constraints.length,
    },
  };
}
export function evaluateTerms(terms, frames, positions) {
  const p = new THREE.Vector3();
  for (const term of terms) {
    const local = positions?.get(term.vertex.offset) ?? term.vertex.position,
      frame = frames[term.vertex.row];
    requireValue(frame, `No bind frame for native row ${term.vertex.row}`);
    p.addScaledVector(
      new THREE.Vector3().fromArray(local).applyMatrix4(frame),
      term.weight,
    );
  }
  return p;
}
export function decodeTextureArchive(input) {
  const entries = readARC(input),
    tiles = [];
  for (let entry = 0; entry < entries.length; entry++) {
    const bytes = entries[entry];
    if (
      bytes.length < 8 ||
      new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
        0,
        true,
      ) !== 16
    )
      continue;
    const tile = readTIM(bytes),
      clut = (tile.clutY << 6) | (tile.clutX >> 4);
    tiles.push({ ...tile, entry, clut, bytes });
  }
  requireValue(
    tiles.length > 0,
    "Donor ARC contains no supported TIM textures",
  );
  return { entries, tiles };
}
export function materialTexel(archive, material, u, v) {
  const bpp = material & 0x8000 ? 8 : 4,
    clut = material & 0x7fff & ~0x100,
    page = material & 0x100 ? 64 : 0,
    wordX = page + Math.floor(u / (16 / bpp));
  const candidates = archive.tiles.filter(
    (t) =>
      t.palette.length === (bpp === 4 ? 16 : 256) &&
      t.clut === clut &&
      wordX >= t.x &&
      wordX < t.x + t.width / (16 / bpp) &&
      v >= t.y &&
      v < t.y + t.height,
  );
  requireValue(
    candidates.length === 1,
    `Missing/ambiguous TIM for material ${material}, UV ${u},${v}`,
  );
  const tile = candidates[0],
    x = u - (tile.x - page) * (16 / bpp),
    y = v - tile.y,
    index = tile.indices[y * tile.width + x];
  return {
    tile,
    index,
    color: rgba555(tile.palette[index]),
    pixel: y * tile.width + x,
  };
}
export function donorPreview(decoded, frames, archive, positions) {
  const group = new THREE.Group();
  group.name = "NativeDonor";
  const materialCache = new Map();
  const getMaterial = (id) => {
    if (materialCache.has(id)) return materialCache.get(id);
    if (!archive) {
      const m = new THREE.MeshBasicMaterial({
        color: 0xb4bed2,
        side: THREE.DoubleSide,
      });
      materialCache.set(id, m);
      return m;
    }
    const rgba = new Uint8Array(256 * 256 * 4),
      bpp = id & 0x8000 ? 8 : 4,
      page = id & 0x100 ? 64 : 0,
      clut = id & 0x7fff & ~0x100,
      occupied = new Uint8Array(256 * 256);
    for (const t of archive.tiles) {
      if (t.clut !== clut || t.palette.length !== (bpp === 4 ? 16 : 256))
        continue;
      for (let y = 0; y < t.height; y++)
        for (let x = 0; x < t.width; x++) {
          const u = (t.x - page) * (16 / bpp) + x,
            v = t.y + y;
          if (u < 0 || u > 255 || v < 0 || v > 255) continue;
          const at = v * 256 + u,
            color = rgba555(t.palette[t.indices[y * t.width + x]]);
          if (occupied[at] && color.some((c, k) => c !== rgba[at * 4 + k]))
            throw Error("Ambiguous overlapping native texture tiles");
          occupied[at] = 1;
          rgba.set(color, at * 4);
        }
    }
    const texture = new THREE.DataTexture(rgba, 256, 256, THREE.RGBAFormat);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    const m = new THREE.MeshBasicMaterial({
      map: texture,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });
    materialCache.set(id, m);
    return m;
  };
  for (const row of decoded.rows) {
    const groups = new Map();
    for (const poly of row.polygons) {
      if (!groups.has(poly.material)) groups.set(poly.material, []);
      groups.get(poly.material).push(poly);
    }
    for (const [material, polygons] of groups) {
      const positionsOut = [],
        uvs = [];
      for (const poly of polygons) {
        const points = poly.vertices.map((t) =>
            evaluateTerms(t, frames, positions),
          ),
          triangles =
            points.length === 4
              ? [
                  [0, 1, 2],
                  [1, 3, 2],
                ]
              : [[0, 1, 2]];
        for (const ids of triangles)
          for (const k of ids) {
            positionsOut.push(...points[k].toArray());
            uvs.push(
              (poly.uvs[k][0] + 0.5) / 256,
              (poly.uvs[k][1] + 0.5) / 256,
            );
          }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positionsOut, 3),
      );
      g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      g.computeVertexNormals();
      const mesh = new THREE.Mesh(g, getMaterial(material));
      mesh.name = `Native row ${row.row}, material ${material}`;
      group.add(mesh);
    }
  }
  return group;
}
