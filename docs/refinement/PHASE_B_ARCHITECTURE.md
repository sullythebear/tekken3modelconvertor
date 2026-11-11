# Phase B implementation and verification boundaries

Optional extension of Phase A on development/080-interactive-refinement. Existing source/converter/project/export/UI paths retained; main and beta1 unchanged. No TTT2, no new importer or character-name rules.

## Source correspondence

Existing studioSourceMeshIndex and studioRegions.sourceMaterialIndex constrain each query. Pose-invalidated per-primitive BVHs cover every selected triangle with corners, edge midpoints and centroid. Shared-vertex answers must agree. Distance, orientation, source layers, skin influence compatibility and, where preserved, UV consistency gate confidence. Parallel inner layers and overlaps remain ambiguous. Root-relative posed coordinates remove preview-holder scale; actual configured per-vertex LBS is inverted for bind-space edits, not a guessed anatomical bone. Interleaved attributes and original transforms/bind matrices enter source signatures.

Reliable/partial/ambiguous/unavailable labels refer to finite controlsamples, not a mathematical or artistic certificate. Source geometry/material provenance does not identify missing topology. Opaque and binary-cutout albedo supported; blend/HDR/missing sources and unsupported composite masks fail closed.

## Local geometry

shape-repair.js projects only safe interior vertices. Geometric/skin-equivalent seams and any unselected or open boundary remain pinned; a two-ring falloff provides transition. Topology, UVs, weights and outside positions remain unchanged. Triangle area/orientation/stretch, before/after regional surface distances, shared answers and new segment/triangle crossings gate proposals. Orthographic 48px regional occupancy is supporting evidence (edge-on views null). Existing/coplanar contacts and all possible animated collisions are not globally certified.

Persisted changes are anchored to a hash-checked immutable artistic base and original vertex lineage. Records are not arbitrary source vertex indices. Newly simplified triangles without exact lineage are rejected; the user can return to the artistic model. A dependent later shape command cannot silently overwrite an earlier command disabled underneath it.

## Local textures

texture-repair.js supports affine source-UV crops that retain the original pixel grid, and otherwise surface-sampled per-triangle charts. Sampler transforms, repeat/mirror/clamp, selected colour UV channel, material colour and genuine RGB vertex colours are used. Source normals are not misread as diffuse data. RGB555, padding, nearest/clamp and no mipmaps bound colour bleed. Quality choices cap a separate patch at256/512/1024; no detail is invented by upsampling.

Patches are applied after base-atlas construction, as separate materials/images. Unselected atlas bytes are not rewritten by the patch. UV seams may duplicate vertex storage but do not add triangles or alter other surfaces' positions/skin tuples. Replays rebuild from immutable geometry; the texture projection is revalidated against the current repaired surface. Metrics compare regional albedo/alpha, local maxima and unexpected darkening; worsening proposals are rejected. This does not reproduce a full PBR lighting shader.

## Transactions and persistence

A preview has separate root/material/texture ownership and never replaces the committed model until Apply. Before/After changes only the displayed proposal. Export/save/import, topology changes and playback are blocked while a proposal is open. Cancellation checkpoints preserve the committed state. Source-object/revision guards prevent stale application. Source remains untouched.

The Phase A project wrapper/schema1 remains; version2 command state adds shape/texture records, source signatures, region anchors and diagnostics. Version1 states still load. Snapshots retain the artistic base, private source-normal fields and texture transforms; images must be embedded. Commands replay after cold reopen, including protections and target optimization. GLB exports the real corrected surfaces/images; editor overlays are excluded. Native build is invalidated/blocked for these local repairs. Preparation packages include patch PNGs and explicit base-atlas/TIM limitations; no playability claim.

## Validation and performance

Node fixtures cover static/skinned surfaces, wrist sections, selection boundaries, overlapping layers, interleaved data, holder scales, transformed/repeated UV1, independent normal UVs, source RGB vertex colour, cutouts, source changes and malformed records. Real Electron/Windows workflow tests preview/cancel/apply, keyboard undo/redo, toggles, protections, optimization, cold reopen, GLB independent reference checks, PNG pixel equality and reimport.

Node-only benchmarks separately measure128/8192-triangle repairs and process rss/heap snapshots. These are not total desktop/GPU usage or retained-memory estimates; post-run snapshots may include garbage awaiting collection. Desktop process working sets are summed (shared pages may repeat), private bytes reported only on Windows. No claimed speedup against unrelated Nikki project measurements.

Heavy CPU phases still run synchronously between yields. Transactional scene copies, selected chart storage and regional samples cost memory; a12000-triangle region bound and existing project limits apply. Commercial reports remain in access-checked unpublished drafts; public demonstrations contain only owned synthetic assets. None of this certifies commercial artistic acceptance or gameplay.
