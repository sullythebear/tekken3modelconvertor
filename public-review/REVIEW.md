# 0.7.0-dev.3 — visual corrections, awaiting the user's approval

Starts at `9e63ddedb750e5aefb42fbc67c3fd1c086669131` on `recovery/070-dev2`.
Development is on `development/070-dev3`; no old commit/tag is replaced and no
automatic merge is performed. This is not 0.8.0 or a second application.

## What changed

- **Eyes:** contours can now be measured from the visible intersection of the
  actual source eye and head surfaces, in one consistent coordinate frame.
  The generated eyelid apertures have twelve contour vertices instead of four
  interior rig controls. Source boundaries are another available measurement;
  unsupported cases retain their explicit fallback. Manual corrections override
  automatic intersection tracing and remain stored in profiles/projects.
- **Lips/jaw:** eight measured lip points where available, additional source chin
  and jaw constraints, and more useful face texture area. Eighty percent of the
  exported cylindrical head texture width is reserved for the face without
  increasing its 128-pixel atlas tile. Normal-map detail is baked into the face
  texture through the existing static-detail material sampler.
- **Hair:** partially occupied volume cells retain valid boundary triangles;
  source cards overlay an inset support volume instead of only covering the
  front fringe. Non-permissive UV-aware card reduction has a bounded error.
  Explicit volume/cards/hybrid methods and automatic selection are compared.
  Already coarse opaque hair is retained. Shared material names no longer cause
  foot-weighted geometry to be reconstructed as hair. No new controls/presets.
- **Boots:** UV-chart connectivity, measured exterior shaft samples and spatial
  chart limits distinguish garment correspondence from hidden skin. Texture
  projection follows the actual generated triangles where a garment layer can
  be identified. The improved shaft/ankle/sole geometry is retained. Reconstructed
  leg tiles receive 128 pixels when the existing atlas can accommodate them.
- **Clothing:** compact garment UV islands around measured hip/knee locations
  stay with the hip surface, instead of being swept into a leg volume. Both
  torso and hip pieces receive physical front/back texture rebaking. This removes
  the long crotch protrusion in the Nikki comparison. Corrected skeleton roles
  are respected when detecting those garment regions.
- **Optimization:** protected minimum allocations are subtracted before the
  remainder is distributed. Eye/mouth boundaries and sampled silhouette extrema
  are locked; geometric error is bounded. Interior hair-support geometry and
  teeth receive less priority than the visible hair cards and face. If a request
  cannot carry those features, the count remains higher and is reported unmet.
  Neither the requested nor actual counts establish a Tekken capacity.

## Nikki project defect and performance

The old timeout concealed a real error: project saving called the strict mapping
exporter, which refused Nikki's ambiguous automatic bone roles before producing
any ZIP. Projects now snapshot explicit mapping overrides and preserve unresolved
ambiguity; they do not silently accept the first ambiguous bone. Standalone
mapping export retains its strict validation. Dev.2 projects remain readable.
New project mapping-state snapshots require dev.3 when reopened.

Saving also avoids a duplicate copy of all 232,047,502 input bytes and uses ZIP
compression level 1. In the initial Linux desktop measurement, saving took 4.51 s,
reopening 6.35 s, and the ZIP was 49,789,433 bytes. The earlier level-6 Node-only
serializer measured 10.43 s and 41,126,549 bytes; those are different scopes, not
a whole-application before/after benchmark. Faster saving costs a larger ZIP.

The first real Windows source-app run passed: saving 5.18 s, reopening 6.67 s,
ZIP 49,789,433 bytes, peak aggregate app working set 3,726,100 KiB and peak test
harness RSS 555,458,560 bytes. It checked all 24 asset hashes and converted before
and after reopening. The release workflow repeats this in the actual packaged
Windows application; `windows-nikki-project.json` is its authoritative receipt.
Working-set sums can count shared pages more than once; these are single-run
measurements, not a RAM requirement or speed guarantee for another PC.

## Private Windows input

Set the repository secret `NIKKI_DOWNLOAD_URL`. The workflow passes it as an
environment variable, never as a command argument or printed value. Download
errors are sanitized; confirmation HTML is not logged. ZIP and FBX SHA-256 must
match the known input, and one FBX plus 23 valid TGA headers must be present.

Original assets, the project ZIP, runtime profile, caches, crash data and browser
console traces stay in a private directory under the runner's temporary folder.
The app's test-only profile is isolated there before startup. Cleanup runs even
on failure; a cleanup failure makes the test fail. Only the sanitized measurement
JSON is eligible for artifacts/release copying. npm's dependency cache contains
no model data. Public evidence copying uses an extension allowlist, excludes
preparation/project/model files, checks every cloud evidence hash, and rejects
symlinks. `.gitattributes` preserves the LF bytes of evidence on Windows.

## Visual report and reproduction

Unpack `Visual-Review.zip` and open `index.html`. It links full-size original,
0.6.0, dev.1, dev.2 and dev.3 images, front/back/both sides/quarter, eyes/mouth/face,
hair, boots/ankles, shorts, wireframe and diagnostic movement. Separate sections
show requested budgets, per-region losses, and hair-method comparisons. A dev.2
2000-triangle control helps compare similar actual costs with dev.3's quality
floor; comparing 890 triangles with approximately 2000 alone would be unfair.

Developer reproduction (Node 24, no Blender):

```
npm ci
npm run build
npm test
git worktree add --detach ../dev2-baseline 9e63dde
```

Use the same node_modules dependencies in the baseline worktree, run its build,
and set `NIKKI_DIR` to the private extracted assets and `DEV2_WORKTREE` to that
worktree. Fetch the pinned Cesium reference with `npm run test:reference`.
Then run `node scripts/dev3-review.mjs`. `REVIEW_ONLY` selects comma-separated
stages for repair/reruns; `REPORT_ONLY=1` rebuilds the gallery from existing data.
The report generator never publishes private assets. Windows project testing is
`node --use-env-proxy scripts/project-roundtrip-test.mjs`; source files and raw
project ZIPs are deliberately absent from its artifact.

## What remains unresolved

The user has not approved any dev.2 or dev.3 artistic result. Hair ends/card alpha,
small heel markings, coarse clothing hems, ankle folds, fine outfit/zipper detail
and the angular face at gameplay distance still need judgement. Requested low
budgets are not forced; the larger artistic intermediate is not a game export.
Numeric silhouette scores and triangle retention are supporting measurements.
Unsupported models without facial evidence still use a reported fallback.

No original Nina model/ARC, calibrated donor bind frames or Expanded runtime was
available. Native exporter checks use authored fixtures only. Diagnostic idle,
walk, crouch, reach, guard, punch, kick and lip/head motion are not Tekken gameplay.
For Nina P1 validation use the matching USA SLUS_004.02, 3DMK record 111 and ARC
record 113 through the existing local extraction/import route. No game integration
or artistic completion is claimed.

## Final cloud geometry measurements

Nikki artistic dev.3: **7,587 triangles** (dev.2: 5,071). The extra outer cards and restored lashes are real geometry, not a free quality gain.

| Experimental request | Actual triangles | Target met |
|---:|---:|:---|
| 900 | 1,974 | No |
| 1,200 | 1,997 | No |
| 1,500 | 2,046 | No |
| 2,000 | 2,301 | No |

The matched-cost dev.2 control has 1,993 triangles. No measured game capacity is implied by any target. Cesium Man: 953; authored short hair: 1,931; authored crest: 2,755. All counts refer to the actual rendered meshes.

The existing visual integration check passes with four verified material tiles: Clothing, Skin, Hair_volume and Hair. The foot now retains its shared source Hair material rather than becoming a hair volume; export readback verifies all four TIM files.
