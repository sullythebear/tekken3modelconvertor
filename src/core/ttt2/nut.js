import {Reader} from './binary.js';import {decodeBC} from './bc.js';
export function readNUT(input,{decode=true}={}){const r=new Reader(input,'NUT');r.magic('NTP3');r.range(0,16);if(r.u16(4)!==0x100)throw Error('NUT: unsupported version');const n=r.u16(6),textures=[];if(n>4096)throw Error('NUT: too many textures');let p=16,totalPixels=0;
 for(let i=0;i<n;i++){
  r.range(p,48);const total=r.u32(p),dataSize=r.u32(p+8),header=r.u16(p+12),mips=r.u8(p+17),format=r.u8(p+19),width=r.u16(p+20),height=r.u16(p+22);
  if(total<48||header<48||header+dataSize>total||!mips||mips>16||r.u32(p+4)!==0)throw Error('NUT: invalid record/mips/palette');r.range(p,total);r.range(p,header);if(![0,1,2].includes(format))throw Error(`NUT: unsupported texture format ${format}`);
  totalPixels+=width*height;if(totalPixels>33554432)throw Error('NUT: decoded texture memory limit exceeded');
  let q=p+48,sizes=mips===1?[dataSize]:Array.from({length:mips},(_,j)=>r.u32(q+j*4));if(mips>1)q+=Math.ceil(mips*4/16)*16;
  let id=null;while(q<p+header){r.range(q,16,p+header);const tag=String.fromCharCode(...r.bytes.subarray(q,q+4)),len=r.u32(q+4);if(len<16||q+len>p+header)throw Error('NUT: invalid extension block');if(tag==='GIDX'){if(id!==null)throw Error('NUT: duplicate GIDX');id=r.u32(q+8);}q+=tag==='eXt\0'?16:len;}
  if(id===null)throw Error('NUT: missing GIDX texture ID');let used=0;
  for(let j=0;j<mips;j++){const w=Math.max(1,width>>j),h=Math.max(1,height>>j),expected=Math.ceil(w/4)*Math.ceil(h/4)*(format?16:8);if(sizes[j]!==expected)throw Error('NUT: invalid mip size');used+=sizes[j];}if(used!==dataSize)throw Error('NUT: mip payload mismatch');
  const rgba=decode?decodeBC(r.bytes.subarray(p+header,p+header+sizes[0]),width,height,format):null;textures.push({id,width,height,format,mips,rgba});p+=total;
 }
 return {textures};
}
