import {readFile,writeFile,mkdir,open,stat} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {openDiscImage} from '../src/core/disc-image.mjs';
import {inspectDiscAssets} from '../src/core/bns.js';
import {readDonorPackage} from '../src/core/donor-package.js';
import {unzipSync} from 'fflate';
import {decodeDonor,decodeTextureArchive} from '../src/core/donor.js';
import {validateConfig,validateRuntimeReceipt,finalVerdict,renderReport,sha256} from './windows-test-core.mjs';
import {runLogged} from './test-process.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
process.chdir(root);
const configFile=path.resolve(process.argv[2]??'.local/windows-test.json');
const runId=new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomUUID().slice(0,8);
const out=path.resolve('artifacts/windows-local',runId), checks=[];
await mkdir(out,{recursive:true});
console.log('Evidence folder:',out);
let report;
let gameplayReviewed=false;
function check(name,status,detail){checks.push({name,status,detail});console.log(`${status}: ${name}: ${detail}`);}
async function command(name,exe,args,env={},timeout=600000){
 return runLogged(exe,args,{cwd:root,env:{...process.env,...env},logFile:path.join(out,name+'.log'),timeout});
}
try {
 const c=validateConfig(JSON.parse((await readFile(configFile,'utf8')).replace(/^\uFEFF/,'')));
 await writeFile(path.join(out,'configuration.json'),JSON.stringify(c,null,2));
 for(const [name,script]of [['build','scripts/build.mjs'],['unit-tests',null]]){
  const args=script?[script]:['--test','tests/*.test.mjs'];
  // Node's glob expansion is supported in Node 24 on Windows as well.
  const code=await command(name,process.execPath,args);
  check(name,code===0?'PASS':'FAIL','Exit '+code);
  if(code!==0)throw Error(name+' failed');
 }
 const donorDir=path.join(out,'donor');await mkdir(donorDir);
 let model,arc;
 try {
 if(c.donorPackage){const d=await readDonorPackage(new Uint8Array(await readFile(c.donorPackage)));model=d.records[0].data;arc=d.records[1].data;}
 else {
  let executable,bns;
  if(c.discImage){const h=await open(c.discImage,'r');try{
   const image=await openDiscImage({size:(await h.stat()).size,read:async(offset,length)=>{const b=new Uint8Array(length);let n=0;while(n<length){const r=await h.read(b,n,length-n,offset+n);if(!r.bytesRead)throw Error('Truncated image');n+=r.bytesRead;}return b;}});
   executable=image.files[0].data;bns=image.files[1].data;
   await writeFile(path.join(donorDir,'disc-extraction.json'),JSON.stringify(image.report,null,2));
  }finally{await h.close();}}
  else {executable=new Uint8Array(await readFile(path.join(c.gameDirectory,'SLUS_004.02')));bns=new Uint8Array(await readFile(path.join(c.gameDirectory,'TEKKEN3.BNS')));}
  const d=await inspectDiscAssets({executable,bns});model=d.model;arc=d.arc;
  await writeFile(path.join(donorDir,'validation.json'),JSON.stringify(d.report,null,2));
 }
 await writeFile(path.join(donorDir,'Nina.3dm'),model);await writeFile(path.join(donorDir,'Nina.arc'),arc);
 check('local donor','PASS','Original-USA executable/record capacities and native contents validated; no source files written');
 } catch(e) {model=null;arc=null;check('local donor','FAIL',e.message);}
 const nikkiDir=path.join(out,'nikki');await mkdir(nikkiDir);
 const code=await command('nikki-electron',process.execPath,['scripts/nikki.mjs'],{
  T3CS_AUTOMATION:'1',T3CS_RUN_OUTPUT:nikkiDir,NIKKI_DIR:c.nikkiDirectory,
  NIKKI_DONOR_MODEL:model?path.join(donorDir,'Nina.3dm'):'',NIKKI_DONOR_ARC:arc?path.join(donorDir,'Nina.arc'):'',
  NIKKI_DONOR_PACKAGE:'',NIKKI_GAME_DIR:'',NIKKI_BIND_PROFILE:c.bindProfile??'',
 },1800000);
 const nikki=JSON.parse(await readFile(path.join(nikkiDir,'results.json'),'utf8'));
 check('Nikki desktop import/materials/atlas',nikki.sourceValidation?'PASS':'FAIL',`Exit ${code}; ${nikki.status}; see nikki/results.json`);
 check('preparation budget',nikki.preparationBudget?.met?'PASS':'FAIL',JSON.stringify(nikki.preparationBudget??nikki.error));
 if(model) {
 const candidate=path.join(nikkiDir,'nikki-native-candidate.zip'),bytes=await readFile(candidate);
 const entries=unzipSync(new Uint8Array(bytes));decodeDonor(entries['candidate.3dm']);decodeTextureArchive(entries['candidate.arc']);
 check('native export','PASS','3DMK/ARC exported via desktop IPC and decoded; not a gameplay assertion');
 if(process.platform!=='win32'){check('Windows runtime','BLOCKED','This run is not on Windows');}
 else if(!c.runtimeAdapter){check('Expanded installation/start','BLOCKED','No verified Expanded loader adapter is included. Candidate was saved; original installation left unchanged. See WINDOWS_TESTING.md.');}
 else {
  if(path.extname(c.runtimeAdapter).toLowerCase()!=='.ps1')throw Error('Runtime adapter must be an explicit local PowerShell script');
  const receiptFile=path.join(out,'runtime-install.json');
  const adapterCode=await command('runtime-adapter','powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.resolve(c.runtimeAdapter),'-Candidate',candidate,'-RunId',runId,'-Output',receiptFile],{},600000);
  if(adapterCode!==0)throw Error('Runtime installation adapter failed');
  const receipt=validateRuntimeReceipt(JSON.parse((await readFile(receiptFile,'utf8')).replace(/^\uFEFF/,'')),sha256(bytes),runId);
  for(const f of receipt.installedFiles)if(sha256(await readFile(f.path))!==f.sha256)throw Error('Installed runtime hash mismatch: '+f.path);
  await stat(receipt.executable);
  check('runtime installation receipt','PASS','Adapter-reported isolated installation and installed file hashes match this candidate; runtime behaviour still requires review');
  const request=path.join(out,'runtime-request.json');
  await writeFile(request,JSON.stringify({...receipt,actions:c.actions??[],captureSeconds:c.captureSeconds??30,output:path.join(out,'runtime')},null,2));
  const result=await command('game-capture','powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts/windows/Capture-Game.ps1'),'-Request',request],{},300000);
  check('game process/screenshots',result===0?'PASS':'FAIL','See runtime/capture.json, game stdout/stderr and screenshots; a launch does not prove the Nina slot');
  if(result===0){
   await command('human-review','powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(root,'scripts/windows/Review-Gameplay.ps1'),'-Evidence',out,'-RunId',runId],{},1800000);
   const review=JSON.parse((await readFile(path.join(out,'human-gameplay.json'),'utf8')).replace(/^\uFEFF/,''));
   const accepted=review.schema==='t3cs-human-gameplay/1' && review.runId===runId && review.status==='PASS' && review.checks.length===5 && review.checks.every(c=>c.passed===true);
   check('Nikki gameplay and animation acceptance',accepted?'PASS':'FAIL','Explicit human checklist for this run; see human-gameplay.json. This is not automatic visual recognition.');
   gameplayReviewed=true;
  }
 }
 } else {check('native export / Expanded runtime','BLOCKED','No valid original Nina donor; source import/preparation still tested.');}
 if(!gameplayReviewed)check('Nikki gameplay and animation acceptance','BLOCKED','Human review in the actual Nina slot is required: identity, all textures, joint deformation, attacks/movement, both sides and stable play. No successful runtime integration has yet been established.');
}catch(e){check('runner','FAIL',e.stack??e.message);}
finally {
 report={schema:'t3cs-windows-test/1',runId,platform:process.platform,createdAt:new Date().toISOString(),...finalVerdict(checks)};
 await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 await writeFile(path.join(out,'report.html'),renderReport(report));
 await writeFile(path.resolve('artifacts/windows-local/latest.json'),JSON.stringify({runId,report:path.join(out,'report.html')},null,2));
 console.log('FINAL:',report.status,'Report:',path.join(out,'report.html'));
 process.exitCode=report.status==='PASS'?0:1;
}
