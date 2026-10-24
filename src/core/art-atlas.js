function legacyAtlasLayout(materials,size,art) {
 const cells=materials.map((m,i)=>({i,side:/head|face/i.test(m.name)&&!/eye|lash|faceacc|hair|strand/i.test(m.name)?(art.face>80?size/2:size/4):/body_(torso|arms|legs)/i.test(m.name)?size/4:/body/i.test(m.name)?size/2:/hair|faceacc/i.test(m.name)?(art.hair>85?size/2:size/4):/iris|lash/i.test(m.name)&&art.face>80?size/4:/eyeshell/i.test(m.name)?size/16:size/8}));
 const occupied=[],out=[];
 for(const c of cells.sort((a,b)=>b.side-a.side||a.i-b.i)){
  let found=null;
  for(let side=c.side;side>=16&&!found;side/=2)for(let y=0;y+side<=size&&!found;y+=16)for(let x=0;x+side<=size;x+=16)
   if(!occupied.some(r=>x<r.x+r.side&&x+side>r.x&&y<r.y+r.side&&y+side>r.y)){found={x,y,side};break;}
  if(!found)throw Error('Art atlas packing failed; reduce material count');occupied.push(found);out[c.i]=found;
 }
 return out;
}

export function artAtlasLayout(materials,size,art) {
 if(['v060','dev1'].includes(art.reconstruction))return legacyAtlasLayout(materials,size,art);
 const base=Math.min(size,256);
 const cells=materials.map((m,i)=>{
  const name=m.name,face=/head|face/i.test(name)&&!/eye|lash|faceacc|hair|strand/i.test(name),hair=/hair|faceacc/i.test(name),torso=/body_torso/i.test(name),eye=/iris|lash/i.test(name);
  const side=face?(art.face>80?base/2:base/4):hair?(art.hair>85?base/2:base/4):torso?(art.pixelation<75?base/2:base/4):/body/i.test(name)?base/4:eye?base/4:/eyeshell/i.test(name)?16:base/8;
  return {i,side:Math.max(16,side),priority:face?6:hair?5:torso?4:eye?3.5:/envelope/i.test(name)?3:1};
 });
 const occupied=[],out=[];let used=0;
 const ordered=cells.sort((a,b)=>b.priority-a.priority||b.side-a.side||a.i-b.i);
 for(let i=0;i<ordered.length;i++){
  const c=ordered[i],reserve=(ordered.length-i-1)*16*16;let found=null;
  for(let side=c.side;side>=16&&!found;side/=2){
   // Reserve a minimal tile for every remaining material. Greedy allocation
   // previously exhausted the atlas before the final boot/material tile.
   if(used+side*side+reserve>size*size)continue;
   for(let y=0;y+side<=size&&!found;y+=16)for(let x=0;x+side<=size;x+=16)if(!occupied.some(r=>x<r.x+r.side&&x+side>r.x&&y<r.y+r.side&&y+side>r.y)){found={x,y,side};break;}
  }
  if(!found)throw Error('Art atlas packing failed; reduce material count');occupied.push(found);used+=found.side*found.side;out[c.i]=found;
 }
 return out;
}
export function pixelateRGBA(bytes,strength,dither=false,width=4,colorLevels=0) {
 const out=new Uint8Array(bytes),levels=colorLevels||Math.round(255-strength/100*224),bayer=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
 for(let i=0;i<out.length;i+=4)for(let k=0;k<3;k++){
  const pixel=i/4,noise=dither?(bayer[(Math.floor(pixel/width)%4)*4+(pixel%width)%4]-7.5)*strength/100:0;
  out[i+k]=Math.max(0,Math.min(255,Math.round((out[i+k]+noise)*levels/255)*255/levels));
 }
 return out;
}
export function artTextureColors(name,art){return art?.face>80&&/head|face/i.test(name)&&!/eye|lash|faceacc|hair|strand/i.test(name)?256:16;}
export function stagingTIMLayout(tiles){
 let x=0,y=0,height=0;
 return tiles.map(t=>{
  const width=t.width/(t.colors===256?2:4);
  if(x+width>768){x=0;y+=height;height=0;}
  if(width>768||y+t.height>480)throw Error('Staging TIM textures exceed available VRAM area');
  const result={x,y,wordWidth:width,height:t.height};x+=width;height=Math.max(height,t.height);return result;
 });
}
