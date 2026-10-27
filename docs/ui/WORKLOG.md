# UI redesign — resumable workflow

Branch: development/070-ui-redesign. Base: 32455421ecb64574ae84730aff46dc06c64e3734 (dev.9.1 source tag 88d1e2e).
No conversion algorithm or project format changes. Main and existing releases remain untouched.

Recovered after cloud interruption: workspace.js, workspace-preferences.js, stylesheet, browser harness, baseline inventory and UI prototype test. Baseline has 80 ID-bearing controls; screenshots exist for 1366×768, 1920×1080, 2560×1440 with an authored synthetic model. No private assets.

Prototype built. Last UI run reached accordion checks but failed because two categories could be open when single-category mode was selected. Do not publish before this and all regression/Windows tests pass.

Next action: repair exclusive accordion behavior, complete real UI workflows and screenshots, run existing conversion/desktop/project tests, publish only after packaged Windows validation. Preserve all original controls and values; new preferences store presentation only.

## Recovered prototype and accepted corrections

- Recovered all prototype files; checkpoint c2c1039 pushed before further work. No rebuild of the converter.
- Fixed DOM relocation while controls were detached. All 80 original controls remain live exactly once, with their existing handlers and values. New locations are in `public-ui-review/control-map.json`.
- Replaced asynchronous accordion-state races with explicit synchronous user intent and native exclusive details names. Multi-open is opt-in; search temporarily reveals matching categories and restores normal preferences afterwards.
- Inspected actual screenshots. On 1366×768 the first layout hid conversion/export; the revised compact workflow and independently scrolling input stack retain style/detail/texture controls and conversion/export/settings above the fold. No forced polygon values or altered conversion defaults.
- Added readable labels, glass-like cool panel gradients, small pixel accents, visible focus, short panel transitions and reduced-motion support. No downloaded fonts, heavy backdrop blur or permanent animation loop.
- Standard/advanced, panel, accordion and preview preferences use a whitelisted local-storage object. Model data and algorithm settings remain in the unchanged existing project/preset mechanisms. Mode switching does not reset values.
- Added independent 320×240 preview resolution that survives tab switches and resizes, including high-DPI framebuffers; this is preview-only. Picking face landmarks reveals the source; native-pose selection reveals the result. Capture/export switches to comparison so both existing renderers have meaningful equal-sized screenshot viewports.
- Existing desktop tests now navigate the Native export group, and the private project test opens the project disclosure before clicking Save. The shared harness explicitly opens advanced controls for legacy algorithm tests; the dedicated UI test always starts in real standard mode.

## Verified locally before Windows publication

- 250 full unit/integration tests PASS, no fails/skips (245 existing + 5 presentation-preference tests).
- UI route PASS: all original control identities; two-model import/switching; actual preset values; conversion; decoded GLB/TIM/report/screenshot preparation package; actual project save/reopen with modified face value and selected model; mode preservation; search; Escape/focus/Enter; one/multiple categories; four preview layouts; actual wireframe/skeleton handlers; 320×240 persistence; reload preferences; reduced motion. Three resolutions tested in both modes with no horizontal overflow and primary controls above fold.
- Existing FBX 7400/7500/7700, OBJ/MTL/TGA/PNG/JPG, texture relationships/alpha, source animation, skinning CPU/GPU (zero pixel mismatch), source mapping and native synthetic fixtures PASS. Native humanoid fixture remains 488 triangles / 15 rows / 17368 of 18720 bytes. Fixtures do not prove gameplay.
- Actual source Electron desktop backup/restore/extraction/import/export IPC PASS. Full private Nikki project PASS, all 24 original assets byte-identical and private temporary data removed. Source-only results do not substitute for the packaged Windows gates.
- Conversion-core Git tree remains `c3e46076213a7a4aa93db0e6d0c7d0ad178ce2d5`, identical to dev.9.1. No project schema/native codec/preset-value changes.

## Publication and next action

Version `0.7.0-dev.9-ui.1`; separate branch `development/070-ui-redesign`. Main and previous tags/releases remain unchanged.
The dedicated Windows workflow must pass the full suite, desktop IPC, skinning/mapping/native fixtures, actual portable EXE, full private Nikki project, packaged UI test and both bake modes. The report must also open via real file:// in Windows Edge. Only then is a new immutable prerelease allowed. Upload paths are explicit UI report/EXE/receipt allowlists; no private models, source textures, project ZIPs, secret URL, game files or entire raw artifact directories.

Next action: push tested source + cloud UI report; inspect actual Windows gates, fix any failure without replacing an existing release, download both release files and validate hashes/receipts. Then record exact commit and verified public URLs. Human design/artistic acceptance and actual Tekken/Expanded gameplay remain open. Advanced technical strings are partly English; known reconstruction limits are inherited unchanged.

## First Windows gate and correction

Run 40585633542 stopped before release: 250 unit tests and real desktop IPC passed, then the source-browser skinning step exited 1. Remaining gates were skipped, no release published. Public annotation exposed only exit code 1, not a detailed exception. Inspection found that the shared default browser path on Windows points at Playwright's browser cache, while this project uses playwright-core without installing that browser. The workflow now explicitly verifies and selects the already installed Microsoft Edge, as used by prior offline report gates. This removes the unsupported browser-path assumption; rerun will establish whether any other defect remains. Failure output from the owned skinning fixture is now captured in a safe log/annotation. No converter code or asserted test result was changed.

## Final visual indicator check

The rerun with installed Edge passed source skinning, mapping and both native fixtures; the missing-browser-path assumption was the only failure observed at that stage. A final UI inspection found that dynamically created range controls inherited empty HTML defaultValue attributes, marking untouched face/hair presets as customized. Category indicators now compare the five style sliders with the selected preset, use actual initial values for other controls, track newly created material/mapping controls and exclude context-only selectors. The real UI test explicitly requires zero face/hair custom indicators on first launch and a nonzero face indicator after editing. Reference calibration and saved regional/landmark corrections are included. This is a presentation correction only.

## Verified public release — complete

- Final product source/tag: **d64351dd628586f31aec8b5c9b1280a3d209b4ac**, `v0.7.0-dev.9-ui.1`. Branch `development/070-ui-redesign`; main still ca7e894, unchanged. Earlier dev.9/dev.9.1 releases retained.
- Windows run **40586622864 SUCCESS**, 4m35s. All **250 tests**, source skinning/mapping/native fixtures, actual desktop IPC, portable EXE smoke, packaged Nikki project, **15 packaged UI workflow checks**, both bake modes and offline Edge report passed. The earlier failed/cancelled runs are not counted as successful validation.
- Both public downloads actually returned HTTP 200. EXE **102,910,032 bytes**, SHA256 **5f567e4ded61eaf79b70c20103e5314d235a40b0f2239fd18b5b6d4e222d9de2**, identical to the Windows portable-smoke receipt. UI-Review.zip **5,015,740 bytes**, SHA256 **80f04fc09c8f91a193203443ce5ec647dbfa075ba96cb663c44ff37c205e5c79**. Every one of **35** manifest files and all ZIP CRCs verified. All 15 PNGs have actual header dimensions matching the requested three resolutions; Windows Edge decoded all 15 offline, with no external requests/errors. No original assets, source textures, game files or private projects included.
- Packaged Nikki roundtrip: all 24 assets byte-identical; 232,047,502 raw bytes reused only after exact comparison; private temporary data removed. Import 3938 ms, first conversion 4546 ms, save **3138 ms**, reopen **3794 ms**, reconvert 3755 ms; project ZIP 49,789,433 B. App summed working sets 3,258,828 KiB, private committed 3,084,376 KiB. Same counters as earlier project tests; shared pages may be counted more than once and one run is not a controlled speed/RAM improvement claim.
- Additional cloud Cesium Man regression PASS: 4672 → 1650 triangles, 19 bones, embedded texture and four source-animation samples. This is not Tekken gameplay.
- Full durable receipt: `docs/ui/RELEASE_VALIDATION.json`. Original-to-new locations, including dynamic material/skeleton families: `docs/ui/CONTROL_MAP.md`.
- Download EXE: https://github.com/sullythebear/tekken3modelconvertor/releases/download/v0.7.0-dev.9-ui.1/Tekken3ConversionStudio-0.7.0-dev.9-ui.1-x64.exe
- Download report: https://github.com/sullythebear/tekken3modelconvertor/releases/download/v0.7.0-dev.9-ui.1/UI-Review.zip — extract and open index.html.

## Exact resumption / acceptance point

The implementation and Windows release gates are complete. Next action is human UI/design review of the before/after screenshots and actual Windows app. Do not describe the design or character artistry as user-approved. Advanced technical labels remain partly English. Existing anatomical reconstruction limits and missing verified Nina/Expanded gameplay are unchanged; UI presentation is not game certification. Do not merge main automatically or replace this tag/release.

The committed `before` images were captured before the redesign at source 3245542, with the same authored synthetic model. `ui-baseline.mjs` is a capture utility, not an automatic checkout switcher: **do not run it on the redesigned app and label those images as old**. For a fresh baseline, use an isolated worktree at 32455421ecb64574ae84730aff46dc06c64e3734, copy the capture utility there, create docs/ui, install/build that old source and explicitly select an available Chromium/Edge through CHROMIUM_PATH before running it. Current before images and their manifest hashes remain the trustworthy historical reference. Source renders may differ across browser/GPU versions; no cross-platform byte-identity claim is made.

This documents-only checkpoint records the verified result without moving the tested product tag or triggering a new release.
