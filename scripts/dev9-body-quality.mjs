import * as THREE from "three";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { loadPrivateScene } from "./dev9-private-scene.mjs";
import { analyzeSkeleton } from "../src/core/skeleton.js";
import { compileRotationTransfer } from "../src/core/pose-transfer.js";
import { regions, surface, distance } from "./dev9-surface-quality.mjs";
for (const dir of process.argv.slice(2)) {
  const file = path.join(dir, "scene-private.json"),
    source = (await loadPrivateScene(file, "source")).root,
    output = (await loadPrivateScene(file)).root,
    rig = analyzeSkeleton(source),
    transfer = compileRotationTransfer(source, output),
    outputParts = regions(output, false, (role) =>
      /^(spine|(left|right)(Shoulder|UpperArm))$/.test(role),
    ),
    keys = new Set(
      [...outputParts].flatMap(([role, parts]) =>
        parts.map((p) => p.mesh.name + "|" + role),
      ),
    ),
    sourceParts = regions(source, true, (role, m) =>
      keys.has(m.name + "|" + role),
    ),
    poses = [];
  const raised = ["left", "right"].flatMap((side) => {
    const a = rig.mapping[side + "UpperArm"],
      b = rig.mapping[side + "LowerArm"];
    if (!a || !b) return [];
    const direction = b
        .getWorldPosition(new THREE.Vector3())
        .sub(a.getWorldPosition(new THREE.Vector3()))
        .normalize(),
      axis = direction.clone().cross(new THREE.Vector3(0, 1, 0));
    if (axis.length() < 1e-6) return [];
    return [
      [
        a,
        axis
          .normalize()
          .applyQuaternion(
            a.getWorldQuaternion(new THREE.Quaternion()).invert(),
          ),
        Math.acos(THREE.MathUtils.clamp(direction.y, -1, 1)) * 0.75,
      ],
    ];
  });
  const xyz = (role, axis, angle) =>
    rig.mapping[role]
      ? [
          [
            rig.mapping[role],
            new THREE.Vector3(
              axis === "x" ? 1 : 0,
              axis === "y" ? 1 : 0,
              axis === "z" ? 1 : 0,
            ),
            angle,
          ],
        ]
      : [];
  for (const [name, channels] of [
    ["neutral", []],
    [
      "guard",
      [...xyz("leftUpperArm", "z", 0.45), ...xyz("rightUpperArm", "z", 0.45)],
    ],
    [
      "reach",
      [...xyz("leftUpperArm", "z", 1), ...xyz("rightUpperArm", "z", 1)],
    ],
    ["arms-raised", raised],
    [
      "punch",
      [...xyz("leftUpperArm", "y", -0.9), ...xyz("leftLowerArm", "z", 0.25)],
    ],
  ]) {
    const saved = [];
    for (const [b, axis, amount] of channels) {
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
    const measurements = [];
    for (const [role, parts] of sourceParts) {
      const a = surface(parts),
        b = surface(outputParts.get(role) ?? []);
      if (!a.length || !b.length) continue;
      const forward = distance(a, b),
        reverse = distance(b, a);
      delete forward.perBone;
      delete reverse.perBone;
      measurements.push({
        role,
        sourceTriangles: a.length,
        outputTriangles: b.length,
        sourceToOutput: forward,
        outputToSource: reverse,
      });
    }
    poses.push({ pose: name, regions: measurements });
    for (const [b, q] of saved) b.quaternion.copy(q);
  }
  await writeFile(
    path.join(dir, "body-quality.json"),
    JSON.stringify(
      {
        method:
          "Same source and output rig in bind-relative diagnostic poses; bidirectional triangle-surface samples, not gameplay.",
        poses,
      },
      null,
      2,
    ),
  );
  console.log(dir, JSON.stringify(poses));
}
