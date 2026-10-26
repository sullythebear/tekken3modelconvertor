import {reconstructAnatomicalHand} from './hand-reconstruction.js';
import {reconcileCoincidentSkin} from './coincident-skin.js';
import {cloneWorkingGeometry} from './working-geometry.js';
import {removeExactDuplicateFaces} from './duplicate-faces.js';
import {geometryEdges,reconstructionBoundaryCheck} from './mesh-integrity.js';
import {conformAnatomicalSeams} from './seam-conform.js';
import {repairWinding} from './winding.js';
import {prepareSkinFields} from './skin-surface.js';
import {reduceBodySurface} from './body-surface.js';
import {sceneIntegrity,integritySummary} from './mesh-integrity.js';
import {creaseFeatures} from './crease-features.js';
import {shortGarmentTriangles} from './garment-segmentation.js';
import {boneSemantic} from './skeleton.js';
import {rebakeTorso} from './torso-bake.js';
import {reconstructBootEnvelope} from './boot-envelope.js';
import {reconstructHairVolume,reconstructHairCards,simplifyHairSupport} from './hair-volume.js';
import {reconstructAnatomicalFace} from './anatomical-face.js';
import {reconstructUVSurface} from './uv-reconstruction.js';
import {facialLandmarkLocks,facialSurfaceAnchors} from "./landmarks.js";
import {planRegionMaterials} from './region-materials.js';
import {removeOccludedShells} from './occlusion.js';
import {artSettings,artPriority,artRegion,reconstructClusters,shapeRegion,measureArtQuality,geometricBoundaryMask,calibrateRegionBudgets} from './art-director.js';
import {configureSkinning} from "./skinning.js";
import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import {
  mergeVertices,
  deinterleaveGeometry,
} from "three/addons/utils/BufferGeometryUtils.js";
import { MeshoptSimplifier } from "meshoptimizer";
import {
  vertexRegion,
  regionImportance,
  analyzeSkeleton,
  deformationProbe,
} from "./skeleton.js";
import { inspectScene } from "./importer.js";
// Only discard attributes whose standard material consumers are inactive.
// Never touch skinning sets or the imported geometry itself.
export function removeUnusedRenderAttributes(geometry, materials) {
  const removed = [];
  const usedUVs = new Set(["uv"]);
  for (const material of materials)
    for (const value of Object.values(material ?? {}))
      if (value?.isTexture)
        usedUVs.add(value.channel ? `uv${value.channel}` : "uv");
  // Custom shaders may consume any attribute: retain everything for them.
  if (materials.some(m => m?.isShaderMaterial || m?.isRawShaderMaterial)) return removed;
  for (const name of Object.keys(geometry.attributes)) {
    if ((name === "color" && !materials.some(m => m?.vertexColors)) ||
        (/^uv[1-9]\d*$/.test(name) && !usedUVs.has(name))) {
      geometry.deleteAttribute(name);
      removed.push(name);
    }
  }
  return removed;
}
export function allocateBudget(parts, budget, minimums = null) {
  if (!Number.isInteger(budget) || budget < parts.length)
    throw Error(
      `Budget must be at least ${parts.length} for these regions/materials.`,
    );
  const a = minimums ? minimums.slice() : parts.map(() => 1);
  if(a.length!==parts.length||a.some((n,i)=>!Number.isInteger(n)||n<0||n>parts[i].triangles))throw Error('Invalid protected region budget');
  let left = Math.max(0,budget-a.reduce((sum,n)=>sum+n,0));
  while (left > 0) {
    const eligible = parts
      .map((p, i) => ({ i, weight: p.triangles * p.importance }))
      .filter(({ i }) => a[i] < parts[i].triangles);
    if (!eligible.length) break;
    const total = eligible.reduce((s, p) => s + p.weight, 0);
    let assigned = 0;
    for (const e of eligible) {
      const n = Math.min(
        parts[e.i].triangles - a[e.i],
        Math.max(1, Math.floor((left * e.weight) / total)),
      );
      a[e.i] += Math.min(n, left - assigned);
      assigned += Math.min(n, left - assigned);
      if (assigned >= left) break;
    }
    left -= assigned;
  }
  return a;
}
function subsetGeometry(g, indices) {
  const map = new Map(),
    old = [],
    index = [];
  for (const i of indices) {
    if (!map.has(i)) {
      map.set(i, old.length);
      old.push(i);
    }
    index.push(map.get(i));
  }
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(g.attributes)) {
    const data = new attr.array.constructor(old.length * attr.itemSize);
    old.forEach((v, i) => {
      for (let k = 0; k < attr.itemSize; k++)
        data[i * attr.itemSize + k] = attr.array[v * attr.itemSize + k];
    });
    out.setAttribute(
      name,
      new THREE.BufferAttribute(data, attr.itemSize, attr.normalized),
    );
  }
  out.setIndex(index);
  return out;
}
export async function convertCharacter(
  source,
  settings,
  onProgress = () => {},
  signal,
) {
  await MeshoptSimplifier.ready;
  const art = settings.art ? artSettings(settings.art) : null;
  if (source.stats.invalidPositions) throw Error("Non-finite source positions");
  const root = clone(source.root),
    materialCopies = new Map(),
    textureCopies = new Map();
  const anatomicalBones=[];root.traverse(o=>{if(o.isBone)anatomicalBones.push(o);});
  const copyMaterial = (mat) => {
    if (materialCopies.has(mat)) return materialCopies.get(mat);
    const c = mat.clone();
    for (const [k, v] of Object.entries(c))
      if (v?.isTexture) {
        if (!textureCopies.has(v)) textureCopies.set(v, v.clone());
        c[k] = textureCopies.get(v);
      }
    materialCopies.set(mat, c);
    return c;
  };
  root.traverse((m) => {
    if (m.isMesh)
      m.material = Array.isArray(m.material)
        ? m.material.map(copyMaterial)
        : copyMaterial(m.material);
  });
  configureSkinning(root);
  const box = new THREE.Box3().setFromObject(root),
    parts = [],
    warnings = [...source.warnings];
  root.updateMatrixWorld(true);
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    if (mesh.geometry.morphAttributes.position?.length)
      warnings.push(
        `${mesh.name}: morph targets excluded from reduced output.`,
      );
    const original = mesh.geometry;
    const prepared = cloneWorkingGeometry(original);
    deinterleaveGeometry(prepared);
    prepared.morphAttributes = {};
    const removed = removeUnusedRenderAttributes(prepared,
      Array.isArray(mesh.material) ? mesh.material : [mesh.material]);
    if (removed.length) warnings.push(`${mesh.name}: unused reduced-output attributes omitted: ${removed.join(", ")}; source retained.`);
    const position = prepared.attributes.position;
    if (!(position.array instanceof Float32Array) || position.normalized) {
      const values = new Float32Array(position.count * 3);
      for (let v = 0; v < position.count; v++)
        for (let k = 0; k < 3; k++)
          values[v * 3 + k] = position.getComponent(v, k);
      prepared.setAttribute("position", new THREE.BufferAttribute(values, 3));
    }
    const g = mergeVertices(prepared, 1e-6);
    prepared.dispose();
    mesh.geometry = g;
    const idx = g.index.array,
      groups = g.groups.length
        ? g.groups
        : [{ start: 0, count: idx.length, materialIndex: 0 }],
      materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
    for (const group of groups) {
      const regions = new Map(),garmentTriangles=art&&/body/i.test(materials[group.materialIndex]?.name??'')&&['combined','boots'].includes(art.reconstruction??'combined')?shortGarmentTriangles(mesh,g,group,boneSemantic):new Set();
      for (
        let t = group.start;
        t < Math.min(idx.length, group.start + group.count);
        t += 3
      ) {
        const rawVotes=[0,1,2].map(k=>vertexRegion(mesh,idx[t+k],box));
        const anatomicalHead=art&&['face','combined'].includes(art.reconstruction??'combined')&&/head/i.test(materials[group.materialIndex]?.name??'')&&!/hair|faceacc|eye|lash|teeth/i.test(materials[group.materialIndex]?.name??'');
        const anatomicalHair=art&&['hair','combined'].includes(art.reconstruction??'combined')&&/hair|faceacc|strand/i.test(materials[group.materialIndex]?.name??'')&&!rawVotes.some(role=>/^(left|right)Foot$/.test(role));
        const votes = [0,1,2].map(k=>art&&Object.hasOwn(art.meshRoles??{},mesh.name)?'manual:'+art.meshRoles[mesh.name]:anatomicalHair?'hair':anatomicalHead?'head':rawVotes[k]);
        if(art&&/body/i.test(materials[group.materialIndex]?.name??'')&&['boots','combined'].includes(art.reconstruction??'combined'))for(let v=0;v<votes.length;v++)if(/^(left|right)(Foot|UpperLeg)$/.test(votes[v]))votes[v]=votes[v].replace(/Foot|UpperLeg/,'LowerLeg');
        const role = garmentTriangles.has(t)&&votes.some(v=>/^(left|right)(UpperLeg|LowerLeg)$/.test(v))?'hips':
          votes.find((r) => votes.filter((v) => v === r).length >= 2) ??
          votes[0];
        if (!regions.has(role)) regions.set(role, []);
        regions.get(role).push(idx[t], idx[t + 1], idx[t + 2]);
      }
      for (const [role, indices] of regions) {
        const material = materials[group.materialIndex];
        parts.push({
          mesh,
          g,
          material,
          materialIndex: group.materialIndex,
          sourceMaterialIndex:group.materialIndex,
          role,
          indices: new Uint32Array(indices),
          triangles: indices.length / 3,
          importance:
            art ? artPriority(role,material?.name,art)/Math.sqrt(indices.length/3) : regionImportance(role, material?.name) *
            (role === "head" ? settings.headPriority : 1),
        });
      }
    }
  });
  if(art){
    planRegionMaterials(parts);if((art.reconstruction??'combined')==='combined')prepareSkinFields(parts);calibrateRegionBudgets(parts,art.reference);
    const boxes=new Map();
    for(const p of parts){const r=artRegion(p.role,p.material?.name);if(!boxes.has(r))boxes.set(r,new THREE.Box3());for(const i of p.indices)boxes.get(r).expandByPoint(new THREE.Vector3().fromBufferAttribute(p.g.attributes.position,i).applyMatrix4(p.mesh.matrixWorld));}
    for(const p of parts)p.artPivot=boxes.get(artRegion(p.role,p.material?.name)).getCenter(new THREE.Vector3()).applyMatrix4(p.mesh.matrixWorld.clone().invert());
  }
  const garmentInterfaces=new Map();
  if(art)for(const p of parts.filter(p=>p.role==='hips')){const view=new THREE.BufferGeometry();view.setAttribute('position',p.g.attributes.position);view.setIndex(new THREE.BufferAttribute(p.indices,1));const edges=geometryEdges(view).edges,keys=new Set([...edges].filter(([k,v])=>v.length===1).map(([k])=>k));if(!garmentInterfaces.has(p.mesh))garmentInterfaces.set(p.mesh,new Set());for(const key of keys)garmentInterfaces.get(p.mesh).add(key);}
  const budgets = allocateBudget(parts, settings.triangles),
    byMesh = new Map(),
    report = [];
  for (let i = 0; i < parts.length; i++) {
    if (signal?.aborted) throw Error("Conversion cancelled");
    const p = parts[i];
    onProgress({
      step: "Anatomical reduction",
      fraction: i / parts.length,
      detail: `${p.mesh.name} / ${p.role}`,
    });
    let g = subsetGeometry(p.g, p.indices);
    if(p.uvCrop){const uv=g.attributes.uv,c=p.uvCrop;for(let v=0;v<uv.count;v++)uv.setXY(v,(uv.getX(v)-c.minU)/c.spanU,(uv.getY(v)-c.minV)/c.spanV);}
    const
      positions = g.attributes.position.array,
      uv = g.attributes.uv,
      n = g.attributes.normal,
      locks = facialLandmarkLocks(p.mesh, g, p.role==='manual:head'?'Head':p.material?.name);
    const attrs = new Float32Array(g.attributes.position.count * 5);
    for (let v = 0; v < g.attributes.position.count; v++) {
      attrs.set(
        [
          uv?.getX(v) ?? 0,
          uv?.getY(v) ?? 0,
          n?.getX(v) ?? 0,
          n?.getY(v) ?? 0,
          n?.getZ(v) ?? 1,
        ],
        v * 5,
      );
    }
    let indices = new Uint32Array(g.index.array),
      error = 0,
      budgetDiagnostic = null,
      reconstruction = null,
      supplements=[];
    const reconstructFace=(/head|face/i.test(p.material?.name??'')||p.role==='head'&&(/head|face/i.test(p.mesh.name)||art?.faceLandmarkMesh===p.mesh.name))&&!/hair|faceacc|lash|eye|teeth/i.test(p.material?.name??'');
    const reconstructBoots=/body/i.test(p.material?.name??'')&&/lowerleg|foot/i.test(p.role);
    const reconstructHair=p.role==='manual:hair'||!p.role.startsWith('manual:')&&!/^(left|right)Foot$/.test(p.role)&&/hair|faceacc|strand/i.test(p.material?.name??'');
    const reconstructLashes=/lash/i.test(p.material?.name??'')&&art?.face>=80;
    const stage=art?.reconstruction??'combined';
    if (art && stage!=='v060' && (((reconstructFace||reconstructLashes)&&['combined','face'].includes(stage)) || (reconstructBoots&&['combined','boots','dev1'].includes(stage)) || (reconstructHair&&['combined','hair'].includes(stage)))) {
      const anchors=reconstructFace?facialSurfaceAnchors(p.mesh,g):[];
      const headBone=anatomicalBones.find(b=>boneSemantic(b)==='head');
      const hairCenter=headBone?.getWorldPosition(new THREE.Vector3()).applyMatrix4(p.mesh.matrixWorld.clone().invert());
      let projectionGeometry=null;
      if(reconstructBoots&&stage!=='dev1'){
        // Bone-majority partitioning can drop a few cross-weighted boot faces.
        // Reproject against every same-side source surface of this material.
        projectionGeometry=p.g.clone();const full=projectionGeometry.attributes.position,index=projectionGeometry.index.array,bodyCenter=new THREE.Box3().setFromBufferAttribute(full).getCenter(new THREE.Vector3()),partBox=new THREE.Box3().setFromBufferAttribute(g.attributes.position),sign=Math.sign(partBox.getCenter(new THREE.Vector3()).x-bodyCenter.x)||1,sideOnly=partBox.getSize(new THREE.Vector3()).x<new THREE.Box3().setFromBufferAttribute(full).getSize(new THREE.Vector3()).x*.9,selected=[];
        for(const group of projectionGeometry.groups.length?projectionGeometry.groups:[{start:0,count:index.length,materialIndex:0}])if(group.materialIndex===p.sourceMaterialIndex)for(let t=group.start;t<group.start+group.count;t+=3){const ids=[index[t],index[t+1],index[t+2]],x=ids.reduce((n,i)=>n+full.getX(i),0)/3,y=ids.reduce((n,i)=>n+full.getY(i),0)/3;if((!sideOnly||sign*(x-bodyCenter.x)>=0)&&y<=partBox.max.y+.001)selected.push(...ids);}
        projectionGeometry.setIndex(selected);projectionGeometry.clearGroups();
        if(p.uvCrop){const uv=projectionGeometry.attributes.uv,c=p.uvCrop;for(let v=0;v<uv.count;v++)uv.setXY(v,(uv.getX(v)-c.minU)/c.spanU,(uv.getY(v)-c.minV)/c.spanV);}
      }
      const candidate=reconstructFace?reconstructAnatomicalFace(p.mesh,g,p.material,{detail:art.face,referenceRoot:root,corrections:!art.faceLandmarkMesh||art.faceLandmarkMesh===p.mesh.name?art.faceLandmarks??{}:{}}):reconstructLashes?reconstructHairCards(g,p.material,MeshoptSimplifier,{preservation:art.face}):reconstructHair&&art.hairMethod==='cards'?reconstructHairCards(g,p.material,MeshoptSimplifier,{preservation:art.hair}):reconstructHair?reconstructHairVolume(g,p.material,{preservation:art.hair,headCenter:hairCenter,method:art.hairMethod??'auto',eyeHeight:p.mesh.skeleton?.bones.find(b=>b.name==='FACIAL_L_EyelidUpperA')?.getWorldPosition(new THREE.Vector3()).applyMatrix4(p.mesh.matrixWorld.clone().invert()).y}):reconstructBoots&&stage!=='dev1'?reconstructBootEnvelope(g,p.material,{projectionGeometry:projectionGeometry??g,normalMatrix:new THREE.Matrix3().getNormalMatrix(p.mesh.matrixWorld),collarEdges:garmentInterfaces.get(p.mesh)}):reconstructUVSurface(g,{target:Math.max(reconstructHair?600:400,budgets[i]),anchors});
      if(reconstructFace&&candidate.geometry){const validation=reconstructionBoundaryCheck(g,candidate.geometry,candidate.contourPoints??[]);candidate.boundaryValidation=validation;if(!validation.valid){candidate.geometry.dispose();candidate.material?.map?.dispose();candidate.material?.dispose();candidate.geometry=null;candidate.reason=`Measured face reconstruction left ${validation.unexplained} unexplained border edges; reliable source topology retained`;}}
      projectionGeometry?.dispose();
      if(candidate.geometry&&candidate.supplements?.length){
        if(candidate.material)candidate.material.userData.t3csHairSupport=true;
        const support=candidate.geometry,reducedSupport=simplifyHairSupport(support,MeshoptSimplifier);
        support.dispose();candidate.geometry=reducedSupport.geometry;candidate.supportReduction=reducedSupport.report;
      }
      if(candidate.geometry){if(candidate.contourPoints)p.faceContours=candidate.contourPoints;g.dispose();g=candidate.geometry;indices=new Uint32Array(g.index.array);if(candidate.material){const materials=Array.isArray(p.mesh.material)?p.mesh.material:[p.mesh.material];if(parts.some(other=>other!==p&&other.mesh===p.mesh&&other.materialIndex===p.materialIndex)){p.materialIndex=materials.length;materials.push(candidate.material);}else materials[p.materialIndex]=candidate.material;p.mesh.material=materials;p.material=candidate.material;}supplements=candidate.supplements??[];const {geometry,material,supplements:extra,...metadata}=candidate;reconstruction=metadata;}
      else reconstruction={method:'source topology fallback',reason:candidate.reason};
    }
    if(art&&stage==='combined'&&/^(left|right)Hand$/.test(p.role)){
      const hand=p.mesh.skeleton?.bones.find(b=>boneSemantic(b)===p.role),candidate=reconstructAnatomicalHand(g,p.material,{mesh:p.mesh,hand,simplifier:MeshoptSimplifier});
      if(candidate.geometry){g.dispose();g=candidate.geometry;indices=new Uint32Array(g.index.array);const mats=Array.isArray(p.mesh.material)?p.mesh.material:[p.mesh.material];p.materialIndex=mats.length;mats.push(candidate.material);p.mesh.material=mats;p.material=candidate.material;const{geometry,material,...metadata}=candidate;reconstruction=metadata;}
      else reconstruction={method:'source hand fallback',reason:candidate.reason};
    }
    if (art && !reconstruction?.generatedVertices) {
      const fallbackReason=reconstruction?.reason;
      const shells=art.occlusionCleanup&&/body/i.test(p.material?.name)?removeOccludedShells(g,new Uint32Array(g.index.array)):null;
      if(shells?.removed)g.setIndex(new THREE.BufferAttribute(shells.indices,1));
      const protectedMask=geometricBoundaryMask(g);
      const creases=p.role==='hips'&&['combined','boots'].includes(stage)?creaseFeatures(g):null;if(creases){for(let v=0;v<protectedMask.length;v++)protectedMask[v]|=creases.mask[v];p.protectedPoints=creases.points;}
      if(locks&&art.face>=50)for(let v=0;v<protectedMask.length;v++)protectedMask[v]|=locks.mask[v];
      const continuous=/^(head|hips|spine|(?:left|right)(?:Shoulder|UpperArm|LowerArm|Hand|UpperLeg|LowerLeg|Foot))$/.test(p.role)&&stage==='combined'&&!(p.role==='head'&&/eye|iris|sclera|lash|teeth/i.test(p.material?.name??''));
      reconstruction = continuous?reduceBodySurface(g,p.role,MeshoptSimplifier,{target:budgets[i],featureMask:protectedMask}):reconstructClusters(g,budgets[i],{featureMask:protectedMask,art,role:p.role,material:p.material?.name});
      indices = art.corrections[artRegion(p.role,p.material?.name)]?.remove ? new Uint32Array() : reconstruction.indices;
      const {indices:unused,...metadata}=reconstruction;reconstruction=metadata;
      reconstruction.occludedShellTriangles=shells?.removed??0;if(creases)reconstruction.creaseProtection=creases.report;
      if(fallbackReason)reconstruction.fallbackReason=fallbackReason;
      if(!continuous&&indices.length>budgets[i]*3){
        [indices,error]=MeshoptSimplifier.simplifyWithAttributes(indices,positions,3,attrs,5,[12,12,.1,.1,.1],protectedMask,budgets[i]*3,settings.error,['Permissive','RegularizeLight']);
        reconstruction.finish='attribute-aware topology optimization after reconstruction';
      }
    } else if (!art && p.triangles > budgets[i]) {
      [indices, error] = MeshoptSimplifier.simplifyWithAttributes(
        indices,
        positions,
        3,
        attrs,
        5,
        [0.4, 0.4, 0.1, 0.1, 0.1],
        locks?.mask ?? null,
        budgets[i] * 3,
        settings.error,
        ["LockBorder"],
      );
      if (indices.length > budgets[i] * 3) {
        const [relaxed] = MeshoptSimplifier.simplifyWithAttributes(
          new Uint32Array(g.index.array), positions, 3, attrs, 5,
          [0.4, 0.4, 0.1, 0.1, 0.1], locks?.mask ?? null,
          budgets[i] * 3, 1, ["LockBorder"],
        );
        budgetDiagnostic = {
          // Measurement only: this potentially distorted mesh is never used.
          trianglesAtRelaxedError: relaxed.length / 3,
          relaxedErrorLimit: 1,
          constrainedBy: relaxed.length > budgets[i] * 3
            ? "protected topology/landmarks; error may also contribute"
            : "configured appearance error",
        };
      }
    }
    if(art?.corrections[artRegion(p.role,p.material?.name)]?.remove)indices=new Uint32Array();
    let reduced = subsetGeometry(g, indices);
    if(art && reduced.attributes.position.count)reconstruction.shaping=shapeRegion(reduced,art,p.role,p.material?.name,p.artPivot,stage==='combined'&&/^(hips|spine|(?:left|right)(?:Shoulder|UpperArm|LowerArm|Hand|UpperLeg|LowerLeg|Foot))$/.test(p.role));
    if(art?.flat){const flat=reduced.toNonIndexed();reduced.dispose();reduced=flat;reduced.computeVertexNormals();}
    if(art&&['combined','boots'].includes(stage)&&/^(spine|hips)$/.test(p.role)&&/body/i.test(p.material?.name)&&reduced.attributes.position.count){
      const rebaked=rebakeTorso(g,reduced,p.material);if(rebaked){reduced.dispose();reduced=rebaked.geometry;const mats=Array.isArray(p.mesh.material)?p.mesh.material:[p.mesh.material];p.materialIndex=mats.length;mats.push(rebaked.material);p.mesh.material=mats;p.material=rebaked.material;reconstruction.torsoBake={method:rebaked.method,width:rebaked.textureWidth,height:rebaked.textureHeight};}
    }
    if(!reduced.index)reduced.setIndex(Array.from({length:reduced.attributes.position.count},(_,i)=>i));
    g.dispose();
    if (!reduced.attributes.normal) reduced.computeVertexNormals();
    if (!byMesh.has(p.mesh)) byMesh.set(p.mesh, []);
    byMesh.get(p.mesh).push({ ...p, geometry: reduced, error });
    for(const supplement of supplements){
      const input=new Uint32Array(supplement.geometry.index.array),uv=supplement.geometry.attributes.uv,target=Math.round(100+art.hair*2.5);
      const [index,error]=input.length>target*3?MeshoptSimplifier.simplifyWithAttributes(input,supplement.geometry.attributes.position.array,3,uv.array,2,[4,4],null,target*3,.007,['RegularizeLight']):[input,0];
      const compact=subsetGeometry(supplement.geometry,index);supplement.geometry.dispose();supplement.geometry=compact;supplement.reduction={before:input.length/3,after:index.length/3,error};
      if(art.flat){const flat=compact.toNonIndexed();flat.computeVertexNormals();flat.setIndex(Array.from({length:flat.attributes.position.count},(_,i)=>i));compact.dispose();supplement.geometry=flat;}
      const mats=Array.isArray(p.mesh.material)?p.mesh.material:[p.mesh.material],slot=mats.length;mats.push(supplement.material);p.mesh.material=mats;byMesh.get(p.mesh).push({...p,role:supplement.role,material:supplement.material,materialIndex:slot,geometry:supplement.geometry,error:0});report.push({mesh:p.mesh.name,region:supplement.role,material:supplement.material.name,before:supplement.geometry.index.count/3,target:0,after:supplement.geometry.index.count/3,reconstruction:{method:'Source alpha cards over inset support volume, bounded UV-aware reduction',sharesSourceRegion:true,reduction:supplement.reduction}});}

    report.push({
      mesh: p.mesh.name,
      region: p.role,
      material: p.material?.name ?? "",
      protectedLandmarks: locks?.landmarks ?? [],
      lockedVertices: locks?.lockedVertices ?? 0,
      before: p.triangles,
      target: budgets[i],
      after: indices.length / 3,
      error,
      budgetDiagnostic,
      reconstruction,
    });
    await new Promise((r) => setTimeout(r, 0));
  }
  for (const [mesh, regions] of byMesh) {
    const combined = new THREE.BufferGeometry(),
      names = Object.keys(regions[0].geometry.attributes),
      length = regions.reduce(
        (s, p) => s + p.geometry.attributes.position.count,
        0,
      );
    for (const name of names) {
      const attr = regions[0].geometry.attributes[name],
        data = new attr.array.constructor(length * attr.itemSize);
      let off = 0;
      for (const p of regions) {
        const a = p.geometry.attributes[name];
        data.set(a.array, off);
        off += a.array.length;
      }
      combined.setAttribute(
        name,
        new THREE.BufferAttribute(data, attr.itemSize, attr.normalized),
      );
    }
    const indices = [];
    let offset = 0;
    const metadata = [];
    for (const p of regions) {
      const start = indices.length;
      for (const i of p.geometry.index.array) indices.push(i + offset);
      combined.addGroup(start, indices.length - start, p.materialIndex);
      metadata.push({ start, count: indices.length - start, role: p.role, ...(p.faceContours?{faceContours:p.faceContours}:{}),...(p.protectedPoints?{protectedPoints:p.protectedPoints}:{}) });
      offset += p.geometry.attributes.position.count;
      p.geometry.dispose();
    }
    combined.setIndex(indices);
    mesh.geometry.dispose();
    mesh.geometry = combined;
    // New regional materials may replace an old slot. Only live group slots
    // belong in the atlas; stale slots previously consumed four extra tiles.
    const materialList=Array.isArray(mesh.material)?mesh.material:[mesh.material],live=[];
    for(const group of combined.groups){if(!group.count){group.materialIndex=0;continue;}const material=materialList[group.materialIndex]??(materialList.length===1?materialList[0]:null);if(!material)throw Error('Invalid reconstructed material slot');let index=live.indexOf(material);if(index<0){index=live.length;live.push(material);}group.materialIndex=index;}
    if(live.length)mesh.material=live;
    mesh.userData.studioRegions = metadata;
  }
  const duplicateCleanup=[];if(art)root.traverse(m=>{if(m.isMesh)duplicateCleanup.push({mesh:m.name,...removeExactDuplicateFaces(m)});});
  const coincidentSkin=art?reconcileCoincidentSkin(root):null;
  const seamRepair=art?conformAnatomicalSeams(root):null;
  const windingRepairs=[];if(art)root.traverse(m=>{if(m.isMesh)windingRepairs.push({mesh:m.name,...repairWinding(m.geometry)});});
  // Conformity may split original region triangles. Report the actual final
  // allocation rather than stale counts from before seam repair.
  const finalAllocations=new Map();root.traverse(m=>{if(!m.isMesh)return;const mats=Array.isArray(m.material)?m.material:[m.material];for(const group of m.geometry.groups){const role=m.userData.studioRegions?.find(r=>r.start===group.start)?.role,key=m.name+'|'+role+'|'+mats[group.materialIndex]?.name;finalAllocations.set(key,(finalAllocations.get(key)??0)+group.count/3);}});
  for(const r of report){const count=finalAllocations.get(r.mesh+'|'+r.region+'|'+r.material);if(count!==undefined&&count!==r.after){r.beforeSeamRepair=r.after;r.postRepairTrianglesAdded=count-r.after;r.after=count;}}
  configureSkinning(root);
  const stats = inspectScene(root);
  if (stats.triangles > settings.triangles)
    warnings.push(
      `Appearance error / protected topology prevent the requested budget: ${stats.triangles} > ${settings.triangles}. See per-region budget diagnostics. Export will enforce limits.`,
    );
  warnings.push(
    "This preparation pass preserves source skinning. It does not establish donor bind-pose or in-game animation compatibility.",
  );
  const skeleton = analyzeSkeleton(root),
    poses = deformationProbe(root, skeleton,()=>{},{extended:true});
  const result = {
    root,
    stats,
    warnings,
    report,
    skeleton,
    poses,
    settings: { ...settings },
    gameVerified: false,
  };
  if(art){result.quality=measureArtQuality(source,result);result.quality.coincidentSkin=coincidentSkin;result.quality.duplicateCleanup=duplicateCleanup;result.quality.windingRepairs=windingRepairs;result.quality.seamRepair=seamRepair;result.quality.integrity=integritySummary(sceneIntegrity(root,source.root));if(result.quality.integrity.unexpectedEdges)warnings.push(`${result.quality.integrity.unexpectedEdges} open boundary edges differ from source borders / measured eye apertures. Inspect boundary diagnostics; geometric and artistic acceptance remain pending.`);}
  return result;
}
