// Read-only ISO9660 extraction. No game bytes or third-party parser code embedded.
const BLOCK = 2048, MAX_FILE = 1024 ** 3;
function check(value, message) { if (!value) throw Error(message); }
function view(bytes) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }
function ascii(bytes) { return String.fromCharCode(...bytes); }
function dual32(bytes, offset) {
  check(offset + 8 <= bytes.length, 'Truncated ISO9660 number');
  const v = view(bytes), n = v.getUint32(offset, true);
  check(n === v.getUint32(offset + 4, false), 'ISO9660 endian copies disagree');
  return n;
}
function dual16(bytes, offset) {
  check(offset + 4 <= bytes.length, 'Truncated ISO9660 number');
  const v = view(bytes), n = v.getUint16(offset, true);
  check(n === v.getUint16(offset + 2, false), 'ISO9660 endian copies disagree');
  return n;
}
function record(bytes, offset, volumeBlocks) {
  const length = bytes[offset];
  check(length >= 34 && offset + length <= bytes.length && offset % BLOCK + length <= BLOCK, 'Invalid ISO9660 directory record');
  const b = bytes.subarray(offset, offset + length), nameLength = b[32];
  check(nameLength && 33 + nameLength <= length, 'Truncated ISO9660 filename');
  const extent = dual32(b, 2), size = dual32(b, 10);
  check(extent + Math.ceil(size / BLOCK) <= volumeBlocks, 'ISO9660 extent lies outside the volume');
  check(b[1] === 0 && b[26] === 0 && b[27] === 0 && dual16(b, 28) === 1, 'Extended, interleaved or multi-volume ISO files are unsupported');
  const raw = b.subarray(33, 33 + nameLength), special = nameLength === 1 && raw[0] <= 1;
  return {length, extent, size, flags: b[25], special, name: special ? '' : ascii(raw).replace(/;\d+$/, '')};
}
export async function openDiscImage(source) {
  check(Number.isSafeInteger(source.size) && source.size >= 18 * BLOCK && source.size <= 2 * 1024 ** 3, 'Unsupported disc image size (maximum 2 GiB)');
  async function physical(offset, length) {
    check(Number.isSafeInteger(offset) && Number.isSafeInteger(length) && offset >= 0 && length >= 0 && offset + length <= source.size, 'Disc image read outside file');
    const bytes = await source.read(offset, length);
    check(bytes instanceof Uint8Array && bytes.length === length, 'Truncated disc image read');
    return bytes;
  }
  const layouts = [];
  for (const leadIn of [0, 150]) for (const [sectorBytes, userOffset, label] of [[2048, 0, 'ISO 2048'], [2352, 16, 'BIN Mode 1'], [2352, 24, 'BIN Mode 2 Form 1']]) {
    const offset = (leadIn + 16) * sectorBytes + userOffset;
    if (offset + BLOCK > source.size) continue;
    const probe = await physical(offset, BLOCK);
    if (probe[0] === 1 && ascii(probe.subarray(1, 6)) === 'CD001' && probe[6] === 1)
      layouts.push({sectorBytes, userOffset, label, leadIn, primary: probe});
  }
  check(layouts.length === 1, layouts.length ? 'Ambiguous disc sector layout' : 'No supported ISO9660 primary volume found');
  const layout = layouts[0], pvd = layout.primary, volumeBlocks = dual32(pvd, 80),
    logicalBlockSize = dual16(pvd, 128),
    availableBlocks = Math.floor(source.size / layout.sectorBytes) - layout.leadIn;
  const diagnostic = {sectorLayout: layout.label, imageBytes: source.size,
    sectorBytes: layout.sectorBytes, leadInSectors: layout.leadIn,
    logicalBlockSize, declaredVolumeBlocks: volumeBlocks, availableBlocks};
  function requireVolume(ok, message) {
    if (!ok) {
      const error = Error(`${message}. Disc diagnostics: ${JSON.stringify(diagnostic)}`);
      error.discDiagnostic = diagnostic;
      throw error;
    }
  }
  requireVolume(logicalBlockSize === BLOCK, 'Unsupported ISO9660 logical block size; expected 2048');
  requireVolume(volumeBlocks >= 18 && availableBlocks >= 18, 'Invalid ISO9660 volume size');
  // A data-track-only dump may omit later tracks counted in the volume header.
  // Extract only physically present extents; never pad missing data or infer it.
  // Retail executable/hash and donor capacity validation still follow extraction.
  const warnings = volumeBlocks > availableBlocks
    ? [`ISO header declares ${volumeBlocks} blocks; this file contains ${availableBlocks}. Only fully backed directories and selected files can be extracted; omitted data/tracks are not validated.`]
    : [];
  function payload(bytes) {
    if (layout.sectorBytes === 2352) {
      check(bytes[0] === 0 && bytes[11] === 0 && bytes.subarray(1, 11).every(v => v === 255), 'Invalid raw sector sync');
      check(bytes[15] === (layout.userOffset === 16 ? 1 : 2), 'Raw sector mode changed inside ISO data');
      if (bytes[15] === 2) {
        check(bytes.subarray(16, 20).every((v, i) => v === bytes[i + 20]), 'Mode 2 subheader copies disagree');
        check(!(bytes[18] & 0x20), 'Mode 2 Form 2 is not a 2048-byte ISO data sector');
      }
    }
    return bytes.subarray(layout.userOffset, layout.userOffset + BLOCK);
  }
  async function sector(lba) {
    check(lba >= 0 && lba < volumeBlocks, 'ISO9660 logical block outside volume');
    return payload(await physical((lba + layout.leadIn) * layout.sectorBytes, layout.sectorBytes));
  }
  // Re-read the PVD through raw-sector validation as well.
  await sector(16);
  async function extent(entry, limit = MAX_FILE) {
    check(!(entry.flags & 0x80), 'Multi-extent ISO files are unsupported');
    check(entry.size <= limit, 'ISO file exceeds extraction size limit');
    requireVolume(entry.extent + Math.ceil(entry.size / BLOCK) <= availableBlocks,
      `Required ISO extent is missing from this file (start=${entry.extent}, bytes=${entry.size}); select the complete data track or supply loose SLUS_004.02 and TEKKEN3.BNS`);
    // Batch contiguous reads for cooked images; raw sectors require subheader validation.
    if (layout.sectorBytes === BLOCK) return physical((entry.extent + layout.leadIn) * BLOCK, entry.size);
    const out = new Uint8Array(entry.size);
    for (let offset = 0; offset < entry.size;) {
      const count = Math.min(128, Math.ceil((entry.size - offset) / BLOCK));
      const raw = await physical((entry.extent + layout.leadIn + offset / BLOCK) * layout.sectorBytes, count * layout.sectorBytes);
      for (let i = 0; i < count; i++) {
        const data = payload(raw.subarray(i * layout.sectorBytes, (i + 1) * layout.sectorBytes));
        const length = Math.min(BLOCK, entry.size - offset);
        out.set(data.subarray(0, length), offset); offset += length;
      }
    }
    return out;
  }
  const root = record(pvd, 156, volumeBlocks);
  check(root.flags & 2, 'ISO root is not a directory');
  const found = new Map(), visited = new Set(), queue = [{entry: root, path: '', depth: 0}];
  let directories = 0, entries = 0, directoryBytes = 0;
  while (queue.length) {
    const current = queue.shift(), key = `${current.entry.extent}:${current.entry.size}`;
    if (visited.has(key)) continue;
    visited.add(key);
    check(current.depth <= 8 && ++directories <= 128, 'ISO directory traversal limit exceeded');
    directoryBytes += current.entry.size;
    check(directoryBytes <= 16 * 1024 ** 2, 'ISO directory data limit exceeded');
    const bytes = await extent(current.entry, 4 * 1024 ** 2);
    for (let p = 0; p < bytes.length;) {
      if (!bytes[p]) { p = (Math.floor(p / BLOCK) + 1) * BLOCK; continue; }
      check(++entries <= 16384, 'ISO directory entry limit exceeded');
      const entry = record(bytes, p, volumeBlocks); p += entry.length;
      if (entry.special) continue;
      check(!/[\\/\0]/.test(entry.name), 'Invalid ISO directory name');
      const name = entry.name.toUpperCase(), pathname = current.path + '/' + entry.name;
      if (entry.flags & 2) queue.push({entry, path: pathname, depth: current.depth + 1});
      else if (['SLUS_004.02', 'TEKKEN3.BNS'].includes(name)) {
        check(!found.has(name), `Ambiguous duplicate ${name} in disc image`);
        found.set(name, {...entry, path: pathname});
      }
    }
  }
  check(found.size === 2, 'Disc image must contain original USA SLUS_004.02 and TEKKEN3.BNS');
  check([...found.values()].reduce((sum, entry) => sum + entry.size, 0) <= MAX_FILE, 'Extracted game files exceed 1 GiB limit');
  const files = [];
  for (const name of ['SLUS_004.02', 'TEKKEN3.BNS']) {
    const entry = found.get(name);
    check(entry.size > 0, `Empty ${name} in disc image`);
    files.push({name, data: await extent(entry)});
  }
  return {files, report: {
    schema: 't3cs-disc-extraction/1', sectorLayout: layout.label, leadInSectors: layout.leadIn,
    volumeBlocks, availableBlocks, logicalBlockSize, warnings,
    completeDeclaredVolumePresent: volumeBlocks <= availableBlocks,
    sourceModified: false, retailExecutableVerified: false,
    files: [...found].map(([name, e]) => ({name, isoPath: e.path, sector: e.extent, bytes: e.size})),
    limitations: ['ISO9660 extraction only; executable and donor validation must follow.', 'Raw sector sync/mode/subheaders are checked; EDC/ECC are not verified or rebuilt.'],
  }};
}
export function discBytesSource(bytes) {
  return {size: bytes.length, read: async (offset, length) => bytes.slice(offset, offset + length)};
}
