# Multi-character conversion workstream

Base: 5be246d (tested UI source/tag d64351d, dev.9-ui.1). Branch development/070-multi-character. All committed dev.9 conversion changes are already ancestors of the UI branch; src/core has no missing merge. Main and earlier releases remain unchanged.

The new archive has not yet been inspected: cloud HTTPS proxy rejects both official Google Drive hosts with HTTP 403 before any bytes. Explicit network permission did not unblock it. No claim that four models exist. User configured CHARACTER_TEST_DOWNLOAD_URL; NIKKI_DOWNLOAD_URL remains untouched. The private Windows workflow is the next input route. No private URL is stored in source/workflows/reports.

Privacy: source archive/models/textures/projects and commercial screenshots stay outside public uploads. Only sanitized technical metadata may be committed to a separate diagnostics branch. Original names/paths and raw model data remain in private temporary storage. Commercial visual reports must remain private; earlier permitted public Nikki releases are not modified.

Confirmed generic defect: atlas baking and UV-domain measurement assumed uv0 although imported textures retain their actual texture.channel. Added channel-specific material UV selection for the supported case where baked maps share a UV set, with explicit refusal instead of guessed colours for mixed/missing channels. Manual texture matrices are no longer overwritten when matrixAutoUpdate=false. Five authored UV-domain tests pass; actual browser atlas tests and Nikki pixel regression still pending. This is not a claim that Rhea or Marston is fixed.

Next: run private archive inventory and actual importer probes; inspect actual metadata, prioritize Rhea materials, then Cena hands and Marston eye. Retain Nikki as a positive visual regression. Do not publish a new application release before real model/Windows validation.
