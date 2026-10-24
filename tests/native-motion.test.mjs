import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {nativePoseFrames, inspectNativeMotion, nativeBoneSegments} from '../src/core/native-motion.js';
import {evaluateTerms} from '../src/core/donor.js';
const frame = y => new THREE.Matrix4().makeTranslation(0, y, 0);
const profile = () => ({frames: {3: frame(0), 1: frame(1), 19: frame(2)}, roleRows: {hips: 3, spine: 1, head: 19}, rowRoles: {3: 'hips', 1: 'spine', 19: 'head'}});
const term = (row, position, weight = 1) => ({vertex: {row, position}, weight});
test('Native diagnostic frames inherit parent rotations around bind pivots and do not mutate calibration', () => {
  const p = profile(), original = p.frames[19].toArray();
  const posed = nativePoseFrames(p, {spine: [0, 0, Math.PI / 2]});
  const head = new THREE.Vector3().setFromMatrixPosition(posed[19]);
  assert.ok(head.distanceTo(new THREE.Vector3(-1, 1, 0)) < 1e-10);
  assert.deepEqual(p.frames[19].toArray(), original);
  assert.ok(nativeBoneSegments(p, posed).every(Number.isFinite));
  for (const [row, matrix] of Object.entries(nativePoseFrames(p, 'bind')))
    assert.ok(matrix.equals(p.frames[row]));
});
test('Native motion diagnostics evaluate cache blend provenance and expose moving seam gaps', () => {
  const p = profile(), a = [term(19, [1, 0, 0])], b = [term(1, [1, 1, 0])];
  const posed = nativePoseFrames(p, {head: [0, 0, Math.PI / 2]});
  const blend = evaluateTerms([term(19, [1, 0, 0], .5), term(1, [1, 1, 0], .5)], posed);
  assert.ok(blend.distanceTo(new THREE.Vector3(.5, 2.5, 0)) < 1e-10);
  const decoded = {rows: [{polygons: [{vertices: [a, [term(19, [0, 1, 0])], [term(19, [0, 0, 1])]]}]}], constraints: [{a,b}]};
  const report = inspectNativeMotion(decoded, p, ['bind', {head: [0, 0, Math.PI / 2]}]);
  assert.equal(report.gameAnimationVerified, false);
  assert.equal(report.poses[0].maxSeamGap, 0);
  assert.ok(Math.abs(report.poses[1].maxSeamGap - Math.SQRT2) < 1e-10);
  assert.ok(Math.abs(report.poses[1].maxEdgeStretch - 1) < 1e-10);
  assert.ok(report.poses[1].maxDisplacement > 1);
  assert.equal(report.poses[1].finite, true);
});
test('Native diagnostic rejects unknown poses, nonfinite angles and missing row mappings', () => {
  const p = profile();
  assert.throws(() => nativePoseFrames(p, 'Unknown'), /Unknown/);
  assert.throws(() => nativePoseFrames(p, {head: [NaN, 0, 0]}), /Invalid/);
  assert.throws(() => nativePoseFrames(p, {other: [0, 0, 0]}), /Invalid/);
  delete p.rowRoles[19];
  assert.throws(() => nativePoseFrames(p, 'bind'), /No anatomical/);
});
