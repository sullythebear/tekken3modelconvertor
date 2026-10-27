import test from 'node:test';
import assert from 'node:assert/strict';
import {probeProvenance, requireProbeConversion} from '../scripts/private-probe-contract.mjs';

test('Private diagnostic provenance includes only allowlisted source/run identifiers', () => {
  const sha = 'a'.repeat(40);
  assert.deepEqual(probeProvenance({GITHUB_SHA:sha,GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'2',CHARACTER_TEST_DOWNLOAD_URL:'SECRET'}),
    {sourceCommit:sha,workflowRunId:'123',workflowRunAttempt:'2'});
});
test('Malformed CI identifiers cannot leak arbitrary environment text', () => {
  assert.deepEqual(probeProvenance({GITHUB_SHA:'private-path',GITHUB_RUN_ID:'https://private.invalid',GITHUB_RUN_ATTEMPT:'secret'}),
    {sourceCommit:null,workflowRunId:null,workflowRunAttempt:null});
});
test('A previous successful conversion cannot satisfy a new preset probe', () => {
  assert.throws(() => requireProbeConversion({conversionPreset:'baseline',triangles:100},'authentic'), /stale/);
});
test('Missing, failed, empty or nonfinite conversions fail numerical probes', () => {
  for (const value of [null,{failed:true},{conversionPreset:'authentic',triangles:0},{conversionPreset:'authentic',triangles:Infinity}]) {
    assert.throws(() => requireProbeConversion(value,'authentic'), /invalid/);
  }
});
test('Valid preparation with unavailable atlas stays a numerical pass, not export acceptance', () => {
  const value={conversionPreset:'authentic',triangles:100,atlas:false};
  assert.equal(requireProbeConversion(value,'authentic'),value);
});
