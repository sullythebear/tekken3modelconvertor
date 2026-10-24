import {readFile,writeFile,mkdir,mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import {unzipSync} from 'fflate';
export async function unpackNikkiZIP(file,{parent=path.dirname(file),maxBytes=1024**3}={}) {
  const raw=await readFile(file);
  if(raw.length>1024**3)throw Error('Nikki ZIP exceeds compressed size limit');
  let total=0,count=0;const names=new Set();
  const entries=unzipSync(new Uint8Array(raw),{filter:entry=>{
    const name=entry.name.replaceAll('\\','/'),parts=name.split('/');
    if(name.startsWith('/')||/^[A-Za-z]:/.test(name)||parts.some(p=>p==='..'||p==='.')||name.includes('\0'))throw Error('Unsafe path in Nikki ZIP');
    if(!/\.(fbx|tga|png|jpe?g|glb|gltf|bin|mtl)$/i.test(name))return false;
    if(names.has(name.toLowerCase()))throw Error('Duplicate file path in Nikki ZIP');
    names.add(name.toLowerCase());
    total+=entry.originalSize;
    if(!Number.isSafeInteger(entry.originalSize)||entry.originalSize<0||total>maxBytes||++count>512)throw Error('Nikki ZIP exceeds extraction limits');
    return true;
  }});
  await mkdir(parent,{recursive:true});const root=await mkdtemp(path.join(parent,'nikki-unpacked-'));
  try {
    for(const [name,data]of Object.entries(entries)) {
      const relative=name.replaceAll('\\','/'),target=path.resolve(root,relative);
      if(!target.startsWith(root+path.sep))throw Error('Unsafe extraction target');
      await mkdir(path.dirname(target),{recursive:true});await writeFile(target,data,{flag:'wx'});
    }
    return root;
  }catch(error){await rm(root,{recursive:true,force:true});throw error;}
}
