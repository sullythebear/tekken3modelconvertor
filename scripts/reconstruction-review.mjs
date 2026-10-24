import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile,readdir,copyFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=process.env.REVIEW_OUTPUT??'artifacts/review-dev2';
const models=process.env.REVIEW_MODELS?.split(',')??[...(process.env.NIKKI_DIR?['nikki']:[]),'synthetic','cesium','crest'];
const stages=process.env.REVIEW_STAGES?.split(',')??['v060','dev1','face','hair','boots','combined','optimized'];
await mkdir(root,{recursive:true});
if(!process.env.REPORT_ONLY)for(const stage of stages){
 console.log('Review',stage);
 const child=spawn(process.execPath,['scripts/art-director-test.mjs'],{stdio:'inherit',env:{...process.env,ART_OUTPUT:`${root}/${stage}`,ART_RECONSTRUCTION:stage==='optimized'?'combined':stage,ART_OPTIMIZE:stage==='optimized'?'1':'0',ART_MODELS:models.join(','),ART_PRESETS:'authentic'}});
 const code=await new Promise((resolve,reject)=>{child.once('error',reject);child.once('close',resolve);});if(code!==0)throw Error(`${stage}: browser conversion/export failed (${code})`);
}
const e=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const summary={acceptance:'PENDING HUMAN REVIEW; GAME NOT VERIFIED',models:[],engineHashes:{}};
for(const folder of ['src/core','src/ui'])for(const file of await readdir(folder))if(/\.(js|html|css|mjs)$/.test(file)){const name=`${folder}/${file}`;summary.engineHashes[name]=createHash('sha256').update(await readFile(name)).digest('hex');}
const labels={v060:'0.6.0 baseline',dev1:'0.7.0-dev.1',face:'Anatomical face',hair:'Hair volume',boots:'Clothing / legs / boots',combined:'Combined artistic model',optimized:'Requested-budget candidate'};
let html=`<!doctype html><html lang="en"><meta charset="utf-8"><title>Conversion Studio 0.7 visual review</title><style>body{font:17px system-ui;background:#101823;color:#e8eef8;margin:24px}a{color:#9cf}section{overflow-x:auto}table{border-collapse:collapse}td,th{min-width:400px;vertical-align:top;padding:10px;border:1px solid #345}img{width:400px;max-height:600px;object-fit:contain}h2{margin-top:3em}.bad{color:#ffb98f}pre{white-space:pre-wrap}summary{cursor:pointer}</style><h1>0.7 development — visual review required</h1><p class="bad">Not artistically approved. Not a verified playable Tekken character. The original Nina donor, real Tekken reference measurements, verified bind frames and runtime are absent in cloud.</p><p>Identical cameras, lighting, scale and image resolution. Click each PNG for full size. The optimization target of 900 triangles is an experiment, not a universal game limit. Idle/walk/punch/kick/guard/reach/crouch/head-and-lip-motion images are local-axis rig diagnostics, not Tekken gameplay.</p><p>The additional crest-haired character is authored for this project. Cesium Man © 2017 Cesium, CC BY 4.0; prepared images modified. Nikki supplied by the user. No source model, source texture, ROM or donor bytes are included in this review.</p><p><a href="technical-summary.json">Technical summary and source hashes</a> · <a href="windows-unit.xml">Windows unit results (added by CI)</a> · <a href="windows-desktop.json">Windows Electron checks (added by CI)</a> · <a href="windows-portable.json">Actual portable EXE checks (added by CI)</a></p>`;
for(const model of models){
 const results=[];for(const stage of stages){try{const report=JSON.parse(await readFile(`${root}/${stage}/${model}-authentic/report.json`,'utf8'));results.push({stage,report});}catch(err){if(err.code!=='ENOENT')throw err;}}
 if(!results.length)continue;
 html+=`<h2>${e(model)}</h2><section><table><tr><th>Original</th>${results.map(r=>`<th>${e(labels[r.stage])}</th>`).join('')}</tr>`;
 for(const view of ['front','back','left-side','right-side','three-quarter','face','face-side','face-quarter','hair-close','boots-close','left-boot-close','right-boot-close','wireframe','idle','walk','crouch','reach','punch','kick','face-motion-close']){
  const cells=[];
  for(const path of [`${results[0].stage}/${model}-authentic/${view}-source.png`,...results.map(r=>`${r.stage}/${model}-authentic/${view}-prepared.png`)]){
   try{await access(`${root}/${path}`);cells.push(`<td><a href="${e(path)}"><img loading="lazy" src="${e(path)}" alt="${e(view)}"></a><br>${e(view)}</td>`);}
   catch(err){if(err.code!=='ENOENT')throw err;cells.push(`<td>${e(view)}: not available for this source rig</td>`);}
  }
  html+='<tr>'+cells.join('')+'</tr>';
 }
 html+='<tr><td>Measured output</td>'+results.map(r=>{const c=r.report.report.conversion;return `<td>${c.stats.triangles} triangles<br>${c.stats.materials} preparation materials<br>Requested: ${c.settings.triangles}; ${c.stats.triangles<=c.settings.triangles?'count met':'COUNT EXCEEDED'}<br><a href="${r.stage}/${model}-authentic/report.json">Full geometry / texture / pose / export readback</a></td>`;}).join('')+'</tr></table></section>';
 summary.models.push({model,stages:results.map(r=>({stage:r.stage,stats:r.report.report.conversion.stats,optimization:r.report.report.conversion.optimization??null,poses:r.report.report.conversion.poses,exportValidation:r.report.exportValidation,quality:r.report.report.conversion.quality}))});
}
html+='<h2>Human review</h2><p>Please assess face identity (front/side/quarter), bangs and long-hair silhouette, outfit, ankle/heel shape and motion seams. Report which model and view need correction. Technical scores do not approve artistic quality.</p></html>';
await writeFile(`${root}/index.html`,html);await writeFile(`${root}/technical-summary.json`,JSON.stringify(summary,null,2));
if(process.env.PUBLISH_REVIEW){
 const dest='public-review';await mkdir(dest,{recursive:true});
 async function copySafe(from,to){await mkdir(to,{recursive:true});for(const entry of await readdir(from,{withFileTypes:true})){if(entry.isDirectory())await copySafe(`${from}/${entry.name}`,`${to}/${entry.name}`);else if(/\.(png|html|json|xml|txt|md)$/.test(entry.name)&&!['pre-export.json','simulation.png'].includes(entry.name))await copyFile(`${from}/${entry.name}`,`${to}/${entry.name}`);}}
 await copySafe(root,dest);
}
console.log(`${root}/index.html`);
