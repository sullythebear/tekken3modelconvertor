import {mkdir,mkdtemp,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {runLogged} from './test-process.mjs';
const pkg=JSON.parse(await readFile('package.json','utf8')),source=process.argv.includes('--source');
if(!source&&process.platform!=='win32')throw Error('Portable EXE execution requires Windows; --source tests source Electron only');
await mkdir('artifacts/portable-smoke',{recursive:true});const dir=await mkdtemp(path.resolve('artifacts/portable-smoke/run-')),report=path.join(dir,'probe.json');
const executable=source?path.resolve('node_modules/electron/dist',process.platform==='win32'?'electron.exe':'electron'):path.resolve(`release/Tekken3ConversionStudio-${pkg.version}-x64.exe`);
const args=source?(process.platform==='win32'?['.']:['--no-sandbox','--ozone-platform=headless','--use-angle=swiftshader','--enable-unsafe-swiftshader','.']):[];
const env={...process.env,T3CS_AUTOMATION:'1',T3CS_SMOKE_OUTPUT:report,...(process.platform==='linux'?{XDG_CONFIG_HOME:path.join(dir,'config'),XDG_CACHE_HOME:path.join(dir,'cache')}:{})};
const code=await runLogged(executable,args,{env,logFile:path.join(dir,'process.log'),timeout:180000});assert.equal(code,0,'Owned EXE process failed; see process log');
const result=JSON.parse(await readFile(report,'utf8'));assert.equal(result.status,'PASS');assert.equal(result.version,pkg.version);assert.ok(result.sourceTriangles>0&&result.convertedTriangles>0&&result.exportBytes>0&&result.nodeIsolated);
if(!source){assert.equal(result.platform,'win32');assert.equal(result.packaged,true,'Must execute packaged app, not source Electron');}
result.mode=source?'SOURCE ELECTRON ONLY':'ACTUAL WINDOWS PORTABLE EXE';result.executableSha256=createHash('sha256').update(await readFile(executable)).digest('hex');
await writeFile('artifacts/portable-smoke/'+(source?'source':'windows')+'.json',JSON.stringify(result,null,2));console.log(result);
