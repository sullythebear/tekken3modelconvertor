import {collectMaterials} from './importer.js';
// Give a mapped head primitive its own continuous UV rectangle when its source
// material is shared with the body. No topology/weights/UV values are changed.
export function routeSharedHeadCharts(root,{maxMaterials=32}={}){
 const usage=new Map(),meshes=[];
 root.traverse(mesh=>{if(!mesh.isMesh)return;meshes.push(mesh);const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material];for(const g of mesh.geometry.groups){if(!g.count)continue;const m=mats[g.materialIndex],role=mesh.userData.studioRegions?.find(r=>r.start===g.start)?.role;if(!m)continue;if(!usage.has(m))usage.set(m,{head:false,other:false});usage.get(m)[role==='head'?'head':'other']=true;}});
 const plans=[];
 meshes.forEach((mesh,meshIndex)=>{const mats=Array.isArray(mesh.material)?mesh.material:[mesh.material],selected=new Map();for(const g of mesh.geometry.groups){const m=mats[g.materialIndex],role=mesh.userData.studioRegions?.find(r=>r.start===g.start)?.role,u=usage.get(m);if(g.count&&role==='head'&&m?.map&&!m.isMeshPhongMaterial&&u?.head&&u.other){if(!selected.has(m))selected.set(m,[]);selected.get(m).push(g.start);}}for(const[m,starts]of selected)plans.push({mesh,meshIndex,material:m,starts});});
 const charts=[],backups=[],owned=new Set(),created=[];let restored=false;
 if([...collectMaterials(root)].length+plans.length>maxMaterials)return{charts,reason:'Head charts exceed staging material capacity',restore(){},dispose(){}};
 const backup=new Map();
 for(const plan of plans){const{mesh,material,starts,meshIndex}=plan;if(!backup.has(mesh)){const b={mesh,geometry:mesh.geometry,material:mesh.material};backup.set(mesh,b);backups.push(b);mesh.geometry=mesh.geometry.clone();owned.add(mesh.geometry);mesh.material=Array.isArray(mesh.material)?mesh.material.slice():[mesh.material];}
  const m=material.clone();m.name=material.name+' [head chart]';m.userData.t3csAtlasRegion='head';m.userData.t3csAtlasCrop=true;created.push(m);const index=mesh.material.push(m)-1;for(const g of mesh.geometry.groups)if(starts.includes(g.start))g.materialIndex=index;
  charts.push({meshIndex,mesh:mesh.name,sourceMaterial:material.name,region:'head',primitives:starts.length});
 }
 return{charts,reason:charts.length?'Head/body source material shared; isolate head UV coverage':'No shared mapped head material',restore(){if(restored)return;for(const b of backups){b.mesh.geometry=b.geometry;b.mesh.material=b.material;}for(const g of owned)g.dispose();owned.clear();for(const m of created)m.dispose();restored=true;},dispose(){for(const g of owned)g.dispose();owned.clear();}};
}
