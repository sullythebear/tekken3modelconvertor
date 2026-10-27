// UI presentation only; preserve existing controls and conversion/project behavior.
const UI_KEY = "t3cs.workspace.v1";
const CATEGORIES = ["geometry", "face", "hair", "materials", "skeleton", "local", "native", "diagnostics", "advanced"];
function workspacePreferences(value) {
  const v = value && typeof value === "object" ? value : {};
  return { mode: v.mode === "advanced" ? "advanced" : "standard", panel: typeof v.panel === "boolean" ? v.panel : false, preview: ["compare", "source", "result", "simulation"].includes(v.preview) ? v.preview : "compare", multiple: v.multiple === true, open: Array.isArray(v.open) ? [...new Set(v.open.filter((x) => CATEGORIES.includes(x)))].slice(0, v.multiple === true ? 9 : 1) : ["geometry"] };
}
function readWorkspacePreferences(storage) {
  try {
    return workspacePreferences(JSON.parse(storage.getItem(UI_KEY)));
  } catch {
    return workspacePreferences();
  }
}
function writeWorkspacePreferences(storage, value) {
  try {
    storage.setItem(UI_KEY, JSON.stringify(workspacePreferences(value)));
    return true;
  } catch {
    return false;
  }
}
export {
  CATEGORIES,
  UI_KEY,
  readWorkspacePreferences,
  workspacePreferences,
  writeWorkspacePreferences
};
