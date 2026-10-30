// Only the synthetic-only TTT2 workflow invokes this. Never feed original-asset reports.
import {readFile,appendFile} from 'node:fs/promises';
const xml=await readFile('artifacts/ttt2/unit.xml','utf8');
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const failures=[];for(const m of xml.matchAll(/<testcase\b([^>]*?)>([\s\S]*?)<\/testcase>/g)){if(!m[2].includes('<failure'))continue;const name=m[1].match(/name="([^"]*)"/)?.[1]??'unknown';failures.push(`<h3>${escape(name)}</h3><pre>${escape(m[2].slice(0,5000))}</pre>`);}
const stats=[...xml.matchAll(/<!-- (tests|pass|fail|cancelled|skipped) (\d+) -->/g)].map(m=>`${m[1]}: ${m[2]}`).join(', ');
const text=`<h2>Synthetic regression result</h2><p>${escape(stats)}</p>${failures.join('\n')}`;
if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,text+'\n');console.log(stats);
