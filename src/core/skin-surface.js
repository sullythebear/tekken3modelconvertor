import * as THREE from 'three';
// Transient, source-derived normal fields. Not project data, not GLB extras.
// Fields use original smooth normals, before regional reduction/flat shading.
const fields=new WeakMap();
export function sourceDiffuse(normal){if(!normal.toArray().every(Number.isFinite)||normal.lengthSq()<1e-12)return 1;return Math.pow(.5+.5*Math.max(0,normal.clone().normalize().dot(new THREE.Vector3(-.3,.5,.8).normalize())),1/2.2);}
export function copySkinField(source,target){if(fields.has(source))fields.set(target,fields.get(source));}
export function sourceSkinLighting(material,u,v){const f=fields.get(material);if(!f)return 1;const x=Math.max(0,Math.min(f.size-1,Math.round(u*(f.size-1)))),y=Math.max(0,Math.min(f.size-1,Math.round(v*(f.size-1)))),i=y*f.size+x;return f.valid[i]?f.light[i]:1;}
export function prepareSkinFields(parts,{size=256}={}){
 const groups=new Map();for(const p of parts)if(p.material?.userData?.t3csSkinSurface){if(!groups.has(p.material))groups.set(p.material,[]);groups.get(p.material).push(p);}
 for(const [material,group]of groups){const normals=new Float32Array(size*size*3),count=new Uint16Array(size*size),light=new Float32Array(size*size),valid=new Uint8Array(size*size);let triangles=0;
  for(const p of group){const uv=p.g.attributes.uv,n=p.g.attributes.normal,c=p.uvCrop;if(!uv||!n||!c)continue;const matrix=new THREE.Matrix3().getNormalMatrix(p.mesh.matrixWorld);
   for(let t=0;t<p.indices.length;t+=3){const ids=Array.from(p.indices.slice(t,t+3)),q=ids.map(i=>new THREE.Vector2((uv.getX(i)-c.minU)/c.spanU*(size-1),(uv.getY(i)-c.minV)/c.spanV*(size-1))),ns=ids.map(i=>new THREE.Vector3().fromBufferAttribute(n,i).applyNormalMatrix(matrix)),[a,b,d]=q,det=(b.y-d.y)*(a.x-d.x)+(d.x-b.x)*(a.y-d.y);if(Math.abs(det)<1e-9)continue;triangles++;
    const minX=Math.max(0,Math.floor(Math.min(...q.map(p=>p.x)))),maxX=Math.min(size-1,Math.ceil(Math.max(...q.map(p=>p.x)))),minY=Math.max(0,Math.floor(Math.min(...q.map(p=>p.y)))),maxY=Math.min(size-1,Math.ceil(Math.max(...q.map(p=>p.y))));
    for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const w0=((b.y-d.y)*(x-d.x)+(d.x-b.x)*(y-d.y))/det,w1=((d.y-a.y)*(x-d.x)+(a.x-d.x)*(y-d.y))/det,w2=1-w0-w1;if(Math.min(w0,w1,w2)<-1e-6)continue;const i=y*size+x;count[i]++;for(let k=0;k<3;k++)normals[i*3+k]+=ns[0].getComponent(k)*w0+ns[1].getComponent(k)*w1+ns[2].getComponent(k)*w2;}
   }
  }
  let covered=0;const queue=new Int32Array(size*size);let end=0;for(let i=0;i<count.length;i++)if(count[i]){const n=new THREE.Vector3(normals[i*3],normals[i*3+1],normals[i*3+2]).divideScalar(count[i]);if(!n.toArray().every(Number.isFinite)||n.length()<.25)continue;light[i]=sourceDiffuse(n);valid[i]=1;queue[end++]=i;covered++;}
  // Dilate real measured values into unused texels; no random detail/occlusion.
  for(let start=0;start<end;start++){const i=queue[start],x=i%size,y=Math.floor(i/size);for(const j of [x?i-1:-1,x<size-1?i+1:-1,y?i-size:-1,y<size-1?i+size:-1])if(j>=0&&!valid[j]){valid[j]=1;light[j]=light[i];queue[end++]=j;}}
  fields.set(material,{size,light,valid});material.userData.t3csSkinBake={method:'Original smooth surface-normal diffuse lighting; source albedo and normal-map detail retained',size,sourceTriangles:triangles,measuredTexels:covered,retainedBytes:light.byteLength+valid.byteLength,staticLighting:true};
 }
}
