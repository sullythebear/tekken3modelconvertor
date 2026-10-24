import {readFile,writeFile} from 'node:fs/promises';
const report=JSON.parse(await readFile('artifacts/art-director/comparison.json','utf8'));
const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let html='<!doctype html><meta charset="utf-8"><title>Art Director comparisons</title><style>body{font:16px system-ui;background:#101823;color:#eee;padding:24px}table{width:100%;table-layout:fixed}td{vertical-align:top}img{width:100%}pre{white-space:pre-wrap}a{color:#aaf}</style><h1>Art Director — experimental, NOT ACCEPTED</h1><p>Same source, camera, 900-triangle requested budget. No real-game test or calibrated Namco reference. Silhouette scores do not establish artistic quality.</p>';
for(const model of [...new Set(report.results.map(r=>r.model))]){
 const rows=report.results.filter(r=>r.model===model);html+='<h2>'+e(model)+'</h2><details><summary>Modern original reference</summary><img style="max-width:400px" src="'+e(model)+'-baseline/front-source.png" alt="Original model"></details><table><tr>'+rows.map(r=>'<th>'+e(r.preset)+'</th>').join('')+'</tr>';
 for(const view of ['front-prepared','side-prepared','back-prepared','three-quarter-prepared','face-prepared'])html+='<tr>'+rows.map(r=>`<td><img src="${e(model)}-${e(r.preset)}/${view}.png" alt="${view}"></td>`).join('')+'</tr>';
 html+='<tr>'+rows.map(r=>`<td>${r.triangles} triangles<br>IoU ${r.silhouettes.map(s=>s.iou.toFixed(3)).join(' / ')}<br><a href="${e(model)}-${e(r.preset)}/report.json">Detailed report</a></td>`).join('')+'</tr></table>';
}
await writeFile('artifacts/art-director/comparison.html',html);
