# Phase A validation — development candidate

Version0.8.0-beta.2-refinement.1, application source[b806f984104eddc18d9b5b698a5c30f16cf1c3a2](https://github.com/sullythebear/tekken3modelconvertor/commit/b806f984104eddc18d9b5b698a5c30f16cf1c3a2). Branch development/080-interactive-refinement. Main and released beta1 unchanged.

[Windows run42903934189](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/42903934189) completed successfully. [Download artifact13803474214](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/42903934189/artifacts/13803474214) contains the portable EXE under release/, editor report artifacts/refinement/index.html with its images/results.json, and the synthetic product report/test evidence. Requires GitHub sign-in; Actions retention30days. Artifact existence/digest verified in the completed run; anonymous download requires authentication rather than providing an independently downloaded ZIP.

Artifact SHA256:c28496631bf44a6ace51bfc938044370c39ebc692ff2daff6a6f58076d3556f5.

## Actual checks

- 334 Node regressions passed locally and Windows unit step passed; no skipped/failed local tests.
- Actual portable startup and distribution verification; packaged real Electron refinement workflow PASS.
- Actual screen click, highlight, selection changes, proposal cancellation/apply, candidate constraints, undo/redo/toggle/reset, transactional cancellation, pending-global-settings recovery.
- Cold process project reopen/replay and independent GLB container/reference/geometry validation followed by application reimport. Selection overlays absent from the export.
- Original product cold project/GLB workflow; OBJ/MTL/TGA dialogs and source overwrite guard; secondary/repeat UV; all original UI controls/workflows; native synthetic fixtures.
- Existing private project integrity and commercial-model baseline/current render passes completed, access-checked unpublished review created, private data cleaned up. No original assets or commercial images in the public artifact. Detailed commercial evidence stays private; no new artistic approval claim.

## Owned synthetic demonstration

Textured non-human planar fixture:1800 source triangles,1494 automatic preparation; same candidate target300 gives1494 with full selected detail protection versus606 with protection undone. Protected vertices and region boundaries survive; protection adds no triangles. Existing quality constraints explain why the unprotected result also exceeds the requested goal. These are not native game limits.

Local source-Electron Linux run: initial click including lazy correspondence and protocol overhead approximately150ms; cold project reopen/replay approximately1.30s; project40498bytes. Single small-fixture observations, not a cross-machine performance improvement claim. Summed process working sets include shared pages; local Linux private-bytes API returned0 and is not a valid zero-memory measurement. Windows-specific editor observations are in the artifact's own-fixture results.json; no claimed comparison against unrelated private-model runs.

## Scope limits

This delivers Phase A, not Phase B/C. No local source-shape restoration, texture repair, brush or sculpting. Initial source correspondence is a single selected-triangle sample, not a complete safe repair field. Unknown/ambiguous source links remain uncertain. A changed topology can invalidate selection; commands replay on the immutable artistic base. Heavy CPU reduction/baking remains synchronous between cancellation checkpoints. Snapshot serialization and retaining the artistic base cost memory and remain subject to the existing project size bound. No gameplay validation or automatic artistic acceptance.

Usage:[GEBRUIK_NL.md](GEBRUIK_NL.md). Design:[ARCHITECTURE.md](ARCHITECTURE.md).
