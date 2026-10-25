import * as THREE from 'three';
// Source facial anchors protect identity before material/region simplification.
export function facialLandmarkLocks(mesh, geometry, materialName='',regionIndices=null) {
  if(!mesh.skeleton||!/head|face|skin/i.test(materialName)||/hair|faceacc|lash|eye|teeth/i.test(materialName))return null;
  const bones=mesh.skeleton.bones.filter(b=>/^FACIAL_[CLR]_(NoseTip|LipCorner|LipUpper|LipLower|EyelidUpperA|EyelidLowerA)$/i.test(b.name));
  if(!bones.length)return null;
  const position=geometry.attributes.position,used=regionIndices?[...new Set(regionIndices)]:Array.from({length:position.count},(_,i)=>i),points=used.map(i=>new THREE.Vector3().fromBufferAttribute(position,i).applyMatrix4(mesh.matrixWorld));
  const box=new THREE.Box3().setFromPoints(points),limit=box.getSize(new THREE.Vector3()).length()*.12;
  const seeds=new Set(),matched=[];
  for(const bone of bones){
    const target=bone.getWorldPosition(new THREE.Vector3());let nearest=-1,distance=Infinity;
    for(let i=0;i<points.length;i++){const d=points[i].distanceToSquared(target);if(d<distance){distance=d;nearest=used[i];}}
    if(distance<=limit*limit){seeds.add(nearest);matched.push(bone.name);}
  }
  if(!seeds.size)return null;
  const selected=new Set(seeds),index=regionIndices??geometry.index,total=regionIndices?.length??index?.count??position.count;
  for(let t=0;t<total;t+=3){const ids=[0,1,2].map(k=>regionIndices?regionIndices[t+k]:index?index.getX(t+k):t+k);if(ids.some(v=>seeds.has(v)))ids.forEach(v=>selected.add(v));}
  // Coincident UV/weight seam copies must receive the same protection.
  const key=v=>[position.getX(v),position.getY(v),position.getZ(v)].map(n=>Math.round(n*1e5)).join(',');
  const positions=new Set([...selected].map(key)),mask=new Uint8Array(position.count);
  for(const i of used)if(positions.has(key(i)))mask[i]=1;
  return {mask,landmarks:matched,lockedVertices:mask.reduce((n,v)=>n+v,0)};
}

// Semantic bone locations in the mesh's bind-local coordinates. Return only
// anchors close to this particular surface partition (exclude remote jaw/neck).
export function facialSurfaceAnchors(mesh, geometry) {
  if (!mesh.skeleton) return [];
  const position = geometry.attributes.position;
  const inverse = mesh.matrixWorld.clone().invert();
  const limitSquared = new THREE.Box3().setFromBufferAttribute(position)
    .getSize(new THREE.Vector3()).lengthSq() * .0144;
  const anchors = [];
  for (const bone of mesh.skeleton.bones) {
    if (!/^FACIAL_[CLR]_(NoseTip|LipCorner|LipUpper|LipLower|EyelidUpperA|EyelidLowerA)$/i.test(bone.name)) continue;
    const point = bone.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse);
    let vertex = 0, distance = Infinity;
    for (let v = 0; v < position.count; v++) {
      const d = new THREE.Vector3().fromBufferAttribute(position, v).distanceToSquared(point);
      if (d < distance) { vertex = v; distance = d; }
    }
    if (distance < limitSquared) anchors.push({name: bone.name, vertex});
  }
  return anchors;
}
