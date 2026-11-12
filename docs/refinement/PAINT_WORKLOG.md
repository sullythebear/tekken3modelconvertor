# Direct Texture Painting — development worklog

Baseline application: 6f4c240ebe41177d9108260ccf7c67fc7cbeef52; documentation head 437c152. Existing branch development/080-interactive-refinement; main/release history unchanged. No TTT2 work or original assets.

## First working checkpoint

Manual painting has a separate native-pixel transaction. It does not query SOURCE, donors, repair confidence or a source-improvement score. It reuses the existing visible-surface brush traversal, with a geometry/skin-edge adjacency option that permits UV/material seams. Pixel weights are evaluated on the actual triangle surface rather than limited to the 16×16 selection-mask samples.

Selected triangles get isolated native-grid charts, grouped into bounded local patches. This avoids altering another surface that shares original UV pixels. Sampling keeps unwrapped coordinates and applies repeat/mirror/clamp per texel. Alpha is retained and replay checks input signatures, chart layout, alpha and material semantics before mutating output. Source geometry and textures remain untouched. Multi-mesh/material patches are one history record (version 5); old histories 1–4 remain readable. Future-target optimization of frozen atlas paint remains conservatively gated.

Live previews clone geometry when chart layout changes, then update owned texture buffers for a stable layout. SOURCE is not modified. Apply uses full validated replay. Cancel discards temporary pixels. Red-paint acceptance via ordinary GLB file input and actual atlas conversion passed locally: paint → Apply → project save → app close → cold reopen → GLB export → independent PNG byte check → reimport. Exact red pixels survived. This is the minimal owned-fixture proof, not final Windows acceptance.

Core tests also pass SOURCE-null replay, opacity, temporary erase/alpha preservation, native pipette colour, input-change refusal and a material split with unrelated shared-UV geometry. Remaining before delivery: broader UI/pipette/eraser/seam tests, retouch refusal audit, Windows packaging and exact-source validation, public synthetic report/manual.

## Expanded UI checkpoint
The ordinary-import UI test now passes visible native red AND rendered red pixels, a true temporary eraser, texture pipette, 50% opacity, Cancel preserving committed state, one-record Apply, undo/redo and exact cold/GLB PNG pixels. A second imported fixture crosses a UV/material split with repeat coordinates and a separate shared-texture back sheet; the stroke creates multiple isolated parts in one history record and passes the same cold/export checks. No triangle geometry is invented. Current relevant unit suite: 454 passed. Next: explicit back-sheet pixel assertion, retouch refusal audit, packaged Windows acceptance and report/manual.
