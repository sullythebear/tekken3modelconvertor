import {BufferGeometry} from 'three';
// Conversion already excludes morph targets. Clone only retained channels so
// large corrective morph buffers are never temporarily duplicated then dropped.
// The original preview geometry and original project asset bytes stay untouched.
export function cloneWorkingGeometry(source){
 const geometry=new BufferGeometry(),shared={};geometry.name=source.name;
 if(source.index)geometry.setIndex(source.index.clone());
 for(const[name,attribute]of Object.entries(source.attributes))geometry.setAttribute(name,attribute.clone(shared));
 for(const group of source.groups)geometry.addGroup(group.start,group.count,group.materialIndex);
 geometry.setDrawRange(source.drawRange.start,source.drawRange.count);
 geometry.morphTargetsRelative=source.morphTargetsRelative;
 if(source.boundingBox)geometry.boundingBox=source.boundingBox.clone();
 if(source.boundingSphere)geometry.boundingSphere=source.boundingSphere.clone();
 geometry.userData={...source.userData};
 return geometry;
}
