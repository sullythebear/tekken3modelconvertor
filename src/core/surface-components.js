import * as THREE from "three";

// Connectivity by complete measured edges, including UV-split copies. This
// labels surfaces; it never welds vertices, materials, UVs or skin channels.
export function edgeConnectedSurfaces(
  geometry,
  indices = geometry.index.array,
  { respectUV = false } = {},
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
      .join(",") +
    (respectUV && geometry.attributes.uv
      ? ":" +
        [geometry.attributes.uv.getX(i), geometry.attributes.uv.getY(i)]
          .map((v) => Math.round(v * 1e6))
          .join(",")
      : "");
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

export function uvChartLabels(geometry) {
  const labels = new Int32Array(geometry.attributes.position.count).fill(-1),
    ambiguous = new Uint8Array(labels.length),
    components = edgeConnectedSurfaces(geometry, geometry.index.array, {
      respectUV: true,
    });
  for (let chart = 0; chart < components.length; chart++)
    for (const v of components[chart]) {
      if (labels[v] >= 0 && labels[v] !== chart) ambiguous[v] = 1;
      else labels[v] = chart;
    }
  return { labels, ambiguous, count: components.length };
}
