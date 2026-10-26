import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { MeshoptSimplifier } from "meshoptimizer";
import {
  jointDisplacementFields,
  armDisplacementFields,
} from "../src/core/joint-fields.js";
import { configureSkinning } from "../src/core/skinning.js";
import { reduceBodySurface } from "../src/core/body-surface.js";

function rig() {
  const g = new THREE.BufferGeometry();
  g.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0], 3),
  );
  g.setAttribute(
    "skinIndex",
    new THREE.Uint16BufferAttribute([0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0], 4),
  );
  g.setAttribute(
    "skinWeight",
    new THREE.Float32BufferAttribute(
      [0.2, 0.3, 0, 0, 0.2, 0.3, 0, 0, 0.2, 0.3, 0, 0],
      4,
    ),
  );
  g.setAttribute(
    "joints_1",
    new THREE.Uint16BufferAttribute([2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0], 4),
  );
  g.setAttribute(
    "weights_1",
    new THREE.Float32BufferAttribute(
      [0.5, 0, 0, 0, 0.5, 0, 0, 0, 0.5, 0, 0, 0],
      4,
    ),
  );
  const mesh = new THREE.SkinnedMesh(g, new THREE.MeshBasicMaterial()),
    parent = new THREE.Bone(),
    joint = new THREE.Bone(),
    child = new THREE.Bone();
  parent.position.set(0.2, 0.3, 0);
  joint.position.x = 0.4;
  joint.rotation.z = 0.2;
  child.position.y = 0.5;
  parent.add(joint);
  joint.add(child);
  mesh.add(parent);
  mesh.rotation.y = 0.3;
  mesh.scale.setScalar(1.2);
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton([parent, joint, child]));
  configureSkinning(mesh);
  return { mesh, g, joint, parent };
}

test("Immutable virtual joint fields match actual full-influence LBS under a rotated/scaled bind hierarchy", () => {
  const { mesh, g, joint } = rig(),
    axis = new THREE.Vector3(0, 0, 1),
    angle = 0.7,
    scale = 2,
    before = g.toJSON(),
    quaternion = joint.quaternion.clone(),
    matrices = mesh.skeleton.bones.map((b) => b.matrixWorld.toArray());
  const fields = jointDisplacementFields(
    mesh,
    g,
    [[{ joint, axis, angle }]],
    scale,
  );
  assert.equal(fields.size, 3);
  assert.equal(fields.poses, 1);
  assert.equal(fields.joints, 1);
  assert.deepEqual(g.toJSON(), before);
  assert.deepEqual(
    mesh.skeleton.bones.map((b) => b.matrixWorld.toArray()),
    matrices,
  );
  assert.ok(joint.quaternion.equals(quaternion));
  const local = axis
    .clone()
    .applyQuaternion(joint.getWorldQuaternion(new THREE.Quaternion()).invert());
  joint.quaternion.multiply(
    new THREE.Quaternion().setFromAxisAngle(local, angle),
  );
  mesh.updateMatrixWorld(true);
  mesh.skeleton.update();
  for (let v = 0; v < 3; v++) {
    const actual = mesh.getVertexPosition(v, new THREE.Vector3()),
      predicted = new THREE.Vector3()
        .fromBufferAttribute(g.attributes.position, v)
        .addScaledVector(
          new THREE.Vector3().fromArray(fields.values, v * 3),
          scale,
        );
    assert.ok(actual.distanceTo(predicted) < 1e-6);
  }
});
test("Unknown arm anatomy safely retains the ordinary simplification path", () => {
  const { mesh, g } = rig();
  assert.equal(armDisplacementFields(mesh, g), null);
  assert.equal(jointDisplacementFields(null, g, [], 1), null);
  assert.throws(
    () =>
      jointDisplacementFields(
        mesh,
        g,
        [
          [
            {
              joint: mesh.skeleton.bones[0],
              axis: new THREE.Vector3(),
              angle: 1,
            },
          ],
        ],
        1,
      ),
    /rotation/,
  );
});
test("Pose-aware attributes stay within the actual Meshoptimizer 32-channel contract", async () => {
  await MeshoptSimplifier.ready;
  const g = new THREE.PlaneGeometry(1, 1, 12, 12),
    count = g.attributes.position.count,
    joints = [],
    weights = [];
  for (let v = 0; v < count; v++) {
    joints.push(v % 30, 0, 0, 0);
    weights.push(0.2, 0.8, 0, 0);
  }
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(joints, 4));
  g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
  let called = false;
  const simplifier = {
    simplifyWithAttributes(...args) {
      called = true;
      assert.ok(args[5].length <= 32);
      assert.equal(args[4], args[5].length);
      return MeshoptSimplifier.simplifyWithAttributes(...args);
    },
  };
  const fields = {
    values: new Float32Array(count * 6),
    size: 6,
    poses: 2,
    joints: 2,
  };
  const result = reduceBodySurface(g, "leftShoulder", simplifier, {
    target: 48,
    deformationFields: fields,
  });
  assert.ok(called);
  assert.equal(result.deformationPoses, 2);
  assert.equal(result.deformationAttributeCount, 6);
  assert.equal(result.integrity.unexpectedOpenEdges, 0);
});

test("Two measured displacement magnitudes retain the full 24-bone simplification capacity and skip static geometry", () => {
  const { mesh, g, joint, parent } = rig();
  joint.userData.t3csRole = "leftUpperArm";
  mesh.skeleton.bones[2].userData.t3csRole = "leftLowerArm";
  const fields = armDisplacementFields(mesh, g);
  assert.equal(fields.size, 2);
  assert.equal(fields.poses, 2);
  assert.match(fields.kind, /magnitude/);
  assert.ok(fields.values.some((v) => v > 0));
  assert.ok(5 + 24 + 1 + fields.size <= 32);
  const staticG = g.clone();
  for (const name of ["skinIndex", "joints_1"])
    staticG.attributes[name].array.fill(0);
  assert.equal(armDisplacementFields(mesh, staticG), null);
  assert.equal(parent.children[0], joint);
});
