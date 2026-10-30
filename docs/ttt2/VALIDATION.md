# TTT2 importer validation — 2026-10-30

Version 0.7.0-dev.9-ttt2.1; dedicated development/070-ttt2-import branch. App source: [e07cc24c63c4feeabbbc18d9172bdd5cec712f6d](https://github.com/sullythebear/tekken3modelconvertor/commit/e07cc24c63c4feeabbbc18d9172bdd5cec712f6d). Main remains ca7e894, no merge or earlier release overwrite. This report's follow-up commit changes documentation only.

## Verified implementation milestone

| Check | Actual result | Scope |
|---|---|---|
| Full local regression suite |338 PASS, 0 failures/skips/cancellations|27 new TTT2 cases, all 311 previous tests retained|
| Authored NUD/NUT/BON read |PASS|8 weighted vertex layouts, UV/colour streams, strip restarts, BC1/2/3 alpha, hierarchy and malformed input|
| Independent upstream read/write |PASS|Owned synthetic files roundtrip byte-identically with pinned upstream readers/writers; no original Jin tested|
| Browser AND actual Electron UI |PASS|New source selection, actual sourceGLB save, exact saved bytes reimported with images, positions, UVs, 2 bones, inverse binds and posed-vertex checks|
| Embedded PNG pixels after GLB |PASS|Actual exported red[255,0,0,255] and green[0,255,0,255], not merely an image-entry/file-existence assertion|
| Existing GLB project compatibility |PASS|Save and reopen after selecting TTT2 mode; auto import restored; authored NUD/NUT/BON ZIP records also byte-identical in unit test|
| Existing converter/reduction/atlas |PASS|Dense authored rigged sphere 960 -> 674 triangles, experimental request 300; quality constraints retained, no invalid positions. Small fixture remains 2 triangles|
| Original UI |PASS|All 80 original controls and 15 workflow groups preserved, browser and packaged app; 3 desktop resolutions and preference/keyboard/project/export routes|
| Private local Nikki appearance regression |PASS|7,481 triangles; 131/132 PNGs identical to pre-TTT2 private baseline; remaining simulation UI image has identical 3D-pane ROI|
| Khronos glTF Validator 2.0.0-dev.3.10 |0 errors, 1 warning|NODE_SKINNED_MESH_NON_ROOT; identity parent in adapter and bind/motion checks pass; warning disclosed, not hidden|
| Actual portable Windows EXE |PASS|Distribution/source checks and self-extracting executable smoke; full TTT2/UI/Nikki tests in actual packaged companion app|
| Private packaged Nikki save/reopen |PASS|Existing full project / 24 original-asset integrity gate passed; no private assets/images/projects uploaded|

[Khronos report](KHRONOS_VALIDATION.json). The temporary Apache-2.0 validator was run locally, not added as an app dependency or used as a hosted asset-upload service. Python/numpy were development cross-checks only; desktop importer is JavaScript.

## Download and source-pinned Windows run

[Successful final Windows run 41093279725](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41093279725).

[Download Windows EXE + authored-only HTML/screenshots/test evidence ZIP](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41093279725/artifacts/12995800795),98.9 MB, GitHub login required. Extract and double-clickEXE; open artifacts/ttt2/index.html locally for the synthetic visual report. Archive paths are preserved by Actions; use results.json and unit.xml alongside it. Artifact retention 14 days, not a permanent prerelease.

Artifact digest: `8e557aa34098ae6779362c838a369a56a7aa5523966e9cee16158faac1716293`. Public run lists the artifact and source commit; direct artifact page redirects to login for anonymous access. Authenticated ZIP bytes could not be downloaded by this developer cloud; no claim of re-downloading them here. Runner packaged/verifies/tests before upload; upload is skipped if any preceding gate fails.

The first run 41090898895 correctly failed the new packaged test because desktop IPC omitted .glb from its bounded export whitelist. No artifact was uploaded. The guard was corrected without removing source/game overwrite protection, reproduced in real Electron, then verified by successful runs41091975971,41092546339 and final41093279725. Tests were not skipped or weakened to turn that failure green.

## Explicitly not established

- No original Jin model/textures/BON was supplied. Synthetic tests are not proof that an original Jin costume renders, rigs or converts correctly.
- TTT2 first-slot diffuse rendering is provisional. Full shader layers, blend/cull/alpha comparators, slot semantics and UV orientation need original-asset review. Plain/swizzled texture variants are not implemented.
- Unweighted rigid singleBind, BON scale/helper/spring runtime behaviour and animation retargeting remain unverified. No fabricated tracks or hand motion approval.
- No OFS/BIN character extraction, effect import, game-install modification or game-data download.
- No original TTT2/PS1 files in repository/artifacts. No commercial screenshot publication; private Nikki tests stay private.
- Hosted Windows runner PASS is not physical Windows 11 testing.
- No authentic native donor/gameplay validation. Existing native exporter remains gated; GLB/preparation success is not playable Tekken 3 or Expanded compatibility.

Next concrete input: a locally supplied matchingJin NUD + all referenced NUTs + one BON, plus a known source pose/reference image. Validate diffuse slot, alpha, UV orientation and rigid parts before changing shader rules or claiming original-character acceptance. Optional matching motion data is needed before animation work.

[Use and limitations](README.md) · [Architecture/source analysis and plan](ANALYSIS.md) · [Worklog](WORKLOG.md) · [Upstream MIT notice](THIRD_PARTY_TTT2.txt).
