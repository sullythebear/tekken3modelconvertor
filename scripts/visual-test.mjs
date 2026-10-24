import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { writeFixtures, binaryFBX, tga } from "./fixtures.mjs";
import { browserSession } from "./browser.mjs";
await mkdir("artifacts/visual", { recursive: true });
await writeFixtures();
const session = await browserSession(),
  { page, errors } = session;
const tests = [];
try {
  await page.screenshot({
    path: "artifacts/visual/workspace-empty.png",
    fullPage: true,
  });
  const fbx = await readFile("artifacts/fixtures/reference-binary.fbx");
  await page.evaluate(
    async (data) => {
      await window.studioTest.load([
        { name: "reference.fbx", data: new Uint8Array(data) },
      ]);
    },
    [...fbx],
  );
  let r = await page.evaluate(() => window.studioTest.report());
  assert.equal(r.source.stats.triangles, 2);
  assert.equal(r.source.stats.invalidPositions, 0);
  for (const version of [7500, 7700]) {
    const data = await readFile(`artifacts/fixtures/reference-${version}.fbx`);
    await page.evaluate(
      async (data) => {
        await window.studioTest.load([
          { name: "modern.fbx", data: new Uint8Array(data) },
        ]);
      },
      [...data],
    );
    const modern = await page.evaluate(() => window.studioTest.report());
    assert.equal(modern.source.stats.triangles, 2);
  }
  tests.push(
    "Binary FBX 7400/7500/7700 (32/64-bit headers) with zlib-compressed geometry/UV arrays: 2 expected triangles each",
  );
  const linked = await page.evaluate(async records => {
    const t = window.studioTest; await t.load(records.map(f => ({name: f.name, data: new Uint8Array(f.data)})));
    let material; t.source.root.traverse(m => {if(m.isMesh) material = m.material;});
    return {width: material.map?.image?.width, pixel: [...material.map.image.data.slice(4,8)], links: material.userData.t3csFBXTextures, warnings: t.source.warnings};
  }, [{name: "linked.fbx", data: [...binaryFBX(7400,0,{linkedTexture:true})]}, {name: "body.tga", data: [...tga()]}]);
  assert.equal(linked.width,8);assert.deepEqual(linked.pixel,[240,100,30,255]);
  assert.equal(linked.links[0].relationship,"DiffuseColor");
  assert.ok(!linked.warnings.some(w => /fallback/i.test(w)));
  tests.push("FBX source DiffuseColor relationship referencing PNG resolves unique same-stem TGA with actual RGBA pixels; source binding preserved");
  await page.setInputFiles("#files", [
    "artifacts/fixtures/reference.obj",
    "artifacts/fixtures/reference.mtl",
    "artifacts/fixtures/body.tga",
  ]);
  await page.waitForFunction(
    () =>
      document.querySelector("#status").textContent.startsWith("Imported") &&
      window.studioTest.source.stats.textures === 1,
  );
  r = await page.evaluate(() => window.studioTest.report());
  assert.equal(r.source.stats.triangles, 2);
  assert.equal(r.source.stats.textures, 1);
  await page.waitForTimeout(100);
  const pixels = await page.evaluate(() => {
    const m = [...window.studioTest.source.root.children].find(
        (x) => x.isMesh,
      ).material,
      mat = Array.isArray(m) ? m[0] : m;
    return {
      data: [...mat.map.image.data.slice(0, 8)],
      width: mat.map.image.width,
    };
  });
  assert.equal(pixels.width, 8);
  assert.equal(pixels.data[3], 0);
  tests.push(
    "OBJ → MTL → TGA explicit material relationship, image dimensions and alpha bytes verified",
  );
  const opaqueRecords = await Promise.all(
    ["reference.obj", "reference.mtl", "body.tga"].map(async (name) => ({
      name,
      data: [...(await readFile("artifacts/fixtures/" + name))],
    })),
  );
  for (let i = 18 + 3; i < opaqueRecords[2].data.length; i += 4)
    opaqueRecords[2].data[i] = 0;
  await page.evaluate(async (records) => {
    await window.studioTest.load(
      records.map((f) => ({ name: f.name, data: new Uint8Array(f.data) })),
    );
  }, opaqueRecords);
  const alphaPolicy = await page.evaluate(() => {
    const mesh = window.studioTest.source.root.children.find((m) => m.isMesh),
      mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    return { alphaTest: mat.alphaTest, transparent: mat.transparent };
  });
  assert.equal(alphaPolicy.alphaTest, 0);
  assert.equal(alphaPolicy.transparent, false);
  await page.click("#convert");
  await page.waitForFunction(
    () =>
      window.studioTest.atlas && !document.querySelector("#convert").disabled,
    null,
    { timeout: 60000 },
  );
  const opaqueBake = await page.evaluate(() => {
    const a = window.studioTest.atlas.tiles[0];
    return { opaque: Array.from(a.indices).some((i) => a.palette[i] !== 0) };
  });
  assert.equal(opaqueBake.opaque, true);
  tests.push(
    "Opaque material with unused all-zero TGA alpha stays visible in source and PS1 bake",
  );
  const objBytes = [...await readFile("artifacts/fixtures/reference.obj")];
  for (const [extension, mime] of [["png", "image/png"], ["jpg", "image/jpeg"]]) {
    const decoded = await page.evaluate(async ({extension, mime, objBytes}) => {
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 8;
      const ctx = canvas.getContext("2d"); ctx.fillStyle = "#ff0000"; ctx.fillRect(0, 0, 8, 8);
      const data = Uint8Array.from(atob(canvas.toDataURL(mime, 1).split(",")[1]), c => c.charCodeAt(0));
      await window.studioTest.load([
        {name: "reference.obj", data: new Uint8Array(objBytes)},
        {name: "reference.mtl", data: new TextEncoder().encode(`newmtl Body\nKd 1 1 1\nmap_Kd body.${extension}\n`)},
        {name: `body.${extension}`, data},
      ]);
      const mesh = window.studioTest.source.root.children.find(m => m.isMesh), mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const output = document.createElement("canvas"); output.width = output.height = 8;
      const out = output.getContext("2d"); out.drawImage(mat.map.image, 0, 0);
      return {pixel: [...out.getImageData(4, 4, 1, 1).data], width: mat.map.image.width, warnings: window.studioTest.source.warnings};
    }, {extension, mime, objBytes});
    assert.equal(decoded.width, 8);
    assert.ok(decoded.pixel[0] > 245 && decoded.pixel[1] < 8 && decoded.pixel[2] < 8);
    assert.equal(decoded.pixel[3], 255);
    assert.ok(!decoded.warnings.some(w => /Filename fallback/.test(w)));
    tests.push(`OBJ → MTL → ${extension.toUpperCase()} explicit relationship and decoded red texel verified`);
  }
  await page.evaluate(async () => {
    const data = await window.studioTest.syntheticCharacter();
    await window.studioTest.load([{ name: "synthetic-humanoid.glb", data }]);
  });
  r = await page.evaluate(() => window.studioTest.report());
  assert.equal(r.source.skeleton.boneCount, 17);
  assert.equal(r.source.weights.invalid, 0);
  const before = r.source.stats.triangles;
  await page.evaluate(() => {
    document.querySelector("#triangles").value = "1500";
    document.querySelector("#triangles").dispatchEvent(new Event("input"));
    document.querySelector("#error").value = ".2";
  });
  await page.click("#convert");
  await page.waitForFunction(
    () =>
      window.studioTest.converted &&
      !document.querySelector("#convert").disabled,
    null,
    { timeout: 120000 },
  );
  r = await page.evaluate(() => window.studioTest.report());
  assert.ok(r.conversion.stats.triangles < before);
  assert.ok(r.conversion.stats.triangles > 100);
  assert.equal(r.conversion.stats.invalidPositions, 0);
  assert.ok(r.atlas && r.atlas.tiles.length === 3);
  assert.equal(r.exportGate.ready, false);
  assert.ok(r.conversion.poses.every((p) => p.finite && p.samples > 0));
  tests.push(
    `Synthetic GLB skinning + anatomical reduction: ${before} → ${r.conversion.stats.triangles} triangles, 3 palette tiles, three pose diagnostics`,
  );
  assert.equal(await page.locator("#animation option").count(), 1);
  await page.click("#play-animation");
  await page.waitForTimeout(250);
  const motion = await page.evaluate(() => {
    const t = window.studioTest;
    return {
      source: t.source.skeleton.mapping.leftUpperArm.quaternion.toArray(),
      prepared: (t.atlas?.root ?? t.converted.root)
        .getObjectByName("LeftArm")
        .quaternion.toArray(),
    };
  });
  assert.ok(Math.abs(motion.source[2]) > 0.01);
  assert.deepEqual(motion.source, motion.prepared);
  await page.click("#play-animation");
  tests.push(
    "Imported source animation plays on both rigs with identical bone quaternions; not a donor/game animation test",
  );
  for (const [name, angle] of [
    ["front", 0],
    ["side", Math.PI / 2],
    ["back", Math.PI],
  ]) {
    const shots = await page.evaluate((a) => {
      const t = window.studioTest;
      t.sourceView.reset(a);
      t.resultView.sync(t.sourceView);
      return {
        source: t.sourceView.shot(),
        prepared: t.resultView.shot(),
        camera: t.sourceView.camera.position.toArray(),
        other: t.resultView.camera.position.toArray(),
      };
    }, angle);
    assert.deepEqual(shots.camera, shots.other);
    for (const key of ["source", "prepared"]) {
      const b = Buffer.from(shots[key].split(",")[1], "base64");
      assert.ok(b.length > 8000, "Nontrivial rendered screenshot");
      await writeFile(`artifacts/visual/synthetic-${name}-${key}.png`, b);
    }
  }
  const silhouettes = await page.evaluate(() => {
    const t = window.studioTest,
      T = t.THREE;
    const masks = [];
    for (const view of [t.sourceView, t.resultView]) {
      const oldBackground = view.scene.background,
        override = view.scene.overrideMaterial,
        hidden = [];
      view.scene.traverse((o) => {
        if (o.isLineSegments && o.visible) {
          hidden.push(o);
          o.visible = false;
        }
      });
      view.scene.background = new T.Color(0);
      const material = new T.MeshBasicMaterial({
        color: 0xffffff,
        side: T.DoubleSide,
      });
      view.scene.overrideMaterial = material;
      const target = new T.WebGLRenderTarget(256, 256),
        pixels = new Uint8Array(256 * 256 * 4);
      view.renderer.setRenderTarget(target);
      view.renderer.render(view.scene, view.camera);
      view.renderer.readRenderTargetPixels(target, 0, 0, 256, 256, pixels);
      view.renderer.setRenderTarget(null);
      view.scene.background = oldBackground;
      view.scene.overrideMaterial = override;
      for (const o of hidden) o.visible = true;
      target.dispose();
      material.dispose();
      view.render();
      masks.push(
        Array.from({ length: 256 * 256 }, (_, i) => pixels[i * 4] > 128),
      );
    }
    let union = 0,
      intersection = 0;
    for (let i = 0; i < masks[0].length; i++) {
      union += masks[0][i] || masks[1][i] ? 1 : 0;
      intersection += masks[0][i] && masks[1][i] ? 1 : 0;
    }
    return {
      iou: intersection / union,
      sourcePixels: masks[0].filter(Boolean).length,
      preparedPixels: masks[1].filter(Boolean).length,
    };
  });
  assert.ok(
    silhouettes.iou > 0.75,
    `Synthetic silhouette IoU ${silhouettes.iou}`,
  );
  assert.ok(silhouettes.sourcePixels > 2000);
  tests.push(
    `Synthetic back-view silhouette IoU ${silhouettes.iou.toFixed(3)} exceeds 0.75; not a Nikki identity test`,
  );
  await page.screenshot({
    path: "artifacts/visual/workspace-converted.png",
    fullPage: true,
  });
  await page.click("#probe");
  assert.match(await page.locator("#pose-report").innerText(), /guard:/);
  assert.ok(await page.locator("#game-export").isDisabled());
  const downloadPromise = page.waitForEvent("download");
  await page.click("#export");
  const download = await downloadPromise;
  await download.saveAs("artifacts/visual/synthetic-preparation.t3prep");
  const { unzipSync } = await import("fflate");
  const z = unzipSync(
    new Uint8Array(
      await readFile("artifacts/visual/synthetic-preparation.t3prep"),
    ),
  );
  assert.equal(
    new TextDecoder().decode(z["converted.glb"].slice(0, 4)),
    "glTF",
  );
  assert.equal(
    JSON.parse(new TextDecoder().decode(z["report.json"])).gameVerified,
    false,
  );
  const glb = Buffer.from(z["converted.glb"]),
    jsonSize = glb.readUInt32LE(12),
    gltf = JSON.parse(glb.subarray(20, 20 + jsonSize).toString());
  assert.equal(gltf.animations.length, 1);
  assert.equal(Object.keys(z).filter((k) => k.endsWith(".tim")).length, 3);
  tests.push(
    "Preparation export contains valid GLB magic, 3 TIM assets, screenshots and explicit gameVerified:false",
  );
  const second = await page.evaluate(() => {
    const t = window.studioTest;
    const a = t.sourceView.shot(),
      b = t.sourceView.shot();
    return a === b;
  });
  assert.equal(second, true);
  tests.push(
    "Stationary render is byte-identical on repeat; front/side/back cameras match exactly",
  );
  assert.deepEqual(errors, []);
  await writeFile(
    "artifacts/visual/results.json",
    JSON.stringify(
      {
        passed: tests,
        errors,
        nikki: "NOT RUN — upload exceeds 32 MiB transfer limit",
        game: "NOT RUN — no original donor/game/runtime",
      },
      null,
      2,
    ),
  );
  console.log(tests.join("\n"));
} catch (e) {
  await page.screenshot({
    path: "artifacts/visual/failure.png",
    fullPage: true,
  });
  console.error(
    "Status:",
    await page.locator("#status").innerText(),
    "Errors:",
    errors,
  );
  throw e;
} finally {
  await session.close();
}
