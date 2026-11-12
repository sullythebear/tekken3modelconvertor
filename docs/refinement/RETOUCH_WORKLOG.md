# Environment healing and Clone Stamp worklog

Branch: development/080-interactive-refinement.
Starting checkpoint: 1b30f27 (validated application/test source 393aed4, refinement.5).
Worktree clean at start. No original assets needed; main and releases remain unchanged.

Plan: shared bounded surface raster and immutable texture patch records; deterministic context-matched environment donors first; explicit surface-anchored cloning next; protection, UI, cold project/export acceptance and packaged Windows checks. Unknown/wrapping-discontinuous UVs and ambiguous overlapping surfaces fail closed. Do not expose tools before their actual pixel/replay tests pass.

Current action: implement/test the source-independent surface texture patch core. No new features validated yet.

## Core checkpoint
Implemented bounded connected-material surface rasterization, deterministic context-matched donor translation for environment healing, fixed root-space surface translation for texture cloning, soft mask compositing, immutable recorded texture pixels/charts, input fingerprints, replay-time pixel-isolation checks and protection-aware target/donor exclusion. No geometry edits. Discontinuous sampler tiles, unsupported alpha/vertex-colour layers, ambiguous UV overlaps and incompatible surface directions fail closed.

Eight new synthetic tests pass (417 full-suite tests at this point). Known periodic cloth damage improves by >95% in targeted damaged pixels for both methods; byte-deterministic JSON replay and forged-outside-pixel rejection tested. These are owned fixtures, not commercial visual approval.

UI integration in progress. First Electron run passed both Preview/Apply corrections and one-record undo/redo, then exposed a test-harness assumption that all texture images have .data. The actual browser patch is CanvasTexture; harness now reads real canvas pixels instead. Cold project/export acceptance must finish before claiming delivery.

Next: finish Electron cold/pixel export test, run prior editor regressions, extend negative/seam/protection tests, then package and validate Windows.

## Integration / persistence findings
The material and atlas Electron workflows both passed actual environment+clone proposals, one-command undo/redo, exact cold patch pixels and independent decoded GLB PNG pixels. Alt-click and the visible source-picker path are both covered. Existing SOURCE and manual shape workflows also passed locally.

A real cold-atlas dependency issue was exposed: native source image hashes, sampler settings, colours and target geometry/UV metadata matched, but rebaking after ImageBitmap → HTMLImageElement project reopening produced different atlas bytes. The exact internal resampling difference is not claimed proven. The fix retains the actual immutable baseline atlas once, with original palette/TIM metadata, instead of depending on recomputation. Input fingerprint checks remain strict. The fixed atlas is released on model reset, and derived candidates do not own its cache. Preparation-package exports retain their original base atlas/TIMs and separate local patch PNGs/GLB.

Snapshot tests also exposed parameter-only Three geometry JSON dropping custom lineage/modified attributes. Unchanged procedural geometry retains its existing exact constructor representation; genuinely changed/custom geometry is serialized as BufferGeometry. No original source buffers are modified.

New texture commands use history version 3, so refinement.5 and older refuse them instead of replaying as SOURCE repairs. Older projects remain supported. New native/pixel protection can cover subtriangle regions without pretending that new geometry exists. Donor footprints are recorded and checked against protection at replay.

Current full Node suite: 427 passed. Remaining before publication: final packaged workflow, final source/manual/UI regression, report/manual update and Windows validation. No release claimed yet.

## Ready for final validation
Both new texture methods now use fixed UV/material-bound records (history v3), so later valid geometry edits do not trigger donor reselection. Recorded donor faces/barycentrics/UVs and pixel footprints are rechecked; changed texture input and protected donors still fail closed. Native RGB555 inputs remain RGB555 through soft compositing. Per-stroke cached connectivity prevents jumps across material/UV islands. A masker spanning several existing patch materials is explicitly refused rather than secretly merged.

Protection UI now supports viewing, disabling all active protection and individual re-enabling in Advanced. The Electron atlas test passed protection of a subtriangle region, a blocked overlap, disable/re-enable and exact protection+texture state after cold reopening. Existing SOURCE/manual geometry workflows passed. Combined SOURCE geometry+texture undo grouping remains the existing two-record limitation.

Full Node suite reached 432 passed. Final rerun and exact-source Windows build still pending. No public release or main modification.

## Final local checkpoint results
435 Node tests pass. The subtle skin-like fixture reduced known 4×4 absolute RGB error from 4728 to 20 while retaining seven distinct colours. This is synthetic numeric evidence, not commercial artistic approval. Both new tools passed real Electron pixel/cold/export workflows; the atlas case also passed preparation-package TIMs/repair PNGs and visible confirmation at all three requested viewport sizes. Per-stroke material/UV-component locking, source picker camera gestures, RGB555 preservation and original magnification filtering are covered.

Final code adds a SOURCE-free replay guard (empty provenance does not access SOURCE) and clears clone anchors when leaving refinement to avoid stale pose markers. Local timing samples are fixture-only; exact Windows timings will be in the generated report. No full curvature retargeting or cross-material/patch merging is claimed. Later geometry changes preserve the fixed texture via UV identity; donor UV/material/protection dependencies remain checked.

Next: commit/push the integrated checkpoint, run the exact packaged Windows workflow, inspect outcomes and artifact access, then record the final validated code hash. Main remains ca7e89470df1c893beffe9c3fd2c8bb4ad8c8e84. No stable release/tag changes.
