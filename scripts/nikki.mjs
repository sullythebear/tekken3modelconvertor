import {silhouetteComparison} from "./render-metrics.mjs";
import {readDonorPackage} from "../src/core/donor-package.js";
import {downloadDriveZIP} from "./drive-download.mjs";
import {unpackNikkiZIP} from "./nikki-assets.mjs";
import { readdir, readFile, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { browserSession } from "./browser.mjs";
import { inspectDiscAssets } from "../src/core/bns.js";
const output = "artifacts/nikki";
await mkdir(output, { recursive: true });
let dir = process.env.NIKKI_DIR;
let acquisitionFailure = null;
if (!dir && (process.env.NIKKI_URL || process.env.NIKKI_ZIP)) {
  try {
    const zip = process.env.NIKKI_ZIP ?? "artifacts/fixtures/Nikki-Model.zip";
    if (process.env.NIKKI_URL) {
      let cached = false; try { await access(zip); cached = true; } catch {}
      if (!cached) await downloadDriveZIP(process.env.NIKKI_URL, zip);
    }
    dir = await unpackNikkiZIP(zip);
  } catch (error) { acquisitionFailure = error.message; }
}
async function blocked(reason) {
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      {
        status: "BLOCKED",
        reason,
        import: "NOT RUN",
        native: "NOT RUN",
        visualIdentity: "NOT RUN",
        game: "NOT RUN",
      },
      null,
      2,
    ),
  );
  console.error(reason);
  process.exitCode = 2;
}
async function capture(page, suffix) {
  const metrics = [];
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
    for (const [i, kind] of (suffix === "native"
      ? ["retargeted-source", "native"]
      : ["source", "prepared"]
    ).entries())
      await writeFile(
        `${output}/${name}-${kind}.png`,
        Buffer.from(shots[i].split(",")[1], "base64"),
      );
    if (suffix === "prepared") metrics.push({angle: name, ...await silhouetteComparison(page)});
  }
  return metrics;
}
if (!dir)
  await blocked(
    acquisitionFailure ? "Nikki asset acquisition blocked: " + acquisitionFailure : "Set NIKKI_DIR, NIKKI_ZIP or NIKKI_URL to run the supplied Nikki assets.",
  );
else {
  const records = [];
  async function visit(current) {
    for (const e of await readdir(current, { withFileTypes: true })) {
      const file = path.join(current, e.name);
      if (e.isDirectory()) await visit(file);
      else if (/\.(fbx|tga|png|jpe?g|glb|gltf|bin|mtl)$/i.test(e.name))
        records.push({ name: e.name, path: file });
    }
  }
  await visit(dir);
  const model = records.find((f) => f.name.toLowerCase() === "nikki fn.fbx"),
    tgas = records.filter((f) => /\.tga$/i.test(f.name));
  if (!model || tgas.length !== 23)
    await blocked(
      `Expected Nikki FN.fbx and 23 TGA files, found model=${Boolean(model)}, TGAs=${tgas.length}.`,
    );
  else {
    const session = await browserSession();
    const { page } = session;
    try {
      // Pass local paths to Chromium; do not serialize hundreds of MB as JSON number arrays.
      await page.setInputFiles("#files", [
        model.path,
        ...records.filter((r) => r !== model).map((f) => f.path),
      ]);
      await page.waitForFunction(
        () =>
          Boolean(window.studioTest.source) &&
          !document.querySelector("#import").disabled,
        null,
        { timeout: 300000 },
      );
      const original = await page.evaluate(() => window.studioTest.report());
      if (
        !original.source.stats.triangles ||
        !original.source.skeleton.boneCount
      )
        throw Error("Nikki import is missing geometry or source bones");
      if (original.source.stats.meshes !== 6 || original.source.stats.triangles !== 44112 || original.source.skeleton.boneCount !== 433)
        throw Error("Nikki reference geometry/skeleton counts differ from the supplied asset");
      if (original.source.skinning.maxInfluences !== 8)
        throw Error("Nikki reference eight-influence skinning was not preserved");
      const materialChecks = await page.evaluate(() => {
        const t = window.studioTest, mats = t.report().source.materials;
        const required = [/FaceAcc_Alt_Under/, /_Body$/, /_Eyelashes$/, /_Teeth$/, /Eye_sclera$/, /Eye_iris$/, /_Head$/];
        return {mapped: required.every(pattern => mats.some(m => pattern.test(m.name) && m.textures.map?.width > 0)),
          hair: mats.find(m => /FaceAcc_Alt_Under/.test(m.name)),
          eyelashes: mats.find(m => /Eyelashes/.test(m.name)),
          preservedColorData: (() => {let count = 0; t.source.root.traverse(m => {if(m.isMesh && m.geometry.attributes.color)count++;});return count;})()};
      });
      if (!materialChecks.mapped || !materialChecks.hair.textures.alphaMap || !materialChecks.eyelashes.textures.alphaMap || materialChecks.preservedColorData !== 6)
        throw Error("Nikki source material/alpha/vertex-mask preservation checks failed");
      await page.click("#convert");
      await page.waitForFunction(
        () => !document.querySelector("#convert").disabled,
        null,
        { timeout: 300000 },
      );
      if (!(await page.evaluate(() => Boolean(window.studioTest.converted))))
        throw Error(await page.locator("#status").innerText());
      const silhouettes = await capture(page, "prepared");
      if (silhouettes.some(m => m.iou < .8 || m.sourcePixels < 1000)) throw Error("Nikki silhouette retention regression: " + JSON.stringify(silhouettes));
      const atlasChecks = await page.evaluate(() => {
        const t = window.studioTest;
        if (!t.atlas) return null;
        return t.atlas.tiles.map(tile => ({material: tile.material, opaque: Array.from(tile.indices).filter(i => tile.palette[i] !== 0).length, transparent: Array.from(tile.indices).filter(i => tile.palette[i] === 0).length}));
      });
      if (!atlasChecks || atlasChecks.length !== 8 || atlasChecks.some(t => !/Eyeshell/.test(t.material) && !t.opaque))
        throw Error("Nikki atlas is missing, has incorrect material count, or dropped an opaque material");
      const close = await page.evaluate(() => {
        const t = window.studioTest, T = t.THREE, head = t.source.skeleton.mapping.head.getWorldPosition(new T.Vector3());
        const target = head.clone().add(new T.Vector3(0, .075, .06));
        t.sourceView.controls.target.copy(target);t.sourceView.camera.position.copy(target).add(new T.Vector3(0, .025, .62));
        t.sourceView.controls.update();t.resultView.sync(t.sourceView);
        return [t.sourceView.shot(),t.resultView.shot()];
      });
      for (const [i,kind] of ["source","prepared"].entries())
        await writeFile(`${output}/face-${kind}.png`, Buffer.from(close[i].split(",")[1], "base64"));

      const motion = await page.evaluate(() => {
        const t = window.studioTest, result = t.atlas?.root ?? t.converted.root, saved = [], captures = [];
        result.traverse(b => {if(b.isBone)saved.push([b,b.quaternion.clone()]);});
        t.sourceView.reset(0);t.resultView.sync(t.sourceView);
        let metrics;
        try {
          metrics = t.deformationProbe(t.source.root, t.source.skeleton, pose => {
            for (const [bone] of saved) {const original=t.source.root.getObjectByName(bone.name);if(original)bone.quaternion.copy(original.quaternion);}
            result.updateMatrixWorld(true);result.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});
            captures.push({pose,source:t.sourceView.shot(),prepared:t.resultView.shot()});
          });
        } finally {
          for(const [bone,q]of saved)bone.quaternion.copy(q);
          result.updateMatrixWorld(true);result.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});
          t.sourceView.render();t.resultView.render();
        }
        return {metrics,captures};
      });
      for(const capture of motion.captures)for(const kind of ["source","prepared"])
        await writeFile(`${output}/${capture.pose}-${kind}.png`,Buffer.from(capture[kind].split(",")[1],"base64"));
      if(motion.metrics.some(p=>!p.finite))throw Error("Nikki source pose diagnostics produced nonfinite vertices");
      let donor = null,
        arc = null;
      if (process.env.NIKKI_GAME_DIR) {
        const game = process.env.NIKKI_GAME_DIR,
          assets = await inspectDiscAssets({
            executable: new Uint8Array(
              await readFile(path.join(game, "SLUS_004.02")),
            ),
            bns: new Uint8Array(await readFile(path.join(game, "TEKKEN3.BNS"))),
          });
        donor = assets.model;
        arc = assets.arc;
      } else if (process.env.NIKKI_DONOR_PACKAGE) {
        const unpacked = await readDonorPackage(new Uint8Array(await readFile(process.env.NIKKI_DONOR_PACKAGE)));
        donor = unpacked.records[0].data; arc = unpacked.records[1].data;
      } else if (process.env.NIKKI_DONOR_MODEL && process.env.NIKKI_DONOR_ARC) {
        donor = new Uint8Array(await readFile(process.env.NIKKI_DONOR_MODEL));
        arc = new Uint8Array(await readFile(process.env.NIKKI_DONOR_ARC));
      }
      if (donor) {
        await page.evaluate(
          async (files) =>
            window.studioTest.loadDonor(
              files.map((f) => ({
                name: f.name,
                data: new Uint8Array(f.data),
              })),
            ),
          [
            { name: "Nina.3dm", data: [...donor] },
            { name: "Nina.arc", data: [...arc] },
          ],
        );
        if (process.env.NIKKI_BIND_PROFILE) {
          const profile = JSON.parse(
            await readFile(process.env.NIKKI_BIND_PROFILE, "utf8"),
          );
          await page.evaluate(
            (p) => window.studioTest.loadBindProfile(p),
            profile,
          );
        } else {
          await page.click("#estimate-bind");
          await page.waitForFunction(
            () => !document.querySelector("#estimate-bind").disabled,
            null,
            { timeout: 300000 },
          );
        }
        if (await page.locator("#native-build").isDisabled())
          throw Error(
            "Donor bind calibration was not established: " +
              (await page.locator("#status").innerText()),
          );
        await page.click("#native-build");
        await page.waitForFunction(
          () => !document.querySelector("#native-build").disabled,
          null,
          { timeout: 300000 },
        );
        if (
          !(await page.evaluate(() =>
            Boolean(window.studioTest.nativeCandidate),
          ))
        )
          throw Error(await page.locator("#status").innerText());
        await capture(page, "native");
        const pending = page.waitForEvent("download");
        await page.click("#native-export");
        await (await pending).saveAs(output + "/nikki-native-candidate.zip");
      }
      const report = await page.evaluate(() => window.studioTest.report());
      await page.screenshot({
        path: output + "/workspace.png",
        fullPage: true,
      });
      await writeFile(
        output + "/results.json",
        JSON.stringify(
          {
            status: "PARTIAL",
            report,
            sourceValidation: {geometry: "PASS", skeleton: "PASS: 433 bones / 8 influences", materials: materialChecks, atlas: atlasChecks, poses: motion.metrics, silhouettes},
            preparationBudget: {requested: report.conversion.settings.triangles, actual: report.conversion.stats.triangles, met: report.conversion.stats.triangles <= report.conversion.settings.triangles},
            native: donor
              ? "Candidate built; not game-verified"
              : "NOT RUN — donor files not provided",
            visualIdentity:
              "REQUIRES HUMAN REVIEW: face, eyes, eyelashes, hair, clothing",
            game: "NOT RUN — no verified runtime/game installation",
          },
          null,
          2,
        ),
      );
      console.log(
        "Nikki asset checks executed. Full game/identity acceptance remains unverified.",
      );
      process.exitCode = 2;
    } catch (e) {
      await page.screenshot({ path: output + "/failure.png", fullPage: true });
      await writeFile(
        output + "/results.json",
        JSON.stringify(
          {
            status: "FAILED",
            error: e.message,
            report: await page.evaluate(() => window.studioTest.report()),
            game: "NOT RUN",
          },
          null,
          2,
        ),
      );
      throw e;
    } finally {
      await session.close();
    }
  }
}
