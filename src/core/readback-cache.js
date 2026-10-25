// Reuse only while another material still needs the same immutable image.
// Unique images are never retained; repeated images leave on their last use.
export function readbackCache(requests,readPixels){
 const remaining=new Map(),cached=new Map(),stats={requests:0,reads:0,hits:0,peakRetainedBytes:0,retainedBytes:0};
 const key=(size,data)=>`${size}:${!!data}`;
 for(const {texture,size,data=false}of requests){const image=texture?.image;if(!image)continue;if(!remaining.has(image))remaining.set(image,new Map());const counts=remaining.get(image),k=key(size,data);counts.set(k,(counts.get(k)??0)+1);}
 function read(texture,size,data=false){const image=texture?.image;if(!image)return null;stats.requests++;const k=key(size,data),counts=remaining.get(image),left=counts?.get(k)??1,bucket=cached.get(image);let value=bucket?.get(k);
  if(value)stats.hits++;else{value=readPixels(texture,size,data);stats.reads++;}
  if(left>1){counts.set(k,left-1);if(!bucket?.has(k)){if(!cached.has(image))cached.set(image,new Map());cached.get(image).set(k,value);stats.retainedBytes+=value?.data?.byteLength??0;stats.peakRetainedBytes=Math.max(stats.peakRetainedBytes,stats.retainedBytes);}}
  else{counts?.delete(k);if(counts&&!counts.size)remaining.delete(image);if(bucket?.has(k)){stats.retainedBytes-=value?.data?.byteLength??0;bucket.delete(k);if(!bucket.size)cached.delete(image);}}
  return value;
 }
 return {read,stats,clear(){cached.clear();remaining.clear();stats.retainedBytes=0;}};
}
