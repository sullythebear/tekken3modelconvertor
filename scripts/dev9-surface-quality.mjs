import * as THREE from "three";
import { vertexRegion } from "../src/core/skeleton.js";
import { forEachInfluence } from "../src/core/skinning.js";
import { SurfaceIndex, triangleRecord } from "../src/core/surface.js";
export function regions(
  root,
  source,
  accept = (role) => /^(left|right)Hand$/.test(role),
) {
  const box = new THREE.Box3().setFromObject(root),
    parts = new Map();
  root.traverse((m) => {
    if (!m.isSkinnedMesh) return;
    const g = m.geometry,
      index = g.index;
    for (let t = 0; t < (index?.count ?? g.attributes.position.count); t += 3) {
      const ids = [0, 1, 2].map((k) => (index ? index.getX(t + k) : t + k));
      let role;
      if (source) {
        const votes = ids.map((i) => vertexRegion(m, i, box));
        role =
          votes.find((v) => votes.filter((k) => k === v).length >= 2) ??
          votes[0];
      } else
        role = m.userData.studioRegions?.find(
          (r) => t >= r.start && t < r.start + r.count,
        )?.role;
      if (!accept(role, m)) continue;
      if (!parts.has(role)) parts.set(role, []);
      parts.get(role).push({ mesh: m, ids });
    }
  });
  return parts;
}
export function surface(parts) {
  const points = new Map(),
    triangles = [];
  for (const { mesh, ids } of parts) {
    if (!points.has(mesh)) points.set(mesh, new Map());
    const cache = points.get(mesh),
      vertices = ids.map((i) => {
        if (!cache.has(i))
          cache.set(
            i,
            mesh
              .getVertexPosition(i, new THREE.Vector3())
              .applyMatrix4(mesh.matrixWorld),
          );
        return cache.get(i);
      });
    const record = triangleRecord(vertices);
    if (record) {
      record.ids = ids;
      record.mesh = mesh;
      triangles.push(record);
    }
  }
  return triangles;
}
export function distance(a, b) {
  const target = new SurfaceIndex(b),
    distances = [],
    perBone = new Map();
  let sum = 0,
    areaSum = 0,
    negative = 0;
  for (const t of a) {
    const area = t.triangle.getArea(),
      center = t.triangle.getMidpoint(new THREE.Vector3()),
      samples = [
        center,
        ...t.points,
        ...t.points.map((p, i) => p.clone().lerp(t.points[(i + 1) % 3], 0.5)),
      ];
    let local = 0;
    for (const point of samples) {
      const hit = target.nearest(point);
      distances.push(hit.distance);
      local += hit.distance;
    }
    const weights = new Map();
    for (const id of t.ids)
      forEachInfluence(t.mesh, id, (bone, w) =>
        weights.set(bone, (weights.get(bone) ?? 0) + w),
      );
    const bone =
      t.mesh.skeleton.bones[[...weights].sort((a, b) => b[1] - a[1])[0]?.[0]]
        ?.name ?? "unknown";
    if (!perBone.has(bone)) perBone.set(bone, { area: 0, sum: 0, maximum: 0 });
    const group = perBone.get(bone);
    group.area += area;
    group.sum += (area * local) / samples.length;
    group.maximum = Math.max(
      group.maximum,
      ...samples.map((q) => target.nearest(q).distance),
    );
    sum += (area * local) / samples.length;
    areaSum += area;
    const hit = target.nearest(center);
    if (t.normal.dot(hit.triangle.normal) < -0.15) negative += area;
  }
  distances.sort((a, b) => a - b);
  return {
    areaWeightedMean: sum / (areaSum || 1),
    p95: distances[Math.floor((distances.length - 1) * 0.95)],
    maximum: distances.at(-1),
    opposedNearestAreaFraction: negative / (areaSum || 1),
    samples: distances.length,
    perBone: [...perBone].map(([bone, q]) => ({
      bone,
      areaWeightedMean: q.sum / q.area,
      maximum: q.maximum,
    })),
  };
}
