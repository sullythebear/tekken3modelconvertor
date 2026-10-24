import {readT3CM} from "../src/core/exporter.js";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import {
  decodeDonor,
  decodeTextureArchive,
  materialTexel,
} from "../src/core/donor.js";
import { browserSession } from "./browser.mjs";
await mkdir("artifacts/native", { recursive: true });
const session = await browserSession();
try {
  const { page, errors } = session;
  await page.selectOption('#art-preset','baseline'); // Isolate the unchanged native codec route.
  await page.evaluate(async () => {
    const t = window.studioTest,
      f = await t.nativeSyntheticFixture();
    await t.load([{ name: "synthetic-native-source.glb", data: f.source }]);
    await t.loadDonor([
      { name: "synthetic-donor.3dm", data: f.donor },
      { name: "synthetic-donor.arc", data: f.arc },
    ]);
    await t.loadBindProfile(f.profile);
  });
  assert.equal(await page.locator("#native-build").isEnabled(), true);
  await page.click("#native-build");
  await page.waitForFunction(
    () =>
      window.studioTest.nativeCandidate &&
      !document.querySelector("#native-build").disabled,
    null,
    { timeout: 60000 },
  );
  const report = await page.evaluate(
    () => window.studioTest.nativeCandidate.report,
  );
  assert.equal(report.gameVerified, false);
  assert.equal(report.topology.triangles, 1);
  assert.equal(report.baking.paintedTiles, 1);
  assert.equal(await page.locator("#game-export").isDisabled(), true);
  assert.match(await page.locator("#source-label").innerText(), /DONOR BIND/);
  await page.screenshot({
    path: "artifacts/native/workspace.png",
    fullPage: true,
  });
  const cameras = await page.evaluate(() => {
    const t = window.studioTest;
    return [
      t.sourceView.camera.position.toArray(),
      t.resultView.camera.position.toArray(),
    ];
  });
  assert.deepEqual(cameras[0], cameras[1]);
  const promise = page.waitForEvent("download");
  await page.click("#native-export");
  const download = await promise;
  await download.saveAs("artifacts/native/synthetic-native-candidate.zip");
  const zip = unzipSync(
      new Uint8Array(
        await readFile("artifacts/native/synthetic-native-candidate.zip"),
      ),
    ),
    native = decodeDonor(zip["candidate.3dm"]),
    arc = decodeTextureArchive(zip["candidate.arc"]);
  assert.equal(native.report.triangles, 1);
  assert.ok(native.ownVertices.every((v) => v.position[1] === 2));
  assert.deepEqual(materialTexel(arc, 64, 2, 2).color, [255, 0, 0, 255]);
  assert.equal(
    Object.keys(zip).some((k) => k.endsWith(".glb")),
    false,
  );
  const expandedDownloadPromise = page.waitForEvent("download");
  await page.click("#expanded-export");
  const expandedDownload = await expandedDownloadPromise;
  await expandedDownload.saveAs("artifacts/native/expanded-container-candidate.zip");
  const expandedZIP = unzipSync(new Uint8Array(await readFile("artifacts/native/expanded-container-candidate.zip")));
  const container = readT3CM(expandedZIP["model.bin"]);
  assert.deepEqual(container.model, zip["candidate.3dm"]);
  assert.deepEqual(container.relocations, zip["candidate.relocs"]);
  assert.equal(container.version, 2);
  assert.equal(container.modelId, 10);
  assert.equal(container.texture.runs[0].id, 64);
  const expandedManifest = JSON.parse(new TextDecoder().decode(expandedZIP["manifest.json"]));
  assert.equal(expandedManifest.gameVerified, false);
  assert.equal(expandedManifest.loaderIncluded, false);
  assert.equal(expandedManifest.loaderVerified, false);
  await page.click("#source-pose");
  assert.equal(await page.locator("#source-label").innerText(), "SOURCE");
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/native/results.json",
    JSON.stringify(
      {
        asset: "procedural fixture, NOT Nikki/Nina",
        passed: [
          "source import and donor/profile dialogs data",
          "retarget + donor surface reconstruction",
          "original UV texture bake and flat native normals",
          "actual 3DMK/ARC/relocations ZIP; no GLB substitute",
          "reimported native geometry/texel contents and camera equality",
          "return to original source view",
          "T3CM/T3TX UI export decodes to identical native model and complete relocations",
        ],
        report,
        windows: "NOT TESTED",
        game: "NOT TESTED",
      },
      null,
      2,
    ),
  );
  console.log(
    "Native UI reconstruction, export, reimport and texel validation passed (synthetic fixture only).",
  );
} catch (e) {
  await session.page.screenshot({
    path: "artifacts/native/failure.png",
    fullPage: true,
  });
  console.error(await session.page.locator("#status").innerText());
  throw e;
} finally {
  await session.close();
}
