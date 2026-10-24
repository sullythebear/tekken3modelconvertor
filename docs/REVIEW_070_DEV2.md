# 0.7.0-dev.2 — recovered development build, awaiting visual acceptance

This version is not an artistically approved or verified playable Tekken character.
See [recovery inventory](RECOVERY_070_DEV2.md) for the source checkpoint.

## Implemented reconstruction

- Face: source-measured anatomical cylindrical chart, explicit paired eyelid and
  mouth support rings, constrained quality diagonal flips and surface projection.
  Source UVs are sampled through source-triangle barycentrics; their overlapping
  layout does not define the new topology. Identical upper/lower centre bones are
  insufficient: distinct A1/A3 contour anchors or manual corrections are required.
  Original contour, nose and lip anchors are projected onto the actual source.
  The resulting texture is baked against the generated triangles. This is new
  geometry, not subdivision. Unsupported anatomy explicitly retains a fallback;
  such a fallback is not counted as a reconstruction improvement.
- Hair: alpha-valid radial envelope around the measured head, with source fringe
  cards preserved in the hybrid method. Fringe simplification retains actual UV,
  transparency and rig attributes. Automatic/cards/volume/hybrid correction is
  available. This is not yet a universal solution for braids or arbitrary layers.
- Clothing/legs: outer-shell cross-sections form a continuous thigh-to-boot
  envelope with denser ankle/toe levels and a sole cap. Source correspondence is
  constrained to the measured leg footprint. Hidden inner surfaces are skipped
  by selecting the outer intersection. General multilayer garment recognition
  remains incomplete. Physical torso texture rebaking preserves printed detail.
- Attribute transfer aggregates categorical joint IDs across all skin sets,
  interpolates weights and normalizes retained influences. UVs/materials belong
  to the generated surface. Source geometry is retained unmodified.
- Optimization is a separate, explicitly lossy candidate stage. Its requested
  triangle count, region losses and unverified capacity status are reported.
  A candidate must not inherit the artistic intermediate's stale quality report.

## Reproduce

```
npm ci
npm test
npm run build
NIKKI_DIR=/path/to/extracted/model REVIEW_OUTPUT=artifacts/recovery-review-dev2 npm run test:review
```

On PowerShell set `$env:NIKKI_DIR` and `$env:REVIEW_OUTPUT` first. Nikki remains a
private local input. Cesium Man must first be fetched by `npm run test:reference`;
the pinned reference hash and attribution are validated. The authored short-hair
and crest-hair fixtures need no downloads. Seven stages run for four models.

To render an existing result inventory into the gallery without rerunning it:
`REPORT_ONLY=1 REVIEW_OUTPUT=artifacts/recovery-review-dev2 node scripts/reconstruction-review.mjs`.
To copy only permitted evidence extensions into `public-review`, also set
`PUBLISH_REVIEW=1`. Preparation packages and raw models/textures are excluded.

The 0.6.0 and dev.1 comparison columns execute the preserved algorithm routes
inside the current application, rather than launching old binary executables.
All stages use identical camera definitions, scale, resolution and lighting.
The HTML links full-size front/back/side/quarter, face, hair, boot, wireframe and
motion images. Missing rig-specific views are explicitly marked unavailable.

## Remaining acceptance work

The new face is angular and the printed outfit is clearer, but eye rims, jaw/lip
shape, hair clumps/gaps, ankle/heel texture leakage and overlap at shorts require
human review. Low-budget optimization can discard important facial/hair detail.
Numeric silhouette scores and a green suite do not approve artistic quality.

The eight diagnostic poses include idle, walk, crouch, reach, guard, punch, kick
and head/lip movement. These are local source-rig diagnostics, not Tekken motions.
Cesium additionally supplies a real source clip. No real Tekken animation,
Nina-capacity validation, game loading or gameplay was performed.

For local Nina P1 validation supply the matching USA `SLUS_004.02`, 3DMK record
111 and ARC record 113, or use the existing local disc extraction/import route.
Do not publish these copyrighted bytes. Original references for Nina/Jin/
Hwoarang/Xiaoyu/Paul are still needed to calibrate actual Namco topology and
budgets using the existing local reference measurement route. 900 is a test
request, not a claimed Tekken limit.

The Windows publishing workflow builds the portable EXE, checks its ASAR and PE,
then launches that exact EXE to import/convert/export an authored fixture before
publishing a prerelease. A Linux cross-build alone cannot pass this Windows test.

## Additional recovery checks

The full suite was rerun after the detached-hand and facial-picking regressions:
113 tests passed, zero failed/skipped. Actual browser clicks placed a nose
landmark on Nikki's Head material, excluding hair/eyes sharing the same rig;
its reusable profile was exported/reset/imported and compared. The authored
crest character additionally passed a full project ZIP save/open round-trip.
Nikki's full 222 MiB-source project ZIP round-trip exceeded the test's initial
30-second download timeout and remains unverified; its smaller correction
profile round-trip passed. Presets/project persistence and unnamed source
skeleton mapping UI tests were also rerun successfully.

The Windows workflow's first attempt built successfully and passed unit and
desktop IPC tests, then failed distribution verification; it did not execute
the portable smoke test or publish a release. Subsequent verifier errors are
reported as explicit public CI annotations, while retaining a failing exit code.
