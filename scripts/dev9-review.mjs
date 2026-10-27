// Reproducible evidence route. Inputs stay private; only the explicit PNG and
// count/hash summary allowlist below is copied into the public review.
import { spawn } from "node:child_process";
import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  copyFile,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const version=JSON.parse(await readFile('package.json','utf8')).version;
const root = path.resolve(process.env.REVIEW_OUTPUT ?? "artifacts/dev9-review"),
  publicRoot = path.resolve("public-review/dev9");
const budgets = [1500, 1750, 2000, 2250, 2500],
  models = ["nikki", "cesium", "synthetic", "crest"];
const plans = [
  { id: "dev9", models },
  ...budgets.map((budget) => ({
    id: "budget" + budget,
    models: ["nikki"],
    budget,
  })),
];
if (process.env.RENDER === "1") {
  if (!process.env.NIKKI_DIR)
    throw Error(
      "Private NIKKI_DIR required; never include it in publication inputs",
    );
  for (const p of plans) {
    if (
      process.env.REVIEW_ONLY &&
      !process.env.REVIEW_ONLY.split(",").includes(p.id)
    )
      continue;
    const child = spawn(process.execPath, ["scripts/art-director-test.mjs"], {
      stdio: "inherit",
      env: {
        ...process.env,
        ART_OUTPUT: path.join(root, p.id),
        ART_MODELS: p.models.join(","),
        ART_PRESETS: "authentic",
        ART_RECONSTRUCTION: "combined",
        ART_OPTIMIZE: p.budget ? "1" : "0",
        ART_BUDGET: String(p.budget ?? 900),
      },
    });
    const code = await new Promise((resolve, reject) => {
      child.on("close", resolve);
      child.on("error", reject);
    });
    if (code) throw Error("Gallery/export checks failed: " + p.id);
  }
  if (process.env.REVIEW_ONLY) process.exit(0);
}
const datasets = [
  { id: "dev7", dir: "public-review/dev8/dev7", models },
  { id: "dev8", dir: "public-review/dev8/dev8", models },
  {
    id: "matched7",
    dir: "public-review/dev8/dev7-budget2000",
    models: ["nikki"],
  },
  { id: "matched8", dir: "public-review/dev8/budget2000", models: ["nikki"] },
  ...plans.map((p) => ({ ...p, dir: path.join(root, p.id) })),
];
const hash = (b) => createHash("sha256").update(b).digest("hex"),
  summary = {
    version,
    baselineCommit: "b04f9bcefe7d44793e9107ef8fa7d75719e79033",
    gameVerified: false,
    artisticAcceptance: "PENDING USER REVIEW",
    results: [],
    sourceCameraChecks: [],
    engineHashes: {},
  };
const safeCounts = (x) =>
  x && typeof x === "object"
    ? Object.fromEntries(
        Object.entries(x)
          .filter(
            ([k, v]) => !k.endsWith("Segments") && (!v || !Array.isArray(v)),
          )
          .map(([k, v]) => [k, v && typeof v === "object" ? safeCounts(v) : v]),
      )
    : x;
for (const d of datasets)
  for (const model of d.models) {
    const from = path.join(d.dir, model + "-authentic"),
      destination = path.join(publicRoot, d.id, model),
      r = JSON.parse(await readFile(path.join(from, "report.json"), "utf8")),
      c = r.report.conversion;
    const row = {
      id: d.id,
      model,
      requestedTriangles: d.budget ?? null,
      triangles: c.stats.triangles,
      optimization: c.optimization ? safeCounts(c.optimization) : null,
      regions: c.regions.map((p) => ({
        region: p.region,
        before: p.before,
        target: p.target ?? null,
        after: p.after,
        kind: p.kind ?? null,
        error: p.error ?? null,
        errorLimit: p.errorLimit ?? null,
        lockedVertices: p.lockedVertices ?? null,
        minimum: p.protectedMinimum ?? null,
        qualityLimited: p.qualityLimited ?? null,
        bodyOptimization: safeCounts(p.bodyOptimization),
        componentOptimization: safeCounts(p.componentOptimization),
        reconstruction: safeCounts(p.reconstruction),
      })),
      integrity: JSON.parse(
        await readFile(path.join(from, "boundary-audit.json"), "utf8"),
      ),
      contacts: JSON.parse(
        await readFile(path.join(from, "contacts.json"), "utf8"),
      ),
      poseContacts: r.poseContacts,
      poseSeams: r.poseSeamContinuity,
      poseDiagnostics: r.sourcePoseDiagnostics,
      anatomyStatistics: r.anatomyStatistics,
      textureBytes: r.report.atlas.textureBytes,
      paletteBytes: r.report.atlas.paletteBytes,
      tiles: r.report.atlas.tiles,
      exportValidation: r.exportValidation,
    };
    if (row.regions.reduce((n, p) => n + p.after, 0) !== row.triangles)
      throw Error("Region count mismatch: " + d.id + "/" + model);
    summary.results.push(row);
    await mkdir(destination, { recursive: true });
    // PNG only: not a general directory copy. Raw scene/pre-export/model/project
    // files and source textures are impossible to include through this path.
    for (const e of await readdir(from, { withFileTypes: true }))
      if (e.isFile() && e.name.endsWith(".png") && e.name !== "simulation.png")
        await copyFile(path.join(from, e.name), path.join(destination, e.name));
    await writeFile(
      path.join(destination, "measurements.json"),
      JSON.stringify(row, null, 2),
    );
  }
for (const model of models)
  for (const view of [
    "front",
    "back",
    "three-quarter",
    "face",
    "left-hand-front",
  ]) {
    const hashes = [];
    for (const id of ["dev7", "dev8", "dev9"]) {
      try {
        hashes.push(
          hash(
            await readFile(
              path.join(publicRoot, id, model, view + "-source.png"),
            ),
          ),
        );
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
    }
    if (hashes.length === 3) {
      const identical = new Set(hashes).size === 1;
      summary.sourceCameraChecks.push({ model, view, identical });
      if (!identical)
        throw Error(
          "Source camera/light/render mismatch: " + model + "/" + view,
        );
    }
  }
const row = (id, model = "nikki") =>
    summary.results.find((r) => r.id === id && r.model === model),
  base = row("dev8"),
  fresh = row("dev9");
summary.faceCore = {
  geometryIdentical:
    base.exportValidation.faceInteriorGeometrySha256 ===
    fresh.exportValidation.faceInteriorGeometrySha256,
  textureIdentical:
    base.exportValidation.faceInteriorTextureSha256 ===
    fresh.exportValidation.faceInteriorTextureSha256,
};
if (!summary.faceCore.geometryIdentical || !summary.faceCore.textureIdentical)
  throw Error("Protected face interior changed");
for (const dir of ["src/core", "src/ui"])
  for (const f of await readdir(dir))
    if (/\.(js|mjs|html|css)$/.test(f))
      summary.engineHashes[dir + "/" + f] = hash(
        await readFile(path.join(dir, f)),
      );
summary.buildHashes = {};
for (const file of [
  "scripts/build.mjs",
  "scripts/extended-loader-patches.mjs",
  "package-lock.json",
  "dist/app.js",
])
  summary.buildHashes[file] = hash(await readFile(file));
const e = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let html = `<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dev.9 — echte beelden en meetgegevens</title><style>body{font:18px system-ui;background:#101823;color:#eef3ff;margin:24px}a{color:#9cf}section{overflow:auto}table{border-collapse:collapse}td,th{padding:10px;border:1px solid #345;vertical-align:top}img{width:clamp(280px,calc((100vw - 180px)/4),510px);max-height:650px;object-fit:contain}pre{white-space:pre-wrap}.warn{color:#ffbd89}nav a{margin-right:18px}</style><h1>${version} — artistieke beoordeling gevraagd</h1><p>Klik op een afbeelding voor de volledige resolutie. Brede budgettabellen kunnen horizontaal worden verschoven.</p><p class="warn">Geen definitieve artistieke goedkeuring en geen geverifieerde Tekken/Expanded-gameplay. Doelbudgetten zijn experimenteel; werkelijk behaalde aantallen staan bij elk beeld.</p><nav><a href="#hands">Handen</a><a href="#body">Schouders en huid</a><a href="#poses">Beweging</a><a href="#budgets">Kandidaten</a><a href="technical-summary.json">Alle meetgegevens</a><a href="../WINDOWS-STATUS.md">Windows-testmetingen</a><a href="../REVIEW.md">Status en beperkingen</a></nav><p>Oude beelden en meetgegevens komen uit de gepubliceerde dev.7- en dev.8-galerijen. Bronbeelden worden byte-voor-byte gecontroleerd om identieke camera, schaal, belichting en resolutie vast te stellen. De nieuwe beelden komen uit dezelfde volledige import/conversie/exporttest. Diagnostische poses zijn geen Tekken-animaties. Bronmodellen, brontextures, projecten en gamebestanden zijn uitgesloten.</p><p>Nieuw: structurele bron-geprojecteerde vingers, echte kleur-overdracht van kleine vingeraccessoires, source-UV-sheetbehoud bij reductie, gerepareerde overdracht van huid-normalvelden, volledige torso-texelhoogte en conservatieve contactreconciliatie. Gezichtskern en zijn onbewerkte texture zijn identiek gebleven. De kledingvervorming bij extreme schouderposes is nog niet volledig opgelost; handen blijven bewust low-poly. Beoordeel verbeteringen en beperkingen in de grote afbeeldingen.</p>`;
async function gallery(title, model, ids, views, anchor = "") {
  html += `<h2 id="${anchor}">${e(title)}</h2><section><table><tr><th>Modern bronmodel</th>${ids.map((id) => `<th>${e(id)} — ${row(id, model).triangles} triangles</th>`).join("")}</tr>`;
  for (const view of views) {
    html += "<tr>";
    for (const file of [
      `dev9/${model}/${view}-source.png`,
      ...ids.map((id) => `${id}/${model}/${view}-prepared.png`),
    ]) {
      try {
        await readFile(path.join(publicRoot, file));
        html += `<td><a href="${file}"><img loading="lazy" src="${file}" alt="${e(view)}"></a><br>${e(view)}</td>`;
      } catch (err) {
        if (err.code !== "ENOENT") throw err;
        html += "<td>Niet van toepassing / alleen outputdiagnostiek</td>";
      }
    }
    html += "</tr>";
  }
  html += "</table></section>";
}
await gallery(
  "Handen en polsen bij vrijwel gelijke artistieke handkosten",
  "nikki",
  ["dev7", "dev8", "dev9"],
  [
    "left-hand-front",
    "left-hand-back",
    "right-hand-front",
    "right-hand-back",
    "left-wrist-front",
    "right-wrist-back",
    "left-hand-flex-close",
    "right-hand-flex-close",
    "left-hand-relax-close",
    "right-thumb-motion-close",
    "right-wrist-roll-close",
  ],
  "hands",
);
await gallery(
  "Huid, kleding, schouders en voeten",
  "nikki",
  ["dev7", "dev8", "dev9"],
  [
    "front",
    "back",
    "left-side",
    "right-side",
    "three-quarter",
    "left-shoulder-front",
    "right-shoulder-back",
    "left-elbow-front",
    "clothing-close",
    "boots-close",
    "heels-close",
    "ankles-side",
    "boundary",
    "contacts",
    "winding",
    "normals",
    "materials",
    "wireframe",
  ],
  "body",
);
await gallery(
  "Beschermd gezicht en kapsel",
  "nikki",
  ["dev7", "dev8", "dev9"],
  [
    "face",
    "face-side",
    "face-quarter",
    "eyes-close",
    "mouth-close",
    "hair-close",
  ],
);
await gallery(
  "Diagnostische poses: huid/cloth en bekkencontact",
  "nikki",
  ["dev7", "dev8", "dev9"],
  [
    "arms-raised",
    "left-arms-raised-close",
    "right-arms-raised-close",
    "guard",
    "reach",
    "crouch",
    "walk",
    "punch",
    "kick",
    "hand-flex",
    "thumb-motion",
    "wrist-roll",
  ],
  "poses",
);
await gallery(
  "Experimentele doelbudgetten — vergelijk werkelijke kosten",
  "nikki",
  budgets.map((n) => "budget" + n),
  [
    "front",
    "face",
    "hair-close",
    "left-hand-front",
    "right-hand-front",
    "right-hand-back",
    "left-shoulder-front",
    "clothing-close",
    "wireframe",
    "boundary",
    "winding",
    "arms-raised",
    "kick",
  ],
  "budgets",
);
await gallery(
  "Bij ongeveer gelijke werkelijke kosten: oude kandidaten versus dev.9",
  "nikki",
  ["matched7", "matched8", "budget2000"],
  [
    "front",
    "face",
    "left-hand-front",
    "right-hand-front",
    "left-shoulder-front",
    "clothing-close",
    "wireframe",
    "arms-raised",
  ],
);
html +=
  "<p>De kolomkop toont het werkelijke aantal: deze vergelijking is geen claim van exact gelijke aantallen. Een gunstiger score door extra geometrie geldt niet als bewezen artistieke verbetering.</p>";
for (const model of ["cesium", "synthetic", "crest"])
  await gallery(
    "Algemene regressie: " + model,
    model,
    ["dev7", "dev8", "dev9"],
    [
      "front",
      "back",
      "face",
      "hair-close",
      "left-hand-front",
      "wireframe",
      "boundary",
      "winding",
      "arms-raised",
      "crouch",
      "kick",
    ],
  );
html +=
  "<h2>Oorzaakanalyse: geometrie, normals en gebakken bronkleur</h2><p>Deze grijze renders gebruiken dezelfde dev.9-geometrie, camera en verlichting, met alleen een andere normal-interpolatie. Geen textures of extra polygonen. Dit zijn testmaterialen, geen nieuwe product- of exportinstellingen. De gewone galerij toont de werkelijk gebakken PS1-kleuren.</p><section><table><tr><th>Vlakke normals</th><th>Geïnterpoleerde normals</th></tr>";
for (const view of ["full", "shoulder", "hand"])
  html +=
    "<tr>" +
    ["flat", "smooth"]
      .map((mode) => {
        const file = `dev9/nikki/geometry-${mode}-${view}-prepared.png`;
        return `<td><a href="${file}"><img loading="lazy" src="${file}" alt="${mode} ${view}"></a></td>`;
      })
      .join("") +
    "</tr>";
html +=
  "</table></section><h3>Texture-ablaties bij exact dezelfde geometrie</h3><p>Vier tussenproeven met identieke camera’s en geometry-/UV-/skin-/bind-hashes: zie bake-ablation-provenance.json. De 16-kleurenvariant is verworpen wegens blokvormige huidkleuren. De behouden 256-kleurenvariant kost 65.536 extra stagingtexturebytes; donorcapaciteit is niet bevestigd. Dit zijn ontwikkelingstussenbeelden, niet de definitieve dev.9-handtexture.</p><section><table><tr><th>Oude 256×128 bronbake</th><th>Volledige 256×256 bronbake</th><th>Bronnormals / 16 kleuren — VERWORPEN</th><th>Bronnormals / 256 kleuren — behouden</th></tr>";
const ablations = [
  ["original", "cycle8-compact-fields"],
  ["resolution", "cycle9-body-resolution"],
  ["diffuse16-rejected", "cycle9-body-diffuse16"],
  ["diffuse256", "cycle9-body-diffuse256"],
];
for (const view of ["left-shoulder", "hips", "arms-raised-shoulder"]) {
  html += "<tr>";
  for (const [id, folder] of ablations) {
    const target = path.join(publicRoot, "ablations", id);
    await mkdir(target, { recursive: true });
    const file = view + "-prepared.png";
    await copyFile(
      path.join("artifacts/dev9", folder, file),
      path.join(target, file),
    );
    const rel = `ablations/${id}/${file}`;
    html += `<td><a href="${rel}"><img loading="lazy" src="${rel}" alt="${id} ${view}"></a></td>`;
  }
  html += "</tr>";
}
html += "</table></section>";
html +=
  "<h2>Regionale kosten en integriteit</h2><section><table><tr><th>Variant</th><th>Regioverdeling</th><th>Integriteit / contacten</th></tr>";
for (const r of summary.results.filter((r) => r.model === "nikki")) {
  const by = {};
  for (const p of r.regions) by[p.region] = (by[p.region] ?? 0) + p.after;
  html += `<tr><td>${e(r.id)}: ${r.triangles}<br>Doel: ${r.requestedTriangles ?? "artistiek"}<br>Texture: ${r.textureBytes} B, CLUT: ${r.paletteBytes} B<br><a href="${r.id}/nikki/measurements.json">Constraint-, pose- en exportmetingen</a></td><td><pre>${e(JSON.stringify(by, null, 2))}</pre></td><td><pre>${e(JSON.stringify({ integrity: r.integrity, contacts: r.contacts }, null, 2))}</pre></td></tr>`;
}
html += "</table></section>";
const stress = JSON.parse(
  await readFile("artifacts/dev9/pose-stress-summary.json", "utf8"),
);
await copyFile(
  "artifacts/dev9/pose-stress-summary.json",
  path.join(publicRoot, "pose-stress-summary.json"),
);
summary.sourceAnimationClips = stress.sourceAnimationClips;
html += `<h2>Bronrig versus conversie: resterende schouderstrain</h2><p>De huidige Nikki-input bevat ${stress.sourceAnimationClips} echte bronanimatieclips en ${stress.sourceAnimationTracks} animatietracks. Deze proeven draaien geselecteerde bones en zijn geen originele animaties of gameplay. Ook de bron heeft meetbare shoulder-strain; de langere low-poly-randen kunnen de absolute rek vergroten. Nul onverklaarde gaten is dus geen bewijs van natuurlijke kledingvervorming.</p><p><a href="pose-stress-summary.json">Volledige aggregaten zonder bronvertices</a>. Aantallen edges zijn niet rechtstreeks vergelijkbaar bij verschillende tessellatie. Onderstaande rek is genormaliseerd op de bronkarakterhoogte; het is geen artistieke score of universele foutgrens.</p><section><table><tr><th>Pose / regio</th><th>Max edgeverhouding bron / conversie</th><th>Max toename als % karakterhoogte bron / conversie</th></tr>`;
for (const p of stress.poses.filter((p) =>
  ["guard", "reach", "arms-raised"].includes(p.pose),
))
  for (const role of [
    "spine",
    "leftShoulder",
    "rightShoulder",
    "leftShoulder/leftUpperArm",
    "rightShoulder/rightUpperArm",
    "leftUpperArm",
    "rightUpperArm",
  ]) {
    const a = p.source[role],
      b = p.converted[role];
    if (!a || !b) continue;
    html += `<tr><td>${e(p.pose)} / ${e(role)}</td><td>${a.maxStretch.toFixed(3)} / ${b.maxStretch.toFixed(3)}</td><td>${(a.maxIncreaseOverHeight * 100).toFixed(3)}% / ${(b.maxIncreaseOverHeight * 100).toFixed(3)}%</td></tr>`;
  }
html +=
  "</table></section><p>Een bestaande armraise/guard/punch-clip op dezelfde bronrig, inclusief eventuele twist-/corrective-bones, zou betrouwbare aanvullende referentie geven. Zonder zulke data wordt een aangenomen correctiebone-aansturing niet als gevalideerde animatiecompatibiliteit geïmplementeerd.</p>";
html += `<h2>Bescherming en nog openstaande beoordeling</h2><pre>${e(JSON.stringify(summary.faceCore, null, 2))}</pre><p>Haarcards hebben echte componentranden; deze worden niet blind aan elkaar gelast. Ogen, oogleden, handcontouren, UV-sheets, gewrichten en fysieke buitenranden kunnen verdere reductie begrenzen. Verklaarde open randen en positionele contacten zijn apart van werkelijke ontbrekende oppervlakken gemeten. Nul onverklaarde randen betekent geen collision- of gameplaycertificaat.</p><p>De grotere torso-palette gebruikt extra stagingtexturegeheugen. Native donorcapaciteit is niet aangetoond. Originele Nina-bestanden, een Expanded-installatie en echte gameanimaties zijn niet beschikbaar; native fixtures zijn alleen synthetische checks. Beoordeel vooral vingers, oksels in opgeheven poses, huidfacettering, haargaten en verlies van detail in de kandidaten.</p><p>Cesium Man ©2017 Cesium, CC BY 4.0; aangepaste screenshots. <a href="CESIUM-ATTRIBUTION.txt">Bron, licentie en wijzigingsvermelding</a>. Nikki is privé aangeleverd. De twee synthetische kapsels en handen zijn eigen regressiefixtures.</p></html>`;
// Keep every displayed PNG plus the original-camera evidence, not thousands
// of unused duplicates in the downloadable review. Raw render outputs remain
// untouched in artifacts; older published review folders are never pruned.
const retainedImages = new Set(
  [...html.matchAll(/src="([^"]+\.png)"/g)].map((m) => m[1]),
);
for (const check of summary.sourceCameraChecks)
  for (const id of ["dev7", "dev8", "dev9"])
    retainedImages.add(`${id}/${check.model}/${check.view}-source.png`);
async function pruneGeneratedPNGs(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    if (item.isSymbolicLink()) throw Error("No evidence symlinks");
    const file = path.join(dir, item.name);
    if (item.isDirectory()) await pruneGeneratedPNGs(file);
    else if (
      item.name.endsWith(".png") &&
      !retainedImages.has(
        path.relative(publicRoot, file).split(path.sep).join("/"),
      )
    )
      await unlink(file);
  }
}
await pruneGeneratedPNGs(publicRoot);
summary.retainedReviewPNGCount = retainedImages.size;
await copyFile(
  "artifacts/reference/ATTRIBUTION.txt",
  path.join(publicRoot, "CESIUM-ATTRIBUTION.txt"),
);
await writeFile(path.join(publicRoot, "index.html"), html);
await writeFile(
  path.join(publicRoot, "technical-summary.json"),
  JSON.stringify(summary, null, 2),
);
console.log(
  "Safe dev.9 gallery generated; no private scene/model/project files copied.",
);
