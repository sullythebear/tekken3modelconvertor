import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {artSettings} from './art-director.js';
const LIMIT=512*1024**2;
export function writeStudioProject(files,metadata) {
 if(files.length>512)throw Error('Project file count exceeds 512');
 let total=0;const out={};
 files.forEach((f,i)=>{const data=new Uint8Array(f.data);total+=data.length;if(total>LIMIT)throw Error('Project exceeds 512 MiB');out['assets/'+i]=data;});
 out['project.json']=strToU8(JSON.stringify({schema:'t3cs-project/1',...metadata,files:files.map(f=>f.name)}));
 return zipSync(out);
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
 artSettings(p.art);
 return {...p,records:p.files.map((name,i)=>{if(!zip['assets/'+i])throw Error('Project asset missing');return {name,data:zip['assets/'+i]};})};
}
