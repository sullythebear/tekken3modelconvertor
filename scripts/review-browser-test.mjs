// Open the downloadable report exactly as a user does: local file://, no server.
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "playwright-core";
import { createServer } from "node:http";
const root = path.resolve(process.argv[2] ?? "artifacts/review-payload"),
  manifest = JSON.parse(
    await readFile(root + "/evidence-manifest.json", "utf8"),
  ),
  gallery = path.resolve(root, manifest.galleryPath),
  html = await readFile(gallery, "utf8"),
  base = pathToFileURL(gallery),
  images = [...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]),
  links = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
for (const name of [...images, ...links]) {
  if (name.startsWith("#")) {
    assert.ok(
      html.includes(`id="${name.slice(1)}"`),
      "Missing navigation anchor " + name,
    );
    continue;
  }
  const url = new URL(name, base);
  assert.equal(
    url.protocol,
    "file:",
    "Offline gallery cannot require a server or external asset",
  );
  const file = fileURLToPath(url);
  assert.ok(file.startsWith(root + path.sep), "Link escapes review package");
  const bytes = await readFile(file);
  if (images.includes(name)) {
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    assert.ok(bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0);
  }
}
const httpMode = process.env.REVIEW_HTTP === "1";
let server,
  origin = "";
if (httpMode) {
  const allowed = new Set([
    ...manifest.files.map((f) => f.path),
    "evidence-manifest.json",
  ]);
  server = createServer(async (req, res) => {
    try {
      const name = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      ).replace(/^\//, "");
      if (!allowed.has(name)) throw Error("Not allowlisted");
      const file = path.resolve(root, name);
      if (!file.startsWith(root + path.sep)) throw Error("Path");
      res.setHeader(
        "Content-Type",
        name.endsWith(".png")
          ? "image/png"
          : name.endsWith(".html")
            ? "text/html"
            : "text/plain",
      );
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
}
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ??
    (process.platform === "linux"
      ? "/usr/bin/chromium"
      : chromium.executablePath()),
  headless: true,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1560, height: 1100 },
    }),
    errors = [],
    network = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (
      /^https?:/.test(r.url()) &&
      !(httpMode && r.url().startsWith(origin + "/"))
    )
      network.push(r.url());
  });
  await page.goto(httpMode ? origin + "/" + manifest.galleryPath : base.href);
  const visible = page.locator("img").first();
  await visible.scrollIntoViewIfNeeded();
  await visible.evaluate((img) => img.decode());
  assert.equal(await visible.evaluate((img) => img.naturalWidth > 0), true);
  await page.locator('a[href="#budgets"]').click();
  assert.ok(await page.locator("#budgets").isVisible());
  assert.deepEqual(errors, []);
  assert.deepEqual(
    network,
    [],
    "No online dependencies allowed in offline report",
  );
  await mkdir("artifacts/dev9", { recursive: true });
  await writeFile(
    "artifacts/dev9/gallery-browser.json",
    JSON.stringify(
      {
        version: manifest.version,
        status: "PASS",
        mode: httpMode
          ? "HTTP rendering only; cloud browser file scheme blocked by administrator policy"
          : "Actual browser file:// open; no local server",
        offlineFileTest: !httpMode,
        gallerySha256: createHash("sha256").update(html).digest("hex"),
        referencedImages: images.length,
        relativeLinksChecked: links.length,
        pngHeadersValid: true,
        firstVisibleImageDecoded: true,
        budgetNavigationPassed: true,
        pageErrors: errors,
        onlineRequests: network,
        privateAssetsPublished: false,
      },
      null,
      2,
    ),
  );
  console.log(
    httpMode
      ? "HTTP-only report rendering: PASS;"
      : "Offline file HTML report: PASS;",
    images.length,
    "PNG references and",
    links.length,
    "local links checked.",
  );
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
