import * as THREE from 'three';
import {collectMaterials} from './importer.js';
import {requireBakeUV,bakeUVAttribute} from './bake-uv.js';
import {materialSampler} from './surface.js';
// Compare each original primitive against its own atlas coordinates. No ray
// occlusion or unrelated nearest surface can assign a different source material.
export function diagnoseBakeCorrespondence(root, atlas, {sampler=null,maxSamplesPerGroup=4096}={}) {
 if(!Number.isInteger(maxSamplesPerGroup)||maxSamplesPerGroup<4||maxSamplesPerGroup>65536)throw Error('Invalid bake diagnostic sample bound');
 const meshes=r=>{const a=[];r.traverse(n=>{if(n.isMesh)a.push(n);});return a;},source=meshes(root),baked=meshes(atlas.root),materials=[...collectMaterials(root)];
 if(source.length!==baked.length)throw Error('Atlas mesh correspondence changed');
 const sample=sampler??materialSampler(materials),rows=new Map(),weights=[[1/3,1/3,1/3],[.6,.2,.2],[.2,.6,.2],[.2,.2,.6]],examples=[];
 const width=atlas.canvas?.width??atlas.width,height=atlas.canvas?.height??atlas.height;
 if(!Number.isInteger(width)||!Number.isInteger(height)||atlas.rgba?.length!==width*height*4)throw Error('Invalid atlas pixel correspondence');
 for(let mi=0;mi<source.length;mi++){
  const mesh=source[mi],g=mesh.geometry,out=baked[mi].geometry,index=g.index,count=index?.count??g.attributes.position.count,uv=out.attributes.uv,list=Array.isArray(mesh.material)?mesh.material:[mesh.material];
  if(out.index||out.attributes.position.count!==count||uv?.count!==count)throw Error('Atlas triangle correspondence changed');
  const groups=g.groups.length?g.groups:[{start:0,count,materialIndex:0}];
  for(let gi=0;gi<groups.length;gi++){
   const group=groups[gi],material=list[group.materialIndex],mid=materials.indexOf(material),srcUV=requireBakeUV(g,material),role=mesh.userData.studioRegions?.find(r=>r.start===group.start)?.role??'unclassified',key=[mi,gi,mid,role].join(':');
   if(!material||mid<0||group.start+group.count>count)throw Error('Invalid primitive bake correspondence');
   const row={meshIndex:mi,mesh:mesh.name,primitive:gi,sourceMaterialIndex:mid,material:material.name,region:role,uvSet:bakeUVAttribute(material),shader:material.type,sourceSide:material.side,alphaMode:material.transparent?'blend':material.alphaTest>0?'mask':'opaque',sourceOpacity:material.opacity??1,texture:material.map?{width:material.map.image?.width??null,height:material.map.image?.height??null,channel:material.map.channel??0,colorSpace:material.map.colorSpace}:null,atlasTile:null,normalShading:!!material.normalMap,triangles:group.count/3,samples:0,meanAbsoluteRGBByteError:0,maxRGBByteError:0,unexpectedBlack:0,unexpectedWhite:0,alphaMismatch:0};rows.set(key,row);
   const stride=Math.max(1,Math.ceil(group.count/3*4/maxSamplesPerGroup));
   for(let ti=0;ti<group.count/3;ti+=stride){
    const start=group.start+ti*3,ids=[0,1,2].map(k=>index?index.getX(start+k):start+k),triangle={material,uvs:srcUV?ids.map(i=>new THREE.Vector2().fromBufferAttribute(srcUV,i)):null};
    for(let wi=0;wi<weights.length;wi++){
     const w=weights[wi],expected=sample({triangle,barycentric:new THREE.Vector3(...w)});let u=0,v=0;for(let k=0;k<3;k++){u+=w[k]*uv.getX(start+k);v+=w[k]*uv.getY(start+k);}if(!Number.isFinite(u)||!Number.isFinite(v))throw Error('Nonfinite atlas diagnostic coordinate');
     const x=Math.max(0,Math.min(width-1,Math.floor(u*width))),y=Math.max(0,Math.min(height-1,Math.floor((1-v)*height))),p=(y*width+x)*4,actual=atlas.rgba.subarray(p,p+4),opaque=expected[3]>0&&actual[3]>0;
     if(row.samples===0&&atlas.tiles){const tileIndex=atlas.tiles.findIndex(t=>x>=t.x&&x<t.x+t.width&&y>=t.y&&y<t.y+t.height),t=atlas.tiles[tileIndex];if(t)row.atlasTile={index:tileIndex,x:t.x,y:t.y,width:t.width,height:t.height,region:t.region??null,cropped:!!t.cropped,sourceUVOrigin:t.sourceUVOrigin,sourceUVSpan:t.sourceUVSpan};}
     const delta=opaque?expected.slice(0,3).reduce((sum,c,i)=>sum+Math.abs(c-actual[i]),0)/3:0;
     const black=opaque&&Math.max(...expected.slice(0,3))>64&&Math.max(...actual.slice(0,3))<12,white=opaque&&Math.max(...expected.slice(0,3))<200&&Math.min(...actual.slice(0,3))>240;
     row.samples++;row.meanAbsoluteRGBByteError+=delta;row.maxRGBByteError=Math.max(row.maxRGBByteError,delta);row.unexpectedBlack+=black;row.unexpectedWhite+=white;row.alphaMismatch+=(expected[3]>0)!==(actual[3]>0);
     if((black||white||delta>48||(expected[3]>0)!==(actual[3]>0))&&examples.filter(e=>e.meshIndex===mi&&e.primitive===gi).length<8)examples.push({meshIndex:mi,primitive:gi,sourceMaterialIndex:mid,triangle:ti,sample:wi,sourceRGB:expected.slice(0,3).map(Math.round),atlasRGB:Array.from(actual.slice(0,3)),sourceOpaque:expected[3]>0,atlasOpaque:actual[3]>0,meanRGBByteError:delta});
    }
   }
   row.meanAbsoluteRGBByteError/=Math.max(1,row.samples);
  }
 }
 return{status:'CHECKED',scope:'Primitive/UV correspondence albedo versus quantized atlas; normal shading, sampling and palette loss may contribute. Flags locate errors; no artistic approval.',groups:[...rows.values()],examples};
}
