import {mkdir,open,link,unlink} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {randomUUID,createHash} from 'node:crypto';
const HOSTS = new Set(['drive.google.com','drive.usercontent.google.com']);
function allowed(input) {
  const url = new URL(input);
  if(url.protocol !== 'https:' || !HOSTS.has(url.hostname) || url.username || url.password || url.port)
    throw Error('Only HTTPS Google Drive download hosts are accepted');
  return url;
}
const decode = s => s.replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'");
function attrs(tag) {
  return Object.fromEntries([...tag.matchAll(/([a-z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)].map(m=>[m[1].toLowerCase(),decode(m[2]??m[3])]));
}
async function boundedHTML(response) {
  const chunks=[];let size=0;
  for await(const part of response.body){size+=part.length;if(size>256*1024)throw Error('Drive confirmation page exceeds size limit');chunks.push(part);}
  return Buffer.concat(chunks).toString('utf8');
}
function confirmation(html,current,id) {
  for(const match of html.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const form=attrs(match[1]);
    if(form.id!=='download-form'||!form.action)continue;
    const url=allowed(new URL(form.action,current));
    if(form.method && form.method.toLowerCase()!=='get')throw Error('Unsupported Drive confirmation method');
    for(const input of match[2].matchAll(/<input\b[^>]*>/gi)) {
      const a=attrs(input[0]);if(a.name&&a.value!==undefined)url.searchParams.set(a.name,a.value);
    }
    if(url.searchParams.get('id')!==id)throw Error('Drive confirmation changed the requested file id');
    return url;
  }
  for(const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const a=attrs(match[0]);
    if(!a.href||!a.href.includes('confirm='))continue;
    const url=allowed(new URL(a.href,current));
    if(url.searchParams.get('id')===id)return url;
  }
  throw Error('Google Drive did not provide a public ZIP or a supported download confirmation form');
}
function transient(error){return ['AbortError','TimeoutError'].includes(error.name)||['ETIMEDOUT','ECONNRESET','UND_ERR_SOCKET','UND_ERR_CONNECT_TIMEOUT'].includes(error.cause?.code??error.code);}
function transferFailure(error,stage,host,bytes=0,status=null){
 const e=new Error(`Drive ${stage} interrupted on ${host}${status?` (HTTP ${status})`:''} after ${bytes} bytes: ${error.cause?.code??error.code??error.name}`);e.retryable=transient(error);return e;
}
export async function downloadDriveZIP(input,destination,{fetchImpl=globalThis.fetch,maxBytes=1024**3,retries=1,onProgress=()=>{}}={}){
 if(!Number.isInteger(retries)||retries<0||retries>2)throw Error('Invalid bounded download retry count');
 for(let attempt=1;attempt<=retries+1;attempt++){
  const emit=event=>onProgress({...event,attempt});
  try{return await downloadDriveZIPAttempt(input,destination,{fetchImpl,maxBytes,onProgress:emit});}
  catch(error){if(!error.retryable||attempt>retries)throw error;emit({stage:'transient-retry',reason:error.message});}
 }
}
async function downloadDriveZIPAttempt(input,destination,{fetchImpl,maxBytes,onProgress}) {
  const requested=allowed(input),id=requested.searchParams.get('id')??requested.pathname.match(/\/file\/d\/([\w-]+)/)?.[1];
  if(!id||!/^[-\w]+$/.test(id))throw Error('Google Drive file id is missing or invalid');
  let url=new URL('https://drive.google.com/uc');url.searchParams.set('export','download');url.searchParams.set('id',id);
  const cookies=new Map();
  for(let step=0;step<10;step++) {
    const jar=cookies.get(url.hostname)??new Map(),headers={};
    if(jar.size)headers.cookie=[...jar].map(([k,v])=>`${k}=${v}`).join('; ');
    let response;
    try{response=await fetchImpl(url,{redirect:'manual',headers,signal:AbortSignal.timeout(300000)});}
    catch(error){throw transferFailure(error,'connection',url.hostname);}
    onProgress({stage:'headers',host:url.hostname,status:response.status,step});
    for(const cookie of response.headers.getSetCookie?.()??[]) {
      const pair=cookie.split(';')[0],at=pair.indexOf('=');if(at>0)jar.set(pair.slice(0,at),pair.slice(at+1));
    }
    cookies.set(url.hostname,jar);
    if(response.status>=300&&response.status<400) {
      const location=response.headers.get('location');if(!location)throw Error('Drive redirect has no destination');
      url=allowed(new URL(location,url));await response.body?.cancel();continue;
    }
    if(!response.ok){await response.body?.cancel();throw Error(`HTTP ${response.status} from ${url.hostname}; download not completed`);}
    if((response.headers.get('content-type')??'').includes('text/html')) {
      let html;try{html=await boundedHTML(response);}catch(error){if(transient(error))throw transferFailure(error,'confirmation-transfer',url.hostname,0,response.status);throw error;}
      url=confirmation(html,url,id);continue;
    }
    const declared=Number(response.headers.get('content-length'));
    if(declared>maxBytes){await response.body?.cancel();throw Error('Nikki ZIP exceeds download size limit');}
    await mkdir(path.dirname(destination),{recursive:true});
    const temp=destination+'.part-'+randomUUID(),handle=await open(temp,'wx');
    let total=0,prefix=Buffer.alloc(0);const hash=createHash('sha256');
    try {
      for await(const chunk of response.body) {
        total+=chunk.length;if(total>maxBytes)throw Error('Nikki ZIP exceeds download size limit');
        if(prefix.length<4)prefix=Buffer.concat([prefix,chunk.subarray(0,4-prefix.length)]);
        hash.update(chunk);
        let at=0;while(at<chunk.length){const result=await handle.write(chunk,at,chunk.length-at);if(!result.bytesWritten)throw Error('Download file write failed');at+=result.bytesWritten;}
      }
      if(prefix.length!==4||prefix[0]!==80||prefix[1]!==75||![0x0403,0x0605].includes(prefix.readUInt16LE(2)))throw Error('Drive response is not a ZIP file');
      await handle.close();
      // link is atomic and refuses to overwrite an existing local asset.
      await link(temp,destination);await unlink(temp);
      onProgress({stage:'complete',bytes:total,confirmationRequests:step});
      return {bytes:total,sha256:hash.digest('hex'),fileId:id,confirmationRequests:step,destination};
    }catch(error){await handle.close().catch(()=>{});await unlink(temp).catch(()=>{});if(transient(error))throw transferFailure(error,'ZIP-transfer',url.hostname,total,response.status);throw error;}
  }
  throw Error('Drive confirmation/redirect limit exceeded');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const input=process.env.NIKKI_URL??process.argv[2],dest=process.env.NIKKI_ZIP??process.argv[3]??'artifacts/fixtures/Nikki-Model.zip';
  try{if(!input)throw Error('Set NIKKI_URL or pass a Google Drive URL');console.log(JSON.stringify(await downloadDriveZIP(input,dest),null,2));}
  catch(error){console.error(error.message);process.exitCode=2;}
}
