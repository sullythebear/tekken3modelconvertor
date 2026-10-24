import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
const out='artifacts/v070';await mkdir(out,{recursive:true});
const stages=['v060','face','hair','boots','combined'];
if(!process.env.REPORT_ONLY){
 for(const stage of stages){
  console.log('Reconstruction comparison:',stage);
  const child=spawn(process.execPath,['scripts/art-director-test.mjs'],{stdio:'inherit',env:{...process.env,ART_OUTPUT:`${out}/${stage}`,ART_RECONSTRUCTION:stage,ART_MODELS:process.env.NIKKI_DIR?'nikki,synthetic,cesium':'synthetic,cesium',ART_PRESETS:'authentic'}});
  const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',resolve);});if(code!==0)throw Error(`${stage} exited ${code}`);
 }
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let html=`<!doctype html><meta charset="utf-8"><title>0.7 reconstruction review</title><style>body{font:17px system-ui;background:#101823;color:#eee;margin:24px}section{overflow:auto}table{border-collapse:collapse}td,th{min-width:350px;vertical-align:top;border:1px solid #456;padding:8px}img{width:350px}a{color:#acf}</style><h1>0.7 development — NOT ARTISTICALLY ACCEPTED</h1><p>Original and isolated reconstruction experiments use identical cameras, lighting and resolution. Click images for full resolution. Budgets are preparation requests, not measured Namco capacities. No real Nina donor, calibrated Tekken reference, Windows execution or game test is available.</p><p>Default: boots reconstruction. Face/hair remain experiments; overlapping charts retain the previous method. Cards are not reconstructed hair volumes. No parametric Tekken facial template has been achieved.</p>`;
const summary=[];
for(const model of ['nikki','synthetic','cesium']){
 const data=[];for(const stage of stages){try{const report=JSON.parse(await readFile(`${out}/${stage}/${model}-authentic/report.json`,'utf8'));data.push({stage,report});}catch(e){if(e.code!=='ENOENT')throw e;}}
 if(!data.length)continue;
 html+=`<h2>${escape(model)}</h2><section><table><tr><th>Original</th>${data.map(d=>`<th>${escape(d.stage)}</th>`).join('')}</tr>`;
 for(const view of ['front','side','back','three-quarter','face','guard','reach','crouch']){
  html+='<tr>'+[`${data[0].stage}/${model}-authentic/${view}-source.png`,...data.map(d=>`${d.stage}/${model}-authentic/${view}-prepared.png`)].map(path=>`<td><a href="${path}"><img loading="lazy" src="${path}" alt="${escape(view)}"></a></td>`).join('')+'</tr>';
 }
 html+='<tr><td>Unbaked diagnostic</td>'+data.map(d=>`<td><a href="${d.stage}/${model}-authentic/front-unbaked.png"><img loading="lazy" src="${d.stage}/${model}-authentic/front-unbaked.png"></a><p>${d.report.report.conversion.stats.triangles} triangles; requested ${d.report.report.conversion.settings.triangles}. <a href="${d.stage}/${model}-authentic/report.json">Full report</a></p></td>`).join('')+'</tr></table></section>';
 summary.push({model,stages:data.map(d=>({stage:d.stage,triangles:d.report.report.conversion.stats.triangles,quality:d.report.report.conversion.quality,exportValidation:d.report.exportValidation}))});
}
html+='<p>Cesium Man © 2017 Cesium, CC BY 4.0, Khronos glTF-Sample-Assets; prepared views modified. Nikki supplied by user. Synthetic character authored for this project.</p>';
await writeFile(`${out}/index.html`,html);await writeFile(`${out}/summary.json`,JSON.stringify({acceptance:'NOT ACCEPTED',results:summary},null,2));
console.log(`${out}/index.html`);
