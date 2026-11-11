# Easy Refinement worklog

Baseline6475d34/applicationdf7a286, same development/080-interactive-refinement branch. Main/releases intact; no TTT2. No private model publication.

Plan checkpoints:1) simple painting interface and barycentric weighted surface mask, eraser, paint undo and hold-before/after; advanced C1 preserved.2) direct reversible weighted manual strokes with validated mouse-up commit; conservative smooth/normal offsets.3) reliable existing shape/texture proposal assessment without treating all PS1 differences as defects. Final packaged Windows complete product/private regressions and owned demonstration.

First work: implement mask independent of triangle-edge highlighting. Corner weights for geometry remain distinct from fine visual mask; refuse absent geometry support rather than invent detail. Texture repair needs real per-pixel mask support before claiming precision. Next: step1 UI and tests.

Local step1 validated:7 mask/BVH tests and real Electron simple paint/erase/undo/redo/Advanced-mode/cold mask replay PASS. Whole suite384 passed after core additions (374 retained +7 mask +3 weighted geometry/smoothing). Existing Advanced C1 real Electron route PASS. Step2 direct-stroke UI and step3 masked texture/repair assessment are integrating; not yet a validated build. Target pixel-grid crop retains unpainted texels; unsupported varying target layouts fail closed. Geometry mask weights are actual painted corners; no invented vertices. Next: verify direct-stroke mouse-up commit and masked texture fixtures, then combined repair / old Phase A/B routes and Windows.
