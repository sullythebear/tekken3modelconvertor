import {validateRefinementProject} from './refinement-project.js';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {assetCRC} from './project-integrity.js';
import {artSettings} from './art-director.js';
const LIMIT=512*1024**2;
export function writeStudioProject(files,metadata) {
 validateRefinementProject(metadata.refinement);
 if(files.length>512)throw Error('Project file count exceeds 512');
 let total=0;const out={};
 files.forEach((f,i)=>{const data=f.data instanceof Uint8Array?f.data:new Uint8Array(f.data);total+=data.length;if(total>LIMIT)throw Error('Project exceeds 512 MiB');out['assets/'+i]=data;});
 out['project.json']=strToU8(JSON.stringify({...metadata,schema:'t3cs-project/1',files:files.map(f=>f.name),assetCRC:files.map(f=>assetCRC(f.data instanceof Uint8Array?f.data:new Uint8Array(f.data)))}));
 return zipSync(out,{level:1});
}
export function readStudioProject(bytes) {
 if(bytes.length>LIMIT)throw Error('Project exceeds 512 MiB');
 let total=0,count=0;const seen=new Set();
 const zip=unzipSync(bytes,{filter:f=>{
  if(!/^(project\.json|assets\/\d+)$/.test(f.name)||seen.has(f.name))throw Error('Unexpected or duplicate project entry');
  seen.add(f.name);total+=f.originalSize;if(++count>513||total>LIMIT)throw Error('Project expansion limit exceeded');return true;
 }});
 const p=JSON.parse(strFromU8(zip['project.json']??new Uint8Array()));
 if(p.schema!=='t3cs-project/1'||!Array.isArray(p.files)||p.files.length>512||p.files.some(n=>typeof n!=='string'||!n||n.includes('\0')))throw Error('Invalid project metadata');
 if(Object.keys(zip).length!==p.files.length+1)throw Error('Unexpected or missing project asset count');
 if(p.selected!=null&&!p.files.includes(p.selected))throw Error('Selected model is missing from project');
 if(p.assetCRC!==undefined&&(!Array.isArray(p.assetCRC)||p.assetCRC.length!==p.files.length||p.assetCRC.some(v=>typeof v!=='string'||! /^[a-f0-9]{8}$/.test(v))))throw Error('Invalid asset integrity metadata');
 artSettings(p.art);
 validateRefinementProject(p.refinement);if(p.refinement&&!p.files.includes(p.refinement.file))throw Error('Artistieke bewerkingsbasis ontbreekt.');
 return {...p,records:p.files.map((name,i)=>{if(!zip['assets/'+i])throw Error('Project asset missing');if(p.assetCRC&&assetCRC(zip['assets/'+i])!==p.assetCRC[i])throw Error('Project asset integrity mismatch');return {name,data:zip['assets/'+i]};})};
}
