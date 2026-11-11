# C1 — implementation and verification boundaries

Optional extension on the Phase B checkpoint b40a911 / application3eb1d1e. Same converter, Phase B version2 commands and Phase A project wrapper1. No importer, TTT2, character-name rule or regular beta2 release.

## Surface brush

selection-brush.js caches oriented triangle adjacency from actual geometry/UV/skin vertex keys and material groups. Dabs flood only connected triangles with bounded surface-centroid path length. The UI raycasts the frontmost rendered mesh (alpha-tested via existing material sampler), then independently checks candidate triangle-centroid visibility against all visible meshes. Back layers and occluded routes cannot be crossed. One stroke stays on its first mesh; add/remove is explicit. Whole-triangle granularity; visibility is sampled, not a pixel-perfect face mask. Up to4000 faces per dab, bounded scan count. Existing material/connected/grow/shrink controls remain.

Left brush drags use pointer capture and temporarily disable OrbitControls before its listener. Alt-left and right gestures remain camera controls; up/cancel/lost-capture/leave restore control. A depth-tested world-space cursor shows radius, selection overlay/outline remains separate from exported roots. Brush choices persist in a separate local preference key, not converter settings. A soft selection boundary means changing the deformation falloff; the face mask is not silently enlarged.

## Intentional geometry changes

manual-shape.js supports thickness, scale and axis translation. Root-relative posed points and the actual per-vertex inverse skin transform produce bind-space position changes. No SOURCE proximity gate: these are intentional user changes, not source restoration. Material/UV/open/nonmanifold seams and selection boundaries are pinned. Shared position/skin seam copies move consistently. Weighted shortest surface-edge distances control sharp/normal/soft falloff, without influencing close disconnected layers.

Thickness uses a chosen/estimated longitudinal axis, and estimates the radial centre from the connected material cross-section within the selected axial span. This avoids expanding a painted front patch about its own off-axis centroid. It is an approximate geometric frame, not bone/anatomical recognition; user axes remain available. Scale uses the selected local centre. Translation is a percentage of the selection's diagonal, not fixed world units. ±30% bounds are tool safety bounds, not PS1/game limits.

Manual proposals reuse shape-command origin anchors and before/after bind positions, with explicit tool/amount/axis/falloff/root-space version metadata. Replay checks before-values so dependent edits cannot silently override a disabled earlier edit. No additive numerical drift: each preview is rebased on committed positions/normals. Final application replays the whole command sequence and validates it transactionally. Shape positions/UVs/weights outside selected movable interiors remain untouched. Normals are recomputed for changed vertices.

The existing segment-crossing test now requires signed-plane separation beyond tolerance before ray intersection, avoiding false positives from near-coplanar floating-point error in a genuinely posed skinned fixture. A separate loose-garment crossing fixture still fails closed. This is not exhaustive coplanar/contact or animation collision validation.

## Fast preview and final commit

Sliders debounce80ms and update a reusable isolated canonical/atlas preview pair; they do not rerun global conversion, optimizer or atlas baking. A pre-editor atlas acquires lineage only after exact triangle-corner position/skin parity validation; no nearest-position weld. No full clone per pointer dab or per slider event after the first preview. Apply performs full triangle/crossing checks, command replay, existing atlas/texture layer integration, source/revision guards and commit. Cancel disposes the draft and restores committed display. Shapes may be shown provisionally before the expensive collision check; UI says so and final Apply may be refused. Heavy phases remain synchronous between checkpoints.

Manual edits are actual Phase B shape commands, preserved in cold project replay, undo/redo, enabled flags, candidate protection, package and GLB. Existing shape/source-texture/protection operations remain. Texture layers are recomputed after geometry; if a later combination cannot safely correspond, transaction fails without replacing earlier state. No automatic source texture projection onto an arbitrarily displaced surface is promised.

## Scope

C1 only: no smoothing, push/pull sculpt, transform gizmo dragging or professional retopology. The axes helper is a visual direction reference, not a drag gizmo. No original source mutation, no arbitrary mesh replacement, no missing surface creation. Morphs/singular skin transforms/instanced and batched meshes fail closed. Finite triangle/normal/crossing gates cannot certify arbitrary animated assets. A complex region still costs O(mesh) seam/quality work and memory; it is not a GPU sculpting engine.

Tests cover static/skinned/unknown-rig, wrist cylinder, disconnected fingers, multiple materials, overlap crossings, active morph rejection, UV seams, arbitrary closed nonhuman objects, dependency replay, malformed state and exact preview lineage. Real Electron route paints/removes/adds, checks front-facing selected surfaces and Alt-camera invariance, previews all3 tools and oscillates sliders, commits thickness, undo/redoes, cold-reopens, independently reads exact GLB positions, and reimports. Owned HTML images only. Node-core benchmarks exclude live visibility rays; app gesture timings include automation and are not frame-time claims. Private regressions remain access-checked unpublished reviews.
