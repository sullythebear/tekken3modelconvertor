import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
const script = path.resolve("scripts/finalize-review-browser.mjs"),
  hash = (b) => createHash("sha256").update(b).digest("hex");
async function fixture() {
  const cwd = await mkdtemp(path.join(tmpdir(), "t3cs-authored-review-")),
    root = path.join(cwd, "public-review"),
    payload = path.join(cwd, "artifacts/review-payload");
  await mkdir(root, { recursive: true });
  await mkdir(payload, { recursive: true });
  const html = Buffer.from(
      "<!doctype html><title>Authored test report only</title>",
    ),
    manifest = {
      version: "0.7.0-dev.9",
      galleryPath: "index.html",
      windowsValidated: true,
      files: [{ path: "index.html", bytes: html.length, sha256: hash(html) }],
    },
    receipt = {
      version: manifest.version,
      status: "PASS",
      offlineFileTest: true,
      onlineRequests: [],
      pageErrors: [],
      gallerySha256: hash(html),
      fixtureOnly: true,
    };
  for (const dir of [root, payload]) {
    await writeFile(path.join(dir, "index.html"), html);
    await writeFile(
      path.join(dir, "evidence-manifest.json"),
      JSON.stringify(manifest),
    );
  }
  return {
    cwd,
    root,
    payload,
    manifest,
    receipt,
    async write() {
      await writeFile(
        path.join(root, "windows-gallery-browser.json"),
        JSON.stringify(this.receipt),
      );
    },
    run() {
      return spawnSync(process.execPath, [script], { cwd, encoding: "utf8" });
    },
    async close() {
      await rm(cwd, { recursive: true, force: true });
    },
  };
}
test("Authored publication receipt gate adds only a matching offline-browser receipt to both measured manifests", async () => {
  const f = await fixture();
  try {
    await f.write();
    const r = f.run();
    assert.equal(r.status, 0, r.stderr);
    const a = JSON.parse(
        await readFile(path.join(f.root, "evidence-manifest.json")),
      ),
      b = JSON.parse(
        await readFile(path.join(f.payload, "evidence-manifest.json")),
      );
    assert.deepEqual(a, b);
    assert.equal(a.offlineWindowsReportValidated, true);
    assert.equal(a.files.length, 2);
    const bytes = await readFile(
      path.join(f.payload, "windows-gallery-browser.json"),
    );
    assert.equal(
      a.files.find((p) => p.path === "windows-gallery-browser.json").sha256,
      hash(bytes),
    );
  } finally {
    await f.close();
  }
});
test("Authored publication receipt gate rejects an HTTP-only render or external dependencies as offline proof", async () => {
  for (const patch of [
    { offlineFileTest: false },
    { onlineRequests: ["https://authored.invalid/online-dependency"] },
  ]) {
    const f = await fixture();
    try {
      Object.assign(f.receipt, patch);
      await f.write();
      assert.notEqual(f.run().status, 0);
      assert.equal(
        JSON.parse(await readFile(path.join(f.root, "evidence-manifest.json")))
          .files.length,
        1,
      );
    } finally {
      await f.close();
    }
  }
});
test("Authored publication receipt gate rejects stale gallery hashes and evidence changed after staging", async () => {
  for (const changed of ["receipt", "manifest"]) {
    const f = await fixture();
    try {
      if (changed === "receipt") f.receipt.gallerySha256 = "0".repeat(64);
      else
        await writeFile(
          path.join(f.payload, "evidence-manifest.json"),
          JSON.stringify({ ...f.manifest, windowsValidated: false }),
        );
      await f.write();
      assert.notEqual(f.run().status, 0);
      assert.equal(
        JSON.parse(await readFile(path.join(f.root, "evidence-manifest.json")))
          .files.length,
        1,
      );
    } finally {
      await f.close();
    }
  }
});
