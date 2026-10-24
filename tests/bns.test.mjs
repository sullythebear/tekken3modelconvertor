import test from "node:test";
import assert from "node:assert/strict";
import {
  readDiscTable,
  inspectDiscAssets,
  patchDiscCopy,
  USA_DISC,
} from "../src/core/bns.js";
import { digest } from "../src/core/bind.js";
import { write3DMK } from "../src/core/native.js";
import { writeARC, writeTIM } from "../src/core/ps1.js";
import {bnsFixture as fixture} from "../scripts/bns-fixture.mjs";
test("USA archive extraction is tied to executable table, capacities and exact model records", async () => {
  const f = await fixture(),
    assets = await inspectDiscAssets({
      executable: f.exe,
      bns: f.bns,
      profile: f.profile,
    });
  assert.deepEqual(assets.model, f.model);
  assert.deepEqual(assets.arc, f.arc);
  assert.equal(assets.report.modelRecord, 111);
  assert.equal(assets.report.retailExecutableVerified, false);
  await assert.rejects(readDiscTable(f.exe), /SHA-256/);
});
test("Patched BNS copy changes only donor records and preserves the original input and executable", async () => {
  const f = await fixture(),
    before = f.bns.slice(),
    modified = f.model.slice();
  const d = new DataView(modified.buffer),
    normalOffset = d.getUint32(24 + 56, true);
  d.setInt16(normalOffset + 16, 100, true);
  const candidate = {
      model: modified,
      arc: f.arc,
      report: { donorSha256: await digest(f.model) },
    },
    patched = await patchDiscCopy({
      executable: f.exe,
      bns: f.bns,
      candidate,
      profile: f.profile,
    });
  assert.deepEqual(f.bns, before);
  assert.equal(patched.bytes.length, f.bns.length);
  assert.notDeepEqual(
    patched.bytes.slice(111 * 2048, 112 * 2048),
    f.bns.slice(111 * 2048, 112 * 2048),
  );
  assert.deepEqual(
    patched.bytes.slice(0, 111 * 2048),
    f.bns.slice(0, 111 * 2048),
  );
  assert.deepEqual(patched.bytes.slice(112 * 2048), f.bns.slice(112 * 2048));
  assert.equal(patched.manifest.sourceModified, false);
  assert.equal(patched.manifest.gameVerified, false);
});
test("Archive export rejects mismatched donors, oversized models and changed ARC sizes", async () => {
  const f = await fixture(),
    base = { executable: f.exe, bns: f.bns, profile: f.profile },
    candidate = {
      model: f.model,
      arc: f.arc,
      report: { donorSha256: "wrong" },
    };
  await assert.rejects(patchDiscCopy({ ...base, candidate }), /does not match/);
  candidate.report.donorSha256 = await digest(f.model);
  await assert.rejects(
    patchDiscCopy({
      ...base,
      candidate: { ...candidate, model: new Uint8Array(f.model.length + 1) },
    }),
    /capacity/,
  );
  await assert.rejects(
    patchDiscCopy({
      ...base,
      candidate: { ...candidate, arc: new Uint8Array(2) },
    }),
    /record size/,
  );
});
