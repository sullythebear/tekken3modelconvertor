import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {zipSync} from 'fflate';
import {sha256} from './windows-test-core.mjs';
const source={}, evidence={};
async function collect(dir,target,filter=()=>true){
 for(const e of await readdir(dir,{withFileTypes:true})){
  const name=dir+'/'+e.name;
  if(e.isDirectory())await collect(name,target,filter);
  else if(filter(name))target[name]=new Uint8Array(await readFile(name));
 }
}
for(const dir of ['src','scripts','tests','docs','.github'])await collect(dir,source);
for(const file of ['Test-Windows.cmd','README.md','LICENSE','.gitignore','package.json','package-lock.json'])source[file]=new Uint8Array(await readFile(file));
const latest=JSON.parse(await readFile('artifacts/windows-local/latest.json','utf8'));
const run=path.relative(process.cwd(),path.dirname(latest.report)).replaceAll('\\','/');
if(!/^artifacts\/windows-local\/[^/]+$/.test(run))throw Error('Evidence run must be inside the local run folder');
await collect(run,evidence,p=>/\.(png|json|html|log)$/i.test(p));
evidence['artifacts/unit-results.xml']=new Uint8Array(await readFile('artifacts/unit-results.xml'));
await mkdir('release',{recursive:true});
const hashes=[];
for(const [file,entries] of [['WindowsTestEnvironment-source.zip',source],['WindowsTestEnvironment-cloud-evidence.zip',evidence]]){
 const bytes=zipSync(entries,{level:1});await writeFile('release/'+file,bytes);hashes.push(sha256(bytes)+'  '+file);
 console.log(file,Object.keys(entries).length,'files');
}
await writeFile('release/WindowsTestEnvironment-SHA256SUMS.txt',hashes.join('\n')+'\n');
