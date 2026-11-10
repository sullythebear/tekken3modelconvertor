# Beta2 visual-quality checkpoint

Base85da7c5 (docs after tested beta1974a6e6). Branch development/080-beta2-visual-quality; main/beta1 untouched. No user screenshots were attached to this turn; symptoms are user-reported, no invented visual inspection.

Proven code paths: fallback arm classification excludes all skinned meshes even when no bone anatomy is known, despite already obtaining posed coordinates. Generic head materials get no regional crop and can have small contrast boundaries reduced without texture-feature constraints. Actual contribution to the two commercial defects needs controlled private comparison.

Implemented candidate: posed-space extremity fallback for unresolved rigs, source topology/weights retention on unresolved arm/wrist/hand regions; skip template hand reconstruction if no reliable semantic hand bone. Generic unmapped opaque textured head gets cropped UV allocation,256 palette and1024 sampling; high source contrast triangles lock their existing vertices. Existing semantically mapped face route remains unchanged. No file/personage-name exceptions, invented bone transforms or filled geometry.

Tests: original315 pass before focused cases. New synthetic cases for posed unknown rigs, contrast-lock localization, transformed sampling and cropped atlas/unchanged source UV/mapped head bypass. Next: all tests, product pipeline, private paired beta1/current renders and regional measurements. No public beta2 release authorized by this workflow: only a development EXE artifact and access-checked unpublished private review draft. No private assets/images in public artifacts.
