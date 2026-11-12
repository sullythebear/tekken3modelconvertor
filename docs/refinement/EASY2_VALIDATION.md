# Easy Refinement 2.0 — development checkpoint

Nieuwste aanvulling: [Easy Refinement 2.1 — Verf en retouchvalidatie](PAINT_VALIDATION.md). Dit verslag hieronder beschrijft de eerdere ontwikkelfase.

Candidate: `0.8.0-beta.2-refinement.5`.
Branch: `development/080-interactive-refinement`.
Application/acceptance checkpoint: `393aed4` (application changes through `b680174`).

This checkpoint improves the existing explicit repair workflow. It is **not a complete Easy Refinement 2.0 delivery** and is not a regular stable/beta release.

## Proven implementation causes and fixes

1. Easy shape pointer-up used to call Apply itself. It now retains an actual isolated geometry draft until explicit confirmation.
2. Clicking a tool could immediately process an old mask. Tool choice now changes intent/instructions only.
3. The paint overlay could cover the provisional shape after the stroke. The ended-stroke preview exposes the actual geometry; the same-camera Before/After comparison remains available.
4. Tool workflows differed. A common Preview action now dispatches to the existing shape/SOURCE texture/protection/assessment implementations.
5. Applying retained the temporary mask. Easy Apply now clears it and keeps the tool selected.
6. Identical SOURCE textures could become empty history entries. Interactive proposals now require regional mean or maximum error improvement (epsilon only), or improved alpha. Low-level baking/replay remains compatible with identical textures.
7. Failure messages suggested lower strength even for missing textures or technical problems. The shared feedback layer distinguishes those causes, keeps exact technical details in Advanced, and never changes repair decisions.

SOURCE remains immutable. The preview uses the same real repair data that is published to conversion state, serialized in the project, replayed on reopening, and exported into GLB. No schema upgrade, invented geometry or character-name rules were introduced.

## Local validation

- 409/409 Node tests passed, including twelve feedback cases and the unchanged-texture refusal.
- Electron shape acceptance: multiple strokes remain provisional, explicit Apply creates one shape command, temporary mask clears, tool remains selected, undo/redo passes, cold reopening and independent GLB position readback are exact.
- Direct SOURCE Retoucheerpenseel acceptance: tool chosen before paint, no implicit proposal on tool choice, actual preview/apply, cold texture pixels and decoded GLB PNG pixels exact.
- Combined SOURCE repair and shape-only SOURCE repair: cold reopening and independent export checks passed.
- Own synthetic editor images inspected; no commercial visual/artist acceptance claimed.
- 1366×768, 1920×1080, 2560×1440 and Electron zoom 100/125/150% exercised. Renderer zoom does not certify all physical-monitor DPI configurations.
- Local renderer CPU observations on the own synthetic fixture: paint median 5.3 ms/max 19 ms; provisional manual geometry median 15.8 ms/max 36.6 ms. These are not GPU frame latency or demonstrated speedups.
- Synthetic damaged albedo mean error: 75.5 → 7.83; unchanged outside-atlas pixels: 0.
- Synthetic shape mean surface distance: 0.02120949 → 0.01783874; position changes outside the selection: 0. Numeric improvement is not general artistic approval.

## Explicitly incomplete

- No environment texture inpainting/patch healing. Existing texture repair samples SOURCE, not surrounding donor patches.
- No texture Clone Stamp, Alt-click donor, cross-triangle donor transport, or geometry cloning.
- Detail protection affects polygon optimization; it does not yet act as a universal lock against subsequent manual/SOURCE repairs. The UI/manual say this explicitly.
- Combined shape+texture SOURCE repair still uses two history records, unlike a directly applied shape correction. It is not a single grouped undo transaction.
- No new commercial character visual acceptance. Private CI regressions do not substitute for human image review.
- Normal-offset thickness is conservative local surface displacement, not inferred complete anatomical cross-section reconstruction. Small changes on an unlit surface viewed head-on can be less visible: inspect another angle or wireframe.

Environment healing and Clone Stamp need new deterministic donor sampling, boundary validation, pixel isolation, replay and export acceptance. No active buttons claim those functions work. Main, existing releases, SOURCE and private assets remain protected.

## Windows validation

SUCCESS: https://github.com/sullythebear/tekken3modelconvertor/actions/runs/43075980216

Actual portable EXE startup/conversion/export smoke passed. Full interactive workflows ran against the same packaged win-unpacked app, including cold project reopening, direct original retouch, shape preview/Apply, undo/redo, independent GLB readback, original UI and real file dialogs. Native synthetic fixtures passed without a gameplay claim. Private Nikki project integrity, private commercial conversions, paired beta1 comparisons and access-checked unpublished review all passed. No private review was published.

Artifact: [Windows EXE + owned synthetic HTML report](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/43075980216/artifacts/13881767616).
Name: `ConversionStudio-easy-refinement-393aed40c00d16fab47fbb5d3a228222f4dd80f1` (108 MB, 30-day retention).
Artifact SHA256: `59d398beb2da26e387095881eb44510a4aab3498f6d03bc9bb04e4020f9f7072`.

GitHub login is required for the artifact download. Metadata/digest and successful upload were checked; this environment's anonymous artifact request returns HTTP 404, so the ZIP was not independently authenticated-downloaded here. Do not describe that as independent download verification.

Main remains `ca7e89470df1c893beffe9c3fd2c8bb4ad8c8e84`. No release or existing tag was modified.

Do not use earlier cancelled candidate runs as validation of this candidate.
