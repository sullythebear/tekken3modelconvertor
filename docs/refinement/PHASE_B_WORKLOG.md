# Phase B — resumable worklog

Branch development/080-interactive-refinement; starting head474142f, Phase A applicationb806f98. Main/beta1 untouched. No TTT2.

Plan: full selected-region source correspondence (corners, midpoints, centroid), conservative ambiguity/distance/orientation/skin gates; topology-preserving local shape projection with pinned geometric selection boundary and invertible per-vertex skin transform; transactional ordered commands/preview; independent local texture patches sampled from original surface/material/UV sampler, post-atlas insertion to preserve unrelated atlas pixels. Stable base signatures and original vertex lineage anchor repair commands; reject newly simplified triangles without reliable lineage rather than guessing. Existing Phase A states/projects remain readable.

Tests: exact synthetic deformations, skinned/unknown rigs, ambiguous layers, contrast/repeat/UV1/cutout textures, outside-region invariance, undo/toggle/replay, cold project/GLB and actual packaged Windows. Commercial models only private regressions, never public screenshots/assets. No claims of universal repair, missing-topology reconstruction or gameplay.

Next: implement correspondence and geometry repair core, tests, then command replay/texture/UI and complete Windows validation.

Core checkpoint: full-region seven-sample correspondence, per-original-primitive BVHs and pose invalidation; source geometry/skin/bind signature; topology-preserving shape projection with pinned geometric/skin seams, exact configured LBS inversion, bounded triangle quality, outside-region invariance and new segment-crossing rejection. Local diffuse/binary-cutout texture charts rebake actual source UV samplers, RGB555, padding and nearest/no mipmap, separate texture allocation. Source arrays remain untouched. Synthetic shape/static/skinned/ambiguous and texture/UV1/repeat/mirror tests pass. UI/preview/project replay integration still next; no Phase B release claim.

Integration checkpoint: real before/after previews with explicit apply/cancel, reversible shape/texture/protection composition, source revisions and concurrent-import/animation guards, independent patch maps after the atlas, GLB/preparation-package inclusion and native invalidation. State version2 coexists with Phase A version1. Fixed a real keyboard-redo focus-loss bug and explicitly allowlisted the new isolated offline guide.

Local validation:352 Node tests passed; Phase A real Electron route PASS; Phase B complete route PASS; original product route PASS; Node core benchmarks128/8192triangles completed. Own defect fixture: mean distance0.01534→0.001135; albedo error65.01→2.48 RGB bytes;288triangles retained. Original source unchanged, cancellation and preview rollback verified, repaired PNG pixels independently decoded from GLB equal, cold project replay and optimization preserve repairs. These are synthetic observations, not commercial approval.

Next: final packaged Windows workflow refinement-quality.yml (Phase B), original/private regressions, safe artifacts, verify download, document final run/source. No regular beta2 release until separately accepted.

Final pose safety checkpoint: source/result node transforms and relevant bone poses must agree in root space before projection. A visible-pose difference cannot be mistaken for bind-space mesh damage. Differently scaled preview holders remain supported and tested. Local regressions354passed; real Electron Phase A, Phase B and original product workflows all PASS, including guide isolation, concurrent-import refusal, preview/apply/cancel, keyboard undo/redo, optimization, cold replay and independently decoded GLB texture pixels.

Next: verify the packaged Windows run for this exact checkpoint and the safe artifact. No further feature additions before that gate.

Packaged run43007908360 (7df7c44) passed Phase A and the complete Phase B workflow but failed the original desktop import-status check; no artifact/release was published. Reproduced locally with the real OBJ/MTL/TGA IPC dialog: a broad animation-disable edit had left an out-of-scope `value` reference in load(). Fixed that exact reference, retained busy/preview animation blocking only in setBusy(), and strengthened programmatic fixture imports/product startup to require the actual Imported success status (rather than merely observing an already assigned source object). Desktop diagnostic output is own synthetic status only. Local real desktop import/convert/export/overwrite/native-fixture IPC now passes. Product first-launch test uses a fresh isolated profile so desktop's intentionally persisted Advanced mode is not mistaken for a broken default.

Next: final Windows validation of this import fix plus all private/product gates. Main and beta1 remain unchanged.
