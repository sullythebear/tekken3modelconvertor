const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld(
  "studio",
  Object.freeze({
    openFiles: () => ipcRenderer.invoke("studio:open"),
    openDonor: () => ipcRenderer.invoke("studio:donor"),
    openBindProfile: () => ipcRenderer.invoke("studio:bind-profile"),
    openDiscImage: () => ipcRenderer.invoke("studio:disc-image"),
    openGameFiles: () => ipcRenderer.invoke("studio:game-files"),
    openGameBackup: () => ipcRenderer.invoke("studio:open-game-backup"),
    restoreGameBackup: (files) =>
      ipcRenderer.invoke("studio:restore-game-backup", { files }),
    save: (name, data) => ipcRenderer.invoke("studio:save", { name, data }),
    version: () => ipcRenderer.invoke("studio:version"),
  }),
);
