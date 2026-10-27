// A release is assembled from the measured manifest, never a directory wildcard.
import {
  readFile,
  writeFile,
  mkdir,
  copyFile,
  readdir,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
const root = path.resolve("public-review"),
  out = path.resolve(process.env.REVIEW_PAYLOAD ?? "artifacts/review-payload"),
  manifest = JSON.parse(
    await readFile(root + "/evidence-manifest.json", "utf8"),
  ),
  hash = (b) => createHash("sha256").update(b).digest("hex");
assert.equal(
  manifest.version,
  JSON.parse(await readFile("package.json", "utf8")).version,
);
const receipts = [
  "windows-unit.xml",
  "windows-distribution.json",
  "windows-desktop.json",
  "windows-portable.json",
  "windows-nikki-project.json",
  "windows-cutout-mode.json",
  "WINDOWS-STATUS.md",
];
if (process.env.WINDOWS_RECEIPTS === "1") {
  const portable = JSON.parse(
      await readFile(root + "/windows-portable.json", "utf8"),
    ),
    project = JSON.parse(
      await readFile(root + "/windows-nikki-project.json", "utf8"),
    );
  assert.equal(portable.status, "PASS");
  assert.equal(portable.packaged, true);
  assert.equal(portable.version, manifest.version);
  assert.equal(project.status, "PASS");
  assert.equal(project.packaged, true);
  assert.equal(project.exactAssetReadback, true);
  assert.equal(project.privateTemporaryFilesRemoved, true);
  assert.equal(project.rawAssetReuse?.reusedFiles, 24);
  assert.equal(project.rawAssetReuse?.reusedBytes, 232047502);
  const cutout=JSON.parse(await readFile(root+'/windows-cutout-mode.json','utf8'));assert.equal(cutout.status,'PASS');assert.equal(cutout.packaged,true);assert.equal(cutout.version,manifest.version);assert.ok(cutout.results.some(r=>!r.bake&&r.after.soft>0&&r.after.mode===false));assert.ok(cutout.results.some(r=>r.bake&&r.after.soft===0&&r.after.mode===true));
  for (const file of receipts) {
    const b = await readFile(path.join(root, file));
    manifest.files = manifest.files.filter((f) => f.path !== file);
    manifest.files.push({ path: file, bytes: b.length, sha256: hash(b) });
  }
  manifest.windowsValidated = true;
  manifest.windowsCommit = process.env.GITHUB_SHA ?? null;
  manifest.files.sort((a, b) => a.path.localeCompare(b.path));
  await writeFile(
    root + "/evidence-manifest.json",
    JSON.stringify(manifest, null, 2) + "\n",
  );
}
await mkdir(out, { recursive: true });
assert.deepEqual(
  await readdir(out),
  [],
  "Use an empty payload destination; stale files must not enter a new release",
);
for (const f of manifest.files) {
  assert.match(f.path, /\.(png|html|json|xml|txt|md)$/i);
  assert.ok(
    !/scene-private|pre-export|project\.zip|\.fbx|\.tga|\.glb|\.tim|Model\.zip|download[_-]?url/i.test(
      f.path,
    ),
  );
  const source = path.resolve(root, f.path),
    destination = path.resolve(out, f.path);
  assert.ok(
    source.startsWith(root + path.sep) &&
      destination.startsWith(out + path.sep),
  );
  const bytes = await readFile(source);
  assert.equal(bytes.length, f.bytes, f.path + " length");
  assert.equal(hash(bytes), f.sha256, f.path + " hash");
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}
await copyFile(
  root + "/evidence-manifest.json",
  out + "/evidence-manifest.json",
);
console.log(
  "Exact allowlisted payload staged:",
  manifest.files.length,
  "files",
);
