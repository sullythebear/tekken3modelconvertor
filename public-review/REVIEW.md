# 0.7.0-dev.4 — visual review, not artistic approval

Base: e00dc874c15154a23de1587dc4d5d159ad41f1a3, preserved unchanged.
Branch: development/070-dev4. No automatic merge, no donor/gameplay claim.

## Accepted changes and their limits

- **Face:** internal rig lip/nose controls are first projected onto the visible source surface before assigning chart coordinates. Semantic levels no longer create three entire skull rings each; the explicit eye and mouth constraints remain. Nikki's head falls from 2,439 to 1,407 triangles. Source-specific contour tracing/manual overrides are retained. Fine eyelid alignment, lip shape and the angular jaw still require judgement.
- **Hair:** the inset support shell uses bounded simplification with open borders locked. Its count falls from 640 to 480; the 1,905 outer card triangles are unchanged. Cards alone still expose holes at the back; volumes alone look blocky around the forehead and long ends. Hybrid remains the automatic choice for Nikki. The authored opaque crest remains a different test case; no Nikki-specific mesh indices or material IDs are used.
- **Cutouts:** area filtering with alpha-weighted RGB and a real binary cutoff is applied to lashes. It prevents transparent black texels from contaminating visible colour and reduces weak-alpha stippling. It deliberately does not change the existing hair cutoff, which must retain thin source strands. Cutouts still cannot reproduce modern soft transparency.
- **Clothing:** front/back rebaked torso/hip maps get 256-pixel staging tiles, giving each side about twice its earlier useful linear texel width. The existing 512 atlas and 128-pixel face tile are retained. This costs more preparation texture bytes and CLUT/VRAM layout is still not a measured native donor allocation. Dark-colour dithering is reduced proportionally to luminance so black fabric is not artificially speckled. Shorts segmentation/geometry remains the dev.3 method; coarse hems are not claimed fixed.
- **Memory:** importer creates Blob URLs lazily and avoids copying a full-span model ArrayBuffer before read-only parsing. Selected source files, project byte identity and mapping validation are unchanged. Windows receipts now distinguish summed working sets, private committed bytes and the separate Node test harness. Neither counter is unique resident RAM. Linux does not provide the Windows private-bytes counter and reports it as unavailable.

Nikki artistic: **6,395 triangles**, down **1,192 (15.7%)** from dev.3's 7,587. These are generated geometry reductions, not a preview shader. Other counts: Cesium Man 953; authored short hair 1,931; authored crest 2,195.

| Experimental target | dev.3 actual | dev.4 actual |
|---:|---:|---:|
| 900 | 1,974 | 1,983 |
| 1,200 | 1,997 | 2,002 |
| 1,500 | 2,046 | 2,059 |
| 2,000 | 2,301 | 2,280 |

**All requested targets remain unmet.** Lower artistic cost does not automatically lower the quality-constrained candidate floor. The 1,974 vs 1,983 comparison is included to judge similar actual cost, rather than comparing different budgets as proof of quality. No count is an established Tekken 3 limit.

## Rejected changes and remaining problems

Aggressive support simplification (0.025/permissive borders) created a forehead opening. A general 0.5 alpha threshold removed too much hair. Both were reverted; rejected frames are linked in the gallery.

Additional exterior-chart and normal-based boot correspondence filters did not convincingly fix the rear heel markings, so those experiments were also reverted. The dev.3 boot reconstruction is preserved. Rear and side close-ups expose the unresolved heel/sole transition: a single ring envelope bridges the source heel/arch geometry, and small underside colour regions become stretched. This needs a more specific heel/sole topology; it is not declared repaired by a texture filter. The new dark dithering changes fabric appearance only.

Fine lash/eye contours, jaw/skin faceting, hair tips and seams, angular clothing hems, lost pockets/zipper detail, and low-budget silhouette loss remain. Artistic acceptance is pending the user's screenshot review. No original Nina donor, calibrated native bind or Expanded runtime is available; native fixture checks are not gameplay verification.

## Evidence and reproduction

Download Visual-Review.zip, unpack, open index.html. It links dev.2, dev.3 and dev.4; identical source views; face/eyes/mouth, hair, boots/heels/side ankles, clothing, wireframes and diagnostic movement; all budgets and hair methods. The 27 common Nikki source PNGs were byte-identical to dev.3 in the cloud check. New heel/side images for dev.3 are rendered from its pinned source checkout with the same current camera script. Dev.2 has no such new close-ups; the gallery labels unavailable views instead of fabricating them.

Node 24 developer reproduction, no Blender:

```
npm ci
npm run build
npm test
# private local asset directory; never commit it
NIKKI_DIR=/private/nikki node scripts/dev4-review.mjs
```

The pinned Cesium fixture is downloaded/validated by `npm run test:reference`. The earlier images are safe archived evidence retained in the repository. To reproduce the added dev.3 heel cameras, create a detached worktree at e00dc87, install the same dependencies, build it, and supply DEV3_WORKTREE to the review script. REPORT_ONLY=1 regenerates HTML and measurements; REVIEW_ONLY selects named stages. Neither script publishes private model files.

Cloud checks: all 124 existing unit/integration cases plus six focused new tests; source visual import/export, skinning CPU/GPU, mapping, Cesium animation, native humanoid and native UI fixtures, desktop IPC and source Electron smoke. The actual Windows executable and private full Nikki roundtrip are tested by publish-review.yml; their authoritative results are windows-unit.xml, windows-portable.json, windows-nikki-project.json and WINDOWS-STATUS.md in the downloaded report. Do not infer a Windows pass from this document alone.

The secret URL is only an environment input. Download ZIP/FBX hashes, TGA presence and headers, all 24 saved/reopened asset hashes and conversion statistics are validated. Source FBX/TGAs, project ZIPs, runtime profiles, caches and raw error logs stay under a private temporary directory and are cleaned up. Only sanitized metrics, generated screenshots and safe evidence formats are published. Missing permissions/download failure remains FAIL with a sanitized cause.
