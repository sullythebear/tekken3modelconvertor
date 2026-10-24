import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { browserSession } from "./browser.mjs";
await mkdir("artifacts/native-humanoid", { recursive: true });
const session = await browserSession();
try {
  const { page } = session;
  await page.selectOption('#art-preset','baseline'); // Authored donor baseline, not an art acceptance test.
  await page.evaluate(async () => {
    const t = window.studioTest,
      f = await t.nativeHumanoidFixture();
    await t.load([{ name: "procedural-human.glb", data: f.source }]);
    await t.loadDonor([
      { name: "AUTHORED-human.3dm", data: f.donor },
      { name: "AUTHORED-human.arc", data: f.arc },
    ]);
    await t.loadBindProfile(f.profile);
  });
  await page.click("#native-build");
  await page.waitForFunction(
    () => !document.querySelector("#native-build").disabled,
    null,
    { timeout: 120000 },
  );
  const report = await page.evaluate(
    () => window.studioTest.nativeCandidate?.report,
  );
  assert.ok(report, await page.locator("#status").innerText());
  assert.ok(report.topology.drawnRows >= 15);
  assert.ok(report.topology.triangles >= 300);
  assert.equal(report.gameVerified, false);
  assert.ok(report.modelBytes <= report.donorBytes);
  assert.equal(report.baking.paintedTiles, 15);
  for (const [name, angle] of [
    ["front", 0],
    ["side", Math.PI / 2],
    ["back", Math.PI],
  ]) {
    const shots = await page.evaluate((a) => {
      const t = window.studioTest;
      t.sourceView.reset(a);
      t.resultView.sync(t.sourceView);
      return [t.sourceView.shot(), t.resultView.shot()];
    }, angle);
    for (const [i, kind] of ["retargeted-source", "native"].entries())
      await writeFile(
        `artifacts/native-humanoid/${name}-${kind}.png`,
        Buffer.from(shots[i].split(",")[1], "base64"),
      );
  }
  await page.check("#skeleton");
  const helpers = await page.evaluate(() => {
    const t = window.studioTest;
    return [
      t.sourceView.helper.geometry.attributes.position.count,
      t.resultView.helper.geometry.attributes.position.count,
    ];
  });
  assert.ok(helpers.every((n) => n >= 30));
  await page.check("#wireframe");
  assert.equal(
    await page.evaluate(() =>
      window.studioTest.nativeCandidate.preview.children.every(
        (m) => m.material.wireframe,
      ),
    ),
    true,
  );
  await page.uncheck("#wireframe");
  await page.uncheck("#skeleton");
  await page.screenshot({
    path: "artifacts/native-humanoid/workspace.png",
    fullPage: true,
  });
  await writeFile(
    "artifacts/native-humanoid/results.json",
    JSON.stringify(
      {
        asset: "Authored procedural humanoid and donor. NOT Nikki or Nina.",
        report,
        game: "NOT TESTED",
      },
      null,
      2,
    ),
  );
  console.log(
    `Authored humanoid: ${report.topology.triangles} native triangles, ${report.topology.drawnRows} rows, ${report.baking.paintedTiles} rebaked tiles; ${report.modelBytes}/${report.donorBytes} bytes.`,
  );
} catch (e) {
  await session.page.screenshot({
    path: "artifacts/native-humanoid/failure.png",
    fullPage: true,
  });
  console.error(await session.page.locator("#status").innerText());
  throw e;
} finally {
  await session.close();
}
