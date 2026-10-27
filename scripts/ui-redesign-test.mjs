// UI presentation only; preserve existing controls and conversion/project behavior.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import path from "node:path";
import { browserSession } from "./browser.mjs";
const out = "artifacts/ui-redesign/after";
await mkdir(out, { recursive: true });
process.env.T3CS_RUN_OUTPUT ??= out;
const session = await browserSession({ presentation: "standard" });
const results = [];
try {
  const { page } = session;
  const inventory = JSON.parse(await readFile("docs/ui/CONTROL_INVENTORY.json", "utf8"));
  const integrity = await page.evaluate((ids) => ids.map((id) => ({ id, count: document.querySelectorAll("[id]").length && [...document.querySelectorAll("[id]")].filter((n) => n.id === id).length })), inventory.map((n) => n.id));
  assert.ok(integrity.every((r) => r.count === 1), JSON.stringify(integrity.filter((r) => r.count !== 1)));
  results.push("Every original control exists exactly once");
  await writeFile(out + "/control-map.json", JSON.stringify(await page.evaluate((ids) => ids.map((id) => {
    const n = document.getElementById(id);
    return { id, category: n.closest("[data-category]")?.dataset.category ?? (n.closest(".workflow-rail") ? "workflow" : n.closest(".preview-bar") ? "preview" : "toolbar"), hiddenInput: n.tagName === "INPUT" && n.hidden };
  }), inventory.map((n) => n.id)), null, 2));
  assert.equal(await page.locator("#settings-face").getAttribute("data-custom"),"0");assert.equal(await page.locator("#settings-hair").getAttribute("data-custom"),"0");
  assert.equal(await page.locator("#workspace-mode").inputValue(), "standard");
  assert.equal(await page.locator("#settings-panel").isVisible(), false);
  assert.equal(await page.locator("#import").isVisible(), true);
  assert.equal(await page.locator("#art-preset").isVisible(), true);
  assert.equal(await page.locator("#triangles").isVisible(), true);
  assert.equal(await page.locator("#art-pixelation").isVisible(), true);
  results.push("Beginner defaults expose the four-step workflow without technical panels");
  await page.evaluate(async () => {
    const t = window.studioTest;
    const a = await t.syntheticCharacter(), b = await t.syntheticCharacter({ hairstyle: "crest" });
    await t.load([{ name: "Studio-example.glb", data: a }, { name: "Alternate-example.glb", data: b }], "Studio-example.glb");
  });
  assert.equal(await page.locator("#model-select option").count(), 2);
  await page.selectOption("#model-select", "Alternate-example.glb");
  await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Imported"));
  assert.equal(await page.locator("#model-select").inputValue(), "Alternate-example.glb");
  await page.selectOption("#model-select", "Studio-example.glb");
  await page.waitForFunction(() => !document.querySelector("#convert").disabled);
  results.push("Import two models and switch the actual source model");
  await page.selectOption("#art-preset", "classic");
  assert.equal(await page.locator("#art-pixelation").inputValue(), "90");
  await page.selectOption("#art-preset", "authentic");
  assert.equal(await page.locator("#art-pixelation").inputValue(), "50");
  results.push("Preset changes reach existing Art Director values");
  await page.click("#convert");
  await page.waitForFunction(() => window.studioTest.converted && !document.querySelector("#convert").disabled);
  assert.equal(await page.locator("#export").isEnabled(), true);
  results.push("Original conversion and preparation export remain enabled");
  const exported = path.resolve(out, "authored-preparation.t3prep");
  if (session.desktop) {
    await page.click("#export");
    await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Preparation package saved"));
    const folder = process.env.T3CS_RUN_OUTPUT ?? "artifacts/nikki";
    await writeFile(exported, await readFile(path.join(folder, "character-preparation.t3prep")));
  } else {
    const pending = page.waitForEvent("download");
    await page.click("#export");
    await (await pending).saveAs(exported);
  }
  const pack = unzipSync(new Uint8Array(await readFile(exported)));
  assert.equal(Buffer.from(pack["converted.glb"]).subarray(0, 4).toString(), "glTF");
  assert.ok(Object.keys(pack).some((n) => n.endsWith(".tim")));
  assert.ok(pack["report.json"] && pack["screenshots/source.png"]);
  results.push("Actual preparation export decoded: GLB, TIM, report and screenshots");
  for (const [width, height] of [[1366, 768], [1920, 1080], [2560, 1440]]) {
    await page.setViewportSize({ width, height });
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, preview: document.querySelector(".studio-stage").getBoundingClientRect().toJSON(), rail: document.querySelector(".workflow-rail").getBoundingClientRect().toJSON() }));
    assert.ok(dimensions.scroll <= dimensions.width, "No horizontal overflow");
    assert.ok(dimensions.preview.height > height * 0.5, "Preview occupies most available height");
    for (const id of ["art-preset", "triangles", "art-pixelation", "convert", "export", "settings-open"]) {
      const b = await page.locator("#" + id).boundingBox();
      assert.ok(b.y >= 76 && b.y + b.height < height - 25, id + " remains above fold");
    }
    await page.screenshot({ path: `${out}/${width}x${height}-standard.png` });
  }
  await page.selectOption("#workspace-mode", "advanced");
  assert.equal(await page.locator("#settings-panel").isVisible(), true);
  await page.setChecked("#settings-multiple", false);
  await page.locator("#settings-face>summary").click();
  await page.waitForFunction(() => document.querySelector("#settings-face").open);
  assert.equal(await page.locator(".settings-category[open]").count(), 1);
  await page.locator("#settings-advanced>summary").click();
  await page.setChecked("#art-live", false);
  await page.locator("#settings-face>summary").click();
  await page.locator("#art-face").fill("88");
  await page.locator("#art-face").dispatchEvent("input");
  assert.match(await page.locator("#preset-state").innerText(), /aangepast/);
  assert.notEqual(await page.locator("#settings-face").getAttribute("data-custom"),"0");
  const stored = await page.locator("#art-face").inputValue();
  await page.selectOption("#workspace-mode", "standard");
  await page.selectOption("#workspace-mode", "advanced");
  assert.equal(await page.locator("#art-face").inputValue(), stored);
  results.push("Modes preserve real settings; customized preset is signalled");
  await page.locator(".project-disclosure>summary").click();
  const projectFile = path.resolve(out, "authored-project.zip");
  if (session.desktop) {
    await page.click("#project-save");
    await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Project saved"));
    await writeFile(projectFile, await readFile(path.join(process.env.T3CS_RUN_OUTPUT ?? "artifacts/nikki", "character-project.zip")));
  } else {
    const pending = page.waitForEvent("download");
    await page.click("#project-save");
    await (await pending).saveAs(projectFile);
  }
  await page.setInputFiles("#project-file", projectFile);
  await page.waitForFunction(() => document.querySelector("#status").textContent.startsWith("Project restored"));
  assert.equal(await page.locator("#art-face").inputValue(), "88");
  assert.equal(await page.locator("#model-select").inputValue(), "Studio-example.glb");
  await page.click("#convert");
  await page.waitForFunction(() => window.studioTest.converted && !document.querySelector("#convert").disabled);
  results.push("Actual project save/reopen retains art settings and selected model");
  await page.locator(".project-disclosure>summary").click();
  await page.locator("#settings-search").fill("haar");
  await page.waitForFunction(() => !document.querySelector("#settings-hair").hidden);
  assert.equal(await page.locator("#hair-method").isVisible(), true);
  await page.locator("#settings-search").fill("unfindable-setting-xyz");
  assert.equal(await page.locator("#settings-empty").isVisible(), true);
  await page.locator("#settings-search").fill("");
  await page.locator("#settings-search").press("Escape");
  assert.equal(await page.locator("#settings-panel").isVisible(), false);
  assert.equal(await page.locator("#settings-open").evaluate((n) => document.activeElement === n), true);
  await page.locator("#settings-open").press("Enter");
  assert.equal(await page.locator("#settings-panel").isVisible(), true);
  results.push("Search, no-results state, Escape focus return and Enter activation");
  await page.setChecked("#settings-multiple", true);
  for (const key of ["face", "hair"]) if (!await page.locator("#settings-" + key).evaluate((n) => n.open)) await page.locator("#settings-" + key + ">summary").click();
  assert.equal(await page.locator("#settings-face").evaluate((n) => n.open), true);
  assert.equal(await page.locator("#settings-hair").evaluate((n) => n.open), true);
  results.push("Explicit multi-category mode");
  for (const value of ["source", "result", "simulation", "compare"]) {
    await page.selectOption("#preview-layout", value);
    assert.equal(await page.locator(".studio-stage>article:visible").count(), value === "compare" ? 2 : 1);
    const id = value === "source" ? "original" : value === "result" ? "result" : value === "simulation" ? "simulation" : "original";
    assert.ok((await page.locator("#" + id + " canvas").boundingBox()).width > 100);
  }
  results.push("All four preview layouts keep working render canvases");
  await page.check('#wireframe');await page.check('#skeleton');
  assert.equal(await page.evaluate(()=>{const t=window.studioTest;let seen=0,valid=true;t.source.root.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material]){seen++;valid&&=m.wireframe;}});return seen>0&&valid&&t.sourceView.skeletonEnabled&&!!t.sourceView.helper;}),true);
  await page.uncheck('#wireframe');await page.uncheck('#skeleton');results.push('Wireframe and skeleton overlays retain their real view handlers');

  await page.selectOption('#preview-layout','simulation');
  if(!await page.locator('#settings-advanced').evaluate(n=>n.open))await page.locator('#settings-advanced>summary').click();
  await page.check('#art-resolution');
  await page.selectOption('#preview-layout','source');await page.selectOption('#preview-layout','simulation');
  await page.waitForFunction(()=>{const c=document.querySelector('#simulation canvas');return c.width===320&&c.height===240;});
  await page.setViewportSize({width:1366,height:768});await page.waitForFunction(()=>document.querySelector('#simulation canvas').width===320);
  await page.uncheck('#art-resolution');await page.selectOption('#preview-layout','compare');
  results.push('320×240 preview stays exact across tabs and resize; export geometry unchanged');

  for (const [width, height] of [[1366, 768], [1920, 1080], [2560, 1440]]) {
    await page.setViewportSize({ width, height });
    await page.screenshot({ path: `${out}/${width}x${height}-advanced.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), true);
  }
  await page.selectOption("#workspace-mode", "standard");
  await page.selectOption("#preview-layout", "source");
  await page.reload();
  await page.waitForFunction(() => window.studioPresentation);
  assert.equal(await page.locator("#workspace-mode").inputValue(), "standard");
  assert.equal(await page.locator("#preview-layout").inputValue(), "source");
  assert.equal(await page.locator("#settings-panel").isVisible(), false);
  results.push("Reload restores presentation preferences without source/private asset persistence");
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await page.locator("#import").evaluate((n) => getComputedStyle(n).transitionDuration), "0s");
  results.push("Reduced-motion system preference respected");
  assert.deepEqual(session.errors, []);
  await writeFile(out + "/results.json", JSON.stringify({ status: "PASS", version: JSON.parse(await readFile("package.json", "utf8")).version, packaged: session.app ? await session.app.evaluate(({ app }) => app.isPackaged) : false, controlCount: inventory.length, results, errors: session.errors }, null, 2));
  console.log(results.join("\n"));
} catch (e) {
  await writeFile(out + "/failure.json", JSON.stringify({ status: "FAIL", message: e.message, stack: e.stack }, null, 2));
  throw e;
} finally {
  await session.close();
}
