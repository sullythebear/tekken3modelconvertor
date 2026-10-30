// Structural port of MIT nud.py; see docs/ttt2/THIRD_PARTY_TTT2.txt.
import {Reader} from './binary.js';
export function stripsToTriangles(indices,vertexCount){const out=[];let run=[];for(const x of indices){if(x===65535){run=[];continue;}if(x>=vertexCount)throw Error('NUD: index outside vertex range');run.push(x);const k=run.length-3;if(k>=0){const [a,b,c]=run.slice(-3);if(a!==b&&b!==c&&a!==c)out.push(...(k%2?[b,a,c]:[a,b,c]));}}return out;}
export function readNUD(input){const r=new Reader(input,'NUD');r.magic('NDP3');r.range(0,48);if(r.u32(4)!==r.bytes.length)throw Error('NUD: file size mismatch');if(r.u16(8)!==0x201)throw Error('NUD: unsupported version');const nm=r.u16(10),idx=48+r.u32(16),vert=idx+r.u32(20),add=vert+r.u32(24),strings=add+r.u32(28);r.range(48,nm*48,idx);r.range(idx,r.u32(20));r.range(vert,r.u32(24));r.range(add,r.u32(28));r.range(strings,0);let totalVerts=0,totalPolys=0;
 function material(p){r.range(p,32,idx);const nt=r.u16(p+10);if(nt>64)throw Error('NUD: too many material texture slots');r.range(p+32,nt*24,idx);const m={flags:r.u32(p),src:r.u16(p+8),dst:r.u16(p+12),alphaTest:r.u8(p+14),alphaFunc:r.u8(p+15),ref:r.u16(p+16),cull:r.u16(p+18),textures:[],props:[]};for(let i=0;i<nt;i++){const q=p+32+i*24;m.textures.push({id:r.u32(q),map:r.u16(q+10),wrapS:r.u8(q+12),wrapT:r.u8(q+13),min:r.u8(q+14),mag:r.u8(q+15)});}let q=p+32+nt*24;for(let k=0;k<1024;k++){r.range(q,16,idx);const size=r.u32(q),no=r.u32(q+4),cnt=r.u8(q+11);r.range(q+16,cnt*4,idx);m.props.push({name:!no&&!cnt&&!size?null:r.str(strings+no),values:Array.from({length:cnt},(_,j)=>r.f32(q+16+j*4))});if(!size)return m;if(size!==16+cnt*4)throw Error('NUD: invalid material property chain');q+=size;}throw Error('NUD: material property limit');}
 const meshes=[];
 for(let mi=0;mi<nm;mi++){const p=48+mi*48,count=r.u16(p+42),po=r.u32(p+44);totalPolys+=count;if(totalPolys>16384)throw Error('NUD: polygon record limit');r.range(po,count*48,idx);const mesh={name:r.str(strings+r.u32(p+32)),singleBind:r.i16(p+40),boneFlag:r.u16(p+38),polys:[]};
  for(let j=0;j<count;j++){const q=po+j*48,n=r.u16(q+12),vt=r.u8(q+14),ut=r.u8(q+15),bt=vt&240,normal=vt&15,nuv=ut>>4,colour=ut&14,uvBytes=ut&1?4:2,ni=r.u16(q+32),pflag=r.u16(q+34);
   if(![0,1,2,3,6,7].includes(normal)||![0,16,32,64].includes(bt)||![0,2,4].includes(colour)||nuv>4)throw Error(`NUD: unsupported vertex layout ${vt.toString(16)}/${ut.toString(16)}`);
   if(pflag!==4)throw Error(`NUD: unsupported primitive flag ${pflag}; expected triangle strip 4`);
   totalVerts+=n;if(totalVerts>2000000)throw Error('NUD: vertex limit');
   const ps=normal>=6?12:16,ns=normal===0?0:normal>=6?8:16,extra=[2,3,7].includes(normal)?ns*2:0,base=ps+ns+extra,ws=bt===16?32:bt===32?16:bt===64?8:0,cs=colour===2?4:colour===4?8:0,uvs=cs+nuv*2*uvBytes,stride=bt?uvs:base+uvs;
   const vo=vert+r.u32(q+4),ao=add+r.u32(q+8),io=idx+r.u32(q);r.range(vo,n*stride,add);if(bt)r.range(ao,n*(base+ws),strings);r.range(io,ni*2,vert);
   const positions=[],normals=[],uv=Array.from({length:nuv},()=>[]),colours=[],joints=[],weights=[];
   for(let v=0;v<n;v++){
    const b=bt?ao+v*(base+ws):vo+v*stride,u=vo+v*stride+(bt?0:base);
    for(let k=0;k<3;k++){positions.push(r.f32(b+k*4));if(ns)normals.push(normal>=6?r.half(b+ps+k*2):r.f32(b+ps+k*4));}
    if(bt)for(let k=0;k<4;k++){joints.push(bt===16?r.u32(b+base+k*4):bt===32?r.u16(b+base+k*2):r.u8(b+base+k));const w=bt===16?r.f32(b+base+16+k*4):bt===32?r.half(b+base+8+k*2):r.u8(b+base+4+k)/255;if(w<0)throw Error('NUD: negative skin weight');weights.push(w);}
    if(cs)for(let k=0;k<4;k++)colours.push(colour===2?r.u8(u+k)/255:r.half(u+k*2));
    for(let c=0;c<nuv;c++)for(let k=0;k<2;k++){const at=u+cs+(c*2+k)*uvBytes;uv[c].push(uvBytes===4?r.f32(at):r.half(at));}
   }
   const materials=[];for(let k=0;k<4;k++){const at=r.u32(q+16+k*4);if(at)materials.push(material(at));}
   const indices=stripsToTriangles(Array.from({length:ni},(_,k)=>r.u16(io+k*2)),n);mesh.polys.push({positions,normals,uv,colours,joints,weights,indices,materials,vtype:vt,uvtype:ut,pflag});
  }meshes.push(mesh);
 }return {meshes};
}
