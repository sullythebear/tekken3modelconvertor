import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {zipSync} from 'fflate';
import {downloadDriveZIP} from '../scripts/drive-download.mjs';
const url='https://drive.google.com/uc?export=download&id=AuthoredFixture';
const zip=zipSync({'fixture.txt':new TextEncoder().encode('test bytes, not Nikki')});
test('Drive downloader follows a confirmation form, scopes cookies, and streams exact ZIP bytes',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'t3cs-drive-')),file=path.join(root,'Model.zip'),requests=[];
  const fetchImpl=async(u,opts)=>{
    requests.push({url:new URL(u),opts});
    if(requests.length===1)return new Response('<form id="download-form" action="https://drive.usercontent.google.com/download" method="get"><input name="id" value="AuthoredFixture"><input name="confirm" value="t"><input name="uuid" value="fixture&amp;token"></form>',{headers:{'content-type':'text/html','set-cookie':'download_warning=fixture; Secure'}});
    return new Response(zip,{headers:{'content-type':'application/zip'}});
  };
  const r=await downloadDriveZIP(url,file,{fetchImpl});
  assert.deepEqual(new Uint8Array(await readFile(file)),zip);assert.equal(r.confirmationRequests,1);
  assert.equal(requests[1].url.hostname,'drive.usercontent.google.com');assert.equal(requests[1].url.searchParams.get('uuid'),'fixture&token');
  assert.equal(requests[1].opts.headers.cookie,undefined);
});
test('Drive downloader rejects changed file ids, off-host redirects, HTML denial and oversized downloads',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'t3cs-drive-')),file=path.join(root,'Model.zip');
  await assert.rejects(downloadDriveZIP(url,file,{fetchImpl:async()=>new Response('',{status:302,headers:{location:'https://example.org/file.zip'}})}),/Only HTTPS Google/);
  await assert.rejects(downloadDriveZIP(url,file,{fetchImpl:async()=>new Response('<form id="download-form" action="https://drive.google.com/uc"><input name="id" value="Different"></form>',{headers:{'content-type':'text/html'}})}),/changed the requested/);
  await assert.rejects(downloadDriveZIP(url,file,{fetchImpl:async()=>new Response('access denied',{status:403})}),/HTTP 403/);
  await assert.rejects(downloadDriveZIP(url,file,{maxBytes:4,fetchImpl:async()=>new Response(zip)}),/size limit/);
  assert.deepEqual(await readdir(root),[]);
});
test('Drive downloader preserves existing files and removes incomplete/non-ZIP output',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'t3cs-drive-')),file=path.join(root,'Model.zip');
  await writeFile(file,'existing asset');
  await assert.rejects(downloadDriveZIP(url,file,{fetchImpl:async()=>new Response(zip)}),/EEXIST/);
  assert.equal(await readFile(file,'utf8'),'existing asset');
  await assert.rejects(downloadDriveZIP(url,path.join(root,'invalid.zip'),{fetchImpl:async()=>new Response('<html>not a ZIP</html>')}),/not a ZIP/);
  assert.deepEqual(await readdir(root),['Model.zip']);
});
