import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
export async function browserSession() {
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
