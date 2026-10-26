// Private source input, aggregate measurements only. No vertices/UVs leave it.
import * as THREE from "three";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadPrivateScene } from "./dev9-private-scene.mjs";
import {
  analyzeSkeleton,
  deformationProbe,
  vertexRegion,
} from "../src/core/skeleton.js";
import { compileRotationTransfer } from "../src/core/pose-transfer.js";
const dir = process.argv[2] ?? "artifacts/dev9/final-private-diagnostics",
  file = path.join(dir, "scene-private.json"),
  raw = JSON.parse(await readFile(file, "utf8"));
if (raw.source.nodes.some((n) => n.morphs?.influences?.some((v) => v !== 0)))
  throw Error(
    "Active source morphs are not serialized in this private diagnostic dump",
  );
const source = (await loadPrivateScene(file, "source")).root,
  output = (await loadPrivateScene(file)).root,
  rig = analyzeSkeleton(source),
  transfer = compileRotationTransfer(source, output),
  height = new THREE.Box3()
    .setFromObject(source)
    .getSize(new THREE.Vector3()).y,
  poses = [];
if (!(height > 0)) throw Error("Invalid source height");
function prepare(root) {
  const meshes = [],
    box = new THREE.Box3().setFromObject(root);
  root.traverse((m) => {
    if (!m.isSkinnedMesh) return;
    const g = m.geometry,
      p = g.attributes.position,
      ids = g.index?.array ?? Array.from({ length: p.count }, (_, i) => i),
      edges = [],
      seen = new Set(),
      roles = Array.from({ length: p.count }, (_, v) =>
        vertexRegion(m, v, box),
      );
    for (let t = 0; t < ids.length; t += 3)
      for (let k = 0; k < 3; k++) {
        const a = ids[t + k],
          b = ids[t + ((k + 1) % 3)],
          key = a < b ? a + ":" + b : b + ":" + a;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push([a, b]);
        }
      }
    const points = Array.from({ length: p.count }, (_, v) =>
      m.getVertexPosition(v, new THREE.Vector3()).applyMatrix4(m.matrixWorld),
    );
    meshes.push({ m, roles, edges, points });
  });
  return meshes;
}
const groups = { source: prepare(source), converted: prepare(output) };
function measure(meshes) {
  const regions = {};
  for (const { m, roles, edges, points } of meshes) {
    const posed = points.map((_, v) =>
      m.getVertexPosition(v, new THREE.Vector3()).applyMatrix4(m.matrixWorld),
    );
    for (const [a, b] of edges) {
      const rest = points[a].distanceTo(points[b]) / height;
      if (rest < 1e-8) continue;
      const now = posed[a].distanceTo(posed[b]) / height,
        ratio = now / rest,
        region =
          roles[a] === roles[b]
            ? roles[a]
            : [roles[a], roles[b]].sort().join("/");
      const r = (regions[region] ??= {
        edges: 0,
        over125BeyondAbsoluteThreshold: 0,
        over2BeyondAbsoluteThreshold: 0,
        over4: 0,
        collapsedBeyondAbsoluteThreshold: 0,
        maxStretch: 1,
        maxIncreaseOverHeight: 0,
        maxDecreaseOverHeight: 0,
        shortestRestEdgeOverHeight: Infinity,
      });
      r.edges++;
      r.maxStretch = Math.max(r.maxStretch, ratio);
      r.maxIncreaseOverHeight = Math.max(r.maxIncreaseOverHeight, now - rest);
      r.maxDecreaseOverHeight = Math.max(r.maxDecreaseOverHeight, rest - now);
      r.shortestRestEdgeOverHeight = Math.min(
        r.shortestRestEdgeOverHeight,
        rest,
      );
      if (ratio > 4) r.over4++;
      if (now - rest > 0.001) {
        if (ratio > 1.25) r.over125BeyondAbsoluteThreshold++;
        if (ratio > 2) r.over2BeyondAbsoluteThreshold++;
      }
      if (rest - now > 0.001 && ratio < 0.25)
        r.collapsedBeyondAbsoluteThreshold++;
    }
  }
  return regions;
}
deformationProbe(
  source,
  rig,
  (pose) => {
    transfer.apply();
    output.updateMatrixWorld(true);
    output.traverse((m) => {
      if (m.isSkinnedMesh) m.skeleton.update();
    });
    poses.push({
      pose,
      source: measure(groups.source),
      converted: measure(groups.converted),
    });
  },
  { extended: true },
);
const report = {
  scope:
    "All unique index edges under bind-relative diagnostic rotations, not gameplay or source animation clips. Counts differ with tessellation and are not directly comparable artistic scores.",
  sourceAnimationClips: raw.source.animationSummary?.length ?? null,
  sourceAnimationTracks:
    raw.source.animationSummary?.reduce((n, c) => n + c.tracks, 0) ?? null,
  absoluteIncreaseThresholdOverSourceHeight: 0.001,
  thresholdMeaning:
    "Experimental 0.1% source-height increase/decrease used to distinguish short-edge ratio artifacts from potentially visible strain; not a universal acceptance bound",
  activeMorphs: 0,
  privateSourceVerticesPublished: false,
  poses,
};
await writeFile(
  "artifacts/dev9/pose-stress-summary.json",
  JSON.stringify(report, null, 2),
);
console.log(
  "Aggregate source/conversion pose stress measured for",
  poses.length,
  "poses; source clips:",
  report.sourceAnimationClips,
);
