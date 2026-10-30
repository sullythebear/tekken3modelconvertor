# Offline archive extractor validation — 2026-10-30

Version **0.7.0-dev.9-ttt2.2**. App/source commit [65f6d1df024fe543b210c191c627be1f4e5d78e6](https://github.com/sullythebear/tekken3modelconvertor/commit/65f6d1df024fe543b210c191c627be1f4e5d78e6), branch development/070-ttt2-import. Main remains ca7e894; no merge. Later documentation checkpoint does not alter the tested app.

## Windows download

[Download portable Windows EXE + authored-only test evidence](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41109332847/artifacts/13002297583) (ZIP, 99.1 MB; GitHub login required; Actions retention14days). Extract the archive and run the EXE under release/. The package also includes test JSON/XML and an authored browser screenshot. It contains NO original game archives, models, textures, skeletons, manifests, project ZIPs or commercial screenshots.

Artifact SHA256: `193c730ad1d4157f2014b90d58f832a6fde52f9f1625d469569eb9cfd4eff3be`. [Final Windows run41109332847](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41109332847) is successful. Artifact existence/size/digest and login redirect checked against the public run. Authenticated ZIP bytes were not re-downloaded by this cloud; source/distribution and actual portable execution are verified on the runner before upload.

## Checks actually executed

- Full local Node suite: **355 PASS;0 failures, skips or cancellations**. Existing338 importer regressions retained;17 new archive/asset-guard cases.
- Independent Python/upstream CRC, member-key and XOR vectors match the JS codec. Source format evidence is upstream archive.py, not original files.
- Authored raw and NRCZ/zlib OFS/BIN records decode to exact authored NUD/NUT/BON bytes, including low-nibble lengths and partial cipher blocks.
- Corrupt chunks/tables/offsets, truncated data, wrong declared decompression sizes, oversized output, missing pairs and source/extracted changes are handled explicitly. Source OFS/BIN hashes stay identical.
- Source aliases and output links into installation are rejected. Previous protected roots survive failed opens; filesystem operations lock before asynchronous destination validation. Duplicate keys retain older provenance while newer index records receive precedence labels.
- GIDX search identifies actual NUT providers. Manifest links model IDs to exact provider entries; missing/duplicate IDs, malformed assets and multiple BONs are not labelled complete. Bone-range checks never prove skeleton identity.
- Real Electron synthetic-only UI: local folder dialogs, Jin-name-hypothesis search, scan, protected-installation output rejection, unique extraction folder, manifest and direct textured/two-bone TTT2 import. Modal responsive bounds at1366x768,1920x1080,2560x1440 and Escape/reopen retention pass.
- Existing80 UI controls and15 workflow groups pass. Existing sourceGLB, skinning, texture, project-save/reopen, conversion and native-fixture tests remain.
- Windows job includes full unit suite, source build, portable packaging, distribution verification, actual self-extracting EXE smoke, importer tests in packaged app, original UI tests and archive browser/extraction/import tests in packaged app. All gates passed; artifact uploads only after success.
- Local precommit and CI guard reject containers, renamed asset magic, new opaque/oversized binary data, images/ZIPs and extraction manifests without printing asset bytes. Synthetic guard tests use a new temporary Git repository. No existing branch/history is rewritten.

## Strict original-data boundary

No original TTT2 archive or other game asset was read, extracted, uploaded, logged or screenshot by this cloud development session. All filesystem fixtures, screenshots and Windows tests are authored. The TTT2 workflow no longer has a private Nikki or other asset-download step; no repositorysecret is consumed. Other private-model workflows do not trigger this branch. No actual extraction of `D:\TTT2\TTT2 Ultimate\game\content\hdd` was attempted here.

The production extractor has no upload/network service. Original files use read-only descriptors; separate local output uses new folders and exclusive file creation. Known network/cloud destinations are rejected. The user must choose a genuinely non-synced local folder, because arbitrary OS backup/sync software cannot all be detected. Game data stays on the user's own PC. Manual sourceGLB/project/image exports after TTT2 import also receive the local-output guard.

## Milestones and remaining limits

**Milestone1:** implemented and synthetically verified offline archive browser/extractor. **Milestone2:** a complete ORIGINAL Jin set, material/rig fidelity and appearance remain unverified and must be checked locally by the owner. No originals may be sent to AI/cloud/CI for that verification.

OFS has hashes, not filenames/character IDs. Search results remain hypotheses. GIDX relations and bone counts are useful but do not prove matching costume/bind poses. Unrecognized nested packs, alternate compression/encryption/index layouts, oversized entries and importer shader/animation/singleBind limitations are not claimed supported. Hosted Windows tests are not physical Windows11 testing. No real Tekken3/Expanded gameplay validation is claimed.

[Windows/Jin local steps and detailed safety/format documentation](ARCHIVES.md) · [Research/implementation plan](ARCHIVE_PLAN.md) · [Importer limits](README.md) · [Worklog](WORKLOG.md).
