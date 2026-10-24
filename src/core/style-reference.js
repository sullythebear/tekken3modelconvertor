import {decodeDonor,decodeTextureArchive} from './donor.js';
import {digest} from './bind.js';
import {ROWS} from './skeleton.js';
// Measurements, not fabricated character averages. Bind/world proportions need
// calibrated frames and cannot be inferred from independent local row positions.
export async function measureStyleReference(model,arc,label) {
 const d=decodeDonor(model),textures=decodeTextureArchive(arc);
 const rows=d.rows.map(r=>({row:r.row,triangles:r.polygons.reduce((s,p)=>s+(p.slots.length===4?2:1),0),polygons:r.polygons.length,populatedSlots:r.slots.filter(Boolean).length}));
 const total=rows.reduce((s,r)=>s+r.triangles,0);
 return {schema:'t3cs-style-measurement/1',label,modelSha256:await digest(model),triangles:total,
  rows:rows.map(r=>({...r,fraction:r.triangles/total})),
  roleFractions:Object.fromEntries(Object.entries(ROWS).map(([role,row])=>[role,(rows.find(r=>r.row===row)?.triangles??0)/total])),
  textures:textures.tiles.map(t=>({width:t.width,height:t.height,colors:t.palette.length})),
  proportions:'NOT MEASURED: calibrated world bind frames required',artistAttribution:'Local user-supplied reference; authenticity not independently verified'};
}
