# 0.7 development: surface reconstruction, not artistically accepted

Starting point: `dede88817895feb916e70573323804d02bb43bfe` (0.6.0). This is a development checkpoint, not completion of the requested 0.7 artistic goals.

## Actual implementation

`uv-reconstruction.js` generates new UV-domain samples and Delaunay connectivity, maps every sample barycentrically to the source surface and transfers UVs and attributes. It separates physically disconnected charts before triangulation, checks chart coverage, rejects ambiguous UV overlap, excessive topology growth and nonfinite input. Chart boundary points remain fixed. Facial source-bone anchors seed local support rings; these are **not** a parametric anatomical facial template.

Skin weights are aggregated barycentrically by bone across all available influence sets, sorted and normalized within the original influence capacity. Discarded weight is reported. Texture coordinates correspond to interpolated source UVs; the existing atlas then bakes the real material. This preserves the source chart rather than inventing a new unwrap. No native exporter changes.

Default integration replaces clustering for lower-leg/foot regions of body materials. Other regions retain the previous method. This targets a measured Nikki failure: skin-coloured boot strips exist in both baked and unbaked 0.6 geometry; palette changes alone cannot fix them. Independent surface reconstruction visibly restores much of the boot shafts. Ankle/foot transitions are still defective. This is not full clothing-layer segmentation.

Hair experiments reconstruct physically separate cards; they retain alpha/material relationships. They do **not** generate solid hair volumes or decide reliably between volumes and cards. Face experiments reject the large ambiguous source head chart and retain the previous reconstruction. Neither experiment is enabled by default. New sliders or presets were not added.

## Reproduce the visual comparison

Run `npm ci`, then `npm run build`. Set `NIKKI_DIR` to the directory containing Nikki's FBX and TGA files and run:

```
node scripts/reconstruction-report.mjs
```

Cesium Man must already be cached at `artifacts/fixtures/CesiumMan.glb` by `npm run test:reference`. The comparison verifies its pinned hash. It executes isolated `v060`, `face`, `hair`, `boots`, `combined` stages through the existing app and writes `artifacts/v070/index.html`. Each stage includes original/prepared front, back, side, three-quarter, face and diagnostic movement captures, actual exported GLB/TIM readback and detailed reports. Every image uses the same camera/light/resolution. The `v060` stage reproduces the frozen 0.6 Art Director method; it is distinct from the older no-Art-Director baseline.

Experimental stages can be reproduced through the existing profile import using `settings.reconstruction`: `v060`, `face`, `hair`, `boots`, `combined`. Projects preserve this setting. Default is `boots`. A profile using `v060` restores the complete previous reconstruction strategy. Artist review must consider the actual images, not IoU alone.

## Local authentic-reference calibration

No authentic Nina/Jin/Hwoarang/Xiaoyu/Paul files are present in cloud. None of the provisional settings is claimed to be measured Namco art direction. Existing **Measure local Tekken reference** remains available.

A multi-reference calibration is executable locally:

1. Extract the original executable's BNS records with the existing local game import. For Nina P1, supply model record **111** and its texture ARC record **113** from the matching supported `SLUS_004.02`; P2 uses **115/117**. Retain the original executable and hashes. Other characters require their own matching records, not Nina's palette.
2. Save local model and ARC paths in a JSON manifest, e.g. `[{"label":"Nina P1","model":"nina.3dm","arc":"nina.arc"}]`. Add authentic references only when actually available.
3. Run `node scripts/calibrate-style.mjs references.json authentic-measured.json`.
4. Import that JSON using the existing Art Director profile loader. Measured regional polygon fractions are applied by the converter. Input hashes, per-character raw measurements, texture dimensions/colours and sample count remain in the profile.

This measures density distributions, **not** world proportions, facial topology or maximum runtime budgets. Those still require calibrated bind frames and real game verification. No world-space anatomical averages are fabricated.

## Still required before acceptance

- Deliberate anatomical face loops for eyes, lips, nose and jaw; reliable chart separation and manual landmark correction.
- Hair-volume reconstruction and elimination of card intersections/holes.
- Full clothing/skin/boot segmentation and correct ankle/foot reconstruction.
- Convincing face and outfit improvements at an actual measured game budget.
- Genuine Tekken references, donor bind calibration, Nina export/gameplay verification.
- Execution on Windows. Linux browser/Electron checks and a Windows cross-build do not establish Windows/game success.

The report is explicitly marked **NOT ARTISTICALLY ACCEPTED**. Higher intermediate polygon counts and passing tests cannot satisfy the final goal.

## Cloud checkpoint results

- 100 unit/integration tests pass, including generated positions/UV correspondence, separate overlapping physical layers, nonfinite-input rejection, additional/normalized skin sets and persisted region removal.
- Nikki comparison: 0.6 Art Director 3,705 triangles; new boot-stage artistic model 5,386 triangles. Requested 900 is **not met**. The comparison shows a real shaft improvement, not a game-ready mesh.
- Nikki face-only and hair-only stages currently retain 0.6 output after the guards reject ambiguous/unsafe reconstruction. This is explicitly a failed improvement attempt, not evidence of successful face/hair reconstruction.
- Synthetic/Cesium comparisons and movement captures are included. Cesium's guarded output remains 953 triangles. Synthetic hair experiments may increase geometry without establishing artistic benefit.
- Existing authored native donor reconstruction still writes and decodes 488 triangles / 15 rows / 15 texture tiles, at 17,368 of 18,720 bytes. This is a synthetic fixture, not Nina.
- Twelve-influence FBX/GLB/CPU/GPU checks pass (zero pixel mismatch). Linux Electron offline import/conversion/export and backup IPC checks pass.
- Windows x64 portable/ZIP are cross-build artifacts only. Original Nina/game/Expanded execution remains unverified.
