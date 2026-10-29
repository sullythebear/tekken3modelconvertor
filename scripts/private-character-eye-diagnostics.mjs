// Screen-space localization only. No eye landmarks or anatomical side inferred.
export function inspectFaceDarkening(source,candidate,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<1||source.length!==width*height*4||candidate.length!==source.length)throw Error('Invalid face raster');
 const results=[];
 for(const [side,x0,x1]of[['image-left',0,Math.floor(width/2)],['image-right',Math.floor(width/2),width]]){
  const w=x1-x0,mask=new Uint8Array(w*height);let count=0,maximumDarkening=0;
  for(let y=0;y<height;y++)for(let x=x0;x<x1;x++){const i=(y*width+x)*4,a=source[i]*.2126+source[i+1]*.7152+source[i+2]*.0722,b=candidate[i]*.2126+candidate[i+1]*.7152+candidate[i+2]*.0722,d=a-b;if(d>=16&&b<a*.6){mask[y*w+x-x0]=1;count++;maximumDarkening=Math.max(maximumDarkening,d);}}
  let largest=null;const queue=new Uint32Array(mask.length);
  for(let seed=0;seed<mask.length;seed++){if(!mask[seed])continue;let head=0,tail=1,minX=w,minY=height,maxX=0,maxY=0;queue[0]=seed;mask[seed]=0;while(head<tail){const p=queue[head++],x=p%w,y=Math.floor(p/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);for(const n of[x>0?p-1:-1,x+1<w?p+1:-1,y>0?p-w:-1,y+1<height?p+w:-1])if(n>=0&&mask[n]){mask[n]=0;queue[tail++]=n;}}if(tail>=4&&(!largest||tail>largest.pixels))largest={pixels:tail,bounds:[minX+x0,minY,maxX+x0+1,maxY+1]};}
  results.push({side,darkenedPixels:count,maximumDarkening,largestDarkeningComponent:largest});
 }
 return{scope:'Darkening components in screen halves; no verified eye localization or anatomical side; numerical flags require image review',halves:results};
}
