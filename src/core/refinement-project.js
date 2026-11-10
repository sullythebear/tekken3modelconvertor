import {snapshotSourceSkinField,restoreSourceSkinField} from './skin-surface.js';
import {collectMaterials} from './importer.js';
import * as THREE from 'three';
import {strToU8,strFromU8} from 'fflate';
import {validateRefinementState,identifyRefinementMeshes,applyDetailProtection,resolveSelection} from './refinement.js';
import {inspectScene} from './importer.js';
import {analyzeSkeleton} from './skeleton.js';
import {configureSkinning} from './skinning.js';
export function validateRefinementProject(p){
 if(p==null)return;
 if(p.version!==1||typeof p.file!=='string'||!/^__t3cs_preparation_\d+\.json$/.test(p.file)||p.target!==null&&(!Number.isInteger(p.target)||p.target<4||p.target>1_000_000)||!p.settings||typeof p.settings!=='object')throw Error('Ongeldige of niet-ondersteunde lokale bewerkingsgegevens.');
 validateRefinementState(p.state);
}
const encode=array=>{const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength),chunks=[];for(let i=0;i<bytes.length;i+=32768)chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));return {type:array.constructor.name,data:btoa(chunks.join(''))};};
const decode=value=>{if(!value||!['Float32Array','Uint8Array'].includes(value.type)||typeof value.data!=='string'||value.data.length>64*1024**2||!/^[A-Za-z0-9+/]*={0,2}$/.test(value.data))throw Error('Invalid embedded source field');const bytes=Uint8Array.from(atob(value.data),c=>c.charCodeAt(0));if(value.type==='Float32Array'&&bytes.length%4)throw Error('Invalid source field alignment');return value.type==='Float32Array'?new Float32Array(bytes.buffer):bytes;};
export function writeRefinementSnapshot(base){const fields=[];for(const m of collectMaterials(base.root)){const f=snapshotSourceSkinField(m);if(f)fields.push({uuid:m.uuid,size:f.size,channels:Object.fromEntries(Object.entries(f).filter(([k])=>k!=='size').map(([k,a])=>[k,encode(a)]))});}return strToU8(JSON.stringify({schema:'t3cs-refinement-base/1',scene:base.root.toJSON(),fields}));}
function embeddedImage(url){if(Array.isArray(url))return url.length<=6&&url.every(embeddedImage);if(typeof url==='string')return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(url);return !!url&&Array.isArray(url.data)&&Number.isInteger(url.width)&&Number.isInteger(url.height)&&url.width>0&&url.height>0&&url.width<=16384&&url.height<=16384&&['Uint8Array','Uint8ClampedArray','Float32Array','Uint16Array'].includes(url.type);}

export async function readRefinementSnapshot(project){
 const meta=project.refinement;if(!meta)return null;validateRefinementProject(meta);
 const record=project.records.find(r=>r.name===meta.file);if(!record)throw Error('Artistieke bewerkingsbasis ontbreekt.');
 const wrapper=JSON.parse(strFromU8(record.data));if(wrapper.schema!=='t3cs-refinement-base/1'||!Array.isArray(wrapper.fields)||wrapper.fields.length>512)throw Error('Unsupported refinement snapshot');const json=wrapper.scene;if(json.metadata?.type!=='Object'||!json.object)throw Error('Ongeldige artistieke bewerkingsbasis.');
 if((json.images??[]).some(im=>!embeddedImage(im.url)))throw Error('Alle snapshottextures moeten ingebed zijn; externe paden zijn geweigerd.');
 const root=await new THREE.ObjectLoader().parseAsync(json);const materials=new Map([...collectMaterials(root)].map(m=>[m.uuid,m]));for(const saved of wrapper.fields){const material=materials.get(saved.uuid);if(!material||!saved.channels||Object.keys(saved.channels).some(k=>!['light','valid','normal','tangent','sign','confidence','coverageUV'].includes(k)))throw Error('Invalid source field material reference');restoreSourceSkinField(material,{size:saved.size,...Object.fromEntries(Object.entries(saved.channels).map(([k,v])=>[k,decode(v)]))});}configureSkinning(root);root.updateMatrixWorld(true);const stats=inspectScene(root);
 if(!stats.triangles||stats.invalidPositions)throw Error('Artistieke bewerkingsbasis bevat ongeldige geometrie.');
 identifyRefinementMeshes(root);applyDetailProtection(root,meta.state);if(meta.state.selection){try{resolveSelection(root,meta.state.selection);}catch{ /* Optimized-topology selection may be unavailable on the immutable base. */ }}
 return {root,stats,skeleton:analyzeSkeleton(root),settings:meta.settings,report:[],warnings:['Project contains an immutable artistic refinement base; gameplay unverified.'],quality:{},poses:[]};
}
