const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const ROOT = path.resolve(__dirname, "../../dist");
let main;
const inputPaths = new Set();
const pathKey = (p) =>
  process.platform === "win32"
    ? path.resolve(p).toLowerCase()
    : path.resolve(p);
async function choose(filters) {
  const result = await dialog.showOpenDialog(main, {
    properties: ["openFile", "multiSelections"],
    filters,
  });
  if (result.canceled) return [];
  const out = [];
  let size = 0;
  for (const p of result.filePaths) {
    const stat = await fs.stat(p);
    if (!stat.isFile()) throw Error("Not a regular file");
    size += stat.size;
    if (size > 1024 ** 3)
      throw Error("Import exceeds the 1 GiB safety limit. Split the asset.");
    inputPaths.add(pathKey(p));
    inputPaths.add(pathKey(await fs.realpath(p)));
    out.push({
      name: path.basename(p),
      data: new Uint8Array(await fs.readFile(p)),
    });
  }
  return out;
}
function trusted(event) {
  if (
    event.sender !== main.webContents ||
    event.senderFrame !== main.webContents.mainFrame
  )
    throw Error("Untrusted IPC sender");
}
app.whenReady().then(() => {
  main = new BrowserWindow({
    width: 1560,
    height: 1000,
    minWidth: 1100,
    minHeight: 740,
    backgroundColor: "#0c1017",
    title: "Tekken 3 Conversion Studio",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  main.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  main.webContents.on("will-navigate", (e) => e.preventDefault());
  main.webContents.session.setPermissionRequestHandler((_, __, cb) =>
    cb(false),
  );
  ipcMain.handle("studio:open", (event) => {
    trusted(event);
    return choose([
      {
        name: "Character and textures",
        extensions: [
          "fbx",
          "obj",
          "mtl",
          "glb",
          "gltf",
          "bin",
          "tga",
          "png",
          "jpg",
          "jpeg",
        ],
      },
    ]);
  });
  ipcMain.handle("studio:donor", (event) => {
    trusted(event);
    return choose([
      {
        name: "Original donor model, ARC or extracted package",
        extensions: ["3dm", "bin", "arc", "zip"],
      },
    ]);
  });
  ipcMain.handle("studio:game-files", (event) => {
    trusted(event);
    return choose([
      {
        name: "Original USA executable and standalone BNS",
        extensions: ["02", "bns"],
      },
    ]);
  });
  ipcMain.handle("studio:disc-image", async event => {
    trusted(event);
    const result = await dialog.showOpenDialog(main, {
      properties: ["openFile"],
      filters: [{name: "Original PlayStation disc image", extensions: ["iso", "bin", "img"]}],
    });
    if (result.canceled || !result.filePaths.length) return null;
    const file = result.filePaths[0], handle = await fs.open(file, "r");
    try {
      const stat = await handle.stat();
      if (!stat.isFile()) throw Error("Not a regular disc image");
      inputPaths.add(pathKey(file)); inputPaths.add(pathKey(await fs.realpath(file)));
      const {openDiscImage} = await import("../core/disc-image.mjs");
      const extracted = await openDiscImage({size: stat.size, read: async (position, length) => {
        const bytes = new Uint8Array(length);
        let offset = 0;
        while (offset < length) {
          const read = await handle.read(bytes, offset, length - offset, position + offset);
          if (!read.bytesRead) throw Error("Truncated disc image");
          offset += read.bytesRead;
        }
        return bytes;
      }});
      extracted.report.sourceFile = path.basename(file);
      return extracted;
    } finally { await handle.close(); }
  });
  ipcMain.handle("studio:bind-profile", (event) => {
    trusted(event);
    return choose([
      { name: "Donor bind calibration JSON", extensions: ["json"] },
    ]);
  });
  ipcMain.handle("studio:open-game-backup", (event) => {
    trusted(event);
    return choose([{ name: "Game backup ZIP", extensions: ["zip"] }]);
  });
  ipcMain.handle("studio:restore-game-backup", async (event, { files }) => {
    trusted(event);
    if (
      !Array.isArray(files) ||
      files.length !== 2 ||
      files.some(
        (f) =>
          !["SLUS_004.02", "TEKKEN3.BNS"].includes(f.name) ||
          !(f.data instanceof Uint8Array),
      ) ||
      files.reduce((s, f) => s + f.data.length, 0) > 1024 ** 3
    )
      throw Error("Invalid game restore payload");
    const directory = await dialog.showOpenDialog(main, {
      title: "Choose the folder to restore the executable and BNS",
      properties: ["openDirectory"],
    });
    if (directory.canceled) return null;
    const confirm = await dialog.showMessageBox(main, {
      type: "warning",
      buttons: ["Cancel", "Restore these two files"],
      defaultId: 0,
      cancelId: 0,
      message: "Restore SLUS_004.02 and TEKKEN3.BNS?",
      detail:
        "Target: " +
        directory.filePaths[0] +
        "\nExisting files will be backed up first. Other game files are not changed.",
    });
    if (confirm.response !== 1) return null;
    const { restoreGameFiles } = await import("../core/backup.mjs");
    return restoreGameFiles(
      directory.filePaths[0],
      path.join(directory.filePaths[0], ".t3cs-restore-backups"),
      files,
    );
  });
  ipcMain.handle("studio:version", (event) => {
    trusted(event);
    return {
      app: app.getVersion(),
      electron: process.versions.electron,
      platform: process.platform,
    };
  });
  ipcMain.handle("studio:save", async (event, { name, data }) => {
    trusted(event);
    if (
      typeof name !== "string" ||
      !/^[-a-zA-Z0-9_. ]+\.(zip|png|json|t3prep|bns)$/.test(name) ||
      !(data instanceof Uint8Array) ||
      data.length > 512 * 1024 * 1024
    )
      throw Error("Invalid export");
    const result = await dialog.showSaveDialog(main, { defaultPath: name });
    if (result.canceled) return false;
    const actualOutput = await fs.realpath(result.filePath).catch(() => null);
    if (
      inputPaths.has(pathKey(result.filePath)) ||
      (actualOutput && inputPaths.has(pathKey(actualOutput)))
    )
      throw Error(
        "Export must be a new file; an imported source/game file cannot be overwritten.",
      );
    const target = result.filePath,
      temp = target + ".t3cs-tmp-" + require("node:crypto").randomUUID();
    try {
      await fs.writeFile(temp, data, { flag: "wx" });
      await fs.rename(temp, target);
    } finally {
      await fs.unlink(temp).catch(() => {});
    }
    return true;
  });
  main.loadFile(path.join(ROOT, "index.html"), {
    query: process.env.T3CS_AUTOMATION === "1" ? {test: "1"} : {},
  });
});
app.on("window-all-closed", () => app.quit());
