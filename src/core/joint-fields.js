import * as THREE from "three";
import { skinSets } from "./skinning.js";
import { boneSemantic } from "./skeleton.js";

// Immutable virtual LBS samples for simplification costs. These are diagnostic
// rotations, not game animations, and never alter the source rig or weights.
export function jointDisplacementFields(
  mesh,
  geometry,
  poses,
  scale,
  { magnitude = false } = {},
) {
  if (!mesh?.skeleton || !poses.length || !(scale > 1e-9)) return null;
  const sets = skinSets(geometry),
    p = geometry.attributes.position;
  if (!sets.length) return null;
  const belongs = (bone, joint) => {
    while (bone) {
      if (bone === joint) return true;
      bone = bone.parent;
    }
    return false;
  };
  const affected = new Set(
    mesh.skeleton.bones
      .map((bone, i) =>
        poses.flat().some((t) => belongs(bone, t.joint)) ? i : -1,
      )
      .filter((i) => i >= 0),
  );
  let active = false;
  for (let v = 0; v < p.count && !active; v++)
    for (const [j, w] of sets)
      for (let k = 0; k < 4; k++)
        if (w.getComponent(v, k) > 0 && affected.has(j.getComponent(v, k)))
          active = true;
  if (!active) return null;
  const dimensions = magnitude ? 1 : 3,
    values = new Float32Array(p.count * poses.length * dimensions),
    base = new THREE.Vector4(),
    out = new THREE.Vector4(),
    point = new THREE.Vector4();
  for (let pose = 0; pose < poses.length; pose++) {
    const transforms = poses[pose].map(({ joint, axis, angle }) => {
      if (
        !axis.toArray().every(Number.isFinite) ||
        axis.lengthSq() < 1e-12 ||
        !Number.isFinite(angle)
      )
        throw Error("Invalid virtual joint rotation");
      const pivot = joint.getWorldPosition(new THREE.Vector3()),
        q = new THREE.Matrix4()
          .makeTranslation(...pivot.toArray())
          .multiply(
            new THREE.Matrix4().makeRotationAxis(
              axis.clone().normalize(),
              angle,
            ),
          )
          .multiply(
            new THREE.Matrix4().makeTranslation(
              ...pivot.clone().negate().toArray(),
            ),
          );
      return { joint, q };
    });
    const matrices = mesh.skeleton.bones.map((bone, i) => {
      const world = bone.matrixWorld.clone();
      for (const { joint, q } of transforms)
        if (belongs(bone, joint)) world.premultiply(q);
      return world.multiply(mesh.skeleton.boneInverses[i]);
    });
    for (let v = 0; v < p.count; v++) {
      base
        .set(p.getX(v), p.getY(v), p.getZ(v), 1)
        .applyMatrix4(mesh.bindMatrix);
      out.set(0, 0, 0, 0);
      for (const [j, w] of sets)
        for (let k = 0; k < 4; k++) {
          const weight = w.getComponent(v, k);
          if (weight)
            out.addScaledVector(
              point.copy(base).applyMatrix4(matrices[j.getComponent(v, k)]),
              weight,
            );
        }
      out.applyMatrix4(mesh.bindMatrixInverse);
      const offset = v * poses.length * dimensions + pose * dimensions,
        dx = (out.x - p.getX(v)) / scale,
        dy = (out.y - p.getY(v)) / scale,
        dz = (out.z - p.getZ(v)) / scale;
      if (magnitude) values[offset] = Math.hypot(dx, dy, dz);
      else {
        values[offset] = dx;
        values[offset + 1] = dy;
        values[offset + 2] = dz;
      }
    }
  }
  return {
    values,
    size: poses.length * dimensions,
    kind: magnitude
      ? "source-joint displacement magnitude"
      : "source-joint displacement vector",
    poses: poses.length,
    joints: new Set(poses.flat().map((p) => p.joint)).size,
    scale,
  };
}

export function armDisplacementFields(mesh, geometry) {
  if (!mesh?.skeleton) return null;
  const raise = [],
    twist = [],
    lengths = [],
    inverse = mesh.matrixWorld.clone().invert();
  for (const side of ["left", "right"]) {
    const joint = mesh.skeleton.bones.find(
        (b) => boneSemantic(b) === side + "UpperArm",
      ),
      end = mesh.skeleton.bones.find(
        (b) => boneSemantic(b) === side + "LowerArm",
      );
    if (!joint || !end) continue;
    const a = joint.getWorldPosition(new THREE.Vector3()),
      b = end.getWorldPosition(new THREE.Vector3()),
      direction = b.clone().sub(a);
    if (direction.length() < 1e-8) continue;
    direction.normalize();
    let axis = direction.clone().cross(new THREE.Vector3(0, 1, 0));
    if (axis.lengthSq() < 1e-8)
      axis = direction.clone().cross(new THREE.Vector3(0, 0, 1));
    axis.normalize();
    lengths.push(
      a
        .clone()
        .applyMatrix4(inverse)
        .distanceTo(b.clone().applyMatrix4(inverse)),
    );
    raise.push({ joint, axis, angle: 0.9 });
    twist.push({ joint, axis: direction, angle: 0.65 });
  }
  if (!raise.length) return null;
  const scale = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  return jointDisplacementFields(mesh, geometry, [raise, twist], scale, {
    magnitude: true,
  });
}
