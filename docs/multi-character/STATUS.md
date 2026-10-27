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
