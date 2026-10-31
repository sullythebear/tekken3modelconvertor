const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld(
  "studio",
  Object.freeze({
    localGamePrivacy:()=>ipcRenderer.invoke('studio:local-game-privacy'),
    archiveOpen:()=>ipcRenderer.invoke('studio:archive-open'),
    archiveInspectCharacter:character=>ipcRenderer.invoke('studio:archive-inspectCharacter',{character}),
    archiveExperimentCatalog:args=>ipcRenderer.invoke('studio:archive-experimentCatalog',args),
    archivePrepareExperiment:args=>ipcRenderer.invoke('studio:archive-prepareExperiment',args),
    archiveBrowse:args=>ipcRenderer.invoke('studio:archive-browse',args),
    archiveScan:args=>ipcRenderer.invoke('studio:archive-scan',args),
    archiveCancel:()=>ipcRenderer.invoke('studio:archive-cancel'),
    archiveExtract:ids=>ipcRenderer.invoke('studio:archive-extract',ids),
    archiveImport:ids=>ipcRenderer.invoke('studio:archive-importFiles',{ids}),
    onArchiveProgress:fn=>{const listener=(_event,p)=>fn(p);ipcRenderer.on('studio:archive-progress',listener);return()=>ipcRenderer.removeListener('studio:archive-progress',listener);},
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
