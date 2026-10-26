// Isolated import-retention diagnostic, not an app peak-RAM benchmark.
// GC is explicitly test-only and applied identically to both compared builds.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { browserSession } from "./browser.mjs";
if (!process.env.NIKKI_DIR) throw Error("Private local NIKKI_DIR required");
const output = process.env.MEMORY_OUTPUT ?? "artifacts/dev9/import-memory",
  paths = [];
await mkdir(output, { recursive: true });
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p);
    else if (/\.(fbx|tga)$/i.test(p)) paths.push(p);
  }
}
await walk(process.env.NIKKI_DIR);
if (paths.length !== 24)
  throw Error("Expected the validated 24 private input assets");
const session = await browserSession();
try {
  const { page } = session,
    client = await page.context().newCDPSession(page),
    start = performance.now();
  await page.setInputFiles("#files", paths);
  await page.waitForFunction(
    () =>
      window.studioTest.source && !document.querySelector("#import").disabled,
    null,
    { timeout: 300000 },
  );
  const durationMs = performance.now() - start;
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  const before = await client.send("Runtime.getHeapUsage");
  await client.send("HeapProfiler.collectGarbage");
  await client.send("HeapProfiler.collectGarbage");
  const after = await client.send("Runtime.getHeapUsage");
  const source = await page.evaluate(() => {
    const t = window.studioTest,
      buffers = new Set();
    let targets = 0,
      active = 0;
    t.source.root.traverse((m) => {
      if (!m.isMesh) return;
      targets += m.geometry.morphAttributes.position?.length ?? 0;
      active += (m.morphTargetInfluences ?? []).filter((v) => v !== 0).length;
      for (const a of Object.values(m.geometry.morphAttributes).flat()) {
        const b = a.array?.buffer ?? a.data?.array?.buffer;
        if (b) buffers.add(b);
      }
    });
    t.sourceView.reset(0);
    return {
      stats: t.source.stats,
      morphTargets: targets,
      activeMorphs: active,
      morphBuffersUniqueBytes: [...buffers].reduce(
        (n, b) => n + b.byteLength,
        0,
      ),
      shot: t.sourceView.shot(),
    };
  });
  await writeFile(
    output + "/front-source.png",
    Buffer.from(source.shot.split(",")[1], "base64"),
  );
  delete source.shot;
  if (session.errors.length) throw Error(session.errors.join("\n"));
  const report = {
    label: process.env.MEMORY_LABEL ?? "unspecified",
    scope:
      "Isolated Chromium source import; retained JS heap after two test-only GC requests, not production GC or process/GPU peak RAM",
    bundleSha256: createHash("sha256")
      .update(await readFile("dist/app.js"))
      .digest("hex"),
    durationMs,
    beforeDiagnosticGC: before,
    afterDiagnosticGC: after,
    source,
    privateSourceFilesPublished: false,
  };
  await writeFile(
    output + "/measurements.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await session.close();
}
