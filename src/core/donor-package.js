import {unzipSync} from 'fflate';
import {DONORS} from './native.js';
import {readDiscTable,USA_DISC} from './bns.js';
import {decodeDonor,decodeTextureArchive} from './donor.js';
import {digest} from './bind.js';
export async function readDonorPackage(input,{donorId='nina-p1-us',profile=USA_DISC}={}) {
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input),slot=DONORS.find(d=>d.id===donorId);
  if(!slot)throw Error('Unsupported donor package slot');
  const names=['SLUS_004.02',`record-${slot.modelRecord}.3dm`,`record-${slot.textureRecord}.arc`,'extraction.json'];
  if(bytes.length>64*1024**2)throw Error('Donor package exceeds 64 MiB limit');
  let total=0;const seen=new Set();
  const files=unzipSync(bytes,{filter:entry=>{
    if(!names.includes(entry.name)||seen.has(entry.name))throw Error('Unexpected or duplicate donor package entry');
    seen.add(entry.name);total+=entry.originalSize;
    if(!Number.isSafeInteger(entry.originalSize)||entry.originalSize<0||total>64*1024**2)throw Error('Donor package extraction size limit');
    return true;
  }});
  if(names.some(name=>!files[name]))throw Error('Donor package is missing its executable, records or extraction report');
  const manifest=JSON.parse(new TextDecoder().decode(files['extraction.json']));
  if(manifest.schema!=='t3cs-donor-extraction/1'||manifest.id!==slot.id)throw Error('Donor package slot differs from the selected character');
  const executable=files[names[0]],model=files[names[1]],arc=files[names[2]],table=await readDiscTable(executable,{profile});
  const sizeOffset=profile.modelSizeOffset+slot.modelId*12,v=new DataView(executable.buffer,executable.byteOffset,executable.byteLength);
  if(sizeOffset+12>executable.length||v.getUint32(sizeOffset,true)!==model.length||v.getUint32(sizeOffset+8,true)!==arc.length||table.entries[slot.modelRecord].size!==model.length||table.entries[slot.textureRecord].size!==arc.length)
    throw Error('Donor package records do not match executable capacities');
  const modelSha256=await digest(model),arcSha256=await digest(arc);
  if(manifest.disc?.modelSha256!==modelSha256||manifest.disc?.arcSha256!==arcSha256)throw Error('Donor package record hashes do not match its extraction report');
  decodeDonor(model);decodeTextureArchive(arc);
  return {records:[{name:names[1],data:model},{name:names[2],data:arc}],executable,report:{
    schema:'t3cs-donor-package-validation/1',donorId:slot.id,retailExecutableVerified:table.retailExecutableVerified,
    modelSha256,arcSha256,sizesBoundToExecutable:true,assetAuthenticityVerified:false,gameVerified:false,
    sourceImage:manifest.sourceImage??null,
  }};
}
