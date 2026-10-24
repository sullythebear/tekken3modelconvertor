// Procedural synthetic test asset, authored for this project. Never presented as Nikki.
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
export async function syntheticCharacter() {
  const root = new THREE.Group();
  root.name = "SyntheticHumanoid";
  const bones = [],
    spec = [
      ["Hips", [0, 0.95, 0], -1],
      ["Spine", [0, 0.25, 0], 0],
      ["Head", [0, 0.48, 0], 1],
      ["LeftShoulder", [0.16, 0.3, 0], 1],
      ["LeftArm", [0.12, 0, 0], 3],
      ["LeftForeArm", [0.3, 0, 0], 4],
      ["LeftHand", [0.26, 0, 0], 5],
      ["RightShoulder", [-0.16, 0.3, 0], 1],
      ["RightArm", [-0.12, 0, 0], 7],
      ["RightForeArm", [-0.3, 0, 0], 8],
      ["RightHand", [-0.26, 0, 0], 9],
      ["LeftUpLeg", [0.13, -0.05, 0], 0],
      ["LeftLeg", [0, -0.42, 0], 11],
      ["LeftFoot", [0, -0.41, 0.06], 12],
      ["RightUpLeg", [-0.13, -0.05, 0], 0],
      ["RightLeg", [0, -0.42, 0], 14],
      ["RightFoot", [0, -0.41, 0.06], 15],
    ];
  for (const [name, pos, parent] of spec) {
    const b = new THREE.Bone();
    b.name = name;
    b.position.fromArray(pos);
    bones.push(b);
    if (parent >= 0) bones[parent].add(b);
    else root.add(b);
  }
  root.updateMatrixWorld(true);
  const skin = new THREE.MeshStandardMaterial({
    color: 0xe5ae8c,
    roughness: 0.8,
  });
  skin.name = "Skin";
  const cloth = new THREE.MeshStandardMaterial({
    color: 0x287d96,
    roughness: 0.7,
  });
  cloth.name = "Clothing";
  const dark = new THREE.MeshStandardMaterial({ color: 0x252032 });
  dark.name = "Hair";
  const make = (name, g, position, mat, bone) => {
    g.translate(...position);
    const n = g.attributes.position.count,
      si = new Uint16Array(n * 4),
      sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      si[i * 4] = bone;
      sw[i * 4] = 1;
    }
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4));
    const m = new THREE.SkinnedMesh(g, mat);
    m.name = name;
    root.add(m);
    m.bind(new THREE.Skeleton(bones));
  };
  make("Torso", new THREE.SphereGeometry(0.27, 24, 18), [0, 1.3, 0], cloth, 1);
  make(
    "Head",
    new THREE.SphereGeometry(0.18, 28, 20),
    [0, 1.75, 0.01],
    skin,
    2,
  );
  make(
    "Hair",
    new THREE.SphereGeometry(0.19, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.65),
    [0, 1.78, -0.025],
    dark,
    2,
  );
  for (const [side, sign, arm, fore, hand, thigh, shin, foot] of [
    ["Left", 1, 4, 5, 6, 11, 12, 13],
    ["Right", -1, 8, 9, 10, 14, 15, 16],
  ]) {
    make(
      side + "UpperArm",
      new THREE.CylinderGeometry(0.065, 0.075, 0.29, 12, 8).rotateZ(
        Math.PI / 2,
      ),
      [sign * 0.42, 1.5, 0],
      skin,
      arm,
    );
    make(
      side + "Forearm",
      new THREE.CylinderGeometry(0.05, 0.06, 0.25, 12, 8).rotateZ(Math.PI / 2),
      [sign * 0.7, 1.5, 0],
      skin,
      fore,
    );
    make(
      side + "Hand",
      new THREE.BoxGeometry(0.13, 0.1, 0.09, 2, 2, 2),
      [sign * 0.88, 1.5, 0],
      skin,
      hand,
    );
    make(
      side + "Thigh",
      new THREE.CylinderGeometry(0.1, 0.075, 0.42, 14, 8),
      [sign * 0.13, 0.7, 0],
      cloth,
      thigh,
    );
    make(
      side + "Shin",
      new THREE.CylinderGeometry(0.07, 0.055, 0.4, 14, 8),
      [sign * 0.13, 0.29, 0],
      skin,
      shin,
    );
    make(
      side + "Foot",
      new THREE.BoxGeometry(0.14, 0.1, 0.25, 2, 2, 2),
      [sign * 0.13, 0.05, 0.06],
      dark,
      foot,
    );
  }
  const clip = new THREE.AnimationClip("Synthetic arm motion", 2, [
    new THREE.QuaternionKeyframeTrack(
      "LeftArm.quaternion",
      [0, 1, 2],
      [0, 0, 0, 1, 0, 0, Math.sin(0.3), Math.cos(0.3), 0, 0, 0, 1],
    ),
  ]);
  return new Uint8Array(
    await new GLTFExporter().parseAsync(root, {
      binary: true,
      animations: [clip],
    }),
  );
}
