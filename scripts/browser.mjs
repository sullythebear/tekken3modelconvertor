import { chromium, _electron } from "playwright-core";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
export async function browserSession() {
  if (process.env.T3CS_AUTOMATION === "1") {
    const app = await _electron.launch({
      executablePath: path.resolve("node_modules/electron/dist/" + (process.platform === "win32" ? "electron.exe" : "electron")),
      args: process.platform === "win32" ? ["."] : ["--no-sandbox", "--ozone-platform=headless", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "."],
      env: {...process.env, ...(process.platform === "linux" ? {XDG_CONFIG_HOME: "/workspace/.t3cs-config", XDG_CACHE_HOME: "/workspace/.t3cs-cache"} : {})},
      timeout: 60000,
    });
    const page = await app.firstWindow(), errors = [], consoleLog = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("console", m => consoleLog.push({type: m.type(), text: m.text().slice(0, 4096)}));
    page.on("crash", () => errors.push("Electron renderer crashed"));
    await page.waitForFunction(() => Boolean(window.studioTest));
    // Preserve real desktop IPC while directing automated exports into test downloads.
    await app.evaluate(({dialog, app}, folder) => {
      app.setPath("crashDumps", folder);
      dialog.showSaveDialog = async (_window, options) => ({canceled: false, filePath: pathJoin(folder, options.defaultPath)});
      function pathJoin(a,b) {return a + "/" + b.replace(/^.*[\\/]/, "");}
    }, path.resolve(process.env.T3CS_RUN_OUTPUT ?? "artifacts/nikki"));
    return {page, errors, desktop: true, async close() {
      await writeFile(path.resolve(process.env.T3CS_RUN_OUTPUT ?? "artifacts/nikki", "electron-console.json"), JSON.stringify({errors, console: consoleLog.slice(-4000)},null,2));
      await app.close();
    }};
  }
  const root = path.resolve("dist"),
    server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, "http://localhost"),
          name = path.resolve(
            root,
            "." +
              decodeURIComponent(
                url.pathname === "/" ? "/index.html" : url.pathname,
              ),
          );
        if (!name.startsWith(root + path.sep)) throw Error("path");
        res.setHeader(
          "Content-Type",
          name.endsWith(".js")
            ? "text/javascript"
            : name.endsWith(".css")
              ? "text/css"
              : "text/html",
        );
        res.end(await readFile(name));
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const browser = await chromium.launch({
    executablePath:
      process.env.CHROMIUM_PATH ||
      (process.platform === "linux"
        ? "/usr/bin/chromium"
        : chromium.executablePath()),
    headless: true,
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1560, height: 1100 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/?test=1`);
  await page.waitForFunction(() => Boolean(window.studioTest));
  return {
    page,
    errors,
    async close() {
      await browser.close();
      await new Promise((r) => server.close(r));
    },
  };
}
