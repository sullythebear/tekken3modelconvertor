import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {auditGeometry} from '../src/core/ttt2/geometry-audit.js';
import {sourceDiagnosticScene} from '../src/core/ttt2/source-diagnosis.js';
function geometry(points,indices){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points,3));g.setIndex(indices);return g;}
test('Geometry audit distinguishes UV-seam vertices from genuinely separate components without welding',()=>{
 const g=geometry([0,0,0,1,0,0,0,1,0,1,0,0,1,1,0,0,1,0,99,99,99],[0,1,2,3,4,5]);const before=g.attributes.position.array.slice(),r=auditGeometry(g);
 assert.equal(r.indexTopology.boundary,6);assert.equal(r.exactPositionTopology.boundary,4);assert.equal(r.indexComponents,2);assert.equal(r.unusedVertices,1);assert.deepEqual(g.attributes.position.array,before);assert.equal(r.exactPositionTopology.sameDirection,0);
});
test('Geometry audit detects same-direction shared edges and disconnected misplaced components',()=>{
 const g=geometry([0,0,0,1,0,0,0,1,0,1,1,0,10,0,0,11,0,0,10,1,0],[0,1,2,1,2,3,4,5,6]);const r=auditGeometry(g);assert.equal(r.indexTopology.sameDirection,1);assert.equal(r.indexComponents,2);assert.equal(r.largestComponents[1].min[0],10);
});
test('Diffuse isolation preserves native blend/depth state instead of introducing opaque occlusion',()=>{
 const root=new THREE.Group(),m=new THREE.MeshStandardMaterial({transparent:true,depthWrite:false,blending:THREE.CustomBlending,blendSrc:THREE.OneFactor,blendDst:THREE.OneFactor});root.add(new THREE.Mesh(new THREE.BoxGeometry(),m));const d=sourceDiagnosticScene(root,'diffuse');assert.equal(d.root.children[0].material.blendSrc,THREE.OneFactor);assert.equal(d.root.children[0].material.blendDst,THREE.OneFactor);assert.equal(d.root.children[0].material.depthWrite,false);d.dispose();assert.equal(m.depthWrite,false);
});
test('No-frustum isolation leaves source and geometry unchanged',()=>{const root=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial());root.add(mesh);const d=sourceDiagnosticScene(root,'no-frustum');assert.equal(d.root.children[0].frustumCulled,false);assert.equal(mesh.frustumCulled,true);assert.equal(d.root.children[0].geometry,mesh.geometry);d.dispose();});
