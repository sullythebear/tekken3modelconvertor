import {requireBakeUV} from './bake-uv.js';
// Continuous source-UV rectangle; no vertex wrapping or topology changes.
export function materialUVFrames(root, materials) {
  const ranges=new Map(materials.map(m=>[m,[Infinity,Infinity,-Infinity,-Infinity]]));
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const g=mesh.geometry;
    const index=g.index,mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    for(const group of g.groups.length?g.groups:[{start:0,count:index?.count??g.attributes.position.count,materialIndex:0}]) {
      const material=mats[group.materialIndex],r=ranges.get(material);if(!r)throw Error('Invalid atlas material group');const uv=requireBakeUV(g,material);if(!uv)continue;
      for(let k=group.start;k<group.start+group.count;k++){
        const v=index?index.getX(k):k,u=uv.getX(v),y=uv.getY(v);
        if(!Number.isFinite(u)||!Number.isFinite(y))throw Error('Nonfinite source UV');
        r[0]=Math.min(r[0],u);r[1]=Math.min(r[1],y);r[2]=Math.max(r[2],u);r[3]=Math.max(r[3],y);
      }
    }
  });
  return new Map([...ranges].map(([m,r])=>{
    if(r[0]===Infinity)return [m,{origin:[0,0],span:[1,1]}];
    const origin=[Math.floor(r[0]+1e-5),Math.floor(r[1]+1e-5)];
    const span=[Math.max(1,Math.ceil(r[2]-origin[0]-1e-5)),Math.max(1,Math.ceil(r[3]-origin[1]-1e-5))];
    if([...origin,...span].some(v=>!Number.isSafeInteger(v)))throw Error('Source UV domain exceeds safe numerical range');
    return [m,{origin,span}];
  }));
}

// Legacy one-tile contract retained for callers that explicitly require it.
export function materialUVDomains(root,materials){
 return new Map([...materialUVFrames(root,materials)].map(([m,f])=>{
  if(f.span.some(s=>s>1))throw Error(`${m.name}: UVs span multiple tiles; use continuous-domain rebaking`);
  return [m,f.origin];
 }));
}
