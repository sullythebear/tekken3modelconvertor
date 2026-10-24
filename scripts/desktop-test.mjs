import {discFixture} from "./disc-fixture.mjs";
import { _electron as electron } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { writeFixtures } from "./fixtures.mjs";
import { backupGameFiles } from "../src/core/game-backup.js";
import { unzipSync } from "fflate";
await mkdir("artifacts/desktop", { recursive: true });
await writeFixtures();
const app = await electron.launch({
  executablePath: path.resolve(
    "node_modules/electron/dist/" +
      (process.platform === "win32" ? "electron.exe" : "electron"),
  ),
  args:
    process.platform === "win32"
      ? ["."]
      : [
          "--no-sandbox",
          "--ozone-platform=headless",
          "--disable-dev-shm-usage",
          "--use-angle=swiftshader",
          "--enable-unsafe-swiftshader",
          ".",
        ],
  env:
    process.platform === "win32"
      ? process.env
      : {
          ...process.env,
          XDG_CONFIG_HOME: "/workspace/.t3cs-config",
          XDG_CACHE_HOME: "/workspace/.t3cs-cache",
        },
  timeout: 30000,
});
try {
  const page = await app.firstWindow();
  await page.waitForFunction(
    () => typeof window.studio?.version === "function",
  );
  const report = await page.evaluate(async () => ({
    runtime: await window.studio.version(),
    node: typeof window.require,
    buttons: document.querySelectorAll("button").length,
  }));
  assert.equal(report.node, "undefined");
  assert.equal(
    report.runtime.app,
    JSON.parse(await readFile("package.json", "utf8")).version,
  );
  assert.ok(report.buttons > 5);
  assert.ok((await page.locator(".build").innerText()).includes(report.runtime.app));
  await app.evaluate(
    ({ dialog }, paths) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: paths,
      });
    },
    ["reference.obj", "reference.mtl", "body.tga"].map((n) =>
      path.resolve("artifacts/fixtures", n),
    ),
  );
  await app.evaluate(({ dialog }, target) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: target });
  }, path.resolve("artifacts/desktop/desktop-export.t3prep"));
  await page.click("#import");
  await page.waitForFunction(() =>
    document.querySelector("#status").textContent.startsWith("Imported"),
  );
  assert.match(await page.locator("#source-count").innerText(), /2 triangles/);
  await page.click("#convert");
  await page.waitForFunction(
    () => !document.querySelector("#export").disabled,
    null,
    { timeout: 60000 },
  );
  await page.click("#export");
  await page.waitForFunction(() =>
    document
      .querySelector("#status")
      .textContent.startsWith("Preparation package saved"),
  );
  const zip = unzipSync(
    new Uint8Array(await readFile("artifacts/desktop/desktop-export.t3prep")),
  );
  assert.ok(zip["converted.glb"]);
  assert.equal(
    JSON.parse(new TextDecoder().decode(zip["report.json"])).gameVerified,
    false,
  );
  const originalPath = path.resolve("artifacts/fixtures/reference.obj"),
    originalBytes = await readFile(originalPath);
  await app.evaluate(({ dialog }, target) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: target });
  }, originalPath);
  await page.click("#export");
  await page.waitForFunction(() =>
    document
      .querySelector("#status")
      .textContent.includes("cannot be overwritten"),
  );
  assert.deepEqual(await readFile(originalPath), originalBytes);
  report.importedSourceOverwrite = "refused without changing original bytes";
  const disc = discFixture({mode: "mode2", nested: true});
  const imagePath = path.resolve("artifacts/fixtures/authored-disc.bin");
  await writeFile(imagePath, disc.image);
  await app.evaluate(({dialog}, image) => { dialog.showOpenDialog = async () => ({canceled: false, filePaths: [image]}); }, imagePath);
  const extracted = await page.evaluate(async () => {
    const result = await window.studio.openDiscImage();
    return {report: result.report, files: result.files.map(f => ({name: f.name, data: [...f.data]}))};
  });
  assert.deepEqual(new Uint8Array(extracted.files[0].data), disc.executable);
  assert.deepEqual(new Uint8Array(extracted.files[1].data), disc.bns);
  assert.equal(extracted.report.sourceModified, false);
  await page.click("#disc-image");
  await page.waitForFunction(() => document.querySelector("#status").textContent.includes("SHA-256 is not the supported"));
  assert.equal(await page.locator("#donor-extract").isDisabled(), true);
  assert.deepEqual(new Uint8Array(await readFile(imagePath)), disc.image);
  report.discExtractionIPC = "passed: raw Mode 2 image extracted byte-exactly; unsupported executable refused by UI; image unchanged";
  const backupPath = path.resolve("artifacts/desktop/test-game-backup.zip"),
    restorePath = path.resolve("artifacts/desktop/restore-target");
  await mkdir(restorePath, { recursive: true });
  await writeFile(path.join(restorePath, "SLUS_004.02"), "modded-executable");
  await writeFile(path.join(restorePath, "TEKKEN3.BNS"), "modded-archive");
  await writeFile(
    backupPath,
    await backupGameFiles({
      executable: new TextEncoder().encode("original-executable"),
      bns: new TextEncoder().encode("original-archive"),
    }),
  );
  await app.evaluate(
    ({ dialog }, paths) => {
      dialog.showOpenDialog = async (...args) => ({
        canceled: false,
        filePaths: args.at(-1).properties.includes("openDirectory")
          ? [paths.target]
          : [paths.zip],
      });
      dialog.showMessageBox = async () => ({ response: 1 });
    },
    { target: restorePath, zip: backupPath },
  );
  await page.click("#game-restore");
  await page.waitForFunction(() =>
    document
      .querySelector("#status")
      .textContent.startsWith("Restored 2 files"),
  );
  assert.equal(
    await readFile(path.join(restorePath, "SLUS_004.02"), "utf8"),
    "original-executable",
  );
  assert.equal(
    await readFile(path.join(restorePath, "TEKKEN3.BNS"), "utf8"),
    "original-archive",
  );
  report.gameBackupRestoreIPC =
    "passed on synthetic files; rollback backup created";
  report.importConvertExportIPC = "passed on " + process.platform;
  await page.screenshot({
    path: "artifacts/desktop/linux-desktop.png",
    fullPage: true,
  });
  await writeFile(
    "artifacts/desktop/runtime.json",
    JSON.stringify(
      {
        platform:
          process.platform === "win32"
            ? "Windows runner"
            : "Linux container headless; Chromium OS sandbox disabled only for this test",
        ...report,
        windowsLaunch: "NOT TESTED",
      },
      null,
      2,
    ),
  );
  console.log(report);
} finally {
  await app.close();
}
