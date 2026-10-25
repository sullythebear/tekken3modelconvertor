import {copySkinField} from './skin-surface.js';
import * as THREE from 'three';
const textureCache = new WeakMap();
export function skinSets(geometry) {
  const a = geometry.attributes, sets = [];
  if (a.skinIndex || a.skinWeight) sets.push([a.skinIndex, a.skinWeight]);
  const keys = Object.keys(a).filter(k => /^(joints|weights)_\d+$/.test(k));
  const max = Math.max(0, ...keys.map(k => Number(k.split('_')[1])));
  if (max > 255) throw Error('More than 256 joint sets are not supported');
  for (let i = 1; i <= max; i++) sets.push([a[`joints_${i}`], a[`weights_${i}`]]);
  for (const pair of sets)
    if (pair.some(v => !v || v.itemSize !== 4 || v.count !== a.position.count))
      throw Error('Incomplete or mismatched source skin influence sets');
  return sets;
}
export function forEachInfluence(mesh, index, callback) {
  for (const [joints, weights] of skinSets(mesh.geometry)) for (let k = 0; k < 4; k++) {
    const w = weights.getComponent(index, k);
    if (w !== 0) callback(joints.getComponent(index, k), w);
  }
}
function fullBoneTransform(index, target) {
  const base = new THREE.Vector4(target.x, target.y, target.z, target.isVector4 ? target.w : 1).applyMatrix4(this.bindMatrix);
  const out = new THREE.Vector4(0, 0, 0, 0), matrix = new THREE.Matrix4();
  forEachInfluence(this, index, (bone, weight) => {
    matrix.multiplyMatrices(this.skeleton.bones[bone].matrixWorld, this.skeleton.boneInverses[bone]);
    out.addScaledVector(base.clone().applyMatrix4(matrix), weight);
  });
  out.applyMatrix4(this.bindMatrixInverse);
  target.set(out.x, out.y, out.z);
  if (target.isVector4) target.w = out.w;
  return target;
}
function influenceTexture(geometry) {
  if (textureCache.has(geometry)) return textureCache.get(geometry);
  const sets = skinSets(geometry), total = geometry.attributes.position.count * sets.length * 2;
  const width = Math.min(2048, Math.max(1, total)), height = Math.max(1, Math.ceil(total / width));
  const data = new Float32Array(width * height * 4);
  let offset = 0;
  for (let v = 0; v < geometry.attributes.position.count; v++) for (const pair of sets)
    for (const attr of pair) for (let k = 0; k < 4; k++) data[offset++] = attr.getComponent(v, k);
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
  texture.needsUpdate = true;
  const result = {texture, count: sets.length, width, height};
  textureCache.set(geometry, result);
  geometry.addEventListener('dispose', () => { texture.dispose(); textureCache.delete(geometry); });
  return result;
}
const GLSL = `
#ifdef USE_SKINNING
uniform highp sampler2D t3csInfluences;
uniform int t3csSetCount;
vec4 t3csFetch(int index) {
  int width = textureSize(t3csInfluences, 0).x;
  return texelFetch(t3csInfluences, ivec2(index % width, index / width), 0);
}
mat4 t3csSkinMatrix() {
  mat4 result = mat4(0.0);
  for(int s = 0; s < t3csSetCount; s++) {
    int index = (gl_VertexID * t3csSetCount + s) * 2;
    vec4 joints = t3csFetch(index), weights = t3csFetch(index + 1);
    for(int k = 0; k < 4; k++) if(weights[k] > 0.0) result += getBoneMatrix(joints[k]) * weights[k];
  }
  return bindMatrixInverse * result * bindMatrix;
}
#endif
`;
function extendMaterial(material, mesh) {
  // Per-mesh uniforms avoid leaking another skeleton's influence texture through shared materials.
  const copy = material.clone();
  copySkinField(material, copy);
  copy.onBeforeCompile = shader => {
    const info = influenceTexture(mesh.geometry);
    shader.uniforms.t3csInfluences = {value: info.texture};
    shader.uniforms.t3csSetCount = {value: info.count};
    shader.vertexShader = shader.vertexShader
      .replace('#include <skinning_pars_vertex>', '#include <skinning_pars_vertex>\n' + GLSL)
      .replace('#include <skinning_vertex>', '#ifdef USE_SKINNING\n transformed = (t3csSkinMatrix() * vec4(transformed, 1.0)).xyz;\n#endif')
      .replace('#include <skinnormal_vertex>', `#ifdef USE_SKINNING
        mat4 t3csNormal = t3csSkinMatrix();
        objectNormal = (t3csNormal * vec4(objectNormal, 0.0)).xyz;
        #ifdef USE_TANGENT
          objectTangent = (t3csNormal * vec4(objectTangent, 0.0)).xyz;
        #endif
      #endif`);
  };
  copy.t3csExtendedMaterial = true;
  if (material.t3csExtendedMaterial) material.dispose();
  copy.customProgramCacheKey = () => 't3cs-all-joint-sets-v1';
  return copy;
}
export function configureSkinning(root, {normalize = false} = {}) {
  let maxInfluences = 0, extendedMeshes = 0;
  root.traverse(mesh => {
    if (!mesh.isSkinnedMesh) return;
    const sets = skinSets(mesh.geometry);
    if (!sets.length) throw Error('Skinned mesh has no skin influence attributes');
    const arrays = normalize ? sets.map(() => new Float32Array(mesh.geometry.attributes.position.count * 4)) : null;
    for (let v = 0; v < mesh.geometry.attributes.position.count; v++) {
      let total = 0, count = 0;
      for (const [joints, weights] of sets) for (let k = 0; k < 4; k++) {
        const w = weights.getComponent(v, k), joint = joints.getComponent(v, k);
        if (!Number.isFinite(w) || w < 0 || !Number.isInteger(joint) || joint < 0 || joint >= mesh.skeleton.bones.length)
          throw Error('Invalid skin weight or skeleton bone index');
        total += w; if (w > 0) count++;
      }
      if (!(total > 0)) throw Error('Vertex has no positive skin influence');
      if (!normalize && Math.abs(total - 1) > .02) throw Error('Source skin weights must sum to one across all joint sets');
      maxInfluences = Math.max(maxInfluences, count);
      if (normalize) sets.forEach(([, weights], s) => {
        for (let k = 0; k < 4; k++) arrays[s][v * 4 + k] = weights.getComponent(v, k) / total;
      });
    }
    if (normalize) sets.forEach((_, s) => mesh.geometry.setAttribute(s ? `weights_${s}` : 'skinWeight', new THREE.BufferAttribute(arrays[s], 4)));
    if (sets.length > 1) {
      extendedMeshes++;
      mesh.frustumCulled = false;
      mesh.applyBoneTransform = fullBoneTransform;
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(m => extendMaterial(m, mesh)) : extendMaterial(mesh.material, mesh);
      mesh.onBeforeRender = renderer => {
        const info = influenceTexture(mesh.geometry), limit = renderer.capabilities.maxTextureSize;
        if (info.width > limit || info.height > limit) throw Error('Skin influence texture exceeds GPU texture limits');
      };
    }
  });
  return {maxInfluences, extendedMeshes};
}
