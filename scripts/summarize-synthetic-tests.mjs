// Only the synthetic-only TTT2 workflow invokes this. Never feed original-asset reports.
import {execFileSync} from 'node:child_process';
import {readFile,appendFile,writeFile} from 'node:fs/promises';
const xml=await readFile('artifacts/ttt2/unit.xml','utf8');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const failures=[];for(const m of xml.matchAll(/<testcase\b([^>]*?)(?<!\/)>([\s\S]*?)<\/testcase>/g)){if(!m[2].includes('<failure'))continue;const name=m[1].match(/name="([^"]*)"/)?.[1]??'unknown';failures.push(`<h3>${escape(name)}</h3><pre>${escape(m[2].slice(0,5000))}</pre>`);}
const stats=[...xml.matchAll(/<!-- (tests|pass|fail|cancelled|skipped) (\d+) -->/g)].map(m=>`${m[1]}: ${m[2]}`).join(', ');
const text=`<h2>Synthetic regression result</h2><p>${escape(stats)}</p>${failures.join('\n')}`;
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,text+'\n');console.log(stats);

// Publish only bounded synthetic failures, to one fixed documentation file/branch.
// GITHUB_TOKEN commits do not retrigger workflows. Refuse concurrent source changes.
if(failures.length&&process.env.T3CS_PUBLISH_SYNTHETIC_FAILURE==='1'&&process.env.GITHUB_REPOSITORY==='sullythebear/tekken3modelconvertor'&&process.env.GITHUB_REF==='refs/heads/development/070-ttt2-import'){
 const git=(...args)=>execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const branch='development/070-ttt2-import',remote=git('ls-remote','origin','refs/heads/'+branch).split(/\s/)[0];
 if(remote===process.env.GITHUB_SHA){
  const file='docs/ttt2/WINDOWS_SYNTHETIC_FAILURE.md';
  await writeFile(file,`# Windows synthetic failure\n\nSource: ${process.env.GITHUB_SHA}\n\nRun: https://github.com/sullythebear/tekken3modelconvertor/actions/runs/${process.env.GITHUB_RUN_ID}\n\n${stats}\n\nAuthored test inputs only. No original assets or private reports.\n\n`+failures.slice(0,10).join('\n').slice(0,16000)+'\n');
  git('config','user.name','github-actions[bot]');git('config','user.email','41898282+github-actions[bot]@users.noreply.github.com');git('add','--',file);
  execFileSync(process.execPath,['scripts/guard-game-assets.mjs','--staged'],{stdio:'inherit'});
  git('commit','-m','Record synthetic Windows regression failure');git('push','origin','HEAD:refs/heads/'+branch);console.log('Synthetic failure checkpoint recorded.');
 }else console.log('Source branch advanced; no diagnostic commit made.');
}
