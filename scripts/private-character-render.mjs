// All image bytes stay under PRIVATE_CHARACTER_DIR; only aggregate errors return.
import {mkdir,writeFile} from 'node:fs/promises';import path from 'node:path';
export async function renderPrivateCharacter(page,dir,id){
 const output=path.join(dir,'renders',id);await mkdir(output,{recursive:true});
 const rendered=await page.evaluate(()=>{
  const t=window.studioTest,T=t.THREE,view=t.resultView,reference=t.referenceBounds,original=view.root,images=[],metrics=[];
  const roots=[['source',t.source.root],['prepared',t.converted.root],...(t.atlas?[['atlas',t.atlas.root]]:[])];
  const shots=[['front',0,[0,1,0],4.4],['back',Math.PI,[0,1,0],4.4],['side',Math.PI/2,[0,1,0],4.4],['quarter',Math.PI/4,[0,1,0],4.4],['face',0,[0,1.75,0],.65],['left-hand',0,[-.75,1.25,0],.8],['right-hand',0,[.75,1.25,0],.8]];
  const cropFraming={};
  // Use reconstructed anatomical groups rather than guessing hand positions.
  const size=reference.getSize(new T.Vector3()),center=reference.getCenter(new T.Vector3()),scale=2/Math.max(size.y,size.x*.5,.001),bounds={leftHand:new T.Box3(),rightHand:new T.Box3()};
  t.converted.root.updateWorldMatrix(true,false);t.converted.root.updateMatrixWorld(true);const parentInverse=t.converted.root.parent?.matrixWorld.clone().invert()??new T.Matrix4();
  t.converted.root.traverse(n=>{if(!n.isMesh)return;const g=n.geometry,matrix=parentInverse.clone().multiply(n.matrixWorld);for(const r of n.userData.studioRegions??[]){if(!bounds[r.role])continue;for(let j=r.start;j<r.start+r.count;j++){const i=g.index?g.index.getX(j):j;bounds[r.role].expandByPoint(n.getVertexPosition(i,new T.Vector3()).applyMatrix4(matrix));}}});
  for(const [name,role] of [['left-hand','leftHand'],['right-hand','rightHand']]){const box=bounds[role],shot=shots.find(s=>s[0]===name);if(box.isEmpty()){cropFraming[name]='provisional; no anatomical group';continue;}const p=box.getCenter(new T.Vector3());shot[2]=[(p.x-center.x)*scale,(p.y-reference.min.y)*scale,(p.z-center.z)*scale];shot[3]=Math.max(.22,box.getSize(new T.Vector3()).length()*scale*2);cropFraming[name]='anatomical region bounds';}
  const saved=new Map(),replacements=[];const ids=new Map();t.source.root.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])if(!ids.has(m.name))ids.set(m.name,ids.size);});
  const pixels=()=>{const c=document.createElement('canvas');c.width=c.height=512;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(view.renderer.domElement,0,0,512,512);return x.getImageData(0,0,512,512).data;};
  try{
   view.setResolution([512,512]);view.camera.aspect=1;view.camera.updateProjectionMatrix();
   for(const mode of ['full','diffuse','normals','material-id']){
    const sourcePixels=new Map();
    for(const [stage,root] of roots){
     root.traverse(n=>{if(!n.isMesh)return;saved.set(n,n.material);if(mode==='full')return;const mats=Array.isArray(n.material)?n.material:[n.material],next=mats.map(m=>{let a;if(mode==='normals')a=new T.MeshNormalMaterial({side:m.side});else{const col=mode==='material-id'?new T.Color().setHSL(((ids.get(m.name)??0)*.61803398875)%1,.75,.5):m.color?.clone()??new T.Color(1,1,1);a=new T.MeshBasicMaterial({color:col,map:mode==='diffuse'?m.map:null,alphaMap:m.alphaMap,alphaTest:m.alphaTest,transparent:m.transparent,opacity:m.opacity,side:m.side,vertexColors:mode==='diffuse'&&m.vertexColors});}replacements.push(a);return a;});n.material=Array.isArray(n.material)?next:next[0];});
     t.configureSkinning(root);view.setModel(root,reference);view.camera.aspect=1;view.camera.updateProjectionMatrix();
     for(const [name,angle,target,distance] of shots){view.controls.target.fromArray(target);view.camera.position.set(target[0]+Math.sin(angle)*distance,target[1],target[2]+Math.cos(angle)*distance);view.controls.update();view.render();const data=pixels();images.push({name:`${stage}-${mode}-${name}.png`,url:view.shot()});if(stage==='source')sourcePixels.set(name,data);else{const source=sourcePixels.get(name);let sum=0,changed=0,sourceNearBlackPixels=0,candidateNearBlackPixels=0,sourceNearWhitePixels=0,candidateNearWhitePixels=0;for(let i=0;i<data.length;i+=4){sourceNearBlackPixels+=Math.max(source[i],source[i+1],source[i+2])<12;candidateNearBlackPixels+=Math.max(data[i],data[i+1],data[i+2])<12;sourceNearWhitePixels+=Math.min(source[i],source[i+1],source[i+2])>240;candidateNearWhitePixels+=Math.min(data[i],data[i+1],data[i+2])>240;let d=0;for(let k=0;k<3;k++)d+=Math.abs(data[i+k]-source[i+k]);sum+=d;changed+=d>24;}metrics.push({stage,mode,view:name,width:512,height:512,meanAbsoluteRGBByteError:sum/(512*512*3),changedPixels:changed,sourceNearBlackPixels,candidateNearBlackPixels,sourceNearWhitePixels,candidateNearWhitePixels});}}
     for(const[n,m]of saved)n.material=m;saved.clear();
    }
   }
   if(t.atlas)images.push({name:'atlas.png',url:t.atlas.canvas.toDataURL('image/png')});
  }finally{for(const[n,m]of saved)n.material=m;for(const m of replacements)m.dispose();view.setModel(original,reference);view.setResolution(null);view.reset();t.sourceView.setModel(t.source.root,reference);}
  return{images,metrics,cropFraming};
 });
 for(const im of rendered.images)await writeFile(path.join(output,im.name),Buffer.from(im.url.split(',')[1],'base64'));
 await writeFile(path.join(output,'index.html'),'<!doctype html><meta charset="utf-8"><title>Private model diagnostics</title><p>Private renders; aggregate differences are not artistic approval.</p>'+rendered.images.map(im=>`<figure><figcaption>${im.name}</figcaption><img width="512" src="${im.name}"></figure>`).join(''));
 return{status:'RENDERED',imageCount:rendered.images.length,scope:'Private raster images generated and deleted on runner; pixel differences are diagnostics, not visual approval',metrics:rendered.metrics,cropFraming:rendered.cropFraming};
}
