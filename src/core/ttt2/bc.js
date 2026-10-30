// BC1/BC2/BC3 decoding; container byte order does not apply to BC blocks.
export function decodeBC(bytes,width,height,format){
 if(![0,1,2].includes(format))throw Error(`NUT: unsupported texture format ${format}; only BC1/BC2/BC3`);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>16777216)throw Error('NUT: invalid/oversized image');
 const bw=Math.ceil(width/4),bh=Math.ceil(height/4),size=format?16:8;if(bytes.length!==bw*bh*size)throw Error('NUT: BC mip length mismatch');
 const out=new Uint8Array(width*height*4),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),rgb=c=>{const r=c>>11,g=(c>>5)&63,b=c&31;return[(r<<3)|(r>>2),(g<<2)|(g>>4),(b<<3)|(b>>2)];};
 for(let by=0;by<bh;by++)for(let bx=0;bx<bw;bx++){
  const o=(by*bw+bx)*size,c=o+(format?8:0),a=v.getUint16(c,true),b=v.getUint16(c+2,true),p=[rgb(a),rgb(b)],four=format!==0||a>b;
  p.push(p[0].map((x,k)=>Math.floor(four?(2*x+p[1][k])/3:(x+p[1][k])/2)),four?p[0].map((x,k)=>Math.floor((x+2*p[1][k])/3)):[0,0,0]);
  const bits=v.getUint32(c+4,true),alphas=[bytes[o],bytes[o+1]];let abits=0n;
  if(format===2){for(let k=0;k<6;k++)abits|=BigInt(bytes[o+2+k])<<BigInt(k*8);if(alphas[0]>alphas[1])for(let k=1;k<=6;k++)alphas.push(Math.floor(((7-k)*alphas[0]+k*alphas[1])/7));else {for(let k=1;k<=4;k++)alphas.push(Math.floor(((5-k)*alphas[0]+k*alphas[1])/5));alphas.push(0,255);}}
  for(let t=0;t<16;t++){const x=bx*4+t%4,y=by*4+Math.floor(t/4);if(x>=width||y>=height)continue;const k=(bits>>>(2*t))&3;let alpha=!four&&k===3?0:255;if(format===1)alpha=((bytes[o+Math.floor(t/2)]>>((t%2)*4))&15)*17;if(format===2)alpha=alphas[Number((abits>>BigInt(t*3))&7n)];out.set([...p[k],alpha],(y*width+x)*4);}
 }
 return out;
}
