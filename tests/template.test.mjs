import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { write3DMK, read3DMK } from "../src/core/native.js";
import {
  decodeDonor,
  decodeTextureArchive,
  materialTexel,
} from "../src/core/donor.js";
import { digest, parseBindProfile } from "../src/core/bind.js";
import { SurfaceIndex, triangleRecord } from "../src/core/surface.js";
import { reconstructOnDonor, projectTemplate } from "../src/core/template.js";
import {
  nativeRelocations,
  rebuildNativeNormals,
} from "../src/core/native-rebuild.js";
import { writeTIM, writeARC } from "../src/core/ps1.js";
function modelFixture() {
  const donor = new Uint8Array(16000),
    v = new DataView(donor.buffer);
  v.setUint32(0, 27, true);
  v.setUint32(4, 100, true);
  v.setUint32(8, 0x4b4d4433, true);
  v.setUint32(16, 1536, true);
  return write3DMK({
    donor,
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
  }).model;
}
function sourceFixture() {
  const root = new THREE.Group(),
    hips = new THREE.Bone();
  hips.name = "Hips";
  root.add(hips);
  const specification = [
      ["Spine", [0, 10, 0]],
      ["Head", [0, 20, 0]],
      ["LeftArm", [5, 10, 0]],
      ["RightArm", [-5, 10, 0]],
      ["LeftUpLeg", [2, -2, 0]],
      ["RightUpLeg", [-2, -2, 0]],
    ],
    bones = [hips];
  for (const [name, pos] of specification) {
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
  const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 }),
    mesh = new THREE.SkinnedMesh(g, mat);
  root.add(mesh);
  root.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones));
  return { root };
}
async function profileFor(donor) {
  const spine = new THREE.Matrix4()
      .makeBasis(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(1, 0, 0),
      )
      .setPosition(0, 10, 0),
    hips = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(0, -1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(-1, 0, 0),
    );
  return {
    schema: "t3cs-donor-bind/1",
    donorSha256: await digest(donor),
    frames: { 1: spine.toArray(), 3: hips.toArray() },
    provenance: "procedural test calibration; NOT a Nina calibration",
  };
}
function archiveFixture() {
  const palette = new Uint16Array(16);
  palette[1] = 0x7c00;
  return writeARC([
    new Uint8Array([17, 23, 42]),
    writeTIM({
      width: 16,
      height: 16,
      palette,
      indices: new Uint8Array(256).fill(1),
      clutY: 1,
    }),
  ]);
}
test("CPU BVH nearest points and barycentrics are geometrically correct", () => {
  const record = triangleRecord([
      new THREE.Vector3(0, 0, 2),
      new THREE.Vector3(10, 0, 2),
      new THREE.Vector3(0, 10, 2),
    ]),
    surface = new SurfaceIndex([record]),
    hit = surface.nearest(new THREE.Vector3(2, 3, 8));
  assert.deepEqual(hit.point.toArray(), [2, 3, 2]);
  assert.ok(Math.abs(hit.distance - 6) < 1e-8);
  assert.ok(
    hit.barycentric.distanceTo(new THREE.Vector3(0.5, 0.2, 0.3)) < 1e-8,
  );
  assert.equal(surface.nearest(new THREE.Vector3(2, 3, 8), 5), null);
});
test("Bind input is donor-hash bound and rejects scaling, reflection and missing rows", async () => {
  const donor = modelFixture(),
    d = decodeDonor(donor),
    profile = await profileFor(donor);
  assert.equal(
    (await parseBindProfile(profile, d)).verification,
    "external-frame-input-not-game-tested",
  );
  await assert.rejects(
    parseBindProfile({ ...profile, donorSha256: "wrong" }, d),
    /hash/,
  );
  const bad = structuredClone(profile);
  bad.frames[1][0] = 2;
  await assert.rejects(parseBindProfile(bad, d), /rigid/);
  await assert.rejects(
    parseBindProfile({ ...profile, frames: {} }, d),
    /misses row/,
  );
});
test("Donor reconstruction retargets a source, projects actual vertices, bakes original UVs, preserves ARC members and decodes native output", async () => {
  const donor = modelFixture(),
    profile = await profileFor(donor),
    arc = archiveFixture(),
    source = sourceFixture(),
    before = source.root.children
      .at(-1)
      .geometry.attributes.position.array.slice();
  const result = await reconstructOnDonor({
    source,
    donor,
    textureARC: arc,
    bindProfile: profile,
  });
  assert.equal(result.report.gameVerified, false);
  assert.equal(result.report.topology.triangles, 1);
  const decoded = decodeDonor(result.model);
  for (const v of decoded.ownVertices) assert.equal(v.position[1], 2);
  const colors = decodeTextureArchive(result.arc);
  assert.deepEqual(colors.entries[0], new Uint8Array([17, 23, 42]));
  assert.deepEqual(materialTexel(colors, 64, 2, 2).color, [255, 0, 0, 255]);
  assert.equal(result.arc.length, arc.length);
  assert.ok(result.model.length <= donor.length);
  assert.deepEqual(
    source.root.children.at(-1).geometry.attributes.position.array,
    before,
  );
  assert.ok(result.report.normals.normalMode === "rebuilt-flat");
});
test("Native projection fails if an anatomical region is missing or projection exceeds a limit", async () => {
  const donor = modelFixture(),
    decoded = decodeDonor(donor),
    profile = await parseBindProfile(await profileFor(donor), decoded);
  assert.throws(
    () => projectTemplate(decoded, profile, new Map()),
    /No source surface/,
  );
  const rec = triangleRecord([
    new THREE.Vector3(0, 0, 100),
    new THREE.Vector3(10, 0, 100),
    new THREE.Vector3(0, 10, 100),
  ]);
  assert.throws(
    () =>
      projectTemplate(
        decoded,
        profile,
        new Map([["spine", new SurfaceIndex([rec])]]),
        { maxProjectionDistance: 1 },
      ),
    /projection range/,
  );
});
test("Normal rebuild produces complete header relocations and stays inside measured budgets", async () => {
  const donor = modelFixture(),
    profile = await parseBindProfile(
      await profileFor(donor),
      decodeDonor(donor),
    ),
    r = rebuildNativeNormals(donor, profile.frames);
  assert.equal(r.report.packetBytes, 32);
  assert.equal(r.report.normalMode, "rebuilt-flat");
  assert.equal(nativeRelocations(r.model).length, r.relocations.length / 4);
  assert.throws(
    () => rebuildNativeNormals(donor, profile.frames, { maxPacketBytes: 31 }),
    /packets/,
  );
  const row = read3DMK(r.model).rows[1],
    v = new DataView(r.model.buffer);
  assert.equal(v.getUint32(row[0] + 12, true), 1);
});
