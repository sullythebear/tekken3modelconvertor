# 0.7.0-dev.6 — whole-character integrity review

This is a development build requiring human visual approval. It does not establish real Tekken 3 / Expanded gameplay compatibility.

Changes:

- Source-connectivity reduction replaces blind clustering on torso, shoulders, arms and hands. Regional boundary positions stay invariant during automatic stylization; joint-weight fields contribute to reduction. Unsafe reductions retain the reliable source surface and report the fallback.
- Hands have independent source UV crops and 8-bit palettes. Original bent finger poses and skinning are retained; no generic spread-finger template is imposed.
- Skin diffuse shading is baked from original smooth normals. Genuine source colour/normal-map detail is retained, without noise, shiny shaders or fabricated AO. Upper-leg skin receives source-derived form shading where the exterior garment boundary is measured.
- Whole-scene diagnostics distinguish original open borders, measured eye apertures, hair cards and unexplained boundaries. No arbitrary clothing/alpha hole filling. Counts, winding and nonmanifold edges are reported; public reports contain no original boundary vertex arrays.
- The accepted face algorithm is unchanged. The report checks the full triangle-ordered geometry/UV/skin attribute signature against dev.5.1.
- Shared diagnostic instrumentation produces comparable hand, wrist, elbow, shoulder, arm-raising and finger-flex images for both engines. These are source-rig diagnostics, not Tekken animations.

Reproduce locally with Node 24 and dependencies installed:

```
npm ci
npm run build
npm test
```

For the complete visual comparison, prepare an unchanged checkout at commit `50a82e886275b11586d5f41bc852ebb8962decdb`, build its renderer, and set `DEV51_WORKTREE` to that checkout and `NIKKI_DIR` to your private FBX/TGA folder. Then run `node scripts/dev6-review.mjs`. Cesium Man must be present in each checkout's ignored `artifacts/fixtures/CesiumMan.glb`, with attribution in `artifacts/reference/ATTRIBUTION.txt`. The runner checks its pinned SHA-256. Reports and screenshots are placed in `artifacts/dev6-review`. Raw preparation/project files remain private; only the evidence packager's allowlist is published.

`node scripts/project-roundtrip-test.mjs` validates the private Nikki archive/assets, saves and reopens the whole project, checks byte-identical assets and reconversion, measures timings and memory, and deletes private temporary data. In Windows Actions it uses repository secret `NIKKI_DOWNLOAD_URL`; the publishing workflow also runs it in the actual packaged EXE. The URL, FBX, TGA and project ZIP are excluded from logs, caches and public artifacts. Npm dependency caching contains no model inputs.

Open `index.html` in the downloaded Visual-Review.zip to see the full comparison. Actual Windows outcomes are in WINDOWS-STATUS.md, windows-unit.xml, windows-portable.json and windows-nikki-project.json. Working-set sums may double-count shared pages; private committed bytes are a different counter, not unique resident RAM. One run does not prove a general memory improvement.

Outstanding: review open clothing/neck/boot boundaries, finger silhouette and texture seams under motion. Experimental targets are not measured game capacities; higher actual counts deliberately retain protected surfaces. Artistically approving this release requires the user's screenshot review. Real Nina/Expanded loading and gameplay remain unverified.

## Recorded cloud results

156 unit/integration tests pass, without skipped tests. Browser regressions cover import, source/GPU skinning, two native fixtures, source mapping, Cesium source animation, deterministic rendering, desktop IPC and the source-Electron smoke test. The complete private Nikki project roundtrip also passes; Windows receipts are generated separately by Actions.

Nikki's artistic intermediate has 7,386 triangles (dev.5.1: 6,038). The experimental requests 900 / 1,200 / 1,500 / 2,000 produce 4,028 / 4,028 / 4,031 / 4,047 triangles. None meets its requested target. The actual-cost comparison uses 4,025 baseline triangles versus 4,028 current triangles. These counts are not evidence of donor capacity.

Artistic allocation: head/face/eyes 1,551 (the reconstructed face itself remains 965); hair 2,385; torso 483; hips/clothing 360; shoulders/upper/lower arms 889; hands 1,022; full leg/boot regions 696. The technical JSON provides each side and material separately.

Whole-character diagnostics flag 1,193 unexplained open edges in the baseline and 103 in dev.6: torso 16, hips/clothing 62, full leg/boot regions 12, head 13. No new open edges remain in shoulders, upper/lower arms or hands under this positional test. Those 103 edges are not silently accepted or blindly filled; visibility and intentional clothing openings still need review. The 47 winding inconsistencies are inherited from dev.5.1 and remain unresolved. The optimized candidate introduces no additional unexplained boundary edges relative to the artistic intermediate. These are geometric diagnostics, not a proof of watertightness or animation/game validity.

The artistic head's triangle-ordered geometry, UV and skin attributes have exactly the same SHA-256 signature as dev.5.1. The 128×128 face TIM's pixel indices and 256-colour palette also match exactly. Remaining concerns include clothing/neck/boot borders, faceted skin transitions, overlapping finger silhouettes in the source bent pose, and the higher geometry floor. Please judge the full gallery before granting artistic acceptance.
