# Interactive refinement — Phase A

Branch development/080-interactive-refinement. Base 387f008 (tested regular beta2 converter checkpoint, not an artistically approved beta2 release); beta1 tag and main unchanged. No TTT2.

Plan: reuse existing studioSourceMeshIndex/studioRegions and SurfaceIndex; add topology-checked result selection, conservative same-source-primitive barycentric correspondence, reversible detail-protection commands, existing optimizer constraints, optional project extension containing one immutable artistic snapshot and command history. UI remains optional/contextual. No shape/texture repair buttons in Phase A.

Acceptance: actual click selection/highlight; grow/shrink/component/material selection; explicit proposal/apply/cancel; detail constraints measurably affect candidate geometry; undo/redo/toggle/reset; cold project reopen; independent GLB validation; existing controls; synthetic report at three resolutions and actual packaged Windows test. Private model inputs/images remain private. Correspondence is evidence, never proof of an anatomically correct reconstruction.

Next: implement/test independent selection/history/protection core, then integrate optimizer/UI/storage. Preserve immutable SOURCE and artistic base across candidate transactions.

Local checkpoint: 331 Node regressions passed; existing real Electron product workflow PASS. New real Electron editor workflow PASS: click/highlight, grow/shrink/component, proposal cancel/apply, constrained optimization, undo/redo/toggle, immutable source, three resolutions, cold project reopen, GLB independent validation and reimport. Own planar textured fixture: 1800 source, 1494 preparation/protected versus606 unprotected at target300. This fixture isolates constraint effects; it does not prove artistic quality for commercial characters.

Found/corrected: shrink used the already shrinking set (cascading removal); branch ambiguity in unbraced selection logic; phase-A protection now preserves region boundaries; correspondence respects material UV channel; project base preserves topology without GLB primitive splitting. A curved sphere fixture did not distinguish protection because existing shape constraints already kept the same count: documented as inconclusive, replaced by a planar fixture for the isolated effect test, not weakened assertions.

Next: run Windows packaged editor/product/private regressions via refinement-quality.yml, inspect synthetic screenshots, verify artifact, and publish only a phase-A development candidate. No Phase B/C implementation claim.
