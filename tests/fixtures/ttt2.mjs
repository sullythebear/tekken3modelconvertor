// Authored synthetic square/two-joint rig. Contains no game data.
export function ttt2Fixture({weighted=true,vtype=0x11,uvtype=0x10,format=0}={}){
 const type=weighted?vtype:(vtype&15),bt=type&240,nt=type&15,ps=nt>=6?12:16,ns=nt===0?0:nt>=6?8:16,base=ps+ns+([2,3,7].includes(nt)?2*ns:0),ws=bt===16?32:bt===32?16:bt===64?8:0,cs=(uvtype&14)===2?4:(uvtype&14)===4?8:0,uvn=uvtype>>4,uvsize=uvtype&1?4:2,uvs=cs+uvn*2*uvsize;
 const idx=224,vert=240,add=vert+Math.ceil(4*(bt?uvs:base+uvs)/16)*16,strings=add+(bt?Math.ceil(4*(base+ws)/16)*16:0),nud=new Uint8Array(strings+16),n=new DataView(nud.buffer);const text=(a,p,s)=>a.set(new TextEncoder().encode(s),p);
 text(nud,0,'NDP3');n.setUint32(4,nud.length);n.setUint16(8,0x201);n.setUint16(10,1);n.setUint32(16,idx-48);n.setUint32(20,vert-idx);n.setUint32(24,add-vert);n.setUint32(28,strings-add);n.setInt16(48+40,-1);n.setUint16(48+42,1);n.setUint32(48+44,96);n.setUint16(96+12,4);n.setUint8(96+14,type);n.setUint8(96+15,uvtype);n.setUint32(96+16,144);n.setUint16(96+32,4);n.setUint16(96+34,4);n.setUint16(144+10,1);n.setUint32(176,0x12345678);n.setUint8(176+12,1);n.setUint8(176+13,3);text(nud,strings,'Authored');
 [0,1,2,3].forEach((x,i)=>n.setUint16(idx+i*2,x));
 const pos=[[-500,0,0],[500,0,0],[-500,1000,0],[500,1000,0]],uv=[[0,0],[1,0],[0,1],[1,1]];
 const h=(p,x)=>n.setUint16(p,x===1?0x3c00:x===0?0:0x3800);
 for(let i=0;i<4;i++){const b=bt?add+i*(base+ws):vert+i*(base+uvs),u=vert+i*(bt?uvs:base+uvs)+(bt?0:base);pos[i].forEach((x,k)=>n.setFloat32(b+k*4,x));if(ns){if(nt>=6)h(b+ps+4,1);else n.setFloat32(b+ps+8,1);}
  if(bt){const bone=i>1?1:0;if(bt===16){n.setUint32(b+base,bone);n.setFloat32(b+base+16,1);}else if(bt===32){n.setUint16(b+base,bone);h(b+base+8,1);}else{n.setUint8(b+base,bone);n.setUint8(b+base+4,255);}}
  if(cs)for(let k=0;k<4;k++){if(cs===4)n.setUint8(u+k,255);else h(u+k*2,1);}for(let c=0;c<uvn;c++)for(let k=0;k<2;k++){const p=u+cs+(c*2+k)*uvsize;if(uvsize===4)n.setFloat32(p,uv[i][k]);else h(p,uv[i][k]);}
 }
 const block=format?16:8,nut=new Uint8Array(16+80+block),t=new DataView(nut.buffer);text(nut,0,'NTP3');t.setUint16(4,0x100);t.setUint16(6,1);t.setUint32(16,80+block);t.setUint32(24,block);t.setUint16(28,80);t.setUint8(33,1);t.setUint8(35,format);t.setUint16(36,4);t.setUint16(38,4);text(nut,64,'eXt\0');t.setUint32(68,32);text(nut,80,'GIDX');t.setUint32(84,16);t.setUint32(88,0x12345678);const col=96+(format?8:0);t.setUint16(col,0xf800,true);t.setUint16(col+2,0x07e0,true);t.setUint32(col+4,0x50505050,true);if(format===1)nut.fill(255,96,104);if(format===2){nut[96]=255;nut[97]=0;}
 const bon=new Uint8Array(212),b=new DataView(bon.buffer);text(bon,0,'BONE');b.setUint32(4,1,true);b.setUint32(8,100,true);b.setUint32(16,2,true);b.setFloat32(20,1,true);[64,72,96,120,0,124,188].forEach((x,i)=>b.setUint32(24+i*4,x,true));b.setInt32(64,-1,true);b.setInt32(68,0,true);b.setFloat32(72+12+4,500,true);text(bon,124,'root');text(bon,156,'child');for(let i=0;i<6;i++)b.setFloat32(188+i*4,1,true);
 return [{name:'Authored.nud',data:nud},{name:'Authored.nut',data:nut},...(weighted?[{name:'Authored.bon',data:bon}]:[])];
}

export function denseTTT2Fixture(geometry){
 const original=ttt2Fixture(),src=new DataView(original[0].data.buffer),p=geometry.attributes.position,n=geometry.attributes.normal,uv=geometry.attributes.uv,ix=geometry.index.array,indices=[];
 for(let i=0;i<ix.length;i+=3)indices.push(ix[i],ix[i+1],ix[i+2],65535);
 const align=n=>Math.ceil(n/16)*16,idx=224,vert=idx+align(indices.length*2),add=vert+align(p.count*8),strings=add+align(p.count*64),bytes=new Uint8Array(strings+16),v=new DataView(bytes.buffer);bytes.set(original[0].data.subarray(0,224));v.setUint32(4,bytes.length);v.setUint32(20,vert-idx);v.setUint32(24,add-vert);v.setUint32(28,strings-add);v.setUint16(96+12,p.count);v.setUint8(96+15,0x11);v.setUint16(96+32,indices.length);indices.forEach((x,i)=>v.setUint16(idx+i*2,x));
 for(let i=0;i<p.count;i++){for(let k=0;k<3;k++){v.setFloat32(add+i*64+k*4,p.getComponent(i,k)*1000);v.setFloat32(add+i*64+16+k*4,n.getComponent(i,k));}v.setUint32(add+i*64+32,p.getY(i)>.5?1:0);v.setFloat32(add+i*64+48,1);v.setFloat32(vert+i*8,uv.getX(i));v.setFloat32(vert+i*8+4,uv.getY(i));}
 bytes.set(new TextEncoder().encode('AuthoredDense'),strings);return[{name:'AuthoredDense.nud',data:bytes},...original.slice(1)];
}
