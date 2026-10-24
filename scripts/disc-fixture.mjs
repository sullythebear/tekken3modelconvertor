// Authored ISO/raw-sector test data. These are not Tekken files.
function both32(b, at, n) {const v=new DataView(b.buffer,b.byteOffset,b.byteLength);v.setUint32(at,n,true);v.setUint32(at+4,n,false);}
function both16(b, at, n) {const v=new DataView(b.buffer,b.byteOffset,b.byteLength);v.setUint16(at,n,true);v.setUint16(at+2,n,false);}
function record(name, sector, size, directory=false) {
  const id=typeof name==='number'?new Uint8Array([name]):new TextEncoder().encode(name);
  const b=new Uint8Array(33+id.length+(id.length%2===0?1:0));b[0]=b.length;
  both32(b,2,sector);both32(b,10,size);b[25]=directory?2:0;both16(b,28,1);b[32]=id.length;b.set(id,33);return b;
}
export function discFixture({mode='iso',leadIn=0,nested=false,duplicate=false,archiveSize=7000}={}) {
  const count=Math.max(40,30+Math.ceil(archiveSize/2048)),cooked=new Uint8Array(count*2048),pvd=cooked.subarray(16*2048,17*2048);
  pvd[0]=1;pvd.set(new TextEncoder().encode('CD001'),1);pvd[6]=1;both32(pvd,80,count);both16(pvd,128,2048);
  pvd.set(record(0,20,2048,true),156);
  const executable=new Uint8Array(5000),bns=new Uint8Array(archiveSize);
  executable.set(new TextEncoder().encode('PS-X EXE'));
  for(let i=8;i<executable.length;i++)executable[i]=(i*13)%251;
  for(let i=0;i<bns.length;i++)bns[i]=(i*17)%253;
  cooked.set(executable,24*2048);cooked.set(bns,28*2048);
  const dir=cooked.subarray(20*2048,21*2048);let cursor=0;
  const add=(b,target=dir)=>{target.set(b,cursor);cursor+=b.length;};
  add(record(0,20,2048,true));add(record(1,20,2048,true));
  if(nested){
    add(record('DATA',21,2048,true));cursor=0;
    const child=cooked.subarray(21*2048,22*2048);
    add(record(0,21,2048,true),child);add(record(1,20,2048,true),child);
    add(record('SLUS_004.02;1',24,executable.length),child);add(record('TEKKEN3.BNS;1',28,bns.length),child);
  }else{add(record('SLUS_004.02;1',24,executable.length));add(record('TEKKEN3.BNS;1',28,bns.length));}
  if(duplicate){if(nested)throw Error('Fixture option combination');add(record('TEKKEN3.BNS;2',28,bns.length));}
  const sectorBytes=mode==='iso'?2048:2352,offset=mode==='mode1'?16:24;
  const image=new Uint8Array((count+leadIn)*sectorBytes);
  for(let i=0;i<count;i++){
    const sector=image.subarray((i+leadIn)*sectorBytes,(i+leadIn+1)*sectorBytes);
    if(mode==='iso')sector.set(cooked.subarray(i*2048,(i+1)*2048));
    else{sector.fill(255,1,11);sector[15]=mode==='mode1'?1:2;sector.set(cooked.subarray(i*2048,(i+1)*2048),offset);}
  }
  return {image,executable,bns};
}
