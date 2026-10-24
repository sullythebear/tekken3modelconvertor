import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {bnsFixture} from '../scripts/bns-fixture.mjs';
import {readDonorPackage} from '../src/core/donor-package.js';
import {inspectDiscAssets} from '../src/core/bns.js';
async function packageFixture(){
 const f=await bnsFixture(),assets=await inspectDiscAssets({executable:f.exe,bns:f.bns,profile:f.profile});
 const manifest={schema:'t3cs-donor-extraction/1',id:'nina-p1-us',disc:assets.report};
 return{f,files:{'SLUS_004.02':f.exe,'record-111.3dm':f.model,'record-113.arc':f.arc,'extraction.json':strToU8(JSON.stringify(manifest))}};
}
test('Extracted donor package reimports exact record bytes and preserves authenticity limits',async()=>{
 const{f,files}=await packageFixture(),result=await readDonorPackage(zipSync(files),{profile:f.profile});
 assert.deepEqual(result.records[0].data,f.model);assert.deepEqual(result.records[1].data,f.arc);assert.equal(result.report.retailExecutableVerified,false);assert.equal(result.report.gameVerified,false);
 await assert.rejects(readDonorPackage(zipSync(files)),/SHA-256/);
});
test('Donor package rejects altered records, changed slots and unexpected ZIP entries',async()=>{
 const{f,files}=await packageFixture();
 await assert.rejects(readDonorPackage(zipSync({...files,'../extra':new Uint8Array([1])}),{profile:f.profile}),/Unexpected/);
 const altered=files['record-111.3dm'].slice();altered[30]^=1;
 await assert.rejects(readDonorPackage(zipSync({...files,'record-111.3dm':altered}),{profile:f.profile}),/hashes/);
 const manifest=JSON.parse(new TextDecoder().decode(files['extraction.json']));manifest.id='nina-p2-us';
 await assert.rejects(readDonorPackage(zipSync({...files,'extraction.json':strToU8(JSON.stringify(manifest))}),{profile:f.profile}),/slot differs/);
});
