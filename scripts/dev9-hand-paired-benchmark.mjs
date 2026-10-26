import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { writeFile, access, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";
import * as THREE from "three";
import { MeshoptSimplifier } from "meshoptimizer";
import { authoredHand } from "../tests/fixtures/authored-hand.mjs";
import { reconstructAnatomicalHand } from "../src/core/hand-reconstruction.js";
await MeshoptSimplifier.ready;
const baselineCommit = "5888a6a6015c6fce72ca335480be4c0f8c4e8c70",
  baselineFile = path.resolve(
    process.argv[2] ?? "artifacts/dev9/hand-before-raster.mjs",
  );
try {
  await access(baselineFile);
} catch (error) {
  if (error.code !== "ENOENT" || process.argv[2]) throw error;
  await mkdir(path.dirname(baselineFile), { recursive: true });
  const prefix = path
      .relative(path.dirname(baselineFile), path.resolve("src/core"))
      .split(path.sep)
      .join("/"),
    source = execFileSync(
      "git",
      ["show", baselineCommit + ":src/core/hand-reconstruction.js"],
      { encoding: "utf8" },
    ).replace(
      /(from\s*["'])\.\/([^"']+)(["'])/g,
      (_, a, b, c) => a + prefix + "/" + b + c,
    );
  await writeFile(baselineFile, source);
}
const baseline = await import(pathToFileURL(baselineFile)),
  fixture = authoredHand(true),
  data = new Uint8Array(32 * 32 * 4);
for (let y = 0; y < 32; y++)
  for (let x = 0; x < 32; x++)
    data.set([x * 8, y * 8, (x + y) * 4, 255], (y * 32 + x) * 4);
fixture.material.map = new THREE.DataTexture(data, 32, 32);
const results = { baseline: [], current: [] },
  functions = {
    baseline: baseline.reconstructAnatomicalHand,
    current: reconstructAnatomicalHand,
  };
for (let round = 0; round < 8; round++)
  for (const name of round % 2
    ? ["current", "baseline"]
    : ["baseline", "current"]) {
    const start = performance.now(),
      r = functions[name](fixture.g, fixture.material, {
        ...fixture,
        simplifier: MeshoptSimplifier,
        textureSize: 256,
      });
    if (!r.geometry) throw Error(r.reason);
    const durationMs = performance.now() - start,
      sha256 = createHash("sha256")
        .update(r.material.map.image.data)
        .digest("hex");
    if (round >= 2)
      results[name].push({ durationMs, sha256, triangles: r.triangles });
    r.geometry.dispose();
    r.material.map.dispose();
    r.material.dispose();
  }
const medians = Object.fromEntries(
    Object.entries(results).map(([name, values]) => {
      const a = values.map((v) => v.durationMs).sort((a, b) => a - b);
      return [name, (a[2] + a[3]) / 2];
    }),
  ),
  identicalTexels =
    new Set(
      Object.values(results)
        .flat()
        .map((r) => r.sha256),
    ).size === 1,
  report = {
    baselineCommit: process.argv[2] ? null : baselineCommit,
    platform: process.platform,
    node: process.version,
    method:
      "Same process, alternating AB/BA, two warmup rounds, six measured samples per method. CPU stage only, not Windows app performance.",
    identicalTexels,
    medians,
    ratio: medians.current / medians.baseline,
    results,
  };
await writeFile(
  process.argv[3] ?? "artifacts/dev9/hand-bake-paired.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (process.env.EXPECT_IDENTICAL === "1" && !identicalTexels)
  throw Error("Baked texels changed");
