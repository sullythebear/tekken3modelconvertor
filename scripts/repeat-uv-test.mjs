// Authored textures/rig only. Compare actual quantized atlas pixels and posed vertices.
import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import {browserSession} from './browser.mjs';
const out='artifacts/multi-character/repeat-uv';await mkdir(out,{recursive:true});const session=await browserSession();try{
 const results=await session.page.evaluate(async()=>{const t=window.studioTest,T=t.THREE,results=[];
 for(const kind of ['repeat','mirror','clamp','transformed','manual-matrix','nonindexed-repeat']){
  const c=document.createElement('canvas');c.width=c.height=4;const ctx=c.getContext('2d'),colours=[[255,0,0],[0,255,0],[0,0,255],[255,255,0]];
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){ctx.fillStyle=`rgb(${colours[(x+y)%4]})`;ctx.fillRect(x,y,1,1);}
  const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.flipY=false;map.magFilter=map.minFilter=T.NearestFilter;map.wrapS=map.wrapT=kind==='clamp'?T.ClampToEdgeWrapping:kind==='mirror'?T.MirroredRepeatWrapping:T.RepeatWrapping;
  if(kind==='transformed'){map.repeat.set(1.3,.7);map.offset.set(.2,-.3);map.rotation=.37;}
  if(kind==='manual-matrix'){map.matrixAutoUpdate=false;map.matrix.set(1.1,.2,.3,-.1,.8,-.2,0,0,1);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));if(kind!=='nonindexed-repeat')g.setIndex([0,1,2]);g.setAttribute('uv',new T.Float32BufferAttribute([-1.2,-.7,2.3,-.1,.4,2.2],2));g.setAttribute('skinIndex',new T.Uint16BufferAttribute([0,1,0,0,0,1,0,0,0,1,0,0],4));g.setAttribute('skinWeight',new T.Float32BufferAttribute([1,0,0,0,.5,.5,0,0,0,1,0,0],4));g.computeVertexNormals();
  const m=new T.MeshBasicMaterial({map}),mesh=new T.SkinnedMesh(g,m),a=new T.Bone(),b=new T.Bone();a.add(b);mesh.add(a);mesh.bind(new T.Skeleton([a,b]));const root=new T.Group();root.add(mesh);root.updateMatrixWorld(true);
  const before=Array.from(g.attributes.uv.array),baked=await t.bakeAtlas({root},{size:256});let prepared;baked.root.traverse(n=>{if(n.isSkinnedMesh)prepared=n;});const tile=baked.tiles[0],origin=tile.sourceUVOrigin,span=tile.sourceUVSpan;let checked=0,maxError=0;
  // Sample the actual atlas texel centres, avoiding discontinuity/filter boundaries.
  for(let y=3;y<tile.height-3;y+=7)for(let x=3;x<tile.width-3;x+=7){const u=(x-2)/(tile.width-5),v=1-(y-2)/(tile.height-5),q=new T.Vector2(origin[0]+u*span[0],origin[1]+v*span[1]);if(map.matrixAutoUpdate)map.updateMatrix();map.transformUv(q);if([q.x,q.y].some(z=>z>0&&z<1&&(z*4%1<.12||z*4%1>.88)))continue;const expected=colours[(Math.min(3,Math.floor(q.x*4))+Math.min(3,Math.floor(q.y*4)))%4],i=((tile.y+y)*256+tile.x+x)*4;for(let k=0;k<3;k++)maxError=Math.max(maxError,Math.abs(baked.rgba[i+k]-expected[k]));checked++;}
  if(JSON.stringify(before)!==JSON.stringify(Array.from(g.attributes.uv.array)))throw Error('Source UV changed');
  mesh.skeleton.bones[1].rotation.z=.7;prepared.skeleton.bones[1].rotation.z=.7;root.updateMatrixWorld(true);baked.root.updateMatrixWorld(true);let poseError=0;
  for(let i=0;i<3;i++){const p=mesh.getVertexPosition(i,new T.Vector3()),q=prepared.getVertexPosition(i,new T.Vector3());poseError=Math.max(poseError,p.distanceTo(q));}
  results.push({kind,checked,maxError,poseError,triangles:prepared.geometry.attributes.position.count/3,span});
 }
 return results;});
 for(const r of results){assert.ok(r.checked>100);assert.ok(r.maxError<=8,JSON.stringify(r));assert.ok(r.poseError<1e-6,JSON.stringify(r));assert.equal(r.triangles,1);}
 assert.deepEqual(session.errors,[]);await writeFile(out+'/results.json',JSON.stringify({status:'PASS',scope:'Authored repeat/mirror/clamp/transform fixtures; real quantized atlas, varying-weight posed rig',results},null,2));console.log(JSON.stringify(results));
}finally{await session.close();}
