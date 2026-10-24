// Translate a whole UV tile into atlas-local coordinates without wrapping triangles across seams.
export function materialUVDomains(root, materials) {
  const ranges=new Map(materials.map(m=>[m,[Infinity,Infinity,-Infinity,-Infinity]]));
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const g=mesh.geometry,uv=g.attributes.uv;if(!uv)return;
    const index=g.index,mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];
    for(const group of g.groups.length?g.groups:[{start:0,count:index?.count??uv.count,materialIndex:0}]) {
      const r=ranges.get(mats[group.materialIndex]);if(!r)throw Error('Invalid atlas material group');
      for(let k=group.start;k<group.start+group.count;k++){
        const v=index?index.getX(k):k,u=uv.getX(v),y=uv.getY(v);
        if(!Number.isFinite(u)||!Number.isFinite(y))throw Error('Nonfinite source UV');
        r[0]=Math.min(r[0],u);r[1]=Math.min(r[1],y);r[2]=Math.max(r[2],u);r[3]=Math.max(r[3],y);
      }
    }
  });
  return new Map([...ranges].map(([m,r])=>{
    if(r[0]===Infinity)return [m,[0,0]];
    const origin=[Math.floor(r[0]+1e-5),Math.floor(r[1]+1e-5)];
    if(r[2]>origin[0]+1.00001||r[3]>origin[1]+1.00001)
      throw Error(`${m.name}: UVs span multiple tiles; per-triangle rebaking is required`);
    return [m,origin];
  }));
}
