import test from 'node:test';
import assert from 'node:assert/strict';
import { nativeRelocations } from '../src/core/native-rebuild.js';
import { buildNativeCandidate } from '../src/core/exporter.js';
function header(size=8192){const b=new Uint8Array(size),v=new DataView(b.buffer);v.setUint32(0,27,true);v.setUint32(8,0x4b4d4433,true);v.setUint32(16,1536,true);return b;}
test('Native relocation validation rejects an unaligned hand-pose target',()=>{const b=header(1540),v=new DataView(b.buffer);v.setUint32(24+13*4,1536,true);v.setUint32(1536,1537,true);assert.throws(()=>nativeRelocations(b),/aligned pointer-only/);});
test('Native packet ceiling is explicitly provisional, not certified runtime capacity',()=>{const r=buildNativeCandidate({donor:header(),modelId:10,maxBytes:8192,parts:[{row:1,positions:[[0,0,0],[10,0,0],[0,10,0]],triangles:[[0,1,2]],uvs:[[0,0],[1,0],[0,1]]}]});assert.equal(r.manifest.packetBytes,32);assert.equal(r.manifest.packetBudget.bytes,31000);assert.equal(r.manifest.packetBudget.runtimeCapacityVerified,false);assert.equal(r.manifest.gameVerified,false);});
