import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {configureSkinning} from '../core/skinning.js';
export function simulationModel(root,{snap=false,affine=false,gouraud=false}={}) {
 const result=clone(root);
 result.traverse(m=>{if(m.isMesh){const material=mat=>gouraud?new THREE.MeshLambertMaterial({map:mat.map,alphaTest:mat.alphaTest,side:mat.side,transparent:mat.transparent,opacity:mat.opacity,vertexColors:mat.vertexColors}):mat.clone();m.material=Array.isArray(m.material)?m.material.map(material):material(m.material);}});
 configureSkinning(result);
 result.traverse(m=>{if(!m.isMesh)return;for(const mat of Array.isArray(m.material)?m.material:[m.material]){
  const previous=mat.onBeforeCompile;
  mat.onBeforeCompile=shader=>{
   previous.call(mat,shader);
   let code='';
   if(snap)code+='gl_Position.xy = floor((gl_Position.xy/gl_Position.w*0.5+0.5)*vec2(320.0,240.0))/vec2(320.0,240.0)*2.0*gl_Position.w-gl_Position.w;';
   if(affine)code+='\n#ifdef USE_MAP\nvMapUv *= gl_Position.w;\n#endif\n';
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n'+code);
   if(affine)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','texture2D( map, vMapUv * gl_FragCoord.w )'));
  };
  const key=mat.customProgramCacheKey.bind(mat);mat.customProgramCacheKey=()=>key()+JSON.stringify({snap,affine,gouraud});mat.needsUpdate=true;
 }});
 return result;
}
