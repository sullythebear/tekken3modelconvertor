import {
  mkdir,
  readFile,
  writeFile,
  copyFile,
  readdir,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const root = "public-review",
  version = "0.7.0-dev.9",
  hash = (b) => createHash("sha256").update(b).digest("hex");
const unit = await readFile("artifacts/dev9/final-unit.xml", "utf8"),
  count = (n) =>
    Number(unit.match(new RegExp(`<!-- ${n} (\\d+) -->`))?.[1] ?? NaN),
  tests = {
    passed: count("pass"),
    failed: count("fail"),
    skipped: count("skipped"),
  };
if (tests.passed < 242 || tests.failed !== 0 || tests.skipped !== 0)
  throw Error("Full dev.9 unit suite not passed");
const files = [];
async function include(from, to) {
  await mkdir(path.dirname(path.join(root, to)), { recursive: true });
  await copyFile(from, path.join(root, to));
  files.push(to);
}
// Explicitly safe, author-owned documentation, count/hash receipts and test logs.
await include("docs/REVIEW_070_DEV9.md", "REVIEW.md");
await include("docs/DEV9_WORKLOG.md", "DEV9_WORKLOG.md");
await include("artifacts/dev9/final-unit.xml", "cloud-unit.xml");
await include(
  "artifacts/project-roundtrip/results.json",
  "cloud-nikki-project.json",
);
for (const name of [
  "native",
  "skinning",
  "mapping",
  "desktop",
  "portable-source",
  "reference",
  "visual",
  "art-presets",
])
  await include(`artifacts/dev9/final-${name}.log`, `dev9-${name}.txt`);
for (const name of [
  "bake-ablation-provenance",
  "skipped-work-image-provenance",
  "hand-bake-paired",
  "lookup-image-provenance",
  "parser-lifetime-evidence",
  "windows-source-comparison",
  "gallery-browser",
  "gallery-browser-cloud-file",
  "rejected-card-experiment",
  "rejected-directional-experiment",
  "rejected-appearance-experiment",
])
  await include(`artifacts/dev9/${name}.json`, `dev9/${name}.json`);
const summary = JSON.parse(
  await readFile(root + "/dev9/technical-summary.json", "utf8"),
);
await writeFile(
  root + "/cloud-validation.json",
  JSON.stringify(
    {
      version,
      tests,
      gameVerified: false,
      artisticAcceptance: "PENDING USER REVIEW",
      modelChecks: summary.results.map((r) => ({
        id: r.id,
        model: r.model,
        triangles: r.triangles,
        unexpectedEdges: r.integrity.unexpectedEdges,
        inconsistentWinding: r.integrity.inconsistentWinding,
        exportValidation: r.exportValidation,
      })),
      faceCore: summary.faceCore,
    },
    null,
    2,
  ),
);
files.push("cloud-validation.json");
await writeFile(
  root + "/index.html",
  '<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dev.9 visuele beoordeling</title><h1>Tekken 3 Conversion Studio 0.7.0-dev.9</h1><p><a href="dev9/index.html">Open het volledige HTML-vergelijkingsrapport</a></p><p><a href="REVIEW.md">Teststatus en resterende problemen</a> · <a href="WINDOWS-STATUS.md">Windows-metingen</a></p><p>Menselijke artistieke goedkeuring en echte gamevalidatie ontbreken nog. Geen originele bronassets, textures, projecten of gamebestanden opgenomen.</p></html>',
);
files.push("index.html");
files.push("WINDOWS-STATUS.md");
async function gallery(dir) {
  for (const e of await readdir(path.join(root, dir), {
    withFileTypes: true,
  })) {
    if (e.isSymbolicLink()) throw Error("No evidence symlinks");
    const file = path.posix.join(dir, e.name);
    if (e.isDirectory()) await gallery(file);
    else {
      if (
        (!/\.(png|html|json)$/i.test(e.name) &&
          e.name !== "CESIUM-ATTRIBUTION.txt") ||
        /scene-private|pre-export|simulation|atlas\.png/i.test(e.name)
      )
        throw Error("Unexpected gallery file: " + file);
      if (
        e.name.endsWith(".png") &&
        !/-(source|prepared|unbaked)\.png$/.test(e.name)
      )
        throw Error("Not a renderer screenshot: " + file);
      files.push(file);
    }
  }
}
await gallery("dev9");
const manifest = {
  version,
  galleryPath: "dev9/index.html",
  generated: new Date().toISOString(),
  tests,
  sourceFilesPublished: false,
  gameVerified: false,
  artisticAcceptance: "PENDING HUMAN REVIEW",
  files: [],
};
for (const file of [...new Set(files)].sort()) {
  const bytes = await readFile(path.join(root, file));
  manifest.files.push({ path: file, bytes: bytes.length, sha256: hash(bytes) });
}
await writeFile(
  root + "/evidence-manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Explicit dev.9 evidence allowlist:",
  manifest.files.length,
  "files. Historical review folders preserved, excluded from this payload.",
);
