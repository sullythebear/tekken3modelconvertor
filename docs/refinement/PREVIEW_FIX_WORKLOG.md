# Preview reliability investigation — refinement.7

Baseline: tested application e8a543230323b3b89d9b017431cc8883a501dd38, documentation head 8ff908f. Branch development/080-interactive-refinement; main unchanged.

## Reproduced before fixes

1. Ordinary GLB file input, convert, baked atlas, paint, environment Preview at 150% renderer zoom: algorithm refused a no-op, but its explanation was scrolled above the panel. Message rectangle top -26.67/bottom 6.92 CSS px; visible panel top 86/bottom 472. User saw no explanation near Preview. At 100% the same message was visible, explaining why existing default-size tests missed this.
2. SOURCE texture repair used converted.root (hidden pristine materials), while the renderer displayed atlas.root. With an imported high-contrast 256px texture, it refused the quantized repair as worsening the already-pristine material. The same request against the displayed atlas produced a real 612-pixel correction on the initial plane fixture. This is a proven target-version mismatch, not a new repair algorithm.
3. Preview display unconditionally synchronized the result camera to SOURCE. A deliberately offset result camera was not preserved by that code. Preview now switches the root without resynchronizing the camera; the acceptance test asserts its position is unchanged.

These reproduce supported failure modes, not proof that every aspect of the user's private model had the same cause. No user assets were obtained or requested.

## Corrections

- Sticky feedback/action dock: calculating, ready, clear refusal or technical failure; actual progress element; cancel stays available during computation. No empty-selection silent click. Explanation and method choices stay in view at 150% zoom.
- Bounded asset-free request trace with unique per-session IDs: tool/method, mask/triangle counts, selected mesh index, displayed material/texture counts, algorithm entry, actual changes, scene attachment and render invocation. Duplicate computations are gated; stale completions are refused. Stale draft disposal cannot reset a newer displayed scene.
- SOURCE proposal/replay samples the displayed atlas when it exists and is valid. Missing/damaged preview maps keep the established canonical SOURCE recovery fallback. Existing SOURCE geometry algorithms unchanged.
- Atlas-SOURCE commands explicitly use history version 4; old readers refuse them instead of silently replaying the wrong layer. Older histories 1–3 remain supported. Immutable atlas capture, cold replay and exporter use the same repaired data.
- Native pixel deltas and stored bind-space displacement metrics added. No fabricated geometry, material copying between characters or weakened safety checks.
- Tool changes clear old temporary masks; explicit method changes can compare the same area. Automatic assessments also have explicit visible outcomes.
- Diagnose opslaan exports only allowlisted counts/codes/build identity. No names, paths, hashes, UVs, positions, textures, masks or model files. Full technical error details remain local in Advanced.

## New acceptance scope

Real User Preview Acceptance uses owned multi-material geometry (textured panel, sphere head and cylindrical sleeves), normal file input, actual conversion and baked atlas. It requires on-screen terminal feedback, computing acknowledgement, measured pixel/position changes, different actual rendered Before/After canvas images, explicit confirmation/cancel, undo/redo, cold reopen, exact independently decoded GLB PNGs and position accessors, and GLB reimport. Source, environment, automatic, clone, thicker/thinner/smooth and no-op refusals are exercised. A conservative refusal on unsuitable donor/UV data is acceptable only with visible explanation; it is not reported as a successful repair.

Local latest acceptance passed: 1364 changed pixels on the multi-material SOURCE fixture; 79 changed geometry points; max stored bind displacement 0.004789262, mean 0.001753882; outside-region changes 0. Combined geometry+texture cold state and exported data exact. These are synthetic results, not commercial artistic approval. Existing retouch/clone atlas acceptance and combined SOURCE workflow passed locally. Full relevant regression count and exact Windows source/build will be recorded after final validation.

No original game assets, private models or commercial screenshots in public evidence. No TTT2 work, main, tag or regular release changes.

## Windows regression caught before delivery
Run 43304208988 passed portable smoke and product/A workflows, but the existing Phase B optimization test failed. Reproduced live on its owned fixture: cursor 3, target null, explicit artist-atlas rejection. A fixed-pixel retouch guard had incorrectly been extended to the new SOURCE-atlas commands. SOURCE repairs can reproject from the original surface after protected-region optimization; they do not depend on frozen donor pixels. Restored that existing dynamic rebake path for SOURCE only. The frozen-input guard remains intact for environment/clone commands. The Phase B project assertion now expects explicit schema 4 and sourceLayer=atlas rather than falsely requiring the previous schema 2. Full workflow is being rerun, including exact cold/export pixels; the failed run is not release validation.

## Cancellation feedback audit
A ready proposal was discarded by Cancel but its Easy success sentence remained. Cancel now marks the request cancelled and shows an explicit unchanged-model message; Clear shows an idle/new-mask instruction. Applied corrections are not reclassified as cancelled when leaving the editor. A request-state regression and the UI acceptance assertion cover this. All 448 Node tests pass. This small feedback follow-up requires a new exact-source Windows run; earlier candidate runs are not final validation.

## Shared Advanced outcome
The error handler previously returned to the global Advanced error path before updating the shared preview message. It now always completes the active dock outcome and still preserves Advanced technical details. The full normal-import acceptance passed with an additional Advanced no-op refusal whose actual on-screen rectangle is asserted. No repair algorithm or safety change.
