import {forEachInfluence, skinSets} from "./skinning.js";
import * as THREE from "three";
// Semantic names are distinct from Namco row numbers. Additional donor profiles can share them.
export const ROWS = {
  hips: 3,
  spine: 1,
  head: 19,
  leftShoulder: 11,
  leftUpperArm: 12,
  leftLowerArm: 13,
  leftHand: 14,
  rightShoulder: 15,
  rightUpperArm: 16,
  rightLowerArm: 17,
  rightHand: 18,
  leftUpperLeg: 5,
  leftLowerLeg: 6,
  leftFoot: 7,
  rightUpperLeg: 8,
  rightLowerLeg: 9,
  rightFoot: 10,
};
const names = {
  hips: /^(hips?|pelvis|rootpelvis)$/,
  spine: /^(spine|spine0?1|chest)$/,
  head: /^head$/,
  leftShoulder: /^(leftshoulder|claviclel|lclavicle)$/,
  rightShoulder: /^(rightshoulder|clavicler|rclavicle)$/,
  leftUpperArm: /^(leftarm|leftupperarm|upperarml|lupperarm)$/,
  rightUpperArm: /^(rightarm|rightupperarm|upperarmr|rupperarm)$/,
  leftLowerArm: /^(leftforearm|leftlowerarm|lowerarml|lforearm)$/,
  rightLowerArm: /^(rightforearm|rightlowerarm|lowerarmr|rforearm)$/,
  leftHand: /^(lefthand|handl|lhand)$/,
  rightHand: /^(righthand|handr|rhand)$/,
  leftUpperLeg: /^(leftupleg|leftthigh|thighl|lthigh)$/,
  rightUpperLeg: /^(rightupleg|rightthigh|thighr|rthigh)$/,
  leftLowerLeg: /^(leftleg|leftcalf|calfl|lcalf|leftlowerleg)$/,
  rightLowerLeg: /^(rightleg|rightcalf|calfr|rcalf|rightlowerleg)$/,
  leftFoot: /^(leftfoot|footl|lfoot)$/,
  rightFoot: /^(rightfoot|footr|rfoot)$/,
};
export function semantic(name) {
  const n = name
    .toLowerCase()
    .replace(/^.*:/, "")
    .replace(/^mixamorig/, "")
    .replace(/[^a-z0-9]/g, "");
  return Object.keys(names).find((k) => names[k].test(n)) ?? null;
}
// Explicit mappings travel with SkeletonUtils clones through bone userData.
export function boneSemantic(bone) {
  return Object.hasOwn(bone.userData, "t3csRole")
    ? bone.userData.t3csRole
    : semantic(bone.name);
}
export function skeletonIdentity(root) {
  const bones = [];
  root.traverse(o => { if (o.isBone) bones.push(o); });
  return bones.map(b => ({
    name: b.name,
    parent: bones.indexOf(b.parent),
    // Bind-local transforms distinguish rigs with identical names and topology.
    transform: [...b.position.toArray(), ...b.quaternion.toArray(), ...b.scale.toArray()],
  }));
}
export function applySkeletonMapping(root, roles) {
  const bones = [];
  root.traverse(o => { if (o.isBone) bones.push(o); });
  if (!roles || typeof roles !== "object" || Array.isArray(roles))
    throw Error("Source mapping must be an anatomical role dictionary");
  const used = new Set();
  for (const [role, index] of Object.entries(roles)) {
    if (!Object.hasOwn(ROWS, role) || !Number.isInteger(index) || index < 0 || index >= bones.length)
      throw Error("Invalid source skeleton mapping");
    if (used.has(index)) throw Error("A source bone cannot represent multiple anatomical roles");
    used.add(index);
  }
  // Validate everything before mutation, including empty selections.
  for (const b of bones) b.userData.t3csRole = null;
  for (const [role, index] of Object.entries(roles)) bones[index].userData.t3csRole = role;
  return analyzeSkeleton(root);
}
export function resetSkeletonMapping(root) {
  root.traverse(b => { if (b.isBone) delete b.userData.t3csRole; });
  return analyzeSkeleton(root);
}
export function exportSkeletonMapping(root) {
  const rig = analyzeSkeleton(root);
  if (rig.report.ambiguous.length) throw Error("Resolve ambiguous source roles before saving mapping");
  return {
    schema: "t3cs-source-mapping/1",
    skeleton: skeletonIdentity(root),
    roles: Object.fromEntries(Object.entries(rig.mapping).map(([role, b]) => [role, rig.bones.indexOf(b)])),
    gameAnimationVerified: false,
  };
}
export function importSkeletonMapping(root, json) {
  if (json?.schema !== "t3cs-source-mapping/1" || !json.roles || typeof json.roles !== "object" || Array.isArray(json.roles))
    throw Error("Unsupported source skeleton mapping profile");
  if (JSON.stringify(json.skeleton) !== JSON.stringify(skeletonIdentity(root)))
    throw Error("Source skeleton profile does not match this rig and bind pose");
  return applySkeletonMapping(root, json.roles);
}
export function analyzeSkeleton(root) {
  const bones = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (o.isBone) bones.push(o);
  });
  const mapping = {},
    ambiguous = [];
  for (const b of bones) {
    const s = boneSemantic(b);
    if (s) {
      if (mapping[s]) {
        if (s === "spine") {
          const ancestor = (a, node) => {
            for (let p = node.parent; p; p = p.parent) if (p === a) return true;
            return false;
          };
          if (ancestor(mapping[s], b)) continue;
          if (ancestor(b, mapping[s])) {
            mapping[s] = b;
            continue;
          }
        }
        ambiguous.push(s);
      } else mapping[s] = b;
    }
  }
  const missing = Object.keys(ROWS).filter((k) => !mapping[k]);
  return {
    bones,
    mapping,
    report: {
      boneCount: bones.length,
      mapping: Object.entries(mapping).map(([role, b]) => ({
        role,
        name: b.name,
        row: ROWS[role],
        confidence: Object.hasOwn(b.userData, "t3csRole") ? "manual" : "name-match",
        position: b.getWorldPosition(new THREE.Vector3()).toArray(),
      })),
      missing,
      ambiguous: [...new Set(ambiguous)],
      gameAnimationVerified: false,
    },
  };
}
export function vertexRegion(mesh, index, box) {
  const si = mesh.geometry.getAttribute("skinIndex"),
    sw = mesh.geometry.getAttribute("skinWeight");
  if (si && sw && mesh.skeleton) {
    let best = -1,
      chosen = null;
    forEachInfluence(mesh, index, (boneIndex, w) => {
      const b = mesh.skeleton.bones[boneIndex];
      if (w > best && b) {
        let p = b;
        while (p && !boneSemantic(p)) p = p.parent;
        chosen = p ? boneSemantic(p) : null;
        best = w;
      }
    });
    if (chosen) return chosen;
  }
  const p = new THREE.Vector3()
    .fromBufferAttribute(mesh.geometry.getAttribute("position"), index)
    .applyMatrix4(mesh.matrixWorld);
  const h = (p.y - box.min.y) / Math.max(box.max.y - box.min.y, 1e-6),
    left = p.x > (box.min.x + box.max.x) / 2;
  if (h > 0.82) return "head";
  if (h > 0.5) return "spine";
  if (h > 0.43) return "hips";
  if (h > 0.23) return left ? "leftUpperLeg" : "rightUpperLeg";
  return left ? "leftLowerLeg" : "rightLowerLeg";
}
export function regionImportance(role, materialName = "") {
  if (/eye|lash|teeth|face/i.test(materialName)) return 5;
  if (/hair/i.test(materialName)) return 3;
  if (role === "head") return 4;
  if (/hand|foot/i.test(role)) return 1.6;
  return /accessor|jewel|glass/i.test(materialName) ? 2 : 1;
}
export function inspectWeights(root) {
  let invalid = 0,
    unnormalized = 0,
    vertices = 0;
  root.traverse((m) => {
    if (!m.isSkinnedMesh) return;
    let sets;
    try { sets = skinSets(m.geometry); } catch { invalid++; return; }
    if (!sets.length) { invalid++; return; }
    for (let v = 0; v < m.geometry.attributes.position.count; v++) {
      vertices++;
      let total = 0;
      for (const [i, a] of sets) for (let k = 0; k < 4; k++) {
        const w = a.getComponent(v, k), b = i.getComponent(v, k);
        if (!Number.isFinite(w) || w < 0 || !Number.isInteger(b) || b < 0 || b >= m.skeleton.bones.length) invalid++;
        total += w;
      }
      if (Math.abs(total - 1) > 0.02) unnormalized++;
    }
  });
  return { vertices, invalid, unnormalized };
}
// A diagnostic of source rig deformation, not a Tekken motion compatibility proof.
export function deformationProbe(root, analysis, onPose = () => {}) {
  const results = [];
  const q = new THREE.Quaternion();
  const baseline = new Map();
  root.updateMatrixWorld(true);
  root.traverse((m) => {
    if (m.isSkinnedMesh) {
      m.skeleton.update();
      const a = m.geometry.attributes.position,
        positions = [];
      for (let i = 0; i < a.count; i++)
        positions.push(
          m.applyBoneTransform(
            i,
            new THREE.Vector3().fromBufferAttribute(a, i),
          ),
        );
      baseline.set(m, positions);
    }
  });
  for (const [label, angle] of [
    ["guard", 0.45],
    ["reach", 1.0],
    ["crouch", -0.6],
  ]) {
    const changes = [];
    for (const key of [
      "leftUpperArm",
      "rightUpperArm",
      "leftUpperLeg",
      "rightUpperLeg",
    ]) {
      const b = analysis.mapping[key];
      if (b) {
        changes.push([b, b.quaternion.clone()]);
        b.quaternion.multiply(
          q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle),
        );
      }
    }
    root.updateMatrixWorld(true);
    root.traverse((m) => {
      if (m.isSkinnedMesh) m.skeleton.update();
    });
    let finite = true,
      maxDisplacement = 0,
      samples = 0,
      checkedEdges = 0,
      extremeEdges = 0,
      maxEdgeStretch = 1;
    root.traverse((m) => {
      if (!m.isSkinnedMesh) return;
      const a = m.geometry.attributes.position;
      const step = Math.max(1, Math.floor(a.count / 1000));
      for (let i = 0; i < a.count; i += step) {
        const original = new THREE.Vector3().fromBufferAttribute(a, i);
        const p = m.applyBoneTransform(i, original.clone());
        finite &&= p.toArray().every(Number.isFinite);
        maxDisplacement = Math.max(maxDisplacement, p.distanceTo(original));
        samples++;
      }
    });
    root.traverse((m) => {
      if (!m.isSkinnedMesh) return;
      const a = m.geometry.attributes.position,
        idx = m.geometry.index,
        number = idx?.count ?? a.count,
        step = Math.max(3, Math.floor(number / 3000 / 3) * 3),
        rest = baseline.get(m);
      for (let i = 0; i + 2 < number; i += step) {
        const ids = [0, 1, 2].map((k) => (idx ? idx.getX(i + k) : i + k)),
          p = ids.map((j) =>
            m.applyBoneTransform(
              j,
              new THREE.Vector3().fromBufferAttribute(a, j),
            ),
          );
        for (let k = 0; k < 3; k++) {
          const j = (k + 1) % 3,
            before = rest[ids[k]].distanceTo(rest[ids[j]]);
          if (before < 1e-8) continue;
          const ratio = p[k].distanceTo(p[j]) / before;
          maxEdgeStretch = Math.max(maxEdgeStretch, ratio);
          if (ratio > 4 || ratio < 0.25) extremeEdges++;
          checkedEdges++;
        }
      }
    });
    results.push({
      pose: label,
      finite,
      maxDisplacement,
      samples,
      checkedEdges,
      extremeEdges,
      maxEdgeStretch,
      kind: "source-rig-diagnostic",
    });
    try { onPose(label); }
    finally {
      for (const [b, saved] of changes) b.quaternion.copy(saved);
      root.updateMatrixWorld(true);
      root.traverse(m => { if (m.isSkinnedMesh) m.skeleton.update(); });
    }
  }
  root.updateMatrixWorld(true);
  root.traverse((m) => {
    if (m.isSkinnedMesh) m.skeleton.update();
  });
  return results;
}
