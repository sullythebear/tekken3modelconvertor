# Multi-character checkpoint — 2026-10-27

This is a source/test checkpoint, **not a visually accepted conversion release**. The existing UI, 80 controls and main branch are preserved. No commercial assets or screenshots are published here.

## Actual archive inventory

The private Windows runner downloaded and extracted a 42,802,902-byte ZIP, SHA256 `c94a59875a805c769e56a57eeaf0d4b8e54140a9a368326dce8dc8587fbc53b6`. It contains exactly three embedded-resource GLBs, 46,733,140 expanded bytes. No Nikki, FBX, loose textures or animation clips are present. Resource metadata reports no missing external assets.

| File | Bytes | Source triangles | Skeleton |
|---|---:|---:|---|
| John Cena.glb | 460,116 | 6,186 | None |
| John Marston.glb | 2,235,952 | 17,176 | 274 joints; anatomical mapping unresolved |
| Rhea Ripley.glb | 44,037,072 | 81,469 | None |

Safe full hashes and material/UV metadata: [private test metadata branch](https://github.com/sullythebear/tekken3modelconvertor/tree/automation/private-character-diagnostics/docs/private-tests). Despite the branch naming, these files are **public sanitized metadata**, not a private place to put images or originals.

## Kept fixes and rejected experiment

- Material atlas UV selection now respects the actual common texture UV channel; missing or mixed channels explicitly fail rather than silently use UV0. An authored two-colour GLB checks the actual resulting atlas texel. Manual texture matrices are preserved.
- Guarded unskinned, upright extended-arm classification prevents source hands from being treated as torso. Bone-based semantics remain primary when present. Ambiguous poses use the earlier fallback.
- Cena source hands previously fell from 1,040 combined triangles to 48. The current bounded source-anatomical route retains 284 per hand, 568 combined. This is structural preservation, not visual or animated-hand approval.
- Rejected unconditional source-hand retention: it increased Rhea to 22,787 artist triangles. No character-name threshold was substituted.
- Added opaque ray/material provenance, alpha summaries and original glTF material metadata. These are bounded numerical diagnostics, not rendered/PBR/alpha quality scores.

| Model | Baseline triangles | Current artistic triangles | Atlas |
|---|---:|---:|---|
| Cena | 2,290 | 3,692 | Blocked by multi-tile UVs |
| Marston | 4,090 | 12,862 | Blocked by multi-tile UVs |
| Rhea | 75,931 | 15,503 | Generated; visual acceptance pending |

Rhea's active maps use UV0, so UV1 support is not established as her repair. Source metadata really contains untextured white, dark and metallic-grey materials. Opaque-map alpha samples are fully opaque. Neither fact establishes the cause of the unwanted visible blocks. The four-view coarse opaque-ray comparison finds 36 material changes in 760 reference samples; none expose the white material in these samples. Exact private raster inspection is still required.

Marston's black-eye cause is **not fixed or verified**. No cosmetic colour copy was applied. Cena sleeves and Rhea final appearance remain unverified.

## Verified checks

- Full local Node suite: **268 passed**, zero failures/skips/cancellations.
- Offline renderer build: passed.
- Browser UI regression: passed all 15 workflow groups; every original control exists exactly once, 80 total. Includes real preparation export, project reopen, keyboard/search, preference restoration, preview modes, reduced motion and desktop resolutions.
- Existing private Nikki input: artistic output 7,481 triangles, same 3D views as immutable UI baseline. 131/132 full PNGs byte-identical; the remaining full-UI screenshot differs only in a right-panel hover, with the 3D-pane ROI identical. No new Nikki image is publicly uploaded.
- Actual Windows source-Electron probes imported/converted all three supplied GLBs; see [workflow](https://github.com/sullythebear/tekken3modelconvertor/actions/workflows/private-character-inventory.yml). New reports carry source commit/run provenance and reject stale preset results.

**Not rerun for this checkpoint:** newly packaged portable Windows EXE, full private Nikki Windows project roundtrip, comparable Windows memory/timing measurements, actual commercial-model visual review and real gameplay. Existing UI-release binary is not presented as a new multi-character build.

## Remaining input and next steps

The cloud proxy rejects Google Drive before downloading bytes. Windows private download works, but public metadata cannot replace access to the actual source for private visual review. A temporary private HTTPS mirror outside Drive was requested. Do not copy its URL into the repository.

Next engineering issue is repeat-UV atlas baking: triangles must be clipped/rebaked with reliable surface correspondence, wrapping, material and skinning constraints. Modulo/clamping vertices would corrupt patterns and is not an acceptable workaround. Preserve source appearance until this is validated. Commercial images must stay private; no new public screenshot report or release is claimed.

[OpenKumite findings](OPENKUMITE.md): a distinct target appears technically possible with substantial constraints, but no new exporter, Rust rewrite or compatibility claim was added.

## 2026-10-28 continuation — verified atlas repair

The one-tile atlas assumption is replaced by a continuous source-UV rectangle per material. Chart mapping is affine; atlas texels evaluate original wrap modes and texture matrices. No modulo folding, vertex clamping workaround, new triangle generation or skinweight interpolation is needed. Single-tile output remains unchanged. Six authored actual-pixel fixtures cover repeat, mirror, clamp, transformed/manual matrices and nonindexed input; measured RGB and posed-vertex error are zero on checked samples. Nonindexed geometry is cloned before UV writes, avoiding shared-source mutation. Sampler-specific nearest/linear readbacks have separate cache entries.

Actual Windows runs 40678935518, 40679601660 and 40680204381 generated atlases for all three supplied models, with unchanged artist geometry: **Cena 3692; Marston 12862; Rhea 15503 triangles**. Each produced 85 private diagnostic PNGs: source/preparation/atlas, full/diffuse/normals/material-ID, full-body and closeups. Atlas material-ID views show the consolidated material and are not original-material correspondence scores. Cena/Rhea hand crops now use actual anatomical region bounds; Marston remains provisional because mapping is unresolved.

A generic source-resolution fallback avoids assigning every unclassified high-resolution mapped material only a small 32-pixel/16-colour tile. Existing semantic face/skin/hair/eye policies remain unchanged. At equal geometry, diffuse face mean absolute RGB error source-to-atlas decreased from **14.27 to 7.81** for Marston and **17.90 to 11.99** for Rhea. Cena remained 2.79. This supports detail retention, not proof that the eye/material problems are fully repaired. Nikki remains 7481 triangles with the same 131 byte-identical model images; only the known whole-UI hover screenshot differs. All 80 UI controls and existing browser workflows remain intact.

Finite atlas capacity remains a limitation: one Marston material covers 117x1 UV tiles and is undersampled. Spans/texels per repeat are reported; atlas generation is not equivalent to fidelity or export acceptance. Cena fingers/sleeves, Marston's specific right-eye cause and remaining Rhea alpha/material appearance still require private visual review. No new packaged Windows EXE, full private Windows Nikki-project roundtrip, comparable performance numbers or gameplay validation is claimed.

### Restricted visual review

A verified **unpublished draft** contains 255 generated diagnostic PNGs and local HTML, no original models/projects. Both its page and asset returned HTTP404 anonymously; authenticated API confirmed draft=true before/after upload. Sign into GitHub with repository write access, open the repository's Releases view, select the PRIVATE character diagnostics draft, download/extract its ZIP and open index.html locally. **Never publish the draft.** This is not an application release.

Restricted release/download locators are excluded from new public metadata. An automatic approval check rejected the attempted public locator publication; the proposed status command did not execute. Earlier diagnostic metadata already contained a restricted-page locator, so the current tip is being sanitized without rewriting preserved history. Images remained protected by draft access control. The developer cloud cannot authenticate to inspect those private images; automated comparisons do not count as artistic approval.

## Latest anatomy checkpoint — source 5965b6c

Windows run **40681469697 passed**, including full Node suite, actual repeat-UV pixel/posed-rig fixtures, private render matrix, all three model probes, restricted draft verification and private-input cleanup. Public review metadata now contains no restricted release/download locator. Local suite: **283 PASS**, zero failures/skips/cancellations. Final browser UI workflow passes with all 80 controls. No published application release or new EXE.

A further confirmed generic bug affected unmapped rigs: spatial anatomy compared bind-local raw positions to visible posed bounds. The fallback now uses the visible skinned vertex position in the same coordinate space. Recognized bone semantics remain primary. Marston previously classified every primitive as lower legs; corrected output has head, torso, hips and leg regions. It remains unmapped for animation/donor purposes.

| Model | Source triangles | Current artistic triangles | Atlas generated |
|---|---:|---:|---|
| Cena | 6186 | 3692 | Yes |
| Marston | 17176 | 6459 | Yes |
| Rhea | 81469 | 15503 | Yes |
| Nikki, separate private input | — | 7481 | Yes |

Marston region output: head 2889, torso 2225, hips 322, right upper/lower leg 168/289, left upper/lower leg 263/303. The lower total is **not artistic improvement by itself**: source-to-preparation face RGB error increased from 2.80 to 3.88, so visual review is required before accepting this tradeoff. His specific black right-eye cause remains unverified. Cena fingers/sleeves and remaining Rhea material/alpha errors remain visually unapproved.

Final Nikki regression again has 132 PNGs with 131 byte-identical model images and only the known UI-hover difference. Cesium Man (1122 triangles) and synthetic short-hair/crest models (3496/2976) passed their actual conversion/render diagnostic route. These tests do not establish gameplay or automatic artistic quality.

For private review, sign into the repository's Releases UI with write access and open the latest PRIVATE character diagnostics draft. Download/extract locally and open index.html; never publish the draft. Folder IDs map to Cena `97cd06d570f34e56`, Marston `ac97d32c3727e377`, Rhea `d0762a8df6f72497`. The developer cloud cannot inspect authenticated draft image bytes; owner visual assessment is still required. Original assets are absent from the review bundle. No HTTPS mirror is requested.

Pixel-check clarification: the latest remaining full-UI Nikki screenshot differs outside the verified 3D-pane ROI; that pane is byte-identical. The precise UI-difference cause was not fully inspected, so earlier hover-only wording is narrower than the evidence. All 131 other PNGs are byte-identical.
