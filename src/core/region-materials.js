import {artRegion} from './art-director.js';
// Give anatomy-specific UV ranges their own tile; a tiny boot/arm chart in a
// full-body image otherwise disappears when the whole image becomes one tile.
export function planRegionMaterials(parts) {
 const buckets=new Map();
 for(const p of parts){
  if(!/body/i.test(p.material?.name)||p.material.rotation)continue;
  const region=artRegion(p.role,p.material.name);if(!['torso','arms','legs'].includes(region))continue;
  let meshBuckets=buckets.get(p.mesh);if(!meshBuckets)buckets.set(p.mesh,meshBuckets=new Map());
  const side=/^left/i.test(p.role)?'_left':/^right/i.test(p.role)?'_right':'';
  const key=p.materialIndex+':'+region+side+(/Hand$/.test(p.role)?':hand':'');if(!meshBuckets.has(key))meshBuckets.set(key,[]);meshBuckets.get(key).push(p);
 }
 for(const [mesh,groups]of buckets){
  const materials=Array.isArray(mesh.material)?mesh.material.slice():[mesh.material];
  for(const group of groups.values()){
   const uv=group[0].g.attributes.uv;if(!uv)continue;
   let minU=Infinity,minV=Infinity,maxU=-Infinity,maxV=-Infinity;
   for(const p of group)for(const i of p.indices){minU=Math.min(minU,uv.getX(i));maxU=Math.max(maxU,uv.getX(i));minV=Math.min(minV,uv.getY(i));maxV=Math.max(maxV,uv.getY(i));}
   const spanU=maxU-minU,spanV=maxV-minV;if(spanU<1e-6||spanV<1e-6)continue;
   const m=group[0].material.clone();m.name+='_'+artRegion(group[0].role,m.name)+(/^left/i.test(group[0].role)?'_left':/^right/i.test(group[0].role)?'_right':'');
   if(group.every(p=>/^(left|right)(Shoulder|UpperArm|LowerArm|Hand)$/.test(p.role))){m.userData.t3csSkinSurface=true;m.userData.t3csSkinPart=group.every(p=>/Hand$/.test(p.role))?'hand':'arm';if(m.userData.t3csSkinPart==='hand')m.name+='_hand';}
   let supported=true;
   for(const [key,value]of Object.entries(m))if(value?.isTexture){
    if(value.rotation||value.channel){supported=false;break;}
    const tex=value.clone();tex.offset.set(value.offset.x+minU*value.repeat.x,value.offset.y+minV*value.repeat.y);tex.repeat.set(value.repeat.x*spanU,value.repeat.y*spanV);m[key]=tex;
   }
   if(!supported)continue;
   const index=materials.length;materials.push(m);
   for(const p of group){p.material=m;p.materialIndex=index;p.uvCrop={minU,minV,spanU,spanV};}
  }
  const used=[...new Set(parts.filter(p=>p.mesh===mesh).map(p=>p.materialIndex))].sort((a,b)=>a-b);
  const remap=new Map(used.map((old,i)=>[old,i]));
  for(const p of parts)if(p.mesh===mesh)p.materialIndex=remap.get(p.materialIndex);
  mesh.material=used.map(i=>materials[i]);
 }
}
