# UI redesign — resumable workflow

Branch: development/070-ui-redesign. Base: 32455421ecb64574ae84730aff46dc06c64e3734 (dev.9.1 source tag 88d1e2e).
No conversion algorithm or project format changes. Main and existing releases remain untouched.

Recovered after cloud interruption: workspace.js, workspace-preferences.js, stylesheet, browser harness, baseline inventory and UI prototype test. Baseline has 80 ID-bearing controls; screenshots exist for 1366×768, 1920×1080, 2560×1440 with an authored synthetic model. No private assets.

Prototype built. Last UI run reached accordion checks but failed because two categories could be open when single-category mode was selected. Do not publish before this and all regression/Windows tests pass.

Next action: repair exclusive accordion behavior, complete real UI workflows and screenshots, run existing conversion/desktop/project tests, publish only after packaged Windows validation. Preserve all original controls and values; new preferences store presentation only.
