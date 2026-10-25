// Area sampling before binary PS1 cutout conversion. RGB is alpha weighted so
// transparent black border texels cannot darken visible hair/lash edges.
export function filteredRGBA(image,coordinates){
 const out=[0,0,0,0];let weight=0;
 for(const [u,v] of coordinates){
  const px=Math.max(0,Math.min(image.width-1,u*image.width-.5)),py=Math.max(0,Math.min(image.height-1,v*image.height-.5)),x=Math.floor(px),y=Math.floor(py),fx=px-x,fy=py-y;
  for(const [dx,dy,w]of [[0,0,(1-fx)*(1-fy)],[1,0,fx*(1-fy)],[0,1,(1-fx)*fy],[1,1,fx*fy]]){
   const at=(Math.min(image.height-1,y+dy)*image.width+Math.min(image.width-1,x+dx))*4,a=image.data[at+3]/255;
   weight+=w*a;for(let k=0;k<3;k++)out[k]+=image.data[at+k]*w*a;out[3]+=image.data[at+3]*w;
  }
 }
 for(let k=0;k<3;k++)out[k]=weight?out[k]/weight:0;out[3]/=coordinates.length;return out;
}
export function cutoutThreshold(material,defaultCutoff=.5){return Math.max(defaultCutoff,material.alphaTest??0);}
