import { mkdir, writeFile } from "node:fs/promises";
import { browserSession } from "./browser.mjs";
await mkdir("artifacts/benchmark", { recursive: true });
const s = await browserSession();
try {
  const { page } = s;
  await page.evaluate(async () => {
    const data = await window.studioTest.syntheticCharacter();
    await window.studioTest.load([{ name: "synthetic-benchmark.glb", data }]);
  });
  const results = [];
  for (const priority of [1, 2, 4]) {
    await page.evaluate((p) => {
      document.querySelector("#head").value = String(p);
      document.querySelector("#triangles").value = "900";
      document.querySelector("#error").value = ".2";
      document.querySelector("#bake").checked = false;
    }, priority);
    await page.click("#convert");
    await page.waitForFunction(
      () => !document.querySelector("#convert").disabled,
      null,
      { timeout: 60000 },
    );
    const r = await page.evaluate(() => window.studioTest.report());
    results.push({
      headPriority: priority,
      before: r.source.stats.triangles,
      after: r.conversion.stats.triangles,
      headTriangles: r.conversion.regions
        .filter((p) => p.region === "head")
        .reduce((a, p) => a + p.after, 0),
      headOriginal: r.conversion.regions
        .filter((p) => p.region === "head")
        .reduce((a, p) => a + p.before, 0),
      invalidPositions: r.conversion.stats.invalidPositions,
      poses: r.conversion.poses,
    });
  }
  await writeFile(
    "artifacts/benchmark/results.json",
    JSON.stringify(
      {
        asset: "procedural humanoid, NOT Nikki",
        comparison:
          "anatomical allocation with varied head weighting; NOT an ML/reference retopology comparison",
        results,
        conclusion:
          "Only geometric allocation and rig diagnostics are measured. Identity and game animation quality are unverified.",
      },
      null,
      2,
    ),
  );
  console.log(
    results.map(({ headPriority, after, headTriangles }) => ({
      headPriority,
      after,
      headTriangles,
    })),
  );
} finally {
  await s.close();
}
