// Independently implemented PS1 TIM and Namco ARC codecs. No game data included.
function assert(ok, msg) {
  if (!ok) throw Error(msg);
}
export function rgb555(r, g, b, a = 255) {
  if (a < 128) return 0;
  const n =
    Math.round((r * 31) / 255) |
    (Math.round((g * 31) / 255) << 5) |
    (Math.round((b * 31) / 255) << 10);
  return n || 0x8000;
}
export function rgba555(c) {
  return [
    ((c & 31) * 255) / 31,
    (((c >> 5) & 31) * 255) / 31,
    (((c >> 10) & 31) * 255) / 31,
    c === 0 ? 0 : 255,
  ].map(Math.round);
}
export function quantize(rgba, colors = 16) {
  assert(
    colors === 16 || colors === 256,
    "Palette must have 16 or 256 entries",
  );
  assert(rgba.length % 4 === 0, "RGBA byte length");
  const hist = new Map();
  for (let i = 0; i < rgba.length; i += 4) {
    const c = rgb555(...rgba.subarray(i, i + 4));
    if (c) hist.set(c, (hist.get(c) || 0) + 1);
  }
  let boxes = hist.size
    ? [[...hist].map(([c, n]) => ({ c, n, p: rgba555(c) }))]
    : [];
  const score = (b) => {
    const range = [0, 1, 2].map(
      (k) =>
        Math.max(...b.map((x) => x.p[k])) - Math.min(...b.map((x) => x.p[k])),
    );
    return {
      range,
      axis: range.indexOf(Math.max(...range)),
      value: Math.max(...range) * Math.sqrt(b.reduce((s, x) => s + x.n, 0)),
    };
  };
  while (boxes.length < colors - 1) {
    let best = -1,
      value = -1;
    for (let i = 0; i < boxes.length; i++)
      if (boxes[i].length > 1) {
        const s = score(boxes[i]);
        if (s.value > value) {
          best = i;
          value = s.value;
        }
      }
    if (best < 0) break;
    const b = boxes.splice(best, 1)[0],
      axis = score(b).axis;
    b.sort((a, b) => a.p[axis] - b.p[axis] || a.c - b.c);
    const total = b.reduce((s, x) => s + x.n, 0);
    let sum = 0,
      k = 0;
    while (k < b.length - 1 && sum < total / 2) sum += b[k++].n;
    boxes.push(b.slice(0, k), b.slice(k));
  }
  const palette = new Uint16Array(colors);
  boxes.forEach((b, i) => {
    const total = b.reduce((s, x) => s + x.n, 0),
      p = [0, 1, 2].map((k) => b.reduce((s, x) => s + x.p[k] * x.n, 0) / total);
    palette[i + 1] = rgb555(...p);
  });
  const cache = new Map([[0, 0]]),
    indices = new Uint8Array(rgba.length / 4),
    decoded = new Uint8Array(rgba.length);
  for (let i = 0; i < indices.length; i++) {
    const c = rgb555(...rgba.subarray(i * 4, i * 4 + 4));
    let index = cache.get(c);
    if (index === undefined) {
      const p = rgba555(c);
      let best = Infinity;
      index = 1;
      for (let j = 1; j <= boxes.length; j++) {
        const q = rgba555(palette[j]),
          d =
            2 * (p[0] - q[0]) ** 2 +
            4 * (p[1] - q[1]) ** 2 +
            (p[2] - q[2]) ** 2;
        if (d < best) {
          best = d;
          index = j;
        }
      }
      cache.set(c, index);
    }
    indices[i] = index;
    decoded.set(rgba555(palette[index]), i * 4);
  }
  return { palette, indices, rgba: decoded };
}
export function writeTIM({
  width,
  height,
  indices,
  palette,
  x = 0,
  y = 0,
  clutX = 0,
  clutY = 1,
}) {
  const bpp = palette.length === 16 ? 4 : palette.length === 256 ? 8 : 0,
    ppw = 16 / bpp;
  assert(
    bpp &&
      Number.isInteger(width) &&
      Number.isInteger(height) &&
      width > 0 &&
      height > 0 &&
      width % ppw === 0,
    "Invalid TIM dimensions/palette",
  );
  assert(indices.length === width * height, "TIM pixel count mismatch");
  assert(
    indices.every((i) => i < palette.length),
    "TIM palette index overflow",
  );
  assert(
    clutX % 16 === 0 &&
      clutX >= 0 &&
      clutX + palette.length <= 1024 &&
      clutY >= 0 &&
      clutY < 512,
    "Invalid CLUT placement",
  );
  assert(
    x >= 0 && x + width / ppw <= 1024 && y >= 0 && y + height <= 512,
    "Invalid TIM VRAM rectangle",
  );
  const clutSize = 12 + palette.length * 2,
    imageSize = 12 + (indices.length / ppw) * 2,
    out = new Uint8Array(8 + clutSize + imageSize),
    v = new DataView(out.buffer);
  v.setUint32(0, 16, true);
  v.setUint32(4, bpp === 4 ? 8 : 9, true);
  let p = 8;
  v.setUint32(p, clutSize, true);
  v.setUint16(p + 4, clutX, true);
  v.setUint16(p + 6, clutY, true);
  v.setUint16(p + 8, palette.length, true);
  v.setUint16(p + 10, 1, true);
  palette.forEach((c, i) => v.setUint16(p + 12 + i * 2, c, true));
  p += clutSize;
  v.setUint32(p, imageSize, true);
  v.setUint16(p + 4, x, true);
  v.setUint16(p + 6, y, true);
  v.setUint16(p + 8, width / ppw, true);
  v.setUint16(p + 10, height, true);
  p += 12;
  for (let i = 0; i < indices.length; i += ppw) {
    let w = 0;
    for (let j = 0; j < ppw; j++) w |= indices[i + j] << (j * bpp);
    v.setUint16(p, w, true);
    p += 2;
  }
  return out;
}
export function readTIM(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes),
    v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  assert(b.length >= 8, "Truncated TIM");
  assert(v.getUint32(0, true) === 16, "Not a TIM");
  const flags = v.getUint32(4, true);
  assert(flags === 8 || flags === 9, "Only indexed 4/8-bit TIM supported");
  const colors = flags === 8 ? 16 : 256;
  let p = 8;
  function block() {
    assert(p + 12 <= b.length, "Truncated TIM block");
    const size = v.getUint32(p, true),
      x = v.getUint16(p + 4, true),
      y = v.getUint16(p + 6, true),
      w = v.getUint16(p + 8, true),
      h = v.getUint16(p + 10, true);
    assert(
      size === 12 + w * h * 2 && size <= b.length - p,
      "Invalid TIM block size",
    );
    const data = b.slice(p + 12, p + size);
    p += size;
    return { x, y, w, h, data };
  }
  const c = block();
  assert(c.w * c.h === colors, "Expected one CLUT");
  const palette = new Uint16Array(colors);
  for (let i = 0; i < colors; i++)
    palette[i] = new DataView(c.data.buffer).getUint16(i * 2, true);
  const image = block();
  assert(p === b.length, "Trailing TIM data");
  const width = image.w * (colors === 16 ? 4 : 2),
    height = image.h,
    indices = new Uint8Array(width * height);
  for (let i = 0; i < indices.length; i++)
    indices[i] =
      colors === 16
        ? (image.data[i >> 1] >> ((i % 2) * 4)) & 15
        : image.data[i];
  return {
    width,
    height,
    indices,
    palette,
    x: image.x,
    y: image.y,
    clutX: c.x,
    clutY: c.y,
  };
}
export function writeARC(entries) {
  assert(entries.length < 65536, "Too many ARC entries");
  let offset = 4 + 8 * entries.length;
  const total = offset + entries.reduce((s, e) => s + e.length, 0),
    out = new Uint8Array(total),
    v = new DataView(out.buffer);
  v.setUint32(0, entries.length, true);
  entries.forEach((e, i) => {
    v.setUint32(4 + i * 8, offset, true);
    v.setUint32(8 + i * 8, e.length, true);
    out.set(e, offset);
    offset += e.length;
  });
  return out;
}
export function readARC(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  assert(b.length >= 4, "Truncated ARC");
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength),
    n = v.getUint32(0, true);
  assert(n < 65536 && 4 + 8 * n <= b.length, "Invalid ARC table");
  const result = [],
    ranges = [];
  for (let i = 0; i < n; i++) {
    const o = v.getUint32(4 + i * 8, true),
      s = v.getUint32(8 + i * 8, true);
    assert(o >= 4 + 8 * n && o + s <= b.length, "ARC entry outside archive");
    ranges.push([o, o + s]);
    result.push(b.slice(o, o + s));
  }
  ranges.sort((a, b) => a[0] - b[0]);
  for (let i = 1; i < ranges.length; i++)
    assert(ranges[i][0] >= ranges[i - 1][1], "Overlapping ARC entries");
  return result;
}
