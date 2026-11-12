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
