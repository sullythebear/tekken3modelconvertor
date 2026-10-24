import * as THREE from 'three';

// Transfer continuous attributes by source-triangle barycentrics. Joint IDs
// remain categorical: gather, merge, normalize and retain all source sets.
export function transferSurfaceAttributes(source, hits, positions, uvs) {
  const out = new THREE.BufferGeometry();
  const sets = [['skinIndex','skinWeight'], ...Object.keys(source.attributes)
    .filter(n=>/^joints_\d+$/.test(n)).sort((a,b)=>Number(a.slice(7))-Number(b.slice(7)))
    .map(n=>[n,n.replace('joints_','weights_')])].filter(([j,w])=>source.attributes[j]&&source.attributes[w]);
  const skinNames=new Set(sets.flat()),capacity=sets.reduce((n,[j])=>n+source.attributes[j].itemSize,0);
  for(const [name,a] of Object.entries(source.attributes)){
    if(['position','uv','normal'].includes(name)||skinNames.has(name))continue;
    const values=new Float32Array(hits.length*a.itemSize);
    hits.forEach((hit,i)=>{for(let k=0;k<a.itemSize;k++)values[i*a.itemSize+k]=hit.triangle.ids.reduce((sum,id,c)=>sum+a.getComponent(id,k)*hit.barycentric.getComponent(c),0);});
    out.setAttribute(name,new THREE.BufferAttribute(values,a.itemSize));
  }
  for(const [j,w]of sets){out.setAttribute(j,new THREE.Uint16BufferAttribute(new Uint16Array(hits.length*source.attributes[j].itemSize),source.attributes[j].itemSize));out.setAttribute(w,new THREE.Float32BufferAttribute(new Float32Array(hits.length*source.attributes[w].itemSize),source.attributes[w].itemSize));}
  let maximumDiscardedWeight=0;
  hits.forEach((hit,i)=>{
    const weights=new Map();
    for(let c=0;c<3;c++)for(const [j,w]of sets)for(let k=0;k<source.attributes[j].itemSize;k++){
      const id=hit.triangle.ids[c],bone=source.attributes[j].getComponent(id,k),weight=source.attributes[w].getComponent(id,k)*Math.max(0,hit.barycentric.getComponent(c));
      if(weight>0)weights.set(bone,(weights.get(bone)??0)+weight);
    }
    const sorted=[...weights].sort((a,b)=>b[1]-a[1]),kept=sorted.slice(0,capacity),total=kept.reduce((n,v)=>n+v[1],0);
    maximumDiscardedWeight=Math.max(maximumDiscardedWeight,sorted.slice(capacity).reduce((n,v)=>n+v[1],0));
    let offset=0;for(const [j,w]of sets)for(let k=0;k<source.attributes[j].itemSize;k++,offset++){out.attributes[j].setComponent(i,k,kept[offset]?.[0]??0);out.attributes[w].setComponent(i,k,total?(kept[offset]?.[1]??0)/total:0);}
  });
  out.setAttribute('position',new THREE.Float32BufferAttribute(positions.flatMap(p=>p.toArray()),3));
  out.setAttribute('uv',new THREE.Float32BufferAttribute(uvs.flatMap(p=>p.toArray()),2));
  return {geometry:out,maximumDiscardedWeight};
}

export function sourceRecords(g,material,record){
 const p=g.attributes.position,uv=g.attributes.uv,index=g.index,triangles=[];
 for(let t=0;t<(index?.count??p.count);t+=3){const ids=[0,1,2].map(k=>index?index.getX(t+k):t+k),r=record(ids.map(i=>new THREE.Vector3().fromBufferAttribute(p,i)),{uvs:uv?ids.map(i=>new THREE.Vector2().fromBufferAttribute(uv,i)):null,material});if(r){r.ids=ids;triangles.push(r);}}
 return triangles;
}

// Canvas-backed browser textures can also be serialized by Three's exporter.
// Node tests retain the same RGBA bytes in a DataTexture without a DOM.
export function surfaceTexture(rgba,width,height){
 let texture;
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba),width,height),0,0);texture=new THREE.CanvasTexture(canvas);texture.flipY=false;
 }else texture=new THREE.DataTexture(rgba,width,height);
 texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.needsUpdate=true;return texture;
}

export function subsetSurface(g,indices){
 const old=[...new Set(indices)],mapping=new Map(old.map((id,i)=>[id,i])),out=new THREE.BufferGeometry();
 for(const [name,a]of Object.entries(g.attributes)){const data=new a.array.constructor(old.length*a.itemSize);old.forEach((id,i)=>{for(let k=0;k<a.itemSize;k++)data[i*a.itemSize+k]=a.array[id*a.itemSize+k];});out.setAttribute(name,new THREE.BufferAttribute(data,a.itemSize,a.normalized));}
 out.setIndex(Array.from(indices,i=>mapping.get(i)));return out;
}
