// GitHub draft releases are restricted to repository collaborators with write access.
// Never publish this draft. No originals enter the image-only allowlisted bundle.
import {readFile,writeFile,readdir} from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {zipSync} from 'fflate';import {pathToFileURL} from 'node:url';
export function permittedReviewFile(name){return name==='index.html'||name==='atlas.png'||/^(source|prepared|atlas)-(full|diffuse|normals|material-id)-(front|back|side|quarter|face|left-hand|right-hand)\.png$/.test(name);}
export function requireDraft(release){if(release?.draft!==true||!Number.isSafeInteger(release.id)||!/^https:\/\/github\.com\//.test(release.html_url??''))throw Error('Private review requires a verified unpublished draft');}
export async function publishPrivateReview(env=process.env){
 const {GITHUB_TOKEN:token,GITHUB_REPOSITORY:repo,GITHUB_SHA:sha,GITHUB_RUN_ID:run,GITHUB_RUN_ATTEMPT:attempt,PRIVATE_CHARACTER_DIR:dir}=env;
 if(!token||!/^[-\w.]+\/[-\w.]+$/.test(repo??'')||!/^[a-f0-9]{40}$/.test(sha??'')||!/^\d+$/.test(run??''))throw Error('Private review CI identity unavailable');
 const reportPath=path.join(dir,'safe-model-probes.json'),report=JSON.parse(await readFile(reportPath,'utf8'));
 if(report.status!=='PASS'||report.sourceCommit!==sha)throw Error('Private review requires successful source-attributed probes');
 const files={};let bytes=0,imageCount=0;
 for(const model of report.results){if(!/^[a-f0-9]{16}$/.test(model.id)||model.renders?.status!=='RENDERED')throw Error('Private render identity unavailable');const folder=path.join(dir,'renders',model.id);
  for(const f of await readdir(folder,{withFileTypes:true})){if(!f.isFile()||!permittedReviewFile(f.name))throw Error('Unexpected private review file refused');const b=await readFile(path.join(folder,f.name));bytes+=b.length;if(bytes>256*1024**2)throw Error('Private review exceeds bounded image storage');files[`${model.id}/${f.name}`]=new Uint8Array(b);imageCount+=f.name.endsWith('.png');}
 }
 if(!imageCount)throw Error('Private review contains no rendered images');
 files['index.html']=new TextEncoder().encode('<!doctype html><meta charset="utf-8"><title>Private character review</title><h1>Private diagnostic review</h1><p>Do not publish this draft. Contains commercial character renders, no source models. Numerical differences are not artistic approval.</p>'+report.results.map(r=>`<p><a href="${r.id}/index.html">${r.id}</a></p>`).join(''));
 const archive=zipSync(files,{level:1}),digest=createHash('sha256').update(archive).digest('hex'),base=`https://api.github.com/repos/${repo}`,headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
 const request=async(url,options={})=>{const r=await fetch(url,{...options,headers:{...headers,...options.headers}});if(!r.ok)throw Error(`Private review API failed (${r.status})`);return r;};let draft;
 try{
  draft=await(await request(base+'/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_name:`private-review-${run}-${attempt??'1'}`,target_commitish:sha,name:`PRIVATE character diagnostics ${run} — DO NOT PUBLISH`,draft:true,prerelease:true,body:'PRIVATE REVIEW ONLY — DO NOT PUBLISH THIS DRAFT.\nContains copyrighted commercial character diagnostic images for authorized repository collaborators only. No original models/textures/projects. Extract the ZIP locally and open index.html.\nSource: '+sha})})).json();requireDraft(draft);
  const anonymous=await fetch(draft.html_url);if(![401,403,404].includes(anonymous.status))throw Error('Private review anonymous access was not denied');
  const name='Private-Character-Review.zip';await request(draft.upload_url.replace(/\{.*$/,'')+'?name='+name,{method:'POST',headers:{'Content-Type':'application/zip'},body:archive});
  const verified=await(await request(base+'/releases/'+draft.id)).json();requireDraft(verified);const asset=verified.assets?.find(a=>a.name===name&&a.size===archive.length);if(!asset)throw Error('Private review upload verification failed');
  const anonymousAsset=await fetch(asset.browser_download_url);if(![401,403,404].includes(anonymousAsset.status))throw Error('Private review asset anonymous access was not denied');
  report.privateReview={status:'DRAFT_RESTRICTED',url:verified.html_url,asset:name,bytes:archive.length,sha256:digest,imageCount,access:'Repository collaborators with write access only; extract locally; never publish this draft',anonymousPageStatus:anonymous.status,anonymousAssetStatus:anonymousAsset.status};
  await writeFile(reportPath,JSON.stringify(report,null,2));console.log('Restricted draft review verified; no images published publicly.');
 }catch(e){if(draft?.id)await fetch(base+'/releases/'+draft.id,{method:'DELETE',headers});throw e;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await publishPrivateReview();
