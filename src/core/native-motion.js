import * as THREE from 'three';
import {evaluateTerms} from './donor.js';
// Anatomical preview hierarchy; not a decoded Namco animation stream.
const PARENT = {
  spine: 'hips', head: 'spine',
  leftShoulder: 'spine', leftUpperArm: 'leftShoulder', leftLowerArm: 'leftUpperArm', leftHand: 'leftLowerArm',
  rightShoulder: 'spine', rightUpperArm: 'rightShoulder', rightLowerArm: 'rightUpperArm', rightHand: 'rightLowerArm',
  leftUpperLeg: 'hips', leftLowerLeg: 'leftUpperLeg', leftFoot: 'leftLowerLeg',
  rightUpperLeg: 'hips', rightLowerLeg: 'rightUpperLeg', rightFoot: 'rightLowerLeg',
};
// Rotations are radians in externally supplied donor joint-local axes.
export const NATIVE_POSES = {
  bind: {},
  guard: {leftUpperArm: [0, 0, .45], rightUpperArm: [0, 0, -.45], leftLowerArm: [0, 0, 1.0], rightLowerArm: [0, 0, -1.0]},
  reach: {spine: [0, .2, 0], leftUpperArm: [0, -.8, .2], leftLowerArm: [0, 0, .25], rightUpperArm: [0, .6, -.2]},
  crouch: {leftUpperLeg: [0, 0, -.6], rightUpperLeg: [0, 0, -.6], leftLowerLeg: [0, 0, 1.1], rightLowerLeg: [0, 0, 1.1], spine: [0, 0, -.2]},
};
export function nativePoseFrames(profile, pose = 'bind') {
  const rotations = typeof pose === 'string' ? NATIVE_POSES[pose] : pose;
  if (!rotations || typeof rotations !== 'object') throw Error('Unknown native diagnostic pose');
  for (const [role, angles] of Object.entries(rotations))
    if (!Object.hasOwn(profile.roleRows, role) || !Array.isArray(angles) || angles.length !== 3 || !angles.every(Number.isFinite))
      throw Error('Invalid native diagnostic joint rotation');
  const posedRoles = {}, deltas = {};
  function solve(role) {
    if (posedRoles[role]) return posedRoles[role];
    const bind = profile.frames[profile.roleRows[role]];
    if (!bind) return null;
    let parent = PARENT[role];
    while (parent && !profile.frames[profile.roleRows[parent]]) parent = PARENT[parent];
    if (parent) solve(parent);
    const matrix = (parent ? deltas[parent].clone() : new THREE.Matrix4()).multiply(bind);
    const angles = rotations[role];
    if (angles) matrix.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...angles)));
    posedRoles[role] = matrix;
    deltas[role] = matrix.clone().multiply(bind.clone().invert());
    return matrix;
  }
  for (const role of Object.keys(profile.roleRows)) solve(role);
  const frames = {};
  for (const [row, frame] of Object.entries(profile.frames)) {
    const delta = deltas[profile.rowRoles[row]];
    if (!delta) throw Error(`No anatomical motion mapping for donor row ${row}`);
    frames[row] = delta.clone().multiply(frame);
  }
  return frames;
}
export function inspectNativeMotion(decoded, profile, poses = ['bind', 'guard', 'reach', 'crouch']) {
  const baseline = profile.frames;
  const results = poses.map(pose => {
    const frames = nativePoseFrames(profile, pose);
    let finite = true, maxDisplacement = 0, edges = 0, extremeEdges = 0, maxEdgeStretch = 1, maxSeamGap = 0;
    for (const row of decoded.rows) for (const polygon of row.polygons) {
      const bind = polygon.vertices.map(v => evaluateTerms(v, baseline));
      const moved = polygon.vertices.map(v => evaluateTerms(v, frames));
      for (let k = 0; k < moved.length; k++) {
        finite &&= moved[k].toArray().every(Number.isFinite);
        maxDisplacement = Math.max(maxDisplacement, moved[k].distanceTo(bind[k]));
      }
      const triangles = moved.length === 4 ? [[0, 1, 2], [1, 3, 2]] : [[0, 1, 2]];
      for (const ids of triangles) for (let k = 0; k < 3; k++) {
        const a = ids[k], b = ids[(k + 1) % 3], length = bind[a].distanceTo(bind[b]);
        if (length < 1e-8) continue;
        const ratio = moved[a].distanceTo(moved[b]) / length;
        edges++;
        if (ratio > 4 || ratio < .25) extremeEdges++;
        maxEdgeStretch = Math.max(maxEdgeStretch, ratio);
      }
    }
    for (const seam of decoded.constraints)
      maxSeamGap = Math.max(maxSeamGap, evaluateTerms(seam.a, frames).distanceTo(evaluateTerms(seam.b, frames)));
    return {pose, finite, maxDisplacement, edges, extremeEdges, maxEdgeStretch, maxSeamGap};
  });
  return {
    kind: 'native-anatomical-preview-diagnostic',
    gameAnimationVerified: false,
    coordinateUnit: 'donor-local units',
    limitations: ['Uses an anatomical hierarchy and supplied bind axes, not decoded game motions.', 'Seam gaps and extreme triangle stretch require inspection; finite output alone does not prove correct deformation.'],
    poses: results,
  };
}
export function nativeBoneSegments(profile, frames) {
  const segments = [];
  for (const [role, parent] of Object.entries(PARENT)) {
    const a = frames[profile.roleRows[role]], b = frames[profile.roleRows[parent]];
    if (a && b) segments.push(...new THREE.Vector3().setFromMatrixPosition(a).toArray(), ...new THREE.Vector3().setFromMatrixPosition(b).toArray());
  }
  return segments;
}
