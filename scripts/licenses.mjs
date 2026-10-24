import { readFile, mkdir, writeFile, readdir, cp } from "node:fs/promises";
const packages = [
  "three",
  "delaunator",
  "robust-predicates",
  "meshoptimizer",
  "fflate",
  "electron",
  "electron-builder",
  "esbuild",
  "playwright-core",
];
const inventory = [];
await mkdir("docs/licenses", { recursive: true });
for (const name of packages) {
  const p = JSON.parse(
    await readFile(`node_modules/${name}/package.json`, "utf8"),
  );
  const files = (await readdir(`node_modules/${name}`)).filter((n) =>
    /^licen[sc]e|^copying|^notice/i.test(n),
  );
  for (const file of files)
    await cp(`node_modules/${name}/${file}`, `docs/licenses/${name}-${file}`, {
      recursive: true,
    });
  inventory.push({
    name,
    version: p.version,
    license: p.license,
    repository: p.repository,
    licenseFiles: files,
  });
}
await writeFile(
  "docs/licenses/direct-dependencies.json",
  JSON.stringify(inventory, null, 2) + "\n",
);
console.log(
  inventory.map((i) => `${i.name}@${i.version}: ${i.license}`).join("\n"),
);
