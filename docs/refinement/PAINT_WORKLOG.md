# Direct Texture Painting — development worklog

Baseline application: 6f4c240ebe41177d9108260ccf7c67fc7cbeef52; documentation head 437c152. Existing branch development/080-interactive-refinement; main/release history unchanged. No TTT2 work or original assets.

## First working checkpoint

Manual painting has a separate native-pixel transaction. It does not query SOURCE, donors, repair confidence or a source-improvement score. It reuses the existing visible-surface brush traversal, with a geometry/skin-edge adjacency option that permits UV/material seams. Pixel weights are evaluated on the actual triangle surface rather than limited to the 16×16 selection-mask samples.

Selected triangles get isolated native-grid charts, grouped into bounded local patches. This avoids altering another surface that shares original UV pixels. Sampling keeps unwrapped coordinates and applies repeat/mirror/clamp per texel. Alpha is retained and replay checks input signatures, chart layout, alpha and material semantics before mutating output. Source geometry and textures remain untouched. Multi-mesh/material patches are one history record (version 5); old histories 1–4 remain readable. Future-target optimization of frozen atlas paint remains conservatively gated.

Live previews clone geometry when chart layout changes, then update owned texture buffers for a stable layout. SOURCE is not modified. Apply uses full validated replay. Cancel discards temporary pixels. Red-paint acceptance via ordinary GLB file input and actual atlas conversion passed locally: paint → Apply → project save → app close → cold reopen → GLB export → independent PNG byte check → reimport. Exact red pixels survived. This is the minimal owned-fixture proof, not final Windows acceptance.

Core tests also pass SOURCE-null replay, opacity, temporary erase/alpha preservation, native pipette colour, input-change refusal and a material split with unrelated shared-UV geometry. Remaining before delivery: broader UI/pipette/eraser/seam tests, retouch refusal audit, Windows packaging and exact-source validation, public synthetic report/manual.

## Expanded UI checkpoint
The ordinary-import UI test now passes visible native red AND rendered red pixels, a true temporary eraser, texture pipette, 50% opacity, Cancel preserving committed state, one-record Apply, undo/redo and exact cold/GLB PNG pixels. A second imported fixture crosses a UV/material split with repeat coordinates and a separate shared-texture back sheet; the stroke creates multiple isolated parts in one history record and passes the same cold/export checks. No triangle geometry is invented. Current relevant unit suite: 454 passed. Next: explicit back-sheet pixel assertion, retouch refusal audit, packaged Windows acceptance and report/manual.

## Retouch and Windows acceptance checkpoint
458 Node regressions pass. Normal GLB input → real atlas conversion → native red paint → pipette/opacity/temporary erasure → Cancel/Apply → two paint history records → exact undo/redo → cold reopening → independent GLB PNG and preparation PNG checks pass locally. UV/material seam fixture also checks the untouched back sheet which shares original UV pixels. Source geometry and skin channels are unchanged.

The general automatic repair assessor contained an extra >3 RGB improvement gate after a valid texture proposal had passed the real repair checks. This hid valid subtle SOURCE improvements. Removed only that redundant gate; added a controlled +2 RGB regression and a real UI Auto/cold/export test. Uncertain correspondence, unsafe UVs, no effect and unsuitable donors remain refused. Explicit manual paint fallback is offered for eligible textured surfaces after relevant repair refusals.

Actual portable smoke now sends mouse input to the renderer, applies red paint, captures a synthetic screenshot and verifies native red pixels plus exported paint materials. Source Electron harness passed; Windows package validation is required before final delivery. Public artifacts are allowlisted synthetic reports/screenshots only; no source models or private imagery. No regular release is created.

## Windows result
Application source fad3fc73b494abbfd6fd9f15abf797d67e8e9b07 passed all substantive Windows steps in run 43326321484: actual portable native pointer paint/export, packaged UI/cold/PNG/GLB/preparation checks, seams, subtle Auto correction, original workflows, Nikki integrity, commercial inputs and access-checked unpublished review. Public artifact 13993358945 contains portable EXE and allowlisted owned synthetic evidence only. See PAINT_VALIDATION.md for digest, limitations and links. Main remains ca7e89470df1c893beffe9c3fd2c8bb4ad8c8e84 (remote checked).
