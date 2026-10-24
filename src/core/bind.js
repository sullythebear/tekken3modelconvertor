import {forEachInfluence} from "./skinning.js";
import * as THREE from "three";
import { ROWS, analyzeSkeleton } from "./skeleton.js";
const CHILD = {
  hips: "leftUpperLeg",
  spine: "head",
  leftShoulder: "leftUpperArm",
  rightShoulder: "rightUpperArm",
  leftUpperArm: "leftLowerArm",
  rightUpperArm: "rightLowerArm",
  leftLowerArm: "leftHand",
  rightLowerArm: "rightHand",
  leftUpperLeg: "leftLowerLeg",
  rightUpperLeg: "rightLowerLeg",
  leftLowerLeg: "leftFoot",
  rightLowerLeg: "rightFoot",
};
export const SECONDARY = { 2: 1, 4: 3, 20: 19 };
export const ROLE_FOR_ROW = Object.fromEntries(
  Object.entries(ROWS).map(([k, v]) => [v, k]),
);
export async function digest(bytes) {
  return [
    ...new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes)),
  ]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export async function parseBindProfile(json, decoded) {
  if (json.schema !== "t3cs-donor-bind/1")
    throw Error("Unsupported donor bind profile schema");
  if (json.donorSha256 !== (await digest(decoded.model.bytes)))
    throw Error("Bind profile donor hash does not match loaded donor");
  const frames = {};
  for (const [key, values] of Object.entries(json.frames ?? {})) {
    const row = Number(key);
    if (
      !Number.isInteger(row) ||
      row < 1 ||
      row > 26 ||
      !Array.isArray(values) ||
      values.length !== 16 ||
      !values.every(Number.isFinite)
    )
      throw Error("Invalid bind frame");
    const m = new THREE.Matrix4().fromArray(values),
      e = m.elements,
      axes = [0, 1, 2].map((i) => new THREE.Vector3().fromArray(e, i * 4));
    if (
      Math.abs(e[3]) + Math.abs(e[7]) + Math.abs(e[11]) + Math.abs(e[15] - 1) >
        0.0001 ||
      Math.abs(m.determinant() - 1) > 0.001 ||
      axes.some((a) => Math.abs(a.length() - 1) > 0.001) ||
      Math.abs(axes[0].dot(axes[1])) +
        Math.abs(axes[1].dot(axes[2])) +
        Math.abs(axes[0].dot(axes[2])) >
        0.001
    )
      throw Error(
        "Bind frames must be rigid, right-handed, unit-scale matrices",
      );
    frames[row] = m;
  }
  for (const vertex of decoded.ownVertices)
    if (!frames[vertex.row])
      throw Error(`Bind profile misses row ${vertex.row}`);
  const roleRows = { ...ROWS, ...json.roleRows };
  for (const [role, row] of Object.entries(roleRows))
    if (!(role in ROWS) || !Number.isInteger(row) || row < 1 || row > 26)
      throw Error("Invalid profile semantic mapping");
  const rowRoles = {
    ...ROLE_FOR_ROW,
    ...Object.fromEntries(
      Object.entries(roleRows).map(([role, row]) => [row, role]),
    ),
    ...json.rowRoles,
  };
  for (const [secondary, primary] of Object.entries(SECONDARY))
    rowRoles[secondary] ??= rowRoles[primary];
  for (const row of decoded.rows)
    if (!rowRoles[row.row])
      throw Error(
        `Explicit anatomical role required for accessory row ${row.row}`,
      );
  for (const role of Object.values(rowRoles))
    if (!(role in ROWS)) throw Error("Unknown profile anatomical role");
  return {
    frames,
    roleRows,
    rowRoles,
    donorSha256: json.donorSha256,
    provenance: String(json.provenance ?? "not supplied"),
    verification: "external-frame-input-not-game-tested",
  };
}
export function sourceBindFrames(root, profile) {
  const rig = analyzeSkeleton(root),
    mapping = rig.mapping;
  if (rig.report.ambiguous.length)
    throw Error(
      "Ambiguous source skeleton roles: " + rig.report.ambiguous.join(", "),
    );
  const position = (role) =>
      mapping[role]?.getWorldPosition(new THREE.Vector3()),
    hips = position("hips"),
    spine = position("spine");
  if (!hips || !spine)
    throw Error(
      "Source hips and spine must be mapped before donor retargeting",
    );
  const up = spine.clone().sub(hips).normalize(),
    left = position("leftShoulder") ?? position("leftUpperArm"),
    right = position("rightShoulder") ?? position("rightUpperArm");
  if (!left || !right)
    throw Error("Both source arms are needed to determine anatomical front");
  const forward = left.clone().sub(right).cross(up).normalize();
  if (forward.lengthSq() < 0.9)
    throw Error("Source anatomical axes are degenerate");
  const targetHips = profile.frames[profile.roleRows.hips],
    targetSpine = profile.frames[profile.roleRows.spine];
  if (!targetHips || !targetSpine)
    throw Error("Donor hips and spine bind frames are required");
  const ratios = [];
  const roles = Object.keys(profile.roleRows);
  for (let i = 0; i < roles.length; i++)
    for (let j = i + 1; j < roles.length; j++) {
      const a = position(roles[i]),
        b = position(roles[j]),
        ta = profile.frames[profile.roleRows[roles[i]]],
        tb = profile.frames[profile.roleRows[roles[j]]];
      if (!a || !b || !ta || !tb) continue;
      const sd = a.distanceTo(b),
        td = new THREE.Vector3()
          .setFromMatrixPosition(ta)
          .distanceTo(new THREE.Vector3().setFromMatrixPosition(tb));
      if (sd > 1e-8 && td > 1e-8) ratios.push(td / sd);
    }
  ratios.sort((a, b) => a - b);
  const globalScale = ratios[Math.floor(ratios.length / 2)];
  if (!(globalScale > 1e-8)) throw Error("Degenerate donor axial skeleton");
  const frames = {},
    scales = {};
  for (const [role, targetRow] of Object.entries(profile.roleRows)) {
    if (!profile.frames[targetRow]) continue;
    const origin = position(role);
    if (!origin) throw Error(`Source skeleton has no mapped ${role}`);
    let axis,
      next = position(CHILD[role]);
    if (role === "hips") {
      const a = position("leftUpperLeg"),
        b = position("rightUpperLeg");
      next = a && b ? a.add(b).multiplyScalar(0.5) : next;
    }
    if (next && next.distanceToSquared(origin) > 1e-10)
      axis = next.clone().sub(origin).normalize();
    else if (/Foot/.test(role)) axis = forward.clone();
    else if (/Hand/.test(role)) {
      const parent = position(
        role.startsWith("left") ? "leftLowerArm" : "rightLowerArm",
      );
      axis = parent
        ? origin.clone().sub(parent).normalize()
        : left.clone().sub(right).normalize();
    } else axis = up.clone();
    let y = forward.clone().addScaledVector(axis, -forward.dot(axis));
    if (y.lengthSq() < 1e-8)
      y = up.clone().addScaledVector(axis, -up.dot(axis));
    y.normalize();
    const z = axis.clone().cross(y).normalize();
    const matrix = new THREE.Matrix4().makeBasis(axis, y, z);
    matrix.setPosition(origin);
    frames[role] = matrix;
    const childRow = profile.roleRows[CHILD[role]],
      childFrame = profile.frames[childRow];
    const sourceLength = next ? next.distanceTo(origin) : 0,
      targetLength = childFrame
        ? new THREE.Vector3()
            .setFromMatrixPosition(childFrame)
            .distanceTo(
              new THREE.Vector3().setFromMatrixPosition(
                profile.frames[targetRow],
              ),
            )
        : 0;
    scales[role] =
      sourceLength > 1e-6 && targetLength > 1e-6
        ? targetLength / sourceLength
        : globalScale;
  }
  // Terminal parts inherit their parent's scale, not an arbitrary unit mismatch.
  for (const role of Object.keys(frames))
    if (!CHILD[role]) {
      const parent = Object.keys(CHILD).find((k) => CHILD[k] === role);
      scales[role] = scales[parent] ?? scales.spine ?? 1;
    }
  const transforms = Object.fromEntries(Object.entries(frames).map(([role, frame]) => [role,
    profile.frames[profile.roleRows[role]].clone()
      .multiply(new THREE.Matrix4().makeScale(scales[role], scales[role], scales[role]))
      .multiply(frame.clone().invert()),
  ]));
  const boneRoles = new Map();
  for (const bone of rig.bones) {
    let ancestor = bone, role;
    while (ancestor && !role) {
      role = Object.keys(mapping).find(k => mapping[k] === ancestor);
      ancestor = ancestor.parent;
    }
    boneRoles.set(bone, role);
  }
  return { rig, frames, scales, transforms, boneRoles };
}
export function retargetSourceVertex(mesh, index, source, profile) {
  const input = mesh
      .getVertexPosition(index, new THREE.Vector3())
      .applyMatrix4(mesh.matrixWorld),
    si = mesh.geometry.attributes.skinIndex,
    sw = mesh.geometry.attributes.skinWeight;
  if (!si || !sw || !mesh.skeleton) {
    let parent = mesh.parent,
      role;
    while (parent && !role) {
      role = Object.keys(source.rig.mapping).find(
        (k) => source.rig.mapping[k] === parent,
      );
      parent = parent.parent;
    }
    if (
      !role ||
      !source.frames[role] ||
      !profile.frames[profile.roleRows[role]]
    )
      throw Error(
        "Static source mesh needs an explicit anatomical bone attachment",
      );
    return {
      point: input
        .applyMatrix4(source.frames[role].clone().invert())
        .multiplyScalar(source.scales[role])
        .applyMatrix4(profile.frames[profile.roleRows[role]]),
      role,
    };
  }
  const out = new THREE.Vector3(),
    weights = new Map();
  let sum = 0;
  forEachInfluence(mesh, index, (boneIndex, weight) => {
    if (weight <= 0) return;
    let bone = mesh.skeleton.bones[boneIndex],
      role = source.boneRoles?.get(bone);
    while (bone && !role) {
      role = Object.keys(source.rig.mapping).find(
        (key) => source.rig.mapping[key] === bone,
      );
      bone = bone.parent;
    }
    if (
      !role ||
      !source.frames[role] ||
      !profile.frames[profile.roleRows[role]]
    )
      throw Error("Source skin influence cannot be mapped to donor");
    const p = source.transforms?.[role]
      ? input.clone().applyMatrix4(source.transforms[role])
      : input.clone().applyMatrix4(source.frames[role].clone().invert())
          .multiplyScalar(source.scales[role]).applyMatrix4(profile.frames[profile.roleRows[role]]);
    out.addScaledVector(p, weight);
    weights.set(role, (weights.get(role) ?? 0) + weight);
    sum += weight;
  });
  if (Math.abs(sum - 1) > 0.02)
    throw Error("Unnormalized source weights cannot be retargeted");
  out.divideScalar(sum);
  const role = [...weights].sort((a, b) => b[1] - a[1])[0][0];
  return { point: out, role };
}
