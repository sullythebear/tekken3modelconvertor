import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {browserSession} from './browser.mjs';
const session = await browserSession();
await mkdir('artifacts/source-mapping', {recursive: true});
try {
  const {page} = session;
  await page.selectOption('#art-preset','baseline'); // Keep mapping validation independent of art reconstruction.
  const profile = await page.evaluate(async () => {
    const t = window.studioTest, f = await t.nativeHumanoidFixture();
    await t.load([{name: 'authored-human.glb', data: f.source}]);
    await t.loadDonor([{name: 'AUTHORED.3dm', data: f.donor}, {name: 'AUTHORED.arc', data: f.arc}]);
    await t.loadBindProfile(f.profile);
    const roles = Object.fromEntries(t.source.skeleton.report.mapping.map(m => [m.role, t.source.skeleton.bones.findIndex(b => b.name === m.name)]));
    const bones = t.source.skeleton.bones;
    for (const [i, b] of bones.entries()) b.name = `UnfamiliarJoint_${i}`;
    // The profile uses imported rig-local transforms, not transient UUIDs.
    return {roles};
  });
  await page.locator('#source-mapping').evaluate(e => e.open = true);
  // Force a duplicate and verify failure is atomic before applying the valid mapping.
  const first = Object.entries(profile.roles)[0];
  await page.locator(`#mapping-editor select[data-role="${first[0]}"]`).selectOption(String(profile.roles.head));
  await page.click('#mapping-apply');
  assert.match(await page.locator('#status').innerText(), /multiple anatomical roles/);
  for (const [role, index] of Object.entries(profile.roles))
    await page.locator(`#mapping-editor select[data-role="${role}"]`).selectOption(String(index));
  await page.click('#mapping-apply');
  assert.equal(await page.evaluate(() => window.studioTest.source.skeleton.report.mapping.every(m => m.confidence === 'manual')), true);
  const downloadPromise = page.waitForEvent('download');
  await page.click('#mapping-save');
  const download = await downloadPromise;
  await download.saveAs('artifacts/source-mapping/source-mapping.json');
  await page.click('#mapping-reset');
  assert.equal(await page.evaluate(() => window.studioTest.source.skeleton.report.mapping.length), 0);
  await page.locator('#mapping-file').setInputFiles('artifacts/source-mapping/source-mapping.json');
  await page.waitForFunction(() => window.studioTest.source.skeleton.report.mapping.length === 17);
  await page.click('#native-build');
  await page.waitForFunction(() => Boolean(window.studioTest.nativeCandidate), null, {timeout: 120000});
  const report = await page.evaluate(() => window.studioTest.nativeCandidate.report);
  assert.ok(report.topology.drawnRows >= 15);
  assert.equal(report.gameVerified, false);
  assert.equal(await page.locator('#mapping-apply').isDisabled(), true);
  const beforeMotion = await page.evaluate(() => {
    const t = window.studioTest;
    window.motionBytes = t.nativeCandidate.model.slice();
    return {left: Array.from(t.sourceView.root.children[0].geometry.attributes.position.array), right: t.resultView.root.children.flatMap(m => Array.from(m.geometry.attributes.position.array))};
  });
  await page.locator('#native-pose').selectOption('guard');
  const afterMotion = await page.evaluate(() => {
    const t = window.studioTest;
    return {
      left: Array.from(t.sourceView.root.children[0].geometry.attributes.position.array),
      right: t.resultView.root.children.flatMap(m => Array.from(m.geometry.attributes.position.array)),
      unchanged: window.motionBytes.every((v, i) => t.nativeCandidate.model[i] === v),
      camera: t.sourceView.camera.position.distanceTo(t.resultView.camera.position),
      scaleDifference: t.sourceView.holder.scale.distanceTo(t.resultView.holder.scale),
    };
  });
  assert.deepEqual(afterMotion.left, beforeMotion.left);
  assert.notDeepEqual(afterMotion.right, beforeMotion.right);
  assert.equal(afterMotion.unchanged, true);
  assert.equal(afterMotion.camera, 0);
  assert.equal(afterMotion.scaleDifference, 0);
  assert.equal(report.motionDiagnostics.gameAnimationVerified, false);
  assert.equal(report.motionDiagnostics.poses.length, 4);
  assert.ok(report.motionDiagnostics.poses.every(p => p.finite));
  await page.check('#skeleton');
  await page.check('#wireframe');
  assert.equal(await page.evaluate(() => window.studioTest.resultView.root.children.every(m => m.material.wireframe)), true);
  await page.screenshot({path: 'artifacts/source-mapping/native-guard.png', fullPage: true});
  await page.locator('#native-pose').selectOption('bind');
  assert.deepEqual(await page.evaluate(() => window.studioTest.resultView.root.children.flatMap(m => Array.from(m.geometry.attributes.position.array))), beforeMotion.right);
  await page.click('#source-pose');
  assert.equal(await page.locator('#mapping-apply').isDisabled(), false);
  await page.click('#mapping-reset');
  assert.equal(await page.evaluate(() => window.studioTest.nativeCandidate), null);
  assert.equal(await page.locator('#native-export').isDisabled(), true);
  assert.deepEqual(session.errors, []);
  await page.locator('#mapping-editor').scrollIntoViewIfNeeded();
  await page.screenshot({path: 'artifacts/source-mapping/editor.png', fullPage: true});
  await writeFile('artifacts/source-mapping/results.json', JSON.stringify({status: 'PASS', checks: ['duplicate atomic rejection', 'unnamed rig mapping', 'save/reset/load', 'native donor reconstruction', 'candidate invalidation', 'native multi-pose diagnostics and unchanged export bytes'], report}, null, 2));
  console.log('Source mapping UI: unnamed rig rebuilt on 15 donor rows; profile round-trip and stale candidate invalidation passed.');
} finally { await session.close(); }
