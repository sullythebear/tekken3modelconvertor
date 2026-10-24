import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {facialLandmarkLocks} from '../src/core/landmarks.js';
test('Facial anchors protect nearby source vertices and their neighbourhood without locking unrelated hair or moving geometry',()=>{
 const root=new THREE.Group(),head=new THREE.Bone(),nose=new THREE.Bone();head.name='head';nose.name='FACIAL_C_NoseTip';nose.position.z=.1;head.add(nose);root.add(head);
 const g=new THREE.PlaneGeometry(2,2,10,10),m=new THREE.SkinnedMesh(g,new THREE.MeshBasicMaterial());
 g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(new Uint16Array(g.attributes.position.count*4),4));
 const weights=new Float32Array(g.attributes.position.count*4);for(let i=0;i<weights.length;i+=4)weights[i]=1;
 g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));root.add(m);root.updateMatrixWorld(true);m.bind(new THREE.Skeleton([head,nose]));
 const before=g.attributes.position.array.slice(),locks=facialLandmarkLocks(m,g,'FaceSkin');
 assert.deepEqual(locks.landmarks,['FACIAL_C_NoseTip']);assert.ok(locks.lockedVertices>=3&&locks.lockedVertices<g.attributes.position.count/2);
 assert.deepEqual(g.attributes.position.array,before);assert.equal(facialLandmarkLocks(m,g,'FaceAcc_Hair'),null);
});
