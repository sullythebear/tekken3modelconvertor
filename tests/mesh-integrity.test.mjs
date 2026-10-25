import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {geometryEdges,compareBoundaries,sceneIntegrity} from '../src/core/mesh-integrity.js';
import {artTextureColors} from '../src/core/art-atlas.js';
import {reduceBodySurface} from '../src/core/body-surface.js';
import {MeshoptSimplifier} from 'meshoptimizer';
function quad(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,1,0,0,1,1,0,0,1,0],3));g.setIndex([0,1,2,0,2,3]);return g;}
test('Geometry audit distinguishes original open borders from a deleted face',()=>{const a=quad(),b=a.clone();b.setIndex([0,1,2]);assert.equal(geometryEdges(a).boundaries.length,4);assert.equal(compareBoundaries(a,a).unexpectedOpenEdges,0);assert.equal(compareBoundaries(a,b).unexpectedOpenEdges,1);});
test('Winding audit catches an oppositely connected interior edge',()=>{const a=quad();a.setIndex([0,1,2,0,3,2]);assert.equal(geometryEdges(a).inconsistent,1);});
test('Geometric seams are welded for diagnosis without welding UV or skin attributes',()=>{const a=quad().toNonIndexed();assert.equal(geometryEdges(a).boundaries.length,4);assert.equal(a.attributes.position.count,6);});
test('Whole scene audit finds the same gap across separate reconstruction meshes',()=>{const source=new THREE.Group(),out=new THREE.Group(),g=quad();source.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial()));const a=g.clone(),b=g.clone();a.setIndex([0,1,2]);b.setIndex([0,2,3]);out.add(new THREE.Mesh(a,new THREE.MeshBasicMaterial()),new THREE.Mesh(b,new THREE.MeshBasicMaterial()));assert.equal(sceneIntegrity(out,source).unexpectedEdges,0);b.attributes.position.setZ(0,.1);assert.ok(sceneIntegrity(out,source).unexpectedEdges>0);});
test('Alpha-card borders are contextual intentional openings, not silently repaired',()=>{const root=new THREE.Group();root.add(new THREE.Mesh(quad(),new THREE.MeshBasicMaterial({name:'Hair_cards',alphaTest:.2})));const r=sceneIntegrity(root);assert.equal(r.unexpectedEdges,0);assert.equal(r.intentionalSegments.length,4);});
test('Semantic skin tile retains a real 256-entry palette without changing face policy',()=>{assert.equal(artTextureColors('arbitrary',{face:90},{userData:{t3csSkinSurface:true}}),256);assert.equal(artTextureColors('Head',{face:90}),256);assert.equal(artTextureColors('Clothing',{face:90}),16);});
test('Hand reduction retains reliable source borders and reports bounded source-topology method',async()=>{await MeshoptSimplifier.ready;const g=new THREE.SphereGeometry(1,24,16);const r=reduceBodySurface(g,'leftHand',MeshoptSimplifier,{target:180});assert.equal(r.integrity.unexpectedOpenEdges,0);assert.ok(r.indices.length>0);assert.match(r.method,/Source-anatomical hand/);});

test('Transparent skin material does not hide a newly deleted skin face from the audit',()=>{const source=new THREE.Group(),out=new THREE.Group(),g=quad();source.add(new THREE.Mesh(g,new THREE.MeshBasicMaterial()));const b=g.clone();b.setIndex([0,1,2]);const m=new THREE.Mesh(b,new THREE.MeshBasicMaterial({transparent:true,alphaTest:.5}));m.userData.studioRegions=[{start:0,count:3,role:'leftUpperArm'}];out.add(m);assert.equal(sceneIntegrity(out,source).unexpectedEdges,1);});
