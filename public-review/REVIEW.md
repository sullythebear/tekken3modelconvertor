# 0.7.0-dev.5 — visual refinement, awaiting human review

Base: 960c6b55597b75fdbb9590c2df3d2ac7485ac511 (dev.4).
Branch: development/070-dev5. Existing commits, releases, formats and main are preserved.
No original-game research was performed in this phase. Fixtures are not gameplay evidence.

## Changes that are actually used

**Face.** Coarse support topology is refined locally from measured source-surface chord error, keeping explicit eye/mouth constraints. Flat patches receive no arbitrary subdivision; discontinuous projection samples are excluded. The finite insertion allowance and pre-insertion errors are reported, not presented as a final geometric or artistic pass. Source UV overlap remains unsuitable for generating geometry. New UV density transitions get their own topology rows. Nikki's head falls from 1,407 to **965 triangles**.

The measured jaw/eye-spacing interval receives 70% of the existing head tile height; neck retains 20%, scalp 10%. The horizontal face allocation and real exported 128-pixel/256-colour head TIM remain. Unsupported jaw measurements retain uniform V. A closed template-mouth patch uses measured lip positions and local source UV correspondence instead of projecting through the open source mouth to a remote surface. Ambiguous local UV spans retain the documented projection fallback. Eye and mouth contours are transferred to the candidate's region metadata and explicitly protected during optimization. Bone-landmark lookup is restricted to the actual face partition, rather than accidentally choosing a closer eye or tooth in another group.

**Hair and lashes.** Area filtering retains the original source hair cutoff (Nikki: 0.2), with alpha-weighted colour only for diffuse maps. Opacity-green and normal RGB are data; unused alpha must not erase them. This is not the rejected blanket 0.5 cutoff. Nikki's 1,905 outer card triangles and 480 inset-support triangles are unchanged: improved continuity is not obtained by adding hair geometry. Hair framing can use the global anatomical head bone even when that parent is absent from a mesh's weighted bone list; otherwise source bounds remain the fallback. Ends and some card seams remain angular.

Candidate cards are processed as independent edge-connected sheets. UV-seam relaxation is allowed only for identical skin assignments; mixed assignments retain conservative topology and coincident deformation seams are protected. No collapse can bridge independent sheets. The report includes each component's policy, target, count and error. This does **not** provide a polygon-count improvement for Nikki's hair in the final lowest candidate (658 vs 656); conservative fallbacks are not counted as visual improvements.

**Clothing.** Measured dihedral creases in the lower hip region protect pocket/hem source features through clustering and the final candidate. This is driven by anatomical region and physical surface normals, not Nikki mesh indices or texture colours. Flat tessellation and nonmanifold contacts are excluded; the feature allocation is finite. Nikki's hip region increases from 252 to **337 triangles**, retaining more cargo-pocket boundaries. The improved dev.4 shorts segmentation and sharp 256-pixel rebaked garment tiles remain. The lower hem is still visibly coarse; it is not declared fixed.

## Geometry measurements and tradeoffs

Nikki artistic: **6,038 triangles**, down **357 (5.6%)** from dev.4's 6,395.
Head saves 442; hip feature protection adds 85. Other artistic regions retain their counts.
Cesium Man: 953; authored short hair: 1,931; authored crest: 1,879.

| Experimental request | dev.4 actual | dev.5 actual |
|---:|---:|---:|
| 900 | 1,983 | 1,999 |
| 1,200 | 2,002 | 2,028 |
| 1,500 | 2,059 | 2,086 |
| 2,000 | 2,280 | 2,341 |

**No requested candidate target is met.** The artistic model is smaller, but the final candidates are slightly larger because measured lip/eye/pocket features are retained. This is not reported as successful budget reduction. The matched-cost gallery compares 1,983 vs 1,999 triangles (16 difference, about 0.8%). Every region's counts, locks, retained fraction, error and component fallback are available in JSON and the report table. No request is claimed to be measured game capacity.

## Rejected experiments and unresolved quality

A 3D diagonal-quality criterion produced face folds/texture slivers despite a technically finite mesh; it was removed. The accepted pipeline keeps constrained chart triangulation with source-measured refinement.

A source-measured sole/arch experiment generated concavity and a separate sole chart, but made texture leakage under the foot worse. Global anatomy lookup exposed an unweighted foot-parent issue, but that alone did not make the result good. This experiment was removed from production. Its screenshots are linked beside the original sole. The existing dev.4 boot reconstruction remains: heel/sole shape, underside colours and ankle folds still require a more reliable layered-foot reconstruction. No previously rejected exterior/normal colour filter was restored.

Fine eyelid/eyelash contours, angular jaw/neck shading, hair ends, some card transitions, coarse clothing hems and low-budget detail loss remain. Better texels, finite geometry, IoU and passing tests do not establish artistic acceptance. The user must review the screenshots.

## Memory and private project reliability

Raw 8-bit diffuse data uses a view instead of another full RGBA copy. Full-size scratch canvases are explicitly released after readback. Data maps are resampled directly into small buffers without full-resolution scratch surfaces. Per-image/per-size/per-data-role caching avoids repeated resampling, and is cleared before final atlas construction. A pre-data-map-correction isolation check retained all 13 non-face TIM hashes while only the intentionally reconstructed face changed; the subsequent data-channel correction intentionally changes baked texture sampling.

The original FBX/TGA buffers remain unchanged. Project schema, compression, safe mapping snapshots and strict native mapping validation are unchanged. Old source data remains available until a replacement import succeeds; it is not discarded early merely to lower a memory score. The full private roundtrip validates ZIP/FBX hashes, all 23 TGA headers and byte identity of all 24 saved assets, then reconverts after reopening.

Windows measurements use the same 250 ms Electron per-process samples as dev.4: summed working sets, private committed bytes and separate Node harness RSS. Phase summaries use those same samples; an unobserved phase is unavailable, never zero. Synchronous harness verification can block its sampler. Working sets can double-count shared pages; private committed bytes are not unique resident RAM. One hosted-run measurement per version is not a controlled benchmark. The authoritative new timings, phase peaks, cleanup and executable receipts are in `windows-nikki-project.json` and `WINDOWS-STATUS.md` in the downloaded report.

Secret NIKKI_DOWNLOAD_URL is read only through the test environment. Original ZIP/FBX/TGAs, project ZIPs, runtime profiles and raw private logs remain outside public artifacts/caches/releases and are cleaned up. Only sanitized counters, generated images and safe report files are published.

## Checks and reproduction

140 unit/integration tests (all 130 previous cases plus 10 focused cases), FBX 7400/7500/7700 and TGA/image binding, CPU/GPU skinning, native UI/humanoid fixtures, mapping, Cesium source animation, source Electron/desktop IPC and synthetic preset/project regression. Actual Windows EXE and private Nikki project receipts are separately produced by the publishing workflow; this document alone does not claim they passed.

Unpack Visual-Review.zip and open index.html. The gallery includes dev.3/dev.4/dev.5, identical full/detail/pose cameras, measured budget losses, matched actual cost, hair methods, other models and rejected variants. All **31** common Nikki source views matched dev.4 byte-for-byte in the cloud run. New sole cameras are rendered from the exact old checkouts with the same current camera script.

Developer reproduction with Node 24 and existing dependencies (no Blender):

```
npm ci
npm run build
npm test
npm run test:reference
NIKKI_DIR=/private/nikki node scripts/dev5-review.mjs
```

For the added old-version sole close-ups, build detached worktrees at e00dc87 and 960c6b5 and pass DEV3_WORKTREE and DEV4_WORKTREE. Existing archived evidence supplies the other old-version images. REPORT_ONLY=1 rebuilds HTML/metrics; REVIEW_ONLY selects stages. `node scripts/package-dev5-evidence.mjs` copies an allowlist and creates exact evidence hashes; `node scripts/verify-review-evidence.mjs` validates them. Preparation/model/project formats are excluded from that package.

Main is not merged. No Nina/Expanded gameplay or artistic completion is claimed.
