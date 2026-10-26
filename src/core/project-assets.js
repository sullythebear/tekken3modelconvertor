// Reopening a project still parses its contents normally. Only byte-identical
// raw inputs already owned by this session may share storage; decoded scenes,
// textures, project metadata and changed inputs are never reused here.
export function reuseExactProjectAssets(incoming, current) {
  const candidates = new Map();
  for (const f of current) {
    if (candidates.has(f.name)) candidates.set(f.name, null);
    else candidates.set(f.name, f);
  }
  const counts = new Map();
  for (const f of incoming) counts.set(f.name, (counts.get(f.name) ?? 0) + 1);
  let reusedFiles = 0,
    reusedBytes = 0;
  const records = incoming.map((f) => {
    const old = candidates.get(f.name);
    if (counts.get(f.name) !== 1 || !old || !equalBytes(f.data, old.data))
      return f;
    reusedFiles++;
    reusedBytes += byteView(f.data).byteLength;
    return { ...f, data: old.data };
  });
  return { records, reusedFiles, reusedBytes };
}

function byteView(data) {
  if (data instanceof Uint8Array && data.buffer instanceof ArrayBuffer)
    return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return null;
}
function equalBytes(left, right) {
  const a = byteView(left),
    b = byteView(right);
  if (!a || !b || a.byteLength !== b.byteLength) return false;
  if (a.buffer === b.buffer && a.byteOffset === b.byteOffset) return true;
  let i = 0;
  if (!(a.byteOffset % 4) && !(b.byteOffset % 4)) {
    const count = a.byteLength >>> 2,
      x = new Uint32Array(a.buffer, a.byteOffset, count),
      y = new Uint32Array(b.buffer, b.byteOffset, count);
    for (let j = 0; j < count; j++) if (x[j] !== y[j]) return false;
    i = count * 4;
  }
  for (; i < a.byteLength; i++) if (a[i] !== b[i]) return false;
  return true;
}
