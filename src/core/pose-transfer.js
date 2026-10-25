import * as THREE from 'three';
// Identical imported rigs can contain duplicate bone names and distinct bind
// frames. Diagnostics pair hierarchy paths and transfer rotation deltas only.
export function compileRotationTransfer(source,target){
 const originals=new Map(),names=new Map(),pairs=[];function visit(node,path,map){if(node.isBone){map.set(path,node);names.set(node.name,(names.get(node.name)??0)+1);}node.children.forEach((c,i)=>visit(c,path+'/'+i,map));}visit(source,'',originals);
 function pair(node,path){if(node.isBone){const original=originals.get(path);if(!original||original.name!==node.name)throw Error('Diagnostic pose hierarchy differs from source; name-only matching is forbidden');pairs.push({source:original,target:node,sourceRest:original.quaternion.clone().normalize(),targetRest:node.quaternion.clone()});}node.children.forEach((c,i)=>pair(c,path+'/'+i));}pair(target,'');
 return{report:{matchedBones:pairs.length,duplicateSourceNames:[...names].filter(([,n])=>n>1).length,mode:'Hierarchy paths and bind-relative rotation deltas; no name-only matching'},apply(){for(const p of pairs){const delta=p.sourceRest.clone().invert().multiply(p.source.quaternion.clone().normalize()).normalize();p.target.quaternion.copy(p.targetRest).multiply(delta);}target.updateMatrixWorld(true);target.traverse(m=>{if(m.isSkinnedMesh)m.skeleton.update();});}};
}
