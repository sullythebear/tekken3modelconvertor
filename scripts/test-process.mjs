import {spawn} from 'node:child_process';
import {openSync,writeSync,closeSync} from 'node:fs';
export async function runLogged(executable,args,{cwd,env=process.env,logFile,timeout=600000,echo=true}={}) {
 const fd=openSync(logFile,'wx');let bytes=0;
 try{return await new Promise((resolve,reject)=>{
  const child=spawn(executable,args,{cwd,env,stdio:['ignore','pipe','pipe'],shell:false,windowsHide:false,detached:process.platform!=='win32'});
  let expired=false;
  const timer=setTimeout(()=>{
   expired=true;
   if(process.platform==='win32')spawn('taskkill.exe',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true}).on('error',()=>child.kill());
   else {try{process.kill(-child.pid,'SIGKILL');}catch{child.kill();}}
  },timeout);
  function collect(chunk){if(bytes<32*1024**2){writeSync(fd,chunk);bytes+=chunk.length;}if(echo)process.stdout.write(chunk);}
  child.stdout.on('data',collect);child.stderr.on('data',collect);
  child.on('error',e=>{clearTimeout(timer);reject(e);});
  child.on('close',code=>{clearTimeout(timer);expired?reject(Error('Process timeout; owned process tree terminated')):resolve(code);});
 });}finally{closeSync(fd);}
}
