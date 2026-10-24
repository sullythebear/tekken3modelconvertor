import * as THREE from 'three';
const facialSurface=name=>/head|face/i.test(name??'')&&!/hair|faceacc|strand|lash|eye|teeth/i.test(name??'');
export function facePickSurfaces(source){
 const all=[];source.root.traverse(m=>{if(m.isMesh)all.push(m);});
 const named=all.filter(m=>facialSurface(m.name)||(Array.isArray(m.material)?m.material:[m.material]).some(mat=>facialSurface(mat?.name)));
 return named.length?named:all.filter(m=>m.skeleton?.bones.includes(source.skeleton.mapping.head));
}
// Limited corrections in the existing original-model view, persisted in the
// existing art profile/project. Does not modify the user's imported mesh.
export function installLandmarkEditor({view,getSource,getProfile,changed,status,prepare=()=>{}}){
 const select=document.querySelector('#face-landmark'),pick=document.querySelector('#face-landmark-pick'),reset=document.querySelector('#face-landmark-reset');
 const names=['FACIAL_L_EyelidUpperA1','FACIAL_L_EyelidUpperA3','FACIAL_L_EyelidLowerA1','FACIAL_L_EyelidLowerA3','FACIAL_R_EyelidUpperA1','FACIAL_R_EyelidUpperA3','FACIAL_R_EyelidLowerA1','FACIAL_R_EyelidLowerA3','FACIAL_C_NoseTip','FACIAL_L_LipCorner','FACIAL_R_LipCorner','FACIAL_C_LipUpper','FACIAL_C_LipLower','FACIAL_C_Chin'];
 for(const name of names){const option=document.createElement('option');option.value=name;option.textContent=name.replace('FACIAL_','');select.append(option);}
 let pending=false,marker=null;
 function cancel(){pending=false;view.controls.enabled=true;pick.textContent='Pick landmark on original face';}
 pick.onclick=()=>{if(pending){cancel();return;}if(!getSource()){status('Import a character before correcting landmarks.');return;}prepare();pending=true;view.controls.enabled=false;pick.textContent='Click the original face · Esc cancels';};
 window.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});
 view.renderer.domElement.addEventListener('pointerdown',e=>{
  if(!pending||e.button!==0)return;
  const source=getSource(),meshes=facePickSurfaces(source);source.root.updateMatrixWorld(true);
  const rect=view.renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),view.camera);
  const hit=ray.intersectObjects(meshes,false).find(hit=>{const mats=Array.isArray(hit.object.material)?hit.object.material:[hit.object.material];return !mats.some(m=>facialSurface(m?.name))||facialSurface(mats[hit.face?.materialIndex??0]?.name);});if(!hit){status('No head surface at that point; click the original face or press Esc.');return;}
  const point=hit.point.clone().applyMatrix4(hit.object.matrixWorld.clone().invert()),profile=getProfile();profile.faceLandmarks??={};profile.faceLandmarks[select.value]=point.toArray();profile.faceLandmarkMesh=hit.object.name;
  if(marker){marker.removeFromParent();marker.geometry.dispose();marker.material.dispose();}
  marker=new THREE.Mesh(new THREE.SphereGeometry(.006,8,6),new THREE.MeshBasicMaterial({color:0xffc857,depthTest:false}));marker.position.copy(hit.point);marker.renderOrder=100;view.scene.add(marker);
  cancel();view.render();changed();status(`Saved ${select.value} on the original surface; reconvert to apply.`);
 });
 reset.onclick=()=>{const profile=getProfile();if(profile.faceLandmarks)delete profile.faceLandmarks[select.value];if(marker){marker.removeFromParent();marker.geometry.dispose();marker.material.dispose();marker=null;}cancel();changed();view.render();status(`Automatic landmark restored: ${select.value}`);};
}
