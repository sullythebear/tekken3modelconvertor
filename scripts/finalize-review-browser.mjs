import { readFile, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const root = path.resolve("public-review"),
  payload = path.resolve(
    process.env.REVIEW_PAYLOAD ?? "artifacts/review-payload",
  ),
  filename = "windows-gallery-browser.json",
  bytes = await readFile(path.join(root, filename)),
  receipt = JSON.parse(bytes),
  manifest = JSON.parse(
    await readFile(root + "/evidence-manifest.json", "utf8"),
  ),
  staged = JSON.parse(
    await readFile(payload + "/evidence-manifest.json", "utf8"),
  );
assert.equal(receipt.status, "PASS");
assert.equal(receipt.offlineFileTest, true);
assert.equal(receipt.version, manifest.version);
assert.deepEqual(receipt.onlineRequests, []);
assert.deepEqual(receipt.pageErrors, []);
assert.equal(
  receipt.gallerySha256,
  manifest.files.find((f) => f.path === manifest.galleryPath).sha256,
);
assert.equal(manifest.windowsValidated, true);
assert.deepEqual(
  staged,
  manifest,
  "Do not alter evidence between staging and the real offline browser test",
);
assert.ok(!manifest.files.some((f) => f.path === filename));
manifest.files.push({
  path: filename,
  bytes: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
});
manifest.files.sort((a, b) => a.path.localeCompare(b.path));
manifest.offlineWindowsReportValidated = true;
await copyFile(path.join(root, filename), path.join(payload, filename));
const output = JSON.stringify(manifest, null, 2) + "\n";
await writeFile(root + "/evidence-manifest.json", output);
await writeFile(payload + "/evidence-manifest.json", output);
console.log(
  "Real offline Windows report receipt added to immutable measured payload.",
);
