import {boundaryLoops} from './boundary-loops.js';
import {refineSurfaceCurvature} from './curvature-topology.js';
import * as THREE from 'three';
import {sourceEyeSurface,traceEyeAperture} from './eye-aperture.js';
import {surfaceConnectivity,resampleClosedLoop} from './surface-connectivity.js';
import {improveTriangulation} from './constrained-triangulation.js';
import {SurfaceIndex,triangleRecord,materialSampler} from './surface.js';
import {sourceRecords,transferSurfaceAttributes,surfaceTexture} from './projected-topology.js';

function pointInPolygon(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++)if((ring[i].y>p.y)!==(ring[j].y>p.y)&&p.x<(ring[j].x-ring[i].x)*(p.y-ring[i].y)/(ring[j].y-ring[i].y)+ring[i].x)inside=!inside;return inside;}
export function insertPoint(points,triangles,q){
 if(points.some(p=>p.distanceToSquared(q)<1e-14))return;
 const selected=[];
 for(let t=0;t<triangles.length;t++){
  const ids=triangles[t],a=points[ids[0]],b=points[ids[1]],c=points[ids[2]],area=b.clone().sub(a).cross(c.clone().sub(a));if(Math.abs(area)<1e-14)continue;
  const w1=q.clone().sub(a).cross(c.clone().sub(a))/area,w2=b.clone().sub(a).cross(q.clone().sub(a))/area,w0=1-w1-w2;
  if(Math.min(w0,w1,w2)>=-1e-8)selected.push({t,ids,weights:[w0,w1,w2]});
 }
 if(!selected.length)return;
 const id=points.length;points.push(q);
 for(const {t,ids,weights}of selected.reverse()){
  triangles.splice(t,1);
  for(let k=0;k<3;k++)if(Math.abs(weights[(k+2)%3])>1e-8)triangles.push([ids[k],ids[(k+1)%3],id]);
 }
}

// This template uses measured semantic anchors and a cylindrical anatomical
// chart, not the source UVs or source connectivity. Eye/mouth support rings are
// explicit edges; interior samples refine the remaining cheek/skull patches.
export function reconstructAnatomicalFace(mesh,g,material,{detail=90,corrections={},textureSize=256,referenceRoot=null}={}){
 if(!mesh.skeleton&&!Object.keys(corrections).length)return {geometry:null,reason:'Facial semantic anchors unavailable'};
 mesh.updateWorldMatrix(true,false);
 const inverse=mesh.matrixWorld.clone().invert(),anchors={};
 for(const b of mesh.skeleton?.bones??[])if(/^FACIAL_/i.test(b.name))anchors[b.name]=b.getWorldPosition(new THREE.Vector3()).applyMatrix4(inverse);
 for(const [name,value]of Object.entries(corrections)){
  if(!/^FACIAL_/i.test(name)||!Array.isArray(value)||value.length!==3||!value.every(Number.isFinite))throw Error('Invalid facial landmark correction');
  anchors[name]=new THREE.Vector3(...value);
 }
 for(const side of ['L','R'])if(!anchors[`FACIAL_${side}_EyelidUpperA`]){const contour=['UpperA1','UpperA3','LowerA1','LowerA3'].map(n=>anchors[`FACIAL_${side}_Eyelid${n}`]);if(contour.every(Boolean))anchors[`FACIAL_${side}_EyelidUpperA`]=contour.reduce((a,p)=>a.add(p),new THREE.Vector3()).multiplyScalar(.25);}
 const left=anchors.FACIAL_L_EyelidUpperA,right=anchors.FACIAL_R_EyelidUpperA,nose=anchors.FACIAL_C_NoseTip;
 if(!left||!right||!nose)return {geometry:null,reason:'Both eye centres and nose required'};
 const x=left.clone().sub(right).normalize(),up=new THREE.Vector3(0,1,0).transformDirection(inverse),z=x.clone().cross(up).normalize(),y=z.clone().cross(x).normalize();
 const box=new THREE.Box3().setFromBufferAttribute(g.attributes.position),center=box.getCenter(new THREE.Vector3());
 if(nose.clone().sub(center).dot(z)<0)z.negate();
 const points=Array.from({length:g.attributes.position.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(g.attributes.position,i));
 let minY=Infinity,maxY=-Infinity,radius=0;
 for(const p of points){const d=p.clone().sub(center);minY=Math.min(minY,d.dot(y));maxY=Math.max(maxY,d.dot(y));radius=Math.max(radius,Math.hypot(d.dot(x),d.dot(z)));}
 const height=maxY-minY;if(!height||!radius)return {geometry:null,reason:'Degenerate head bounds'};
 const source=new SurfaceIndex(sourceRecords(g,material,triangleRecord));
 const slices=new Map();
 const parameter=p=>{const d=p.clone().sub(center);return new THREE.Vector2(Math.atan2(d.dot(x),d.dot(z)),(d.dot(y)-minY)/height);};
 // The source neck border is nonplanar. A horizontal min-Y cylinder collapses
 // it to a point and cannot meet the torso. Keep its measured contour exactly.
 const chinAnchor=anchors.FACIAL_C_Chin1??anchors.FACIAL_C_Chin??anchors.FACIAL_C_Jawline,neckLimit=chinAnchor?parameter(chinAnchor).y-.02:.3,neckLoops=boundaryLoops(g).filter(loop=>loop.every(i=>parameter(points[i]).y<neckLimit)),neckLoop=neckLoops.length===1?neckLoops[0]:null;
 const neck=neckLoop?neckLoop.map(i=>({point:points[i],angle:parameter(points[i]).x})).sort((a,b)=>a.angle-b.angle):[];
 const neckTop=neck.length?Math.max(...neck.map(n=>n.point.clone().sub(center).dot(y)))+height*.02:minY;
 const neckPoint=angle=>{for(let i=0;i<neck.length;i++){const a=neck[i],b=neck[(i+1)%neck.length],end=b.angle+(i===neck.length-1?Math.PI*2:0),q=angle<a.angle?angle+Math.PI*2:angle;if(q>=a.angle&&q<=end)return a.point.clone().lerp(b.point,(q-a.angle)/(end-a.angle));}return null;};
 const project=q=>{
  q=q.clone();if(Math.abs(Math.abs(q.x)-Math.PI)<1e-7)q.x=Math.PI;
  if(q.y>1-1e-10){const top=points.reduce((a,b)=>a.clone().sub(center).dot(y)>b.clone().sub(center).dot(y)?a:b);return source.nearest(top);}
  if(!neck.length&&q.y<1e-10){const bottom=points.reduce((a,b)=>a.clone().sub(center).dot(y)<b.clone().sub(center).dot(y)?a:b);return source.nearest(bottom);}
  if(neck.length&&q.y<1e-10)return source.nearest(neckPoint(q.x));
  const low=minY+q.y*height;if(neck.length&&low<neckTop){const base=neckPoint(q.x).clone().sub(center).dot(y);q.y=(low+(base-minY)*(neckTop-low)/(neckTop-minY)-minY)/height;}
  const direction=z.clone().multiplyScalar(Math.cos(q.x)).addScaledVector(x,Math.sin(q.x));
  const origin=center.clone().addScaledVector(y,minY+Math.max(.0001,Math.min(.9999,q.y))*height).addScaledVector(direction,radius*2.5);
  const hit=source.raycast(origin,direction.clone().negate(),radius*5);
  if(hit&&hit.point.clone().sub(center).dot(direction)>radius*.08){hit.barycentric=hit.triangle.triangle.getBarycoord(hit.point,new THREE.Vector3());return hit;}
  const level=minY+Math.max(.0001,Math.min(.9999,q.y))*height,key=level.toFixed(6);
  if(!slices.has(key)){const segments=[];for(const t of source.triangles){const cross=[];for(let k=0;k<3;k++){const a=t.points[k],b=t.points[(k+1)%3],da=a.clone().sub(center).dot(y)-level,db=b.clone().sub(center).dot(y)-level;if(da*db<0)cross.push(a.clone().lerp(b,da/(da-db)));}if(cross.length===2)segments.push(new THREE.Line3(...cross));}slices.set(key,segments);}
  let best=null,distance=Infinity;for(const segment of slices.get(key)){const point=segment.closestPointToPoint(origin,true,new THREE.Vector3()),d=point.distanceToSquared(origin);if(d<distance){best=point;distance=d;}}
  return source.nearest(best??origin.clone().addScaledVector(direction,-radius*2.5));
 };
 // Rig lip controls can lie behind the skin. Establish visible 3D surface
 // correspondence before computing the chart; internal depth must not skew UVs.
 for(const name of Object.keys(anchors).filter(n=>/Lip|NoseTip/.test(n))){
  if(Object.hasOwn(corrections,name))continue;
  const hit=source.raycast(anchors[name].clone().addScaledVector(z,radius*3),z.clone().negate(),radius*6);
  if(hit)anchors[name]=hit.point.clone();
 }
 const eyeSurface=referenceRoot?sourceEyeSurface(referenceRoot,inverse):null;
 const features=[],boundaries=surfaceConnectivity(source.triangles).loops,eyeSpacing=left.distanceTo(right);
 function measuredLoop(target){return boundaries.map(points=>({points,center:points.reduce((p,v)=>p.add(v),new THREE.Vector3()).multiplyScalar(1/points.length),box:new THREE.Box3().setFromPoints(points)})).filter(b=>b.center.distanceTo(target)<eyeSpacing*.45&&b.box.getSize(new THREE.Vector3()).length()<eyeSpacing*.9).sort((a,b)=>a.center.distanceToSquared(target)-b.center.distanceToSquared(target))[0]?.points;}
 for(const side of ['L','R']){
  const names=[`FACIAL_${side}_EyelidUpperA1`,`FACIAL_${side}_EyelidUpperA3`,`FACIAL_${side}_EyelidLowerA3`,`FACIAL_${side}_EyelidLowerA1`];
  if(names.every(n=>anchors[n])){
   const manualContour=names.some(n=>Object.hasOwn(corrections,n)),target=names.reduce((p,n)=>p.add(anchors[n]),new THREE.Vector3()).multiplyScalar(.25),boundary=manualContour?null:measuredLoop(target);
   const traced=manualContour?null:traceEyeAperture(source,eyeSurface,anchors[`FACIAL_${side}_EyelidUpperA`],{x,y,z,radius,eyeSpacing});
   const surfacePoints=traced??(boundary?resampleClosedLoop(boundary,12):names.map(n=>anchors[n]));
   features.push({name:side+' eye',contour:surfacePoints.map(parameter),surfacePoints,manualContour,measuredBoundary:!!boundary||!!traced,eyeSurfaceIntersection:!!traced,open:true});
  }
 }
 const mouthNames=['FACIAL_L_LipCorner','FACIAL_C_LipUpper','FACIAL_R_LipCorner','FACIAL_C_LipLower'];
 if(mouthNames.every(n=>anchors[n])){
  const detailed=['FACIAL_L_LipCorner','FACIAL_L_LipUpper','FACIAL_C_LipUpper','FACIAL_R_LipUpper','FACIAL_R_LipCorner','FACIAL_R_LipLower','FACIAL_C_LipLower','FACIAL_L_LipLower'];
  const names=detailed.every(n=>anchors[n])?detailed:mouthNames,surfacePoints=names.map(n=>anchors[n]);
  features.push({name:'mouth',contour:surfacePoints.map(parameter),surfacePoints,open:false});
 }
 if(features.filter(f=>f.open).length!==2)return {geometry:null,reason:'Measured eye contour anchors required; centre bones alone are insufficient'};
 const outer=[new THREE.Vector2(-Math.PI,0),new THREE.Vector2(Math.PI,0),new THREE.Vector2(Math.PI,1),new THREE.Vector2(-Math.PI,1)];
 const holes=features.map(f=>{const c=f.contour.reduce((a,p)=>a.add(p),new THREE.Vector2()).multiplyScalar(1/f.contour.length);f.center=c;return f.contour.map(p=>p.clone().sub(c).multiplyScalar(f.open?1.35:1.45).add(c));});
 const template=[...outer,...holes.flat()],triangles=THREE.ShapeUtils.triangulateShape(outer,holes).map(t=>[...t]);
 let holeOffset=outer.length;
 for(let f=0;f<features.length;f++){
  const innerOffset=template.length,feature=features[f];template.push(...feature.contour);
  const count=feature.contour.length;for(let k=0;k<count;k++){const next=(k+1)%count;triangles.push([holeOffset+k,holeOffset+next,innerOffset+next],[holeOffset+k,innerOffset+next,innerOffset+k]);}
  if(!feature.open){const c=template.length;template.push(feature.center);for(let k=0;k<count;k++)triangles.push([innerOffset+k,innerOffset+(k+1)%count,c]);}
  holeOffset+=count;
 }
 const frontCount=Math.max(9,9+Math.round(detail/12)),gridRows=7+Math.round(detail/20);
 const angles=[-Math.PI,-2.6,-2.1,-1.7,...Array.from({length:frontCount},(_,i)=>-1.45+i*2.9/(frontCount-1)),1.7,2.1,2.6,Math.PI];
 // Limit anatomical density to useful eye/nose/lip levels, not every source rig bone.
 const rows=Array.from({length:gridRows+1},(_,i)=>i/gridRows);
 for(const row of rows)for(const angle of angles){
  const q=new THREE.Vector2(angle,row);
  if(!holes.some(h=>pointInPolygon(q,h)))insertPoint(template,triangles,q);
 }
 // Anatomical support levels stay local instead of circling the whole skull.
 for(const name of ['FACIAL_C_NoseTip','FACIAL_C_Chin1','FACIAL_C_Chin3','FACIAL_C_Jawline'])if(anchors[name]){
  const q=parameter(anchors[name]);for(const dx of [-.16,0,.16]){const p=q.clone();p.x+=dx;if(!holes.some(h=>pointInPolygon(p,h)))insertPoint(template,triangles,p);}
 }
 for(const name of ['FACIAL_C_NoseTip','FACIAL_C_LipUpperSkin','FACIAL_C_LipLower','FACIAL_C_Chin','FACIAL_L_EyelidUpperFurrow','FACIAL_R_EyelidUpperFurrow','FACIAL_C_Chin1','FACIAL_C_Chin3','FACIAL_C_Jawline','FACIAL_L_Jawline','FACIAL_R_Jawline'])if(anchors[name]){
  const q=parameter(anchors[name]);if(!holes.some(h=>pointInPolygon(q,h)))insertPoint(template,triangles,q);
 }
 const constraints=[];let offset=4;for(const hole of holes){for(let k=0;k<hole.length;k++)constraints.push([offset+k,offset+(k+1)%hole.length]);offset+=hole.length;}
 offset=4+holes.reduce((n,h)=>n+h.length,0);const innerOffsets=[];for(const f of features){innerOffsets.push(offset);for(let k=0;k<f.contour.length;k++)constraints.push([offset+k,offset+(k+1)%f.contour.length]);offset+=f.contour.length+(f.open?0:1);}
 const chin=anchors.FACIAL_C_Chin1??anchors.FACIAL_C_Chin??anchors.FACIAL_C_Jawline;
 const measuredLow=chin?Math.max(.02,parameter(chin).y-.025):0,measuredHigh=Math.min(.98,parameter(left).y+eyeSpacing/height*.95),validFaceRange=!!chin&&measuredHigh-measuredLow>.2&&measuredHigh-measuredLow<.85;
 const faceLow=validFaceRange?measuredLow:0,faceHigh=validFaceRange?measuredHigh:1;
 if(validFaceRange)for(const row of [faceLow,faceHigh])for(const angle of angles){const q=new THREE.Vector2(angle,row);if(!holes.some(h=>pointInPolygon(q,h)))insertPoint(template,triangles,q);}
 const curvature=refineSurfaceCurvature(template,triangles,project,insertPoint,{constraints,tolerance:radius*(.012+(100-detail)*.00015),maxInsertions:100,accept:q=>Math.abs(q.x)<1.45&&q.y>=faceLow&&q.y<=faceHigh&&!features.some(f=>!f.open&&pointInPolygon(q,f.contour))});
 const projected=template.map(project);
 const triangulation=improveTriangulation(template,triangles,constraints,{scaleY:height/radius});
 for(const n of neck)insertPoint(template,triangles,new THREE.Vector2(n.angle,0));
 const hits=template.map(project);
 features.forEach((f,i)=>f.surfacePoints.forEach((p,k)=>{hits[innerOffsets[i]+k]=source.nearest(p);}));
 for(const name of Object.keys(anchors).filter(n=>/Eyelid(Upper|Lower)A[13]$|NoseTip$|LipCorner$|LipUpper$|LipLower$/.test(n))){const q=parameter(anchors[name]),vertex=template.findIndex(p=>p.distanceToSquared(q)<1e-12);if(vertex>=0)hits[vertex]=source.nearest(anchors[name]);}
 // An open source mouth has no skin surface at its centre. Projecting there
 // can hit the rear skull or a remote lip edge. Close only this template patch
 // from measured lip positions and transfer its local source UV correspondence.
 const hitUV=h=>h.triangle.uvs?h.triangle.uvs.reduce((v,p,k)=>v.addScaledVector(p,h.barycentric.getComponent(k)),new THREE.Vector2()):new THREE.Vector2();
 const patchCentres=new Set(),sourceUV=hits.map(hitUV);
 features.forEach((f,i)=>{if(f.open)return;const start=innerOffsets[i],id=start+f.contour.length,ring=hits.slice(start,id),point=ring.reduce((p,h)=>p.add(h.point),new THREE.Vector3()).multiplyScalar(1/ring.length),uv=sourceUV.slice(start,id),span=new THREE.Box2().setFromPoints(uv).getSize(new THREE.Vector2());
  hits[id]={...source.nearest(point),point};sourceUV[id]=uv.reduce((p,q)=>p.add(q),new THREE.Vector2()).multiplyScalar(1/uv.length);
  if(span.x<.5&&span.y<.5)patchCentres.add(id);
 });
 // Reserve 80% of the actual exported head texture for the front face.
 // This increases useful eye/lip texels without raising the atlas tile size.
 const angleToU=a=>a< -1.45?.1*(a+Math.PI)/(Math.PI-1.45):a>1.45?.9+.1*(a-1.45)/(Math.PI-1.45):.1+.8*(a+1.45)/2.9;
 const uToAngle=u=>u<.1?-Math.PI+u/.1*(Math.PI-1.45):u>.9?1.45+(u-.9)/.1*(Math.PI-1.45):-1.45+(u-.1)/.8*2.9;
 // Allocate real texels to the measured jaw-to-forehead interval instead of
 // spending most of this tile on neck/scalp. Unsupported rigs keep uniform V.
 const heightToV=v=>!validFaceRange?v:v<faceLow?.2*v/faceLow:v>faceHigh?.9+.1*(v-faceHigh)/(1-faceHigh):.2+.7*(v-faceLow)/(faceHigh-faceLow);
 const vToHeight=v=>!validFaceRange?v:v<.2?v/.2*faceLow:v>.9?faceHigh+(v-.9)/.1*(1-faceHigh):faceLow+(v-.2)/.7*(faceHigh-faceLow);
 const positions=hits.map(h=>h.point),uvs=template.map(q=>new THREE.Vector2(angleToU(q.x),heightToV(q.y)));
 const transferred=transferSurfaceAttributes(g,hits,positions,uvs),geometry=transferred.geometry,indices=[];
 for(let ids of triangles){const p=ids.map(i=>positions[i]),normal=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]));if(normal.lengthSq()<1e-14)continue;const outward=p[0].clone().sub(center);outward.addScaledVector(y,-outward.dot(y));if(normal.dot(outward)<0)ids=[ids[0],ids[2],ids[1]];indices.push(...ids);}
 geometry.setIndex(indices);geometry.computeVertexNormals();
 // Bake against the actual new triangles, not the analytic cylinder. This
 // keeps source eyes/lips aligned when the low-poly surface cuts a curved chord.
 const sample=materialSampler([material],{mode:'static-detail'}),rgba=new Uint8Array(textureSize*textureSize*4),bins=new Map(),binSize=32;
 for(let t=0;t<indices.length;t+=3){const ids=indices.slice(t,t+3),p=ids.map(i=>uvs[i]),min=new THREE.Vector2(1,1),max=new THREE.Vector2();p.forEach(q=>{min.min(q);max.max(q);});for(let bx=Math.floor(min.x*binSize);bx<=Math.floor(max.x*binSize);bx++)for(let by=Math.floor(min.y*binSize);by<=Math.floor(max.y*binSize);by++){const key=bx+','+by;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(ids);}}
 for(let row=0;row<textureSize;row++)for(let col=0;col<textureSize;col++){
  const uv=new THREE.Vector2((col+.5)/textureSize,(row+.5)/textureSize);let hit=null;
  for(const ids of bins.get(Math.floor(uv.x*binSize)+','+Math.floor(uv.y*binSize))??[]){const [a,b,c]=ids.map(i=>uvs[i]),ab=b.clone().sub(a),ac=c.clone().sub(a),v=uv.clone().sub(a),area=ab.cross(ac);if(Math.abs(area)<1e-12)continue;const weights=[0,v.cross(ac)/area,ab.cross(v)/area];weights[0]=1-weights[1]-weights[2];if(Math.min(...weights)<-1e-7)continue;const point=new THREE.Vector3();ids.forEach((id,k)=>point.addScaledVector(positions[id],weights[k]));if(ids.some(id=>patchCentres.has(id))){hit={triangle:triangleRecord(ids.map(id=>positions[id]),{uvs:ids.map(id=>sourceUV[id]),material}),point,barycentric:new THREE.Vector3(...weights)};break;}let normal=new THREE.Triangle(...ids.map(id=>positions[id])).getNormal(new THREE.Vector3());if(point.clone().sub(center).dot(z)>0&&Math.abs(uToAngle(uv.x))<1.2)normal=z;hit=source.raycast(point.clone().addScaledVector(normal,radius*2.5),normal.clone().negate(),radius*5);if(hit)hit.barycentric=hit.triangle.triangle.getBarycoord(hit.point,new THREE.Vector3());else hit=source.nearest(point);break;}
  // Fill outside apertures as padding; the mesh itself retains the openings.
  if(!hit)hit=project(new THREE.Vector2(uToAngle(uv.x),vToHeight(uv.y)));
  rgba.set(sample(hit),(row*textureSize+col)*4);
 }

 const texture=surfaceTexture(rgba,textureSize,textureSize);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.needsUpdate=true;
 const outputMaterial=material.clone();outputMaterial.name=material.name+'_anatomical';outputMaterial.color.set(0xffffff);outputMaterial.map=texture;outputMaterial.normalMap=null;outputMaterial.alphaMap=null;outputMaterial.specularMap=null;outputMaterial.aoMap=null;outputMaterial.roughnessMap=null;outputMaterial.metalnessMap=null;
 return {geometry,material:outputMaterial,method:'anatomical cylindrical head with explicit eye/mouth support rings',triangles:indices.length/3,generatedVertices:positions.length,contourPoints:features.map((f,i)=>({name:f.name,points:f.contour.map((_,k)=>positions[innerOffsets[i]+k].toArray())})),featureLoops:features.map(f=>({name:f.name,vertices:f.contour.length,aperture:f.open,measuredBoundary:!!f.measuredBoundary,eyeSurfaceIntersection:!!f.eyeSurfaceIntersection,manualContour:!!f.manualContour})),maximumDiscardedWeight:transferred.maximumDiscardedWeight,sourceUVIndependent:true,neckBoundary:{sourceVertices:neck.length,method:neck.length?'Measured nonplanar source collar; canonical periodic seam':'Source contour unavailable; no guessed closure'},mouthTextureMode:patchCentres.size?'Measured local lip UV correspondence over a closed source-mouth gap':'Source ray projection fallback',frontTextureFraction:.8,faceTextureVRange:validFaceRange?{source:[faceLow,faceHigh],allocated:[.2,.9]}:null,triangulation,curvature,calibration:'Semantic source measurements; template layout not calibrated to original Namco geometry'};
}
