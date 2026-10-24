import {decodeDonor} from "./donor.js";
import {nativeRelocations} from "./native-rebuild.js";
import { write3DMK, read3DMK } from "./native.js";
import { readTIM } from "./ps1.js";
// T3CM/T3TX are custom-loader containers, not files accepted by the original PS1 disc.
// This codec does not install a loader or imply an Expanded version supports the container.
function requireCondition(ok, message) {
  if (!ok) throw Error(message);
}
export function writeT3CM({ donor, modelId, native, textureTiles = [] }) {
  const stock = read3DMK(donor),
    geometry = decodeDonor(native.model).report;
  requireCondition(
    modelId >= 0 && modelId <= 51 && Number.isInteger(modelId),
    "Invalid donor model number",
  );
  requireCondition(
    native.model.length <= stock.slotBytes,
    "Donor slot overflow",
  );
  requireCondition(
    native.relocations.length % 4 === 0,
    "Invalid relocation list",
  );
  const rel = new DataView(
      native.relocations.buffer,
      native.relocations.byteOffset,
      native.relocations.byteLength,
    ),
    m = new DataView(
      native.model.buffer,
      native.model.byteOffset,
      native.model.byteLength,
    );
  for (let p = 0; p < rel.byteLength; p += 4) {
    const at = rel.getUint32(p, true);
    requireCondition(
      at % 4 === 0 && at + 4 <= m.byteLength,
      "Relocation outside model",
    );
    const pointer = m.getUint32(at, true);
    requireCondition(
      pointer >= 1536 && pointer < m.byteLength,
      "Relocation target outside model",
    );
  }
  const actualRelocations = Array.from({length: rel.byteLength / 4}, (_, i) => rel.getUint32(i * 4, true));
  requireCondition(JSON.stringify(actualRelocations) === JSON.stringify(nativeRelocations(native.model)), "Relocation list must contain every native pointer exactly once in order");
  let band = null,
    runs = [];
  if (textureTiles.length) {
    band = new Uint8Array(64 * 256 * 2);
    const occupied = new Uint8Array(64 * 256), cluts = new Map(), paletteWords = new Map();
    for (const input of textureTiles) {
      const tim = readTIM(input), bpp = tim.palette.length === 16 ? 4 : 8;
      requireCondition(tim.palette.length === 16 || tim.palette.length === 256, "Only indexed 4/8-bit TIM tiles are supported");
      const words = tim.width / (16 / bpp);
      requireCondition(tim.x + words <= 64 && tim.y + tim.height <= 256, "Texture outside first player page");
      const cid = (tim.clutY << 6) | (tim.clutX >> 4);
      requireCondition(tim.clutY < 4 && tim.clutX % 16 === 0 && tim.clutX + tim.palette.length <= 1024, "Palette outside four player CLUT rows");
      for (let i = 0; i < tim.palette.length; i++) {
        const at = tim.clutY * 1024 + tim.clutX + i;
        requireCondition(!paletteWords.has(at) || paletteWords.get(at) === tim.palette[i], "Conflicting overlapping CLUT entries");
        paletteWords.set(at, tim.palette[i]);
      }
      const previous = cluts.get(cid);
      if (previous) requireCondition(previous.length === tim.palette.length && previous.every((c,i) => c === tim.palette[i]), "Conflicting shared palette");
      else { cluts.set(cid, tim.palette); runs.push({id: cid, palette: tim.palette}); }
      for (let y = 0; y < tim.height; y++) for (let x = 0; x < words; x++) {
        const at = (tim.y + y) * 64 + tim.x + x;
        requireCondition(!occupied[at], "Overlapping texture tiles");
        occupied[at] = 1;
        for (let k = 0; k < 16 / bpp; k++) {
          const i = tim.indices[y * tim.width + x * (16 / bpp) + k];
          if (bpp === 4) band[at * 2 + (k >> 1)] |= i << ((k % 2) * 4);
          else band[at * 2 + k] = i;
        }
      }
    }
    // Consecutive 16-color palettes are legal runs up to 256 colors; do not overflow a CLUT row.
    runs.sort((a, b) => a.id - b.id);
    const merged = [];
    for (const run of runs) {
      const prev = merged.at(-1);
      if (
        prev &&
        prev.id + prev.palette.length / 16 === run.id &&
        (prev.id >> 6) === (run.id >> 6) &&
        prev.palette.length + 16 <= 256
      ) {
        const p = new Uint16Array(prev.palette.length + 16);
        p.set(prev.palette);
        p.set(run.palette, prev.palette.length);
        prev.palette = p;
      } else merged.push(run);
    }
    runs = merged;
    for (const row of decodeDonor(native.model).rows) for (const polygon of row.polygons) {
      const material = polygon.material, bpp = material & 0x8000 ? 8 : 4;
      requireCondition(!(material & 0x100), "Second texture page needs a wider runtime texture band");
      const palette = cluts.get(material & 0x7fff & ~0x100);
      requireCondition(palette?.length === (bpp === 4 ? 16 : 256), "Model material has no matching exported CLUT");
      for (const [u,v] of polygon.uvs)
        requireCondition(Math.floor(u / (16 / bpp)) < 64 && occupied[v * 64 + Math.floor(u / (16 / bpp))], "Model UV points outside exported texture tiles");
    }
    requireCondition(runs.length <= 8, "Runtime CLUT run limit exceeded");
  }
  const baseSize = 16 + 1536 + native.model.length + native.relocations.length,
    textureSize = band
      ? 12 +
        runs.reduce((s, r) => s + 4 + r.palette.length * 2, 0) +
        band.length
      : 0,
    out = new Uint8Array(baseSize + textureSize),
    v = new DataView(out.buffer),
    text = new TextEncoder();
  out.set(text.encode("T3CM"));
  v.setUint16(4, band ? 2 : 1, true);
  v.setUint16(6, modelId, true);
  v.setUint32(8, native.model.length, true);
  v.setUint32(12, native.relocations.length / 4, true);
  out.set(stock.header, 16);
  out.set(native.model, 1552);
  out.set(native.relocations, 1552 + native.model.length);
  if (band) {
    let p = baseSize;
    out.set(text.encode("T3TX"), p);
    v.setUint16(p + 4, 64, true);
    v.setUint16(p + 6, 256, true);
    v.setUint16(p + 8, 65535, true);
    v.setUint16(p + 10, runs.length, true);
    p += 12;
    for (const r of runs) {
      v.setUint16(p, r.id, true);
      v.setUint16(p + 2, r.palette.length, true);
      p += 4;
      for (const c of r.palette) {
        v.setUint16(p, c, true);
        p += 2;
      }
    }
    out.set(band, p);
  }
  return {
    bytes: out,
    geometry,
    modelId,
    verification: "structural-only",
    gameVerified: false,
    requires:
      "Compatible custom T3CM/T3TX loader with per-frame texture refresh; donor-calibrated bone-local coordinates",
  };
}
export function readT3CM(input) {
  const b = input instanceof Uint8Array ? input : new Uint8Array(input),
    v = new DataView(b.buffer, b.byteOffset, b.byteLength),
    decode = (p, n) => new TextDecoder().decode(b.slice(p, p + n));
  requireCondition(b.length >= 1552 && decode(0, 4) === "T3CM", "Invalid T3CM");
  const version = v.getUint16(4, true),
    modelId = v.getUint16(6, true),
    size = v.getUint32(8, true),
    count = v.getUint32(12, true);
  requireCondition(version === 1 || version === 2, "Unsupported T3CM version");
  requireCondition(
    modelId <= 51 && size >= 1536 && 1552 + size + count * 4 <= b.length,
    "Invalid T3CM sizes",
  );
  const model = b.slice(1552, 1552 + size);
  read3DMK(model);
  const relocations = b.slice(1552 + size, 1552 + size + count * 4);
  const relocationView = new DataView(relocations.buffer, relocations.byteOffset, relocations.byteLength);
  const pointers = Array.from({length: count}, (_, i) => relocationView.getUint32(i * 4, true));
  requireCondition(JSON.stringify(pointers) === JSON.stringify(nativeRelocations(model)), "Invalid or incomplete T3CM relocations");
  decodeDonor(model);
  let p = 1552 + size + count * 4,
    texture = null;
  if (version === 2) {
    requireCondition(
      p + 12 <= b.length && decode(p, 4) === "T3TX",
      "Missing T3TX",
    );
    const width = v.getUint16(p + 4, true),
      height = v.getUint16(p + 6, true),
      id = v.getUint16(p + 8, true),
      n = v.getUint16(p + 10, true);
    requireCondition(width === 64 && height === 256, "Unexpected texture band");
    p += 12;
    const runs = [];
    if (id === 65535) {
      requireCondition(n > 0 && n <= 8, "Invalid CLUT run count");
      for (let i = 0; i < n; i++) {
        requireCondition(p + 4 <= b.length, "Truncated CLUT run");
        const cid = v.getUint16(p, true),
          colors = v.getUint16(p + 2, true);
        p += 4;
        requireCondition(
          colors > 0 && colors <= 256 && colors % 16 === 0 && cid < 256 && (cid & 63) * 16 + colors <= 1024 && p + colors * 2 <= b.length,
          "Invalid CLUT colors",
        );
        runs.push({ id: cid, colors: b.slice(p, p + colors * 2) });
        p += colors * 2;
      }
    } else {
      requireCondition(
        n > 0 && n <= 256 && n % 16 === 0 && id < 256 && (id & 63) * 16 + n <= 1024 && p + n * 2 <= b.length,
        "Invalid single CLUT",
      );
      runs.push({ id, colors: b.slice(p, p + n * 2) });
      p += n * 2;
    }
    requireCondition(
      p + width * height * 2 === b.length,
      "Invalid texture band size",
    );
    texture = { width, height, runs, band: b.slice(p) };
    p = b.length;
  }
  requireCondition(p === b.length, "Trailing T3CM bytes");
  return { version, modelId, model, relocations, texture };
}
export function buildNativeCandidate({
  donor,
  modelId,
  parts,
  textureTiles = [],
  maxBytes,
}) {
  // Callers must supply game-calibrated row-local vertices; source skin weights are NOT such coordinates.
  const native = write3DMK({ donor, parts, maxBytes }),
    container = writeT3CM({ donor, modelId, native, textureTiles });
  readT3CM(container.bytes);
  return {
    native,
    container,
    manifest: {
      schema: "t3cs-native-candidate/1",
      format: "3DMK + T3CM/T3TX",
      modelId,
      modelBytes: native.bytes,
      packetBytes: native.packetBytes,
      gameCompatible: false,
      gameVerified: false,
      limitations: [
        "Source-to-donor bind calibration must be validated independently.",
        "T3CM needs a compatible custom runtime patch.",
        "Original PS1 disc injection is not implemented.",
      ],
    },
  };
}
