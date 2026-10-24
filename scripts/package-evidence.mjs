import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { zipSync } from "fflate";
const pkg = JSON.parse(await readFile("package.json", "utf8")),
  version = pkg.version;
await mkdir("release", { recursive: true });
const source = {};
async function collect(dir, out) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = dir + "/" + e.name;
    if (e.isDirectory()) await collect(p, out);
    else out[p] = new Uint8Array(await readFile(p));
  }
}
for (const dir of ["src", "scripts", "tests", "docs", ".github"])
  await collect(dir, source);
for (const file of [
  "README.md",
  "LICENSE",
  ".gitignore",
  "package.json",
  "package-lock.json",
  "Test-Windows.cmd",
])
  source[file] = new Uint8Array(await readFile(file));
await writeFile(
  `release/Tekken3ConversionStudio-source-${version}.zip`,
  zipSync(source, { level: 9 }),
);
const evidence = {};
for (const dir of [
  "artifacts/visual",
  "artifacts/native",
  "artifacts/native-humanoid",
  "artifacts/source-mapping",
  "artifacts/distribution",
  "artifacts/skinning",
  "artifacts/reference",
  "artifacts/desktop",
  "artifacts/nikki",
  "artifacts/benchmark",
  "artifacts/art-director",
  "artifacts/v070",
]) {
  try {
    await collect(dir, evidence);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}
for (const key of Object.keys(evidence))
  if (key.includes("/restore-target/") || key.endsWith("/failure.png") || ((key.startsWith("artifacts/nikki/")||key.startsWith('artifacts/art-director/')||key.startsWith('artifacts/v070/')) && /\.(zip|t3prep|fbx|glb|gltf|tga|3dm|arc|bin|bns)$/i.test(key)))
    delete evidence[key];
for (const f of [
  "artifacts/unit-results.xml",
  "artifacts/production-audit.json",
])
  try {
    evidence[f] = new Uint8Array(await readFile(f));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
await writeFile(
  `release/Validation-${version}.zip`,
  zipSync(evidence, { level: 1 }),
);
const lines = [];
for (const name of (await readdir("release")).sort())
  if (name.includes(version) && /\.(exe|zip)$/.test(name)) {
    const h = createHash("sha256");
    for await (const chunk of createReadStream("release/" + name))
      h.update(chunk);
    lines.push(`${h.digest("hex")}  ${name}`);
  }
await writeFile(`release/SHA256SUMS-${version}.txt`, lines.join("\n") + "\n");
console.log(`Created source/evidence archives and SHA256SUMS for ${version}.`);
