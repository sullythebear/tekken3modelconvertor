// Private-source topology summary; never writes source vertex arrays.
import * as THREE from "three";
import { writeFile } from "node:fs/promises";
import { loadPrivateScene } from "./dev9-private-scene.mjs";
import { edgeConnectedSurfaces } from "../src/core/surface-components.js";
import { vertexRegion } from "../src/core/skeleton.js";
import { subsetSurface } from "../src/core/projected-topology.js";
import { geometryEdges } from "../src/core/mesh-integrity.js";
const file = process.argv[2] ?? "artifacts/dev9/baseline/scene-private.json",
  root = (await loadPrivateScene(file, "source")).root,
  box = new THREE.Box3().setFromObject(root),
  result = [];
root.traverse((mesh) => {
  if (!mesh.isSkinnedMesh) return;
  const g = mesh.geometry;
  if (!g.index)
    g.setIndex(
      Array.from({ length: g.attributes.position.count }, (_, i) => i),
    );
  const roles = Array.from({ length: g.attributes.position.count }, (_, i) =>
    vertexRegion(mesh, i, box),
  );
  for (const indices of edgeConnectedSurfaces(g)) {
    const regions = {};
    for (let t = 0; t < indices.length; t += 3) {
      const votes = indices.slice(t, t + 3).map((i) => roles[i]),
        role =
          votes.find((r) => votes.filter((v) => v === r).length >= 2) ??
          votes[0];
      regions[role] = (regions[role] ?? 0) + 1;
    }
    const part = subsetSurface(g, indices),
      edges = geometryEdges(part);
    result.push({
      mesh: mesh.name,
      triangles: indices.length / 3,
      regions,
      openEdges: edges.boundaries.length,
      nonmanifoldEdges: [...edges.edges.values()].filter((e) => e.length > 2)
        .length,
    });
    part.dispose();
  }
});
result.sort((a, b) => b.triangles - a.triangles);
await writeFile(
  "artifacts/dev9/source-components.json",
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify(
    result.filter((r) => r.triangles > 30),
    null,
    2,
  ),
);
