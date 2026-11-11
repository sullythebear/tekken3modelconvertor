# Phase B — resumable worklog

Branch development/080-interactive-refinement; starting head474142f, Phase A applicationb806f98. Main/beta1 untouched. No TTT2.

Plan: full selected-region source correspondence (corners, midpoints, centroid), conservative ambiguity/distance/orientation/skin gates; topology-preserving local shape projection with pinned geometric selection boundary and invertible per-vertex skin transform; transactional ordered commands/preview; independent local texture patches sampled from original surface/material/UV sampler, post-atlas insertion to preserve unrelated atlas pixels. Stable base signatures and original vertex lineage anchor repair commands; reject newly simplified triangles without reliable lineage rather than guessing. Existing Phase A states/projects remain readable.

Tests: exact synthetic deformations, skinned/unknown rigs, ambiguous layers, contrast/repeat/UV1/cutout textures, outside-region invariance, undo/toggle/replay, cold project/GLB and actual packaged Windows. Commercial models only private regressions, never public screenshots/assets. No claims of universal repair, missing-topology reconstruction or gameplay.

Next: implement correspondence and geometry repair core, tests, then command replay/texture/UI and complete Windows validation.

Core checkpoint: full-region seven-sample correspondence, per-original-primitive BVHs and pose invalidation; source geometry/skin/bind signature; topology-preserving shape projection with pinned geometric/skin seams, exact configured LBS inversion, bounded triangle quality, outside-region invariance and new segment-crossing rejection. Local diffuse/binary-cutout texture charts rebake actual source UV samplers, RGB555, padding and nearest/no mipmap, separate texture allocation. Source arrays remain untouched. Synthetic shape/static/skinned/ambiguous and texture/UV1/repeat/mirror tests pass. UI/preview/project replay integration still next; no Phase B release claim.
