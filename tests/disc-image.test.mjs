import test from 'node:test';
import assert from 'node:assert/strict';
import {openDiscImage,discBytesSource} from '../src/core/disc-image.mjs';
import {discFixture} from '../scripts/disc-fixture.mjs';
for(const mode of ['iso','mode1','mode2'])test(`Local ${mode} extraction reads actual file bytes across sector boundaries and preserves the input`,async()=>{
  const f=discFixture({mode}),before=f.image.slice();
  const result=await openDiscImage(discBytesSource(f.image));
  assert.deepEqual(result.files.map(f=>f.name),['SLUS_004.02','TEKKEN3.BNS']);
  assert.deepEqual(result.files[0].data,f.executable);assert.deepEqual(result.files[1].data,f.bns);
  assert.deepEqual(f.image,before);assert.equal(result.report.sourceModified,false);assert.equal(result.report.retailExecutableVerified,false);
});
test('ISO extraction follows nested directories and supports stored 150-sector lead-in',async()=>{
  for(const mode of ['iso','mode2']){
    const f=discFixture({mode,leadIn:150,nested:true});const r=await openDiscImage(discBytesSource(f.image));
    assert.deepEqual(r.files[1].data,f.bns);assert.equal(r.report.leadInSectors,150);assert.match(r.report.files[0].isoPath,/DATA/);
  }
});
test('ISO extraction rejects duplicate game files and inconsistent extent/endian metadata',async()=>{
  await assert.rejects(openDiscImage(discBytesSource(discFixture({duplicate:true}).image)),/duplicate/);
  const f=discFixture();f.image[16*2048+87]^=1;
  await assert.rejects(openDiscImage(discBytesSource(f.image)),/endian/);
  const g=discFixture();g.image.fill(0,20*2048,21*2048);
  await assert.rejects(openDiscImage(discBytesSource(g.image)),/must contain/);
});
test('Raw extraction refuses Form 2, changed sector modes, bad sync and truncated reads',async()=>{
  for(const [at,value,pattern]of [[24*2352+18,0x20,/subheader|Form 2/],[24*2352+15,1,/mode/],[24*2352+1,0,/sync/]]){
    const f=discFixture({mode:'mode2'});f.image[at]=value;
    await assert.rejects(openDiscImage(discBytesSource(f.image)),pattern);
  }
  const f=discFixture();await assert.rejects(openDiscImage({size:f.image.length,read:async()=>new Uint8Array(1)}),/Truncated/);
});
test('Raw extraction batches large records while checking every sector payload',async()=>{
  const f=discFixture({mode:'mode2',archiveSize:257*2048+17});let reads=0;
  const result=await openDiscImage({size:f.image.length,read:async(at,length)=>{reads++;return f.image.slice(at,at+length);}});
  assert.deepEqual(result.files[1].data,f.bns);assert.ok(reads<20,`Too many physical reads: ${reads}`);
  f.image[200*2352+18]=f.image[200*2352+22]=0x20;
  await assert.rejects(openDiscImage(discBytesSource(f.image)),/Form 2/);
});
