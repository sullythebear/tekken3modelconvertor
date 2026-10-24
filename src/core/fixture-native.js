// Authored procedural fixture. This is NOT Nikki or an original game donor.
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { write3DMK } from "./native.js";
import { writeTIM, writeARC } from "./ps1.js";
import { digest } from "./bind.js";
export async function nativeSyntheticFixture() {
  const root = new THREE.Group(),
    hips = new THREE.Bone();
  hips.name = "Hips";
  root.add(hips);
  const bones = [hips];
  for (const [name, pos] of [
    ["Spine", [0, 10, 0]],
    ["Head", [0, 20, 0]],
    ["LeftArm", [5, 10, 0]],
    ["RightArm", [-5, 10, 0]],
    ["LeftUpLeg", [2, -2, 0]],
    ["RightUpLeg", [-2, -2, 0]],
  ]) {
    const b = new THREE.Bone();
    b.name = name;
    b.position.fromArray(pos);
    hips.add(b);
    bones.push(b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([-10, 0, 2, 30, 0, 2, -10, 40, 2], 3),
  );
  g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1], 2));
  g.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4),
  );
  g.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4),
  );
  const mesh = new THREE.SkinnedMesh(
    g,
    new THREE.MeshStandardMaterial({ color: 0xff0000, side: THREE.DoubleSide }),
  );
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  const raw = new Uint8Array(16000),
    v = new DataView(raw.buffer);
  v.setUint32(0, 27, true);
  v.setUint32(4, 100, true);
  v.setUint32(8, 0x4b4d4433, true);
  v.setUint32(16, 1536, true);
  const donor = write3DMK({
      donor: raw,
      parts: [
        {
          row: 1,
          positions: [
            [0, 0, 0],
            [10, 0, 0],
            [0, 0, 10],
          ],
          triangles: [[0, 1, 2]],
          uvs: [
            [0, 0],
            [15, 0],
            [0, 15],
          ],
          material: 64,
        },
      ],
      maxBytes: 16000,
    }).model,
    palette = new Uint16Array(16);
  palette[1] = 0x7c00;
  const arc = writeARC([
      new Uint8Array([17, 23, 42]),
      writeTIM({
        width: 16,
        height: 16,
        palette,
        indices: new Uint8Array(256).fill(1),
        clutY: 1,
      }),
    ]),
    spine = new THREE.Matrix4()
      .makeBasis(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(1, 0, 0),
      )
      .setPosition(0, 10, 0),
    pelvis = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(-1, 0, 0),
    );
  return {
    source: new Uint8Array(
      await new GLTFExporter().parseAsync(root, { binary: true }),
    ),
    donor,
    arc,
    profile: {
      schema: "t3cs-donor-bind/1",
      donorSha256: await digest(donor),
      frames: { 1: spine.toArray(), 3: pelvis.toArray() },
      provenance: "Procedural fixture. NOT Nina, NOT a runtime capture.",
    },
  };
}

export async function nativeHumanoidFixture() {
  const { syntheticCharacter } = await import("./fixture.js"),
    { importCharacter } = await import("./importer.js"),
    { sourceBindFrames } = await import("./bind.js"),
    { ROWS } = await import("./skeleton.js");
  const source = await syntheticCharacter(),
    imported = await importCharacter([
      { name: "procedural-humanoid.glb", data: source },
    ]),
    rawFrames = {};
  for (const [role, row] of Object.entries(ROWS)) {
    const bone = imported.skeleton.mapping[role];
    if (bone) rawFrames[row] = bone.matrixWorld.clone();
  }
  const anatomy = sourceBindFrames(imported.root, {
      roleRows: ROWS,
      frames: rawFrames,
    }),
    frames = {};
  for (const [role, matrix] of Object.entries(anatomy.frames)) {
    const m = matrix.clone(),
      p = new THREE.Vector3().setFromMatrixPosition(m).multiplyScalar(1000);
    m.setPosition(p);
    frames[ROWS[role]] = m;
  }
  frames[20] = frames[19].clone();
  const parts = [],
    tiles = [];
  const add = (row, geometry, position) => {
    geometry.translate(...position);
    const p = geometry.attributes.position,
      uv = geometry.attributes.uv,
      inv = frames[row].clone().invert(),
      positions = [];
    for (let i = 0; i < p.count; i++)
      positions.push(
        new THREE.Vector3()
          .fromBufferAttribute(p, i)
          .multiplyScalar(1000)
          .applyMatrix4(inv)
          .toArray()
          .map(Math.round),
      );
    const ix = geometry.index,
      triangles = [];
    for (let i = 0; i < ix.count; i += 3)
      triangles.push([ix.getX(i), ix.getX(i + 1), ix.getX(i + 2)]);
    const index = parts.length,
      x = (index % 4) * 32,
      y = Math.floor(index / 4) * 32,
      palette = new Uint16Array(16);
    palette[1] = 0x4210;
    tiles.push(
      writeTIM({
        width: 32,
        height: 32,
        palette,
        indices: new Uint8Array(1024).fill(1),
        x: x / 4,
        y,
        clutX: index * 16,
        clutY: 1,
      }),
    );
    parts.push({
      row,
      positions,
      triangles,
      uvs: Array.from({ length: uv.count }, (_, i) => [
        x + 2 + Math.round(uv.getX(i) * 27),
        y + 2 + Math.round((1 - uv.getY(i)) * 27),
      ]),
      material: 64 + index,
    });
    geometry.dispose();
  };
  add(1, new THREE.SphereGeometry(0.27, 8, 6), [0, 1.3, 0]);
  add(19, new THREE.SphereGeometry(0.18, 8, 6), [0, 1.75, 0.01]);
  add(
    20,
    new THREE.SphereGeometry(0.19, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.65),
    [0, 1.78, -0.025],
  );
  for (const [sign, upper, lower, hand, thigh, shin, foot] of [
    [1, 12, 13, 14, 5, 6, 7],
    [-1, 16, 17, 18, 8, 9, 10],
  ]) {
    add(
      upper,
      new THREE.CylinderGeometry(0.065, 0.075, 0.29, 6, 1).rotateZ(Math.PI / 2),
      [sign * 0.42, 1.5, 0],
    );
    add(
      lower,
      new THREE.CylinderGeometry(0.05, 0.06, 0.25, 6, 1).rotateZ(Math.PI / 2),
      [sign * 0.7, 1.5, 0],
    );
    add(hand, new THREE.BoxGeometry(0.13, 0.1, 0.09), [sign * 0.88, 1.5, 0]);
    add(thigh, new THREE.CylinderGeometry(0.1, 0.075, 0.42, 6, 1), [
      sign * 0.13,
      0.7,
      0,
    ]);
    add(shin, new THREE.CylinderGeometry(0.07, 0.055, 0.4, 6, 1), [
      sign * 0.13,
      0.29,
      0,
    ]);
    add(foot, new THREE.BoxGeometry(0.14, 0.1, 0.25), [
      sign * 0.13,
      0.05,
      0.06,
    ]);
  }
  const donor = new Uint8Array(65536),
    v = new DataView(donor.buffer);
  v.setUint32(0, 27, true);
  v.setUint32(4, 100, true);
  v.setUint32(8, 0x4b4d4433, true);
  v.setUint32(16, 1536, true);
  const bytes = write3DMK({ donor, parts, maxBytes: 65536 }).model;
  imported.dispose();
  return {
    source,
    donor: bytes,
    arc: writeARC([new Uint8Array([17, 23, 42]), ...tiles]),
    profile: {
      schema: "t3cs-donor-bind/1",
      donorSha256: await digest(bytes),
      frames: Object.fromEntries(
        Object.entries(frames).map(([row, m]) => [row, m.toArray()]),
      ),
      provenance: "Authored procedural humanoid; NOT Nina or any game model.",
    },
  };
}
