// Reproducible evidence route. Inputs stay private; only the explicit PNG and
// count/hash summary allowlist below is copied into the public review.
import { spawn } from "node:child_process";
import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  copyFile,
} from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
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
    version: "0.7.0-dev.9",
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
const e = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let html = `<!doctype html><html lang="nl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Dev.9 — echte beelden en meetgegevens</title><style>body{font:18px system-ui;background:#101823;color:#eef3ff;margin:24px}a{color:#9cf}section{overflow:auto}table{border-collapse:collapse}td,th{padding:10px;border:1px solid #345;vertical-align:top}img{width:510px;max-height:650px;object-fit:contain}pre{white-space:pre-wrap}.warn{color:#ffbd89}nav a{margin-right:18px}</style><h1>0.7.0-dev.9 — artistieke beoordeling gevraagd</h1><p class="warn">Geen definitieve artistieke goedkeuring en geen geverifieerde Tekken/Expanded-gameplay. Doelbudgetten zijn experimenteel; werkelijk behaalde aantallen staan bij elk beeld.</p><nav><a href="#hands">Handen</a><a href="#body">Schouders en huid</a><a href="#poses">Beweging</a><a href="#budgets">Kandidaten</a><a href="technical-summary.json">Alle meetgegevens</a><a href="../WINDOWS-STATUS.md">Windows-testmetingen</a><a href="../REVIEW.md">Status en beperkingen</a></nav><p>Oude beelden en meetgegevens komen uit de gepubliceerde dev.7- en dev.8-galerijen. Bronbeelden worden byte-voor-byte gecontroleerd om identieke camera, schaal, belichting en resolutie vast te stellen. De nieuwe beelden komen uit dezelfde volledige import/conversie/exporttest. Diagnostische poses zijn geen Tekken-animaties. Bronmodellen, brontextures, projecten en gamebestanden zijn uitgesloten.</p><p>Nieuw: structurele bron-geprojecteerde vingers, echte kleur-overdracht van kleine vingeraccessoires, source-UV-sheetbehoud bij reductie, gerepareerde overdracht van huid-normalvelden, volledige torso-texelhoogte en conservatieve contactreconciliatie. Gezichtskern en zijn onbewerkte texture zijn identiek gebleven. De kledingvervorming bij extreme schouderposes is nog niet volledig opgelost; handen blijven bewust low-poly. Beoordeel verbeteringen en beperkingen in de grote afbeeldingen.</p>`;
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
  "<h2>Regionale kosten en integriteit</h2><section><table><tr><th>Variant</th><th>Regioverdeling</th><th>Integriteit / contacten</th></tr>";
for (const r of summary.results.filter((r) => r.model === "nikki")) {
  const by = {};
  for (const p of r.regions) by[p.region] = (by[p.region] ?? 0) + p.after;
  html += `<tr><td>${e(r.id)}: ${r.triangles}<br>Doel: ${r.requestedTriangles ?? "artistiek"}<br>Texture: ${r.textureBytes} B, CLUT: ${r.paletteBytes} B<br><a href="${r.id}/nikki/measurements.json">Constraint-, pose- en exportmetingen</a></td><td><pre>${e(JSON.stringify(by, null, 2))}</pre></td><td><pre>${e(JSON.stringify({ integrity: r.integrity, contacts: r.contacts }, null, 2))}</pre></td></tr>`;
}
html += "</table></section>";
html += `<h2>Bescherming en nog openstaande beoordeling</h2><pre>${e(JSON.stringify(summary.faceCore, null, 2))}</pre><p>Haarcards hebben echte componentranden; deze worden niet blind aan elkaar gelast. Ogen, oogleden, handcontouren, UV-sheets, gewrichten en fysieke buitenranden kunnen verdere reductie begrenzen. Verklaarde open randen en positionele contacten zijn apart van werkelijke ontbrekende oppervlakken gemeten. Nul onverklaarde randen betekent geen collision- of gameplaycertificaat.</p><p>De grotere torso-palette gebruikt extra stagingtexturegeheugen. Native donorcapaciteit is niet aangetoond. Originele Nina-bestanden, een Expanded-installatie en echte gameanimaties zijn niet beschikbaar; native fixtures zijn alleen synthetische checks. Beoordeel vooral vingers, oksels in opgeheven poses, huidfacettering, haargaten en verlies van detail in de kandidaten.</p><p>Cesium Man ©2017 Cesium, CC BY 4.0; aangepaste screenshots. Nikki is privé aangeleverd. De twee synthetische kapsels en handen zijn eigen regressiefixtures.</p></html>`;
await writeFile(path.join(publicRoot, "index.html"), html);
await writeFile(
  path.join(publicRoot, "technical-summary.json"),
  JSON.stringify(summary, null, 2),
);
console.log(
  "Safe dev.9 gallery generated; no private scene/model/project files copied.",
);
