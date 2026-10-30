// Layout reference: Petexy/Linexy MIT; see docs/ttt2/THIRD_PARTY_TTT2.txt.
export class Reader {
 constructor(input,label){this.bytes=input instanceof ArrayBuffer?new Uint8Array(input):new Uint8Array(input.buffer,input.byteOffset,input.byteLength);this.v=new DataView(this.bytes.buffer,this.bytes.byteOffset,this.bytes.byteLength);this.label=label;}
 range(at,n,end=this.bytes.length){if(!Number.isSafeInteger(at)||!Number.isSafeInteger(n)||at<0||n<0||at+n>end||end>this.bytes.length)throw Error(`${this.label}: truncated/out-of-range section at ${at} (${n} bytes)`);return at;}
 u8(p){return this.v.getUint8(this.range(p,1));} u16(p,le=false){return this.v.getUint16(this.range(p,2),le);} i16(p,le=false){return this.v.getInt16(this.range(p,2),le);} u32(p,le=false){return this.v.getUint32(this.range(p,4),le);} i32(p,le=false){return this.v.getInt32(this.range(p,4),le);}
 f32(p,le=false){const n=this.v.getFloat32(this.range(p,4),le);if(!Number.isFinite(n))throw Error(`${this.label}: non-finite float at ${p}`);return n;}
 half(p){const h=this.u16(p),s=h&32768?-1:1,e=(h>>10)&31,m=h&1023;if(e===31)throw Error(`${this.label}: non-finite half float`);return s*(e?2**(e-15)*(1+m/1024):2**-14*m/1024);}
 str(p,end=this.bytes.length){this.range(p,1,end);let q=p;while(q<end&&this.bytes[q]){if(q-p>=4096)throw Error(`${this.label}: name exceeds 4096 bytes`);q++;}if(q===end)throw Error(`${this.label}: unterminated name`);return Array.from(this.bytes.subarray(p,q),x=>String.fromCharCode(x)).join('');}
 magic(s){if(String.fromCharCode(...this.bytes.subarray(0,4))!==s)throw Error(`${this.label}: expected ${s} magic`);}
}
