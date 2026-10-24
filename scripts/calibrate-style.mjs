import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {measureStyleReference} from '../src/core/style-reference.js';
import {artSettings} from '../src/core/art-director.js';
// Manifest refers to locally owned files only. No copyrighted asset download.
const [manifestPath,output='tekken-authentic-measured.json']=process.argv.slice(2);
if(!manifestPath)throw Error('Usage: node scripts/calibrate-style.mjs references.json [profile.json]');
const entries=JSON.parse(await readFile(manifestPath,'utf8'));
if(!Array.isArray(entries)||!entries.length||entries.length>100)throw Error('Expected 1..100 local reference entries');
const measurements=[];
for(const entry of entries){
 if(typeof entry.label!=='string'||typeof entry.model!=='string'||typeof entry.arc!=='string')throw Error('Each reference needs label, model, arc');
 const base=path.dirname(path.resolve(manifestPath));
 measurements.push(await measureStyleReference(new Uint8Array(await readFile(path.resolve(base,entry.model))),new Uint8Array(await readFile(path.resolve(base,entry.arc))),entry.label));
}
const roles=[...new Set(measurements.flatMap(m=>Object.keys(m.roleFractions)))];
const reference={schema:'t3cs-style-calibration/1',sampleCount:measurements.length,measurements,roleFractions:Object.fromEntries(roles.map(role=>[role,measurements.reduce((n,m)=>n+(m.roleFractions[role]??0),0)/measurements.length])),limitations:['Measured polygon fractions only; not a runtime capacity increase.','No world proportions without calibrated bind frames.','Source authenticity must be checked by the owner.','No facial topology, landmark or artistic-identity calibration is inferred.']};
await writeFile(output,JSON.stringify({schema:'t3cs-art/1',settings:artSettings({preset:'authentic',reference})},null,2));
console.log(`Measured ${measurements.length} local references → ${output}. Import using the existing Art Director profile loader.`);
