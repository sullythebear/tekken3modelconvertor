import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  symlink,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { applyPatch, restorePatch, sha256 } from "../src/core/backup.mjs";
async function fixture(fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "t3cs-test-"));
  try {
    const root = path.join(dir, "game"),
      backup = path.join(dir, "backups");
    await mkdir(root);
    await writeFile(path.join(root, "model.bin"), "original");
    await fn({ dir, root, backup });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
test("Transactional patch and restore verify actual bytes, SHA256 and backups", () =>
  fixture(async ({ root, backup }) => {
    const plan = [
        {
          path: "model.bin",
          expectedSha256: sha256(Buffer.from("original")),
          data: Buffer.from("new"),
        },
      ],
      saved = await applyPatch(root, backup, plan);
    assert.equal(await readFile(path.join(root, "model.bin"), "utf8"), "new");
    assert.equal(await restorePatch(root, saved), 1);
    assert.equal(
      await readFile(path.join(root, "model.bin"), "utf8"),
      "original",
    );
  }));
test("Wrong source hash refuses writes", () =>
  fixture(async ({ root, backup }) => {
    await assert.rejects(
      applyPatch(root, backup, [
        { path: "model.bin", expectedSha256: "bad", data: Buffer.from("x") },
      ]),
      /changed/,
    );
    assert.equal(
      await readFile(path.join(root, "model.bin"), "utf8"),
      "original",
    );
  }));
test("Restore refuses to overwrite independent edits", () =>
  fixture(async ({ root, backup }) => {
    const saved = await applyPatch(root, backup, [
      {
        path: "model.bin",
        expectedSha256: sha256(Buffer.from("original")),
        data: Buffer.from("new"),
      },
    ]);
    await writeFile(path.join(root, "model.bin"), "user edit");
    await assert.rejects(restorePatch(root, saved), /changed/);
    assert.equal(
      await readFile(path.join(root, "model.bin"), "utf8"),
      "user edit",
    );
  }));
test("Traversal, duplicate targets and symlinks cannot escape the game directory", () =>
  fixture(async ({ root, backup, dir }) => {
    await writeFile(path.join(dir, "outside"), "private");
    await symlink(path.join(dir, "outside"), path.join(root, "link"));
    for (const name of ["../outside", "link"])
      await assert.rejects(
        applyPatch(root, backup, [
          {
            path: name,
            expectedSha256: sha256(Buffer.from("private")),
            data: Buffer.from("oops"),
          },
        ]),
        /Unsafe|Symlink/,
      );
    assert.equal(await readFile(path.join(dir, "outside"), "utf8"), "private");
  }));
