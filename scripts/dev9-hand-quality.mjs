import {regions,surface,distance} from './dev9-surface-quality.mjs';
import {forEachInfluence} from '../src/core/skinning.js';
// Aggregate measurements only. Input is a private dump; no vertices leave it.
import * as THREE from "three";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadPrivateScene } from "./dev9-private-scene.mjs";
import {
  analyzeSkeleton,
  vertexRegion,
  handDiagnosticChannels,
} from "../src/core/skeleton.js";
import { compileRotationTransfer } from "../src/core/pose-transfer.js";
import { SurfaceIndex, triangleRecord } from "../src/core/surface.js";

for (const dir of process.argv.slice(2)) {
  const file = path.join(dir, "scene-private.json"),
    source = (await loadPrivateScene(file, "source")).root,
    output = (await loadPrivateScene(file)).root,
    rig = analyzeSkeleton(source),
    transfer = compileRotationTransfer(source, output),
    sourceParts = regions(source, true),
    outputParts = regions(output, false),
    poses = [];
  for (const [name, options] of [
    ["neutral", null],
    ["hand-flex", {}],
    ["hand-relax", { amount: -0.12 }],
    ["thumb-motion", { amount: 0.18, mode: "thumb" }],
    ["wrist-roll", { amount: 0.3, mode: "wrist" }],
  ]) {
    const saved = [];
    for (const [b, axis, amount] of options
      ? handDiagnosticChannels(rig, options)
      : []) {
      saved.push([b, b.quaternion.clone()]);
      b.quaternion.multiply(
        new THREE.Quaternion().setFromAxisAngle(axis, amount),
      );
    }
    source.updateMatrixWorld(true);
    source.traverse((m) => {
      if (m.isSkinnedMesh) m.skeleton.update();
    });
    transfer.apply();
    const hands = [];
    for (const [role, parts] of sourceParts) {
      const a = surface(parts),
        b = surface(outputParts.get(role) ?? []);
      if (!a.length || !b.length) continue;
      const extent = new THREE.Box3()
        .setFromPoints(a.flatMap((t) => t.points))
        .getSize(new THREE.Vector3())
        .length();
      hands.push({
        role,
        sourceTriangles: a.length,
        outputTriangles: b.length,
        handExtent: extent,
        sourceToOutput: distance(a, b),
        outputToSource: distance(b, a),
      });
    }
    poses.push({ pose: name, hands });
    for (const [b, q] of saved) b.quaternion.copy(q);
  }
  const report = {
    method:
      "Seven surface samples per triangle, bidirectional nearest distances; area-weighted mean plus P95/max. Diagnostic poses, not gameplay.",
    poses,
  };
  await writeFile(
    path.join(dir, "hand-quality.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(dir, JSON.stringify(poses.find((p) => p.pose === "neutral")));
}
