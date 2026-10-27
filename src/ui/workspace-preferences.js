// Presentation preferences only. No conversion values or private asset data.
export const UI_KEY='t3cs.workspace.v1';
export const CATEGORIES=['geometry','face','hair','materials','skeleton','local','native','diagnostics','advanced'];
export function workspacePreferences(value){
 const v=value&&typeof value==='object'?value:{};
 return {mode:v.mode==='advanced'?'advanced':'standard',panel:typeof v.panel==='boolean'?v.panel:false,preview:['compare','source','result','simulation'].includes(v.preview)?v.preview:'compare',multiple:v.multiple===true,open:Array.isArray(v.open)?[...new Set(v.open.filter(x=>CATEGORIES.includes(x)))].slice(0,9):['geometry']};
}
export function readWorkspacePreferences(storage){try{return workspacePreferences(JSON.parse(storage.getItem(UI_KEY)));}catch{return workspacePreferences();}}
export function writeWorkspacePreferences(storage,value){try{storage.setItem(UI_KEY,JSON.stringify(workspacePreferences(value)));return true;}catch{return false;}}
