import {Reader} from './binary.js';
export function readBON(input){const r=new Reader(input,'BON');r.magic('BONE');r.range(0,64);if(r.u32(4,true)!==1||r.u32(8,true)!==100)throw Error('BON: unsupported version');const n=r.u32(16,true),scale=r.f32(20,true),off=Array.from({length:7},(_,i)=>r.u32(24+i*4,true));if(!n||n>4096||scale<=0)throw Error('BON: invalid bone count/metadata scale');
 for(const [i,size]of [[0,4],[1,12],[2,12],[5,32],[6,12]]){if(off[i]<64)throw Error('BON: invalid section offset');r.range(off[i],n*size);}
 r.range(off[3],4);const count=r.u32(off[3],true);if(count>n)throw Error('BON: invalid spring bone count');r.range(off[3]+4,count*4);if(off[4])r.range(off[4],32);
 const bones=Array.from({length:n},(_,i)=>{const parent=r.i32(off[0]+i*4,true);if(parent<-1||parent>=n||parent===i)throw Error('BON: invalid bone parent');return {name:r.str(off[5]+i*32,off[5]+(i+1)*32),parent,translation:Array.from({length:3},(_,k)=>r.f32(off[1]+i*12+k*4,true)),rotation:Array.from({length:3},(_,k)=>r.f32(off[2]+i*12+k*4,true)),scale:Array.from({length:3},(_,k)=>r.f32(off[6]+i*12+k*4,true))};});
 const state=new Uint8Array(n);function visit(i){if(state[i]===1)throw Error('BON: cyclic hierarchy');if(state[i]===2)return;state[i]=1;if(bones[i].parent>=0)visit(bones[i].parent);state[i]=2;}for(let i=0;i<n;i++)visit(i);
 return {bones,scale,opt:Array.from({length:count},(_,i)=>{const j=r.u32(off[3]+4+i*4,true);if(j>=n)throw Error('BON: invalid spring bone');return j;})};
}
