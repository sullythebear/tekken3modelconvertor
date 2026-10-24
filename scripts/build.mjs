import {patchFBX, patchGLTF} from "./extended-loader-patches.mjs";
import { build } from "esbuild";
import { mkdir, copyFile, cp, readFile, writeFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await build({
  plugins: [{name: "preserve-all-skin-influences", setup(b) {
    b.onLoad({filter: /[/\\](FBXLoader|GLTFLoader)\.js$/}, async args => ({
      contents: (args.path.endsWith("FBXLoader.js") ? patchFBX : patchGLTF)(await readFile(args.path, "utf8")), loader: "js",
    }));
  }}],
  entryPoints: ["src/ui/app.js"],
  outfile: "dist/app.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  sourcemap: true,
  target: "chrome134",
});
await Promise.all(
  ["style.css"].map((n) => copyFile(`src/ui/${n}`, `dist/${n}`)),
);
const pkg = JSON.parse(await readFile("package.json", "utf8"));
await writeFile("dist/index.html", (await readFile("src/ui/index.html", "utf8")).replaceAll("__APP_VERSION__", pkg.version));
console.log("Built offline renderer in dist/");

await cp("docs", "dist/docs", { recursive: true });
await copyFile("LICENSE", "dist/LICENSE-project.txt");
