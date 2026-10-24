import * as THREE from 'three';
import {improveTriangulation} from './constrained-triangulation.js';
import {SurfaceIndex,triangleRecord,materialSampler} from './surface.js';
import {sourceRecords,transferSurfaceAttributes,surfaceTexture} from './projected-topology.js';

function pointInPolygon(p,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++)if((ring[i].y>p.y)!==(ring[j].y>p.y)&&p.x<(ring[j].x-ring[i].x)*(p.y-ring[i].y)/(ring[j].y-ring[i].y)+ring[i].x)inside=!inside;return inside;}
function insertPoint(points,triangles,q){
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
export function reconstructAnatomicalFace(mesh,g,material,{detail=90,corrections={},textureSize=256}={}){
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
 const project=q=>{
  const direction=z.clone().multiplyScalar(Math.cos(q.x)).addScaledVector(x,Math.sin(q.x));
  const origin=center.clone().addScaledVector(y,minY+Math.max(.0001,Math.min(.9999,q.y))*height).addScaledVector(direction,radius*2.5);
  const hit=source.raycast(origin,direction.clone().negate(),radius*5);
  if(hit&&hit.point.clone().sub(center).dot(direction)>radius*.08){hit.barycentric=hit.triangle.triangle.getBarycoord(hit.point,new THREE.Vector3());return hit;}
  const level=minY+Math.max(.0001,Math.min(.9999,q.y))*height,key=level.toFixed(6);
  if(!slices.has(key)){const segments=[];for(const t of source.triangles){const cross=[];for(let k=0;k<3;k++){const a=t.points[k],b=t.points[(k+1)%3],da=a.clone().sub(center).dot(y)-level,db=b.clone().sub(center).dot(y)-level;if(da*db<0)cross.push(a.clone().lerp(b,da/(da-db)));}if(cross.length===2)segments.push(new THREE.Line3(...cross));}slices.set(key,segments);}
  let best=null,distance=Infinity;for(const segment of slices.get(key)){const point=segment.closestPointToPoint(origin,true,new THREE.Vector3()),d=point.distanceToSquared(origin);if(d<distance){best=point;distance=d;}}
  return source.nearest(best??origin.clone().addScaledVector(direction,-radius*2.5));
 };
 const features=[];
 for(const side of ['L','R']){
  const names=[`FACIAL_${side}_EyelidUpperA1`,`FACIAL_${side}_EyelidUpperA3`,`FACIAL_${side}_EyelidLowerA3`,`FACIAL_${side}_EyelidLowerA1`];
  if(names.every(n=>anchors[n]))features.push({name:side+' eye',contour:names.map(n=>parameter(anchors[n])),open:true});
 }
 const mouthNames=['FACIAL_L_LipCorner','FACIAL_C_LipUpper','FACIAL_R_LipCorner','FACIAL_C_LipLower'];
 if(mouthNames.every(n=>anchors[n]))features.push({name:'mouth',contour:mouthNames.map(n=>parameter(anchors[n])),open:false});
 if(features.filter(f=>f.open).length!==2)return {geometry:null,reason:'Measured eye contour anchors required; centre bones alone are insufficient'};
 const outer=[new THREE.Vector2(-Math.PI,0),new THREE.Vector2(Math.PI,0),new THREE.Vector2(Math.PI,1),new THREE.Vector2(-Math.PI,1)];
 const holes=features.map(f=>{const c=f.contour.reduce((a,p)=>a.add(p),new THREE.Vector2()).multiplyScalar(1/f.contour.length);f.center=c;return f.contour.map(p=>p.clone().sub(c).multiplyScalar(1.65).add(c));});
 const template=[...outer,...holes.flat()],triangles=THREE.ShapeUtils.triangulateShape(outer,holes).map(t=>[...t]);
 let holeOffset=outer.length;
 for(let f=0;f<features.length;f++){
  const innerOffset=template.length,feature=features[f];template.push(...feature.contour);
  for(let k=0;k<4;k++){const next=(k+1)%4;triangles.push([holeOffset+k,holeOffset+next,innerOffset+next],[holeOffset+k,innerOffset+next,innerOffset+k]);}
  if(!feature.open){const c=template.length;template.push(feature.center);for(let k=0;k<4;k++)triangles.push([innerOffset+k,innerOffset+(k+1)%4,c]);}
  holeOffset+=4;
 }
 const frontCount=Math.max(9,8+Math.round(detail/6)),gridRows=8+Math.round(detail/15);
 const angles=[-Math.PI,-2.6,-2.1,-1.7,...Array.from({length:frontCount},(_,i)=>-1.45+i*2.9/(frontCount-1)),1.7,2.1,2.6,Math.PI];
 // Limit anatomical density to useful eye/nose/lip levels, not every source rig bone.
 const semanticLevels=['FACIAL_C_NoseTip','FACIAL_C_LipUpper','FACIAL_C_LipLower','FACIAL_L_EyelidUpperA1','FACIAL_L_EyelidLowerA1','FACIAL_L_EyelidUpperFurrow'].filter(n=>anchors[n]).map(n=>parameter(anchors[n]).y);
 const rows=[...new Set([...Array.from({length:gridRows+1},(_,i)=>i/gridRows),...semanticLevels.flatMap(v=>[v-.012,v,v+.012])])].filter(v=>v>=0&&v<=1).sort((a,b)=>a-b);
 for(const row of rows)for(const angle of angles){
  const q=new THREE.Vector2(angle,row);
  if(!holes.some(h=>pointInPolygon(q,h)))insertPoint(template,triangles,q);
 }
 for(const name of ['FACIAL_C_NoseTip','FACIAL_C_LipUpperSkin','FACIAL_C_LipLower','FACIAL_C_Chin','FACIAL_L_EyelidUpperFurrow','FACIAL_R_EyelidUpperFurrow'])if(anchors[name]){
  const q=parameter(anchors[name]);if(!holes.some(h=>pointInPolygon(q,h)))insertPoint(template,triangles,q);
 }
 const constraints=[];let offset=4;for(let f=0;f<holes.length;f++){for(let k=0;k<4;k++)constraints.push([offset+k,offset+(k+1)%4]);offset+=4;}
 offset=4+holes.length*4;for(const f of features){for(let k=0;k<4;k++)constraints.push([offset+k,offset+(k+1)%4]);offset+=4+(f.open?0:1);}
 const triangulation=improveTriangulation(template,triangles,constraints,{scaleY:height/radius});
 const hits=template.map(project);
 for(const name of Object.keys(anchors).filter(n=>/Eyelid(Upper|Lower)A[13]$|NoseTip$|LipCorner$|LipUpper$|LipLower$/.test(n))){const q=parameter(anchors[name]),vertex=template.findIndex(p=>p.distanceToSquared(q)<1e-12);if(vertex>=0)hits[vertex]=source.nearest(anchors[name]);}
 const positions=hits.map(h=>h.point),uvs=template.map(q=>new THREE.Vector2((q.x+Math.PI)/(2*Math.PI),q.y));
 const transferred=transferSurfaceAttributes(g,hits,positions,uvs),geometry=transferred.geometry,indices=[];
 for(let ids of triangles){const p=ids.map(i=>positions[i]),normal=p[1].clone().sub(p[0]).cross(p[2].clone().sub(p[0]));if(normal.lengthSq()<1e-14)continue;const outward=p[0].clone().sub(center);outward.addScaledVector(y,-outward.dot(y));if(normal.dot(outward)<0)ids=[ids[0],ids[2],ids[1]];indices.push(...ids);}
 geometry.setIndex(indices);geometry.computeVertexNormals();
 // Bake against the actual new triangles, not the analytic cylinder. This
 // keeps source eyes/lips aligned when the low-poly surface cuts a curved chord.
 const sample=materialSampler([material]),rgba=new Uint8Array(textureSize*textureSize*4),bins=new Map(),binSize=32;
 for(let t=0;t<indices.length;t+=3){const ids=indices.slice(t,t+3),p=ids.map(i=>uvs[i]),min=new THREE.Vector2(1,1),max=new THREE.Vector2();p.forEach(q=>{min.min(q);max.max(q);});for(let bx=Math.floor(min.x*binSize);bx<=Math.floor(max.x*binSize);bx++)for(let by=Math.floor(min.y*binSize);by<=Math.floor(max.y*binSize);by++){const key=bx+','+by;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(ids);}}
 for(let row=0;row<textureSize;row++)for(let col=0;col<textureSize;col++){
  const uv=new THREE.Vector2((col+.5)/textureSize,(row+.5)/textureSize);let hit=null;
  for(const ids of bins.get(Math.floor(uv.x*binSize)+','+Math.floor(uv.y*binSize))??[]){const [a,b,c]=ids.map(i=>uvs[i]),ab=b.clone().sub(a),ac=c.clone().sub(a),v=uv.clone().sub(a),area=ab.cross(ac);if(Math.abs(area)<1e-12)continue;const weights=[0,v.cross(ac)/area,ab.cross(v)/area];weights[0]=1-weights[1]-weights[2];if(Math.min(...weights)<-1e-7)continue;const point=new THREE.Vector3();ids.forEach((id,k)=>point.addScaledVector(positions[id],weights[k]));let normal=new THREE.Triangle(...ids.map(id=>positions[id])).getNormal(new THREE.Vector3());if(point.clone().sub(center).dot(z)>0&&Math.abs(-Math.PI+uv.x*2*Math.PI)<1.2)normal=z;hit=source.raycast(point.clone().addScaledVector(normal,radius*2.5),normal.clone().negate(),radius*5);if(hit)hit.barycentric=hit.triangle.triangle.getBarycoord(hit.point,new THREE.Vector3());else hit=source.nearest(point);break;}
  // Fill outside apertures as padding; the mesh itself retains the openings.
  if(!hit)hit=project(new THREE.Vector2(-Math.PI+2*Math.PI*uv.x,uv.y));
  rgba.set(sample(hit),(row*textureSize+col)*4);
 }

 const texture=surfaceTexture(rgba,textureSize,textureSize);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=THREE.RepeatWrapping;texture.needsUpdate=true;
 const outputMaterial=material.clone();outputMaterial.name=material.name+'_anatomical';outputMaterial.color.set(0xffffff);outputMaterial.map=texture;outputMaterial.normalMap=null;outputMaterial.alphaMap=null;outputMaterial.specularMap=null;outputMaterial.aoMap=null;outputMaterial.roughnessMap=null;outputMaterial.metalnessMap=null;
 return {geometry,material:outputMaterial,method:'anatomical cylindrical head with explicit eye/mouth support rings',triangles:indices.length/3,generatedVertices:positions.length,featureLoops:features.map(f=>({name:f.name,vertices:4,aperture:f.open})),maximumDiscardedWeight:transferred.maximumDiscardedWeight,sourceUVIndependent:true,triangulation,calibration:'Semantic source measurements; template layout not calibrated to original Namco geometry'};
}
