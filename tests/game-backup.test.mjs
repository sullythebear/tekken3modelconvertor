import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { backupGameFiles, readGameBackup } from "../src/core/game-backup.js";
import { restoreGameFiles, restorePatch } from "../src/core/backup.mjs";
import { zipSync, strToU8 } from "fflate";
test("Two-file game backup round-trips real contents with SHA256 and restores to a fresh folder", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "t3cs-restore-"));
  try {
    const exe = new Uint8Array([1, 2, 3]),
      bns = new Uint8Array([4, 5, 6]),
      zip = await backupGameFiles({ executable: exe, bns }),
      entries = await readGameBackup(zip),
      r = await restoreGameFiles(dir, path.join(dir, "backups"), entries);
    assert.equal(r.restored, 2);
    assert.equal(r.replaced, 0);
    assert.deepEqual(
      new Uint8Array(await readFile(path.join(dir, "SLUS_004.02"))),
      exe,
    );
    assert.deepEqual(
      new Uint8Array(await readFile(path.join(dir, "TEKKEN3.BNS"))),
      bns,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("Restore over modified files makes a byte-exact rollback backup and rejects corrupt data", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "t3cs-restore-"));
  try {
    await writeFile(path.join(dir, "SLUS_004.02"), "modded-exe");
    await writeFile(path.join(dir, "TEKKEN3.BNS"), "modded-bns");
    const entries = await readGameBackup(
        await backupGameFiles({
          executable: new Uint8Array([1, 2]),
          bns: new Uint8Array([3, 4]),
        }),
      ),
      r = await restoreGameFiles(dir, path.join(dir, "backups"), entries);
    assert.equal(r.replaced, 2);
    await restorePatch(dir, r.rollbackBackup);
    assert.equal(
      await readFile(path.join(dir, "SLUS_004.02"), "utf8"),
      "modded-exe",
    );
    assert.equal(
      await readFile(path.join(dir, "TEKKEN3.BNS"), "utf8"),
      "modded-bns",
    );
    entries[0].data[0] = 99;
    await assert.rejects(
      restoreGameFiles(dir, path.join(dir, "backups"), entries),
      /hash/,
    );
    assert.equal(
      await readFile(path.join(dir, "TEKKEN3.BNS"), "utf8"),
      "modded-bns",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("Backup decoder rejects unexpected paths, malformed schema and missing data", async () => {
  await assert.rejects(
    readGameBackup(zipSync({ "../escape": new Uint8Array([1]) })),
    /Unexpected/,
  );
  await assert.rejects(
    readGameBackup(zipSync({ "manifest.json": strToU8("{}") })),
    /Incomplete/,
  );
});
