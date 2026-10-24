import * as THREE from "three";
import { ROWS } from "./skeleton.js";
import { digest, SECONDARY } from "./bind.js";
import { evaluateTerms } from "./donor.js";
const PARENT = {
    1: 0,
    3: 1,
    5: 3,
    6: 5,
    7: 6,
    8: 3,
    9: 8,
    10: 9,
    11: 1,
    12: 11,
    13: 12,
    14: 13,
    15: 1,
    16: 15,
    17: 16,
    18: 17,
    19: 1,
  },
  PART_ROWS = [
    0, 1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23,
    24,
  ];
function orientation(x) {
  const y = new THREE.Vector3(0, 0, 1);
  if (Math.abs(x.dot(y)) > 0.99) y.set(0, 1, 0);
  y.addScaledVector(x, -y.dot(x)).normalize();
  return new THREE.Matrix4().makeBasis(x, y, x.clone().cross(y).normalize());
}
export async function estimateDonorBind(
  decoded,
  { maxPasses = 3, onProgress = () => {}, signal } = {},
) {
  const rows = decoded.model.rows,
    needed = new Set(decoded.ownVertices.map((v) => v.row)),
    parent = { ...PARENT },
    basis = { 0: orientation(new THREE.Vector3(0, 1, 0)) };
  for (const [row, p] of Object.entries(SECONDARY)) parent[row] = p;
  for (let r = 1; r < 27; r++)
    if (!parent[r] && r !== 1) {
      const part = rows[r][6] & 255;
      if (PART_ROWS[part] && PART_ROWS[part] !== r) parent[r] = PART_ROWS[part];
    }
  for (const r of needed)
    if (parent[r] === undefined)
      throw Error(`Cannot infer parent for native accessory row ${r}`);
  for (let r = 1; r < 27; r++) {
    let x;
    if ([3, 5, 6, 8, 9].includes(r)) x = new THREE.Vector3(0, -1, 0);
    else if ([7, 10].includes(r)) x = new THREE.Vector3(0, 0, 1);
    else if (r >= 11 && r <= 14) x = new THREE.Vector3(1, 0, 0);
    else if (r >= 15 && r <= 18) x = new THREE.Vector3(-1, 0, 0);
    else x = new THREE.Vector3(0, 1, 0);
    basis[r] = orientation(x);
  }
  const angles = Object.fromEntries(
    Object.keys(PARENT)
      .filter((r) => r !== "1")
      .map((r) => [r, [0, 0, 0]]),
  );
  const build = () => {
    const frames = { 0: basis[0].clone() },
      visiting = new Set();
    const get = (r) => {
      if (frames[r]) return frames[r];
      if (visiting.has(r)) throw Error("Cyclic donor part hierarchy");
      visiting.add(r);
      if (SECONDARY[r]) {
        frames[r] = get(SECONDARY[r]).clone();
        visiting.delete(r);
        return frames[r];
      }
      const p = parent[r];
      if (p === undefined) throw Error(`Unknown native parent for row ${r}`);
      const pf = get(p),
        base = basis[p].clone().invert().multiply(basis[r]),
        correction = new THREE.Matrix4().makeRotationFromEuler(
          new THREE.Euler(...(angles[r] ?? [0, 0, 0])),
        ),
        m = pf.clone().multiply(base).multiply(correction),
        offset = new THREE.Vector3(
          rows[r][3],
          rows[r][4],
          -rows[r][5],
        ).applyMatrix4(pf);
      m.setPosition(offset);
      frames[r] = m;
      visiting.delete(r);
      return m;
    };
    for (const r of needed) get(r);
    for (const r of [
      1, 3, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
    ])
      if (parent[r] !== undefined) get(r);
    return frames;
  };
  let frames = build();
  const characteristic = Math.max(
    1,
    new THREE.Box3()
      .setFromPoints(
        decoded.ownVertices.map((v) =>
          new THREE.Vector3().fromArray(v.position).applyMatrix4(frames[v.row]),
        ),
      )
      .getSize(new THREE.Vector3())
      .length(),
  );
  const residual = (f) =>
      decoded.constraints.map((c) =>
        evaluateTerms(c.a, f).distanceTo(evaluateTerms(c.b, f)),
      ),
    cost = () => {
      const values = residual(build());
      return (
        values.reduce((s, x) => s + x * x, 0) +
        Object.values(angles)
          .flat()
          .reduce((s, a) => s + a * a, 0) *
          characteristic *
          characteristic *
          0.00001
      );
    };
  const before = residual(frames),
    initial = cost();
  if (decoded.constraints.length) {
    let best = initial;
    const parameters = Object.keys(angles).filter(
      (r) =>
        needed.has(Number(r)) ||
        decoded.constraints.some(
          (c) =>
            c.a.some((t) => t.vertex.row === Number(r)) ||
            c.b.some((t) => t.vertex.row === Number(r)),
        ),
    );
    for (const step of [
      Math.PI / 2,
      Math.PI / 4,
      Math.PI / 8,
      Math.PI / 16,
      Math.PI / 32,
      Math.PI / 64,
      Math.PI / 128,
    ]) {
      for (let pass = 0; pass < maxPasses; pass++) {
        let improved = false;
        for (const r of parameters)
          for (let axis = 0; axis < 3; axis++) {
            if (signal?.aborted) throw Error("Bind estimation cancelled");
            const original = angles[r][axis];
            let selected = original;
            for (const direction of [-1, 1]) {
              const value = original + step * direction;
              if (axis > 0 && Math.abs(value) > Math.PI / 3) continue;
              angles[r][axis] = value;
              const c = cost();
              if (c < best - 1e-9) {
                best = c;
                selected = value;
                improved = true;
              }
            }
            angles[r][axis] = selected;
          }
        if (!improved) break;
      }
      onProgress({
        step: "Estimating donor bind from joint seam constraints",
        fraction: 1 - step / (Math.PI / 2),
      });
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  frames = build();
  const after = residual(frames),
    roleRows = { ...ROWS };
  const position = (r) => new THREE.Vector3().setFromMatrixPosition(frames[r]);
  if (frames[11] && frames[15] && position(11).x < position(15).x)
    for (const suffix of ["Shoulder", "UpperArm", "LowerArm", "Hand"]) {
      const a = "left" + suffix,
        b = "right" + suffix;
      [roleRows[a], roleRows[b]] = [roleRows[b], roleRows[a]];
    }
  if (frames[5] && frames[8] && position(5).x < position(8).x)
    for (const suffix of ["UpperLeg", "LowerLeg", "Foot"]) {
      const a = "left" + suffix,
        b = "right" + suffix;
      [roleRows[a], roleRows[b]] = [roleRows[b], roleRows[a]];
    }
  const rowRoles = {};
  for (const [role, row] of Object.entries(roleRows)) rowRoles[row] = role;
  for (const [row, p] of Object.entries(SECONDARY)) rowRoles[row] = rowRoles[p];
  for (const r of needed) {
    let p = r;
    while (!rowRoles[p] && parent[p] !== undefined) p = parent[p];
    if (!rowRoles[p])
      throw Error(`Unknown anatomical accessory attachment ${r}`);
    rowRoles[r] = rowRoles[p];
  }
  const stat = (values) => ({
    maximum: values.length ? Math.max(...values) : null,
    rms: values.length
      ? Math.sqrt(values.reduce((s, x) => s + x * x, 0) / values.length)
      : null,
  });
  return {
    schema: "t3cs-donor-bind/1",
    donorSha256: await digest(decoded.model.bytes),
    frames: Object.fromEntries(
      Object.entries(frames)
        .filter(([r]) => r !== "0")
        .map(([r, m]) => [r, m.toArray()]),
    ),
    roleRows,
    rowRoles,
    provenance:
      "AUTOMATIC ESTIMATE from donor joint offsets and shared-vertex seam constraints. Not a runtime-validated bind pose.",
    estimation: {
      method: "bounded coordinate descent; anatomical orientation prior",
      constraints: after.length,
      before: stat(before),
      after: stat(after),
      relativeRms: after.length ? stat(after).rms / characteristic : null,
      gameVerified: false,
      limitations: [
        "Unconstrained joints keep the anatomical prior.",
        "Accessory rest-rotation conventions are not inferred.",
        "Seam agreement does not establish correct donor animation axes.",
      ],
    },
  };
}
