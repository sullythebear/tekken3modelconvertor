// Pure aggregate diagnostics. Never return image bytes or an artistic grade.
export function compareRasterRegions(source,candidate,width,height,{face=false}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||source.length!==width*height*4||candidate.length!==source.length)throw Error('Invalid raster comparison');
 const regions=[{name:'whole-frame',box:[0,0,width,height]}];
 if(face){regions.push({name:'image-left face half; anatomical side unverified',box:[0,0,Math.floor(width/2),height]},{name:'image-right face half; anatomical side unverified',box:[Math.floor(width/2),0,width,height]});}
 return regions.map(({name,box})=>{const[x0,y0,x1,y1]=box;let pixels=0,delta=0,newBlack=0,newWhite=0,sourceBlack=0,candidateBlack=0,maxDelta=0;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*width+x)*4,smax=Math.max(source[i],source[i+1],source[i+2]),cmax=Math.max(candidate[i],candidate[i+1],candidate[i+2]),cmin=Math.min(candidate[i],candidate[i+1],candidate[i+2]),d=(Math.abs(source[i]-candidate[i])+Math.abs(source[i+1]-candidate[i+1])+Math.abs(source[i+2]-candidate[i+2]))/3;pixels++;delta+=d;maxDelta=Math.max(maxDelta,d);sourceBlack+=smax<12;candidateBlack+=cmax<12;newBlack+=smax>64&&cmax<12;newWhite+=smax<200&&cmin>240;}
 return{name,pixels,meanAbsoluteRGBByteError:delta/Math.max(1,pixels),maxRGBByteError:maxDelta,sourceNearBlackPixels:sourceBlack,candidateNearBlackPixels:candidateBlack,newBlackPixels:newBlack,newWhitePixels:newWhite};});
}
