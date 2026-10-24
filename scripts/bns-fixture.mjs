import {USA_DISC} from "../src/core/bns.js";
import {digest} from "../src/core/bind.js";
import {write3DMK} from "../src/core/native.js";
import {writeARC,writeTIM} from "../src/core/ps1.js";
export async function bnsFixture() {
  const exe = new Uint8Array(0x87000),
    v = new DataView(exe.buffer);
  exe.set(new TextEncoder().encode("PS-X EXE"));
  v.setUint32(0x10, USA_DISC.entryPC, true);
  v.setUint32(0x18, USA_DISC.loadAddress, true);
  v.setUint32(0x1c, USA_DISC.textSize, true);
  const header = new Uint8Array(16000),
    h = new DataView(header.buffer);
  h.setUint32(0, 27, true);
  h.setUint32(4, 100, true);
  h.setUint32(8, 0x4b4d4433, true);
  h.setUint32(16, 1536, true);
  const model = write3DMK({
      donor: header,
      parts: [
        {
          row: 1,
          positions: [
            [0, 0, 0],
            [10, 0, 0],
            [0, 10, 0],
          ],
          triangles: [[0, 1, 2]],
          uvs: [
            [0, 0],
            [15, 0],
            [0, 15],
          ],
        },
      ],
      maxBytes: 16000,
    }).model,
    palette = new Uint16Array(16);
  palette[1] = 31;
  const arc = writeARC([
      writeTIM({
        width: 16,
        height: 16,
        palette,
        indices: new Uint8Array(256).fill(1),
      }),
    ]),
    bns = new Uint8Array(303 * 2048);
  for (let i = 0; i < 303; i++) {
    v.setUint32(USA_DISC.tableOffset + i * 8, i, true);
    v.setUint32(USA_DISC.tableOffset + i * 8 + 4, 0, true);
  }
  for (const [id, data] of [
    [111, model],
    [112, new Uint8Array([7, 8])],
    [113, arc],
  ]) {
    bns.set(data, id * 2048);
    v.setUint32(USA_DISC.tableOffset + id * 8 + 4, data.length, true);
  }
  v.setUint32(USA_DISC.modelSizeOffset + 120, model.length, true);
  v.setUint32(USA_DISC.modelSizeOffset + 124, 2, true);
  v.setUint32(USA_DISC.modelSizeOffset + 128, arc.length, true);
  return {
    exe,
    bns,
    model,
    arc,
    profile: { ...USA_DISC, exeSha256: await digest(exe) },
  };
}
