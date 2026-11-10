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
export function writeRefinementSnapshot(base){return strToU8(JSON.stringify(base.root.toJSON()));}
export async function readRefinementSnapshot(project){
 const meta=project.refinement;if(!meta)return null;validateRefinementProject(meta);
 const record=project.records.find(r=>r.name===meta.file);if(!record)throw Error('Artistieke bewerkingsbasis ontbreekt.');
 const json=JSON.parse(strFromU8(record.data));if(json.metadata?.type!=='Object'||!json.object)throw Error('Ongeldige artistieke bewerkingsbasis.');
 const root=await new THREE.ObjectLoader().parseAsync(json);configureSkinning(root);root.updateMatrixWorld(true);const stats=inspectScene(root);
 if(!stats.triangles||stats.invalidPositions)throw Error('Artistieke bewerkingsbasis bevat ongeldige geometrie.');
 identifyRefinementMeshes(root);applyDetailProtection(root,meta.state);if(meta.state.selection){try{resolveSelection(root,meta.state.selection);}catch{ /* Optimized-topology selection may be unavailable on the immutable base. */ }}
 return {root,stats,skeleton:analyzeSkeleton(root),settings:meta.settings,report:[],warnings:['Project contains an immutable artistic refinement base; gameplay unverified.'],quality:{},poses:[]};
}
