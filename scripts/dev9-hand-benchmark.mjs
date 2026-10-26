import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { writeFile } from "node:fs/promises";
import * as THREE from "three";
import { MeshoptSimplifier } from "meshoptimizer";
import { authoredHand } from "../tests/fixtures/authored-hand.mjs";
import { reconstructAnatomicalHand } from "../src/core/hand-reconstruction.js";
await MeshoptSimplifier.ready;
const fixture = authoredHand(true),
  data = new Uint8Array(32 * 32 * 4);
for (let y = 0; y < 32; y++)
  for (let x = 0; x < 32; x++)
    data.set([x * 8, y * 8, (x + y) * 4, 255], (y * 32 + x) * 4);
fixture.material.map = new THREE.DataTexture(data, 32, 32);
const results = [];
for (let i = 0; i < 5; i++) {
  const start = performance.now(),
    r = reconstructAnatomicalHand(fixture.g, fixture.material, {
      ...fixture,
      simplifier: MeshoptSimplifier,
      textureSize: 256,
    });
  if (!r.geometry) throw Error(r.reason);
  const durationMs = performance.now() - start,
    sha256 = createHash("sha256")
      .update(r.material.map.image.data)
      .digest("hex");
  results.push({ durationMs, sha256, triangles: r.triangles });
  r.geometry.dispose();
  r.material.map.dispose();
  r.material.dispose();
}
const sorted = results
    .slice(1)
    .map((r) => r.durationMs)
    .sort((a, b) => a - b),
  report = {
    platform: process.platform,
    method:
      "Node CPU hand stage; one warmup plus four samples, not a Windows app benchmark",
    medianMs: (sorted[1] + sorted[2]) / 2,
    results,
  };
if (process.argv[2])
  await writeFile(process.argv[2], JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
