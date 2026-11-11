# Easy Refinement — architecture and evidence boundaries

Extension on C1 applicationdf7a286 / docs6475d34, same refinement branch. Original converter, project wrapper1 and command state1/2 remain; main and releases preserved. No TTT2 or character-name rules.

## 1. Weighted surface selection

paint-mask.js stores16×16 barycentric lattice samples per original triangle-corner lineage, separate from the face selection and the model vertex attributes. Triangular interpolation avoids artificial fading at the face diagonal. The soft alpha overlay is a separate padded data texture; no full-polygon outline in Easy. It never changes exported geometry. Texture/mask coordinates follow the selected surface through existing origin anchors, not current vertex indices alone.

Paint growth uses existing oriented material/UV/skin adjacency. Every painted sample gets a frontmost visibility test. paint-ray-index.js snapshots posed triangles in the existing SurfaceIndex BVH and reuses it across camera rays; alpha/cutout sampling respects selected UV channels and mirrored mesh winding. Unsupported separate colour/alpha UVs fail closed. One stroke stays on one mesh. No world-proximity weld between disconnected garments. The finite16×16 lattice is not infinite resolution; max1024faces,4096scanned faces per dab, existing total command limits plus1M stored mask-sample/point budget. Recent24mask undo snapshots are session-only; current mask and actual correction history survive save/reopen.

## 2. Shared manual kernel and direct strokes

The same proposeManualShape/applyShapeCommand path serves Advanced and Easy. Added normal offsets and bounded smoothing to existing thickness/scale/move commands. Easy thicker/thinner uses conservative local normal offsets, not guessed anatomy. Advanced retains the explicit longitudinal cross-section tool. Smoothing is a limited neighbour step with crease/seam guards and edge-relative displacement cap, not feature-aware professional sculpting or a universal volume guarantee.

Actual painted-corner weights determine movable points. Equivalent split position/skin corners share the maximum physical paint influence so duplicated converted corners do not zero each other; material/UV/nonmanifold guards still pin true seams. A small topology support ring permits incident faces to follow painted vertices continuously; unpainted points are not given invented paint weight. A painted triangle centre without safe geometry support is refused. SOURCE projection uses the same mask and retains its full-region correspondence gates.

Quick previews reuse C1's isolated pair, rebasing from committed arrays rather than accumulating numerical drift. Each pointerup performs heavy validation and stores one shape command; errors/cancelled strokes discard the draft. Explicit SOURCE proposals still require Apply. A preview is not already accepted geometry. Normal directions account for mirrored transforms and BackSide materials; actual configured inverse skin transforms preserve rig data. No bone-name assumptions.

## 3. Masked texture repair

maskedTargetCrop keeps the current target pixel grid, applies transformed UV correspondence only where the paint has weight, and copies unpainted target texels. Source albedo/binary alpha is sampled through Phase B's reliable surface queries. True overlapping UV interiors with conflicting results are refused; shared raster edges use deterministic ownership, not arbitrary variant/mesh selection. Separate local materials/images preserve other faces and the original atlas bytes.

If an exact target crop is unavailable, only uniform-current-colour charts are allowed for masked repairs. Repeated/discontinuous varying target layouts, vertex-colour composites or unsupported masks are refused rather than degrading unpainted detail. Advanced whole-region texture repair retains its prior repeat/mirror/transform path. Soft blending deliberately retains some original colour near a paint edge. This is albedo preparation, not full PBR/game-shader reproduction.

## 4. Safe repair suggestions and UX

assessRepair tries the proven bounded shape/texture proposal functions without applying them. Shape proposals must pass the existing improvement/confidence checks; texture suggestions additionally require nontrivial regional albedo improvement. This is not a semantic defect classifier: deliberate PS1 simplification/quantisation may differ from SOURCE. The UI offers at most shape/texture/both, explicit confirmation, and manual fallback when unavailable. Combined proposals validate shape first and texture against the actually rebuilt repaired surface, then commit together. A failed stage never publishes a partial command set.

Simple mode presents four actions, mask controls, contextual strength and history/hold-compare. Advanced retains previous controls/diagnostics. Last technical failure/assessment stays available there; simple messages avoid internal errors. Original control IDs and settings survive. Hold compare uses pending proposal's predecessor or one owned recent pre-commit snapshot; after cold reopen the immutable artistic base is the clearly documented fallback, not SOURCE. Helpers/masks are outside exported roots. No camera/pose alignment certificate is implied.

## 5. Persistence, validation and limits

Current masks and command mask parameters are bounded/validated, including matching anchor identities. Commands replay stored bind-space before/after positions; no accumulated slider drift. Old projects still load; new normal/smooth/mask features require this app version. Existing GLB/project/native experimental gates remain. One pre-commit comparison clone adds bounded memory; images are shared safely rather than copied per history entry.

Actual Electron scripts cover simple paint/erase/undo, Advanced switching, uncertain-source fallback, direct strokes for normal/inward/smooth and push/pull, pointer cancellation, one command/stroke, cold geometry/texture replay, independent exact GLB position/PNG checks, explicit source-shape/texture/combined proposals, multiple viewports and renderer zoom. Node fixtures separately test coarse geometry with no movable corner, sharp/overlapping/mirrored/skinned/source-ambiguous cases. No commercial artistic approval follows from those fixtures.

Renderer CPU dab/preview timings exclude event-queue/GPU/frame latency; Windows fixture observations are separate from private-model performance and summed working sets can repeat shared pages. Large BVH builds, final validation, atlas replay and texture queries still cost time/memory and yield only at checkpoints. Segment-crossing checks do not certify every coplanar contact or animation pose. Public reports contain only owned synthetic screenshots/metrics; commercial review remains restricted/unpublished.
