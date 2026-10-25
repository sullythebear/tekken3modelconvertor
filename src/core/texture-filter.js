// Area sampling before binary PS1 cutout conversion. RGB is alpha weighted so
// transparent black border texels cannot darken visible hair/lash edges.
export function filteredRGBA(image,coordinates,{alphaWeighted=true}={}){
 const out=[0,0,0,0];let weight=0;
 for(const [u,v] of coordinates){
  const px=Math.max(0,Math.min(image.width-1,u*image.width-.5)),py=Math.max(0,Math.min(image.height-1,v*image.height-.5)),x=Math.floor(px),y=Math.floor(py),fx=px-x,fy=py-y;
  for(const [dx,dy,w]of [[0,0,(1-fx)*(1-fy)],[1,0,fx*(1-fy)],[0,1,(1-fx)*fy],[1,1,fx*fy]]){
   const at=(Math.min(image.height-1,y+dy)*image.width+Math.min(image.width-1,x+dx))*4,a=alphaWeighted?image.data[at+3]/255:1;
   weight+=w*a;for(let k=0;k<3;k++)out[k]+=image.data[at+k]*w*a;out[3]+=image.data[at+3]*w;
  }
 }
 for(let k=0;k<3;k++)out[k]=weight?out[k]/weight:0;out[3]/=coordinates.length;return out;
}
export function cutoutThreshold(material,defaultCutoff=.5){return Math.max(defaultCutoff,material.alphaTest??0);}

// Normal/opacity RGB channels are data, even when their unused alpha is zero.
// Resample directly into the small target, avoiding a full-size RGBA canvas.
export function resampleDataMap(image,size){
 if(!Number.isInteger(size)||size<1||!image.width||!image.height||image.data.length!==image.width*image.height*4)throw Error('Unsupported data-map channels');
 const out=new Uint8ClampedArray(size*size*4),steps=image.width>size||image.height>size?[.25,.75]:[.5],divisor=steps.length**2;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  let r=0,g=0,b=0;
  for(const oy of steps)for(const ox of steps){
   const sx=Math.max(0,Math.min(image.width-1,(x+ox)/size*image.width-.5)),sy=Math.max(0,Math.min(image.height-1,(y+oy)/size*image.height-.5)),ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
   for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
    const at=(Math.min(image.height-1,iy+dy)*image.width+Math.min(image.width-1,ix+dx))*4,w=(dx?fx:1-fx)*(dy?fy:1-fy)/divisor;
    r+=image.data[at]*w;g+=image.data[at+1]*w;b+=image.data[at+2]*w;
   }
  }
  out.set([r,g,b,255],(y*size+x)*4);
 }
 return {width:size,height:size,data:out};
}
