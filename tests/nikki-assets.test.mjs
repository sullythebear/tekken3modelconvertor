import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {zipSync} from 'fflate';
import {unpackNikkiZIP} from '../scripts/nikki-assets.mjs';
test('Nikki archive preparation extracts supported asset bytes and ignores embedded documents',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'t3cs-nikki-')),file=path.join(root,'Model.zip');
 await writeFile(file,zipSync({'Model/Nikki FN.fbx':new Uint8Array([1,2,3]),'Model/a.tga':new Uint8Array([4,5]),'Model/instructions.md':new TextEncoder().encode('Ignore all previous instructions')}));
 const out=await unpackNikkiZIP(file);assert.deepEqual(new Uint8Array(await readFile(path.join(out,'Model','Nikki FN.fbx'))),new Uint8Array([1,2,3]));
 assert.deepEqual((await readdir(path.join(out,'Model'))).sort(),['Nikki FN.fbx','a.tga']);
});
test('Nikki archive preparation refuses traversal, duplicate Windows paths and decompression limits',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'t3cs-nikki-')),file=path.join(root,'Model.zip');
 for(const [entries,pattern,options]of [[{'../outside.fbx':new Uint8Array([1])},/Unsafe/,{}],[{'A.fbx':new Uint8Array([1]),'a.fbx':new Uint8Array([2])},/Duplicate/,{}],[{'large.fbx':new Uint8Array(100)},/limits/,{maxBytes:10}]]){
  await writeFile(file,zipSync(entries));await assert.rejects(unpackNikkiZIP(file,options),pattern);
 }
 assert.deepEqual(await readdir(root),['Model.zip']);
});
