import test from 'node:test';
import assert from 'node:assert/strict';
import {validateConfig,validateRuntimeReceipt,finalVerdict,renderReport,sha256} from '../scripts/windows-test-core.mjs';
import {runLogged} from '../scripts/test-process.mjs';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
test('Windows runner requires user assets and refuses malformed configuration',()=>{
 assert.throws(()=>validateConfig({}),/Nikki/);
 assert.throws(()=>validateConfig({nikkiDirectory:'Nikki'}),/game files/);
 assert.throws(()=>validateConfig({nikkiDirectory:'Nikki',discImage:7}),/Invalid path/);
 assert.equal(validateConfig({nikkiDirectory:'C:\\Nikki',discImage:'C:\\Game.bin'}).discImage,'C:\\Game.bin');
});
test('Runtime receipts bind exact candidate, run and donor and require isolated installation hashes',()=>{
 const hash=sha256(new Uint8Array([1,2,3]));
 const r={schema:'t3cs-runtime-install/1',runId:'run1',candidateSha256:hash,donorId:'nina-p1-us',expandedVersion:'fixture',loaderVersion:'fixture',executable:'game.exe',workingDirectory:'test-copy',arguments:[],installed:true,sourceModified:false,installedFiles:[{path:'model.bin',sha256:hash}]};
 assert.equal(validateRuntimeReceipt(r,hash,'run1'),r);
 for(const patch of [{runId:'old'},{candidateSha256:'0'.repeat(64)},{donorId:'other'},{sourceModified:true},{installed:false},{installedFiles:[]},{arguments:['x',3]},{loaderVersion:''},{installedFiles:[{path:'model.bin',sha256:'bad'}]}])
  assert.throws(()=>validateRuntimeReceipt({...r,...patch},hash,'run1'));
});
test('Blocked checks cannot be misreported as PASS and report escapes untrusted errors',()=>{
 const checks=[{name:'import',status:'PASS',detail:'ok'},{name:'game',status:'BLOCKED',detail:'<script>alert(1)</script>'}];
 const result=finalVerdict(checks);assert.equal(result.status,'FAIL');assert.equal(result.failures.length,1);
 assert.equal(finalVerdict([{name:'game',status:'FAIL'}]).status,'FAIL');
 assert.equal(finalVerdict([]).status,'FAIL');
 const html=renderReport({...result,runId:'run',platform:'win32'});
 assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));
});
test('Test processes preserve literal arguments, exit codes, stderr and terminate on timeout',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'t3cs-process-'));
 try{
  const file=path.join(dir,'literal.log');
  const value='spaces & "quotes" $(literal)';
  const exit=await runLogged(process.execPath,['-e','console.log(process.argv[1]);console.error("diagnostic");process.exitCode=7',value],{logFile:file,echo:false});
  assert.equal(exit,7);const text=await readFile(file,'utf8');assert.ok(text.includes(value));assert.ok(text.includes('diagnostic'));
  await assert.rejects(runLogged(process.execPath,['-e','setInterval(()=>{},1000)'],{logFile:path.join(dir,'timeout.log'),timeout:100,echo:false}),/timeout/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
