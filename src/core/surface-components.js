import * as THREE from "three";

// Connectivity by complete measured edges, including UV-split copies. This
// labels surfaces; it never welds vertices, materials, UVs or skin channels.
export function edgeConnectedSurfaces(
  geometry,
  indices = geometry.index.array,
) {
  const p = geometry.attributes.position;
  const scale = new THREE.Box3()
    .setFromBufferAttribute(p)
    .getSize(new THREE.Vector3())
    .length();
  const epsilon = Math.max(scale * 1e-8, 1e-8);
  const key = (i) =>
    [p.getX(i), p.getY(i), p.getZ(i)]
      .map((v) => Math.round(v / epsilon))
      .join(",");
  const parents = Array.from({ length: indices.length / 3 }, (_, i) => i),
    edges = new Map();
  const root = (i) => {
    while (parents[i] !== i) {
      parents[i] = parents[parents[i]];
      i = parents[i];
    }
    return i;
  };
  for (let t = 0; t < indices.length; t += 3)
    for (let k = 0; k < 3; k++) {
      const edge = [key(indices[t + k]), key(indices[t + ((k + 1) % 3)])]
        .sort()
        .join("/");
      if (edges.has(edge)) parents[root(t / 3)] = root(edges.get(edge));
      else edges.set(edge, t / 3);
    }
  const components = new Map();
  for (let t = 0; t < indices.length; t += 3) {
    const r = root(t / 3);
    if (!components.has(r)) components.set(r, []);
    components.get(r).push(indices[t], indices[t + 1], indices[t + 2]);
  }
  return [...components.values()];
}
