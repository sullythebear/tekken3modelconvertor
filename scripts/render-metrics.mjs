// Material masks preserve source alpha and extended skinning; a global overrideMaterial would lose >4 influences.
export async function silhouetteComparison(page) {
 return page.evaluate(()=>{
  const t=window.studioTest,T=t.THREE,masks=[];
  for(const view of [t.sourceView,t.resultView]) {
   const previous=[],hidden=[],background=view.scene.background,override=view.scene.overrideMaterial;
   const target=new T.WebGLRenderTarget(256,256),pixels=new Uint8Array(256*256*4);
   try{
    view.root.traverse(mesh=>{
     if(!mesh.isMesh)return;
     const original=mesh.material;
     const mask=material=>{
      const m=new T.MeshBasicMaterial({color:0xffffff,map:material.map,alphaMap:material.alphaMap,alphaTest:material.alphaTest,side:T.DoubleSide});
      m.visible=material.visible&&((material.opacity??1)>=.5||material.alphaTest>0);
      m.onBeforeCompile=shader=>{
       material.onBeforeCompile(shader,view.renderer);
       shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb = vec3(1.0);');
      };
      m.customProgramCacheKey=()=>material.customProgramCacheKey()+':t3cs-silhouette-v1';
      return m;
     };
     mesh.material=Array.isArray(original)?original.map(mask):mask(original);previous.push([mesh,original]);
    });
    view.scene.traverse(o=>{if(o.isLineSegments&&o.visible){hidden.push(o);o.visible=false;}});
    view.scene.background=new T.Color(0);view.scene.overrideMaterial=null;
    view.renderer.setRenderTarget(target);view.renderer.render(view.scene,view.camera);
    view.renderer.readRenderTargetPixels(target,0,0,256,256,pixels);
    masks.push(Array.from({length:256*256},(_,i)=>pixels[i*4]>128));
   }finally{
    view.renderer.setRenderTarget(null);view.scene.background=background;view.scene.overrideMaterial=override;
    for(const [mesh,original]of previous){for(const m of Array.isArray(mesh.material)?mesh.material:[mesh.material])m.dispose();mesh.material=original;}
    for(const o of hidden)o.visible=true;target.dispose();view.render();
   }
  }
  let union=0,intersection=0;
  for(let i=0;i<masks[0].length;i++){if(masks[0][i]||masks[1][i])union++;if(masks[0][i]&&masks[1][i])intersection++;}
  return{iou:union?intersection/union:0,sourcePixels:masks[0].filter(Boolean).length,preparedPixels:masks[1].filter(Boolean).length};
 });
}
