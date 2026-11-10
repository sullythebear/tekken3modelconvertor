// One same-directory rename is the commit point. Never truncate an existing target.
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
async function atomicWrite(target,data,{signal,io=fs}={}){
 if(!(data instanceof Uint8Array)||!data.length)throw Error('Lege of ongeldige uitvoer');
 const check=()=>{if(signal?.aborted)throw Error('Opslaan geannuleerd');};check();
 const info=await io.lstat(target).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});
 if(info&&!info.isFile())throw Error('Doel is geen gewoon bestand');
 const temp=path.join(path.dirname(target),'.t3cs-'+randomUUID()+'.tmp');let handle;
 try{
  handle=await io.open(temp,'wx',0o600);check();await handle.writeFile(data);await handle.sync();await handle.close();handle=null;check();
  const saved=await io.stat(temp);if(saved.size!==data.byteLength)throw Error('Uitvoer is niet volledig geschreven');
  await io.rename(temp,target);
 }finally{if(handle)await handle.close().catch(()=>{});await io.unlink(temp).catch(()=>{});}
}
module.exports={atomicWrite};
