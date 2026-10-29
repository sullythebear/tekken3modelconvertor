# Multi-character status — 2026-10-29

Development branch: `development/070-multi-character`. Main and earlier releases are unchanged. This is a tested development candidate, **not artistic approval or verified Tekken gameplay**.

## Inputs and reproducibility

The private Windows download works using `CHARACTER_TEST_DOWNLOAD_URL`; Nikki uses the separate unchanged `NIKKI_DOWNLOAD_URL`. No mirror is needed. The archive contains exactly three GLBs and no Nikki or animation clips. All resources are embedded; no missing external resource is reported.

| Input | Bytes | Source triangles | Artistic triangles | Rig |
|---|---:|---:|---:|---|
| John Cena.glb | 460,116 | 6,186 | 3,692 | None |
| John Marston.glb | 2,235,952 | 17,176 | 6,459 | 274 joints, anatomical mapping unresolved |
| Rhea Ripley.glb | 44,037,072 | 81,469 | 15,503 | None |
| Nikki, separate private input | — | — | 7,481 | Existing FBX pipeline |

Archive: 42,802,902 bytes; SHA256 `c94a59875a805c769e56a57eeaf0d4b8e54140a9a368326dce8dc8587fbc53b6`. Expanded files: 46,733,140 bytes. Full safe input hashes, UV/material metadata, per-primitive bake checks, source commit and run provenance are on the [sanitized diagnostics branch](https://github.com/sullythebear/tekken3modelconvertor/tree/automation/private-character-diagnostics/docs/private-tests). That branch is public metadata, never a private image store.

The starting branch contained the repeat/mirror/clamp/texture-transform atlas repair and visible-coordinate anatomy fix (`5965b6c` is an ancestor, not the starting head). A checkpoint was made before experiments. No architecture, UI redesign, new presets, character-name exceptions or game research was added.

## Retained repairs

1. **PBR/unlit albedo factors are multiplied in linear colour space.** Encoded texture bytes were previously multiplied by an encoded material factor. An authored actual-render fixture has source RGB [7,7,112] and RGB555 atlas [8,8,115]. Normal maps are sampled as raw vectors. Legacy Phong/FBX preparation is deliberately preserved; a broad initial transfer change failed Nikki comparison and was corrected.
2. **Actual alpha variation controls footprint sampling.** Unnamed PBR/unlit cutout materials receive alpha-weighted sampling when source alpha varies; opaque/uniform-alpha and legacy calibrated materials retain their existing path. This improves sampling, but does not reproduce true semi-transparent layer compositing in a binary PS1 cutout.
3. **Moderate-resolution unclassified PBR textures retain more source detail.** The generic resolution fallback now includes 256px maps, without changing semantic face/skin/hair/eye or legacy Phong policy. No character names decide this route.
4. **Atlas output preserves source PBR/unlit culling.** A single forced DoubleSide material previously exposed backfaces. Mixed sides now use shared atlas textures and explicit per-side groups; positions, UVs, weights and triangle counts are unchanged. Rhea Material.016 is FrontSide while her other materials are DoubleSide. Authored back-view raster verifies FrontSide stays invisible and explicit DoubleSide stays visible. Visibility rays also account for sidedness and mirrored transforms. Legacy Phong preparation is preserved.
5. **Source-correspondence diagnostics identify actual primitive/material faults.** Per-primitive source-to-atlas and prepared-to-atlas checks report colour error, new black/white samples and alpha mismatch, alongside UV spans and tile allocation. Hand geometry audits compare source and candidate surfaces in a common coordinate frame. Relative darkening components localize facial differences without pretending they are detected eyes.
6. **Diagnostic renders now retain source alpha and depth settings.** The old material-ID override dropped base-map/vertex alpha, and diffuse controls did not retain depthWrite. Authored layered raster verifies transparent regions reveal the underlying material. Normal views remain explicitly geometry-only. Shader/context errors now fail probes rather than merely checking that PNG files exist.

The existing continuous UV-domain atlas evaluates original sampler wrapping and texture transforms per texel, without modulo/clamping UV vertices or changing skinning. Repeat-UV fixtures remain passing. Finite atlas resolution can still undersample very large repeat domains (one Marston material spans 117 x 1 tiles).

## Per-character evidence and unresolved issues

### Rhea — material and transparency

Active textures use UV0 despite UV1 being present; UV1 support is not her demonstrated repair. White untextured, dark and metallic-grey materials really exist in the source and must not be indiscriminately recoloured. Linear albedo multiplication and source culling are confirmed generic corrections.

On the same Material.003 primitive/sample sets, alpha mismatches fell from **585 to 506 / 2,336** without reconstruction and **195 to 176 / 752** after reconstruction. Its RGB is black with variable BLEND alpha. Remaining mismatch is substantial: binary cutout cannot preserve the original semi-transparent compositing. There is **no claim that the visible material chaos is fully solved**.

The source diffuse/material-ID reference was corrected this session. Earlier Rhea whole-render means cannot be directly compared across that reference correction; per-primitive UV sample metrics are independent of scene compositing. Darkening overlays still flag local defects for review.

### Marston — right eye not yet established

No eye recolour/copy, filename alpha override or guessed anatomical side was applied. Sampled base alpha is opaque. Source-atlas, reconstructed-with-source-materials and final-atlas renders now separate the stages, with screen-half darkening component boxes and private overlays. These are **not verified eye landmarks**. The actual unilateral eye cause and artistic impact of the earlier 12,862 -> 6,459 reconstruction remain unresolved without authorized image review.

A shared-head cropped-chart experiment improved an average error but increased newly black facial pixels (left half 4 -> 13). Its production routing and experimental module were removed. It is not counted as progress; see preserved commits/worklog.

### Cena — source hands preserved; sleeve review pending

Both source hands contain 512 classified triangles each; current candidate retains 284 each. Bidirectional surface audit reports source-to-candidate p95 at most **0.4241%** of source hand diagonal, maximum bidirectional distance at most **1.0261%**, and no opposing nearest-normal samples. This supports shape preservation, not human approval of fingers or animated hands; the source has no rig.

Improved moderate-map allocation reduced unexpected black samples on the cap material from **34 to 6** without reconstruction and **13 to 3** after reconstruction. Mean sampled colour error fell **14.76 -> 9.28** and **14.23 -> 7.89**, respectively. Logo alpha still has **5 mismatches / 92 samples**. Sleeve edges and finger appearance are not declared fixed. An earlier unconditional hand-retention experiment increased Rhea to 22,787 triangles and remains rejected.

## Executed validation

- Latest local full Node suite: **311 passed, zero failures/skips/cancellations**. Packaged candidate source had **310 passed**; the extra test is later renderer-error detection, not a conversion change.
- Actual GPU/browser fixtures passed for repeat/mirror/clamp/transformed UVs and posed-rig correspondence, linear albedo, mixed material sidedness, material-ID alpha, render matrix, plus existing native/skinning/mapping fixtures in Windows.
- Latest private Windows run [40951204650](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/40951204650), source `3316c93acdee1e1fe5c497daa32a626223fe1aad`, passed imports, atlas generation and rendering for all three models. It generated **351 private PNGs**, HTML and primitive diagnostics. Artistic status is explicitly NOT_REVIEWED.
- All **80 UI controls** and 15 browser workflow groups pass; packaged UI tests passed too. Existing beginner/advanced modes and project compatibility remain.
- Nikki final local comparison: **131/132 PNGs byte-identical** to the immutable UI baseline. The remaining whole-UI simulation image differs outside the checked 3D-pane ROI; that ROI is pixel-identical. Artistic output remains 7,481 triangles.
- Actual conversion/render route passed Cesium Man (1,122 triangles), synthetic short hair (3,496), and crest hair (2,976).

### Actually packaged Windows candidate

Version **0.7.0-dev.9-multi.2**, app source [5ed2818757a739cac19ebfa9f9346523527afd09](https://github.com/sullythebear/tekken3modelconvertor/commit/5ed2818757a739cac19ebfa9f9346523527afd09).

[Windows run 40949456669](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/40949456669) passed packaging/distribution verification, actual self-extracting portable EXE smoke, packaged UI, both cutout modes, skinning/native fixtures, and all three commercial conversions/renders. Full private Nikki save/reopen in the packaged app passed with **24/24 byte-identical original assets**, raw-asset reuse and private temporary-file cleanup. The portable stub itself and packaged companion app are tested separately; no false claim that the entire project roundtrip runs inside the self-extracting stub process.

[Download code-only Windows candidate ZIP](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/40949456669/artifacts/12931016635) (98.2 MB; GitHub login required). Artifact digest: `e15d1370b5d54bffe3825eb768b1384701bb182ba372a2c87582dd9b1212db37`. The allowlisted bundle contains only EXE, Windows-Validation.json, Unit-Results.xml, SHA256SUMS.txt and README.txt. It contains no commercial screenshots, sources, textures or projects. Runner verifies the EXE hash against the actual tested portable executable before upload. Artifact presence and login redirect were checked; the cloud session could not download authenticated artifact bytes.

Windows timing, working-set/private-bytes measurements and phase details are in **Windows-Validation.json** inside the ZIP. This cloud cannot read that authenticated artifact, so no unobserved performance numbers or speedup are claimed. Later commits change diagnostic scripts/docs only; they do not change the packaged conversion code. This is an Actions development build, not a published prerelease.

## Safe private image review

The latest **unpublished draft** is authenticated and confirmed draft=true; anonymous page and asset checks return **404**. Its bundle contains 351 generated PNGs, HTML and diagnosis JSON, no originals/projects. Restricted locators are deliberately absent from public metadata and this document. Never publish the draft.

Sign into the repository with write access, open **Releases**, select the latest **PRIVATE character diagnostics** draft, download/extract its ZIP, then open **index.html** locally. Model folder IDs: Cena `97cd06d570f34e56`, Marston `ac97d32c3727e377`, Rhea `d0762a8df6f72497`. Each local model page labels source, source-atlas, prepared and atlas stages, with identical cameras and lighting, normal/material/alpha views, hand crops and face-darkening overlays. This is the safe owner-review route, not a public HTML URL.

The developer cloud's authenticated release read returns Forbidden and no authorized image connector is available. Therefore actual commercial screenshot bytes were **not visually inspected by the assistant**. Automated raster/primitive analysis is not substituted for that limitation. Drafts stay protected; no public mirror is requested.

## Next concrete work

1. Owner reviews private face, hand and clothing crops and identifies exact faulty surfaces; correlate with primitive IDs and bounded colour/alpha checks.
2. Resolve Rhea true BLEND-to-PS1 appearance, not merely alpha sampling; preserve legitimate white/black source materials.
3. Localize Marston's actual eye surface/material before changing eye handling. Avoid repeating the rejected cropped-head experiment.
4. Inspect Cena sleeve/logo cutout and fingers before any further source-hand simplification.
5. Re-run relevant private Windows/Nikki and packaged gates after any app-code change. Do not optimize triangles to disguise material defects.

No authentic donor/runtime capacity, Nina install, Tekken animation or real gameplay has been verified. Native fixtures remain synthetic. [OpenKumite findings](OPENKUMITE.md) are unchanged; no extra exporter or Rust rewrite was added.
