# TTT2 Archive Browser / Extractor — local and offline

Version 0.7.0-dev.9-ttt2.2, branch development/070-ttt2-import. This extends the existing importer; no game installation is patched. Original assets have NOT been tested in the developer cloud. Only authored OFS/BIN fixtures are used by tests and CI.

## On your Windows 11 PC

1. Start the portable studio EXE. Click **TTT2 Archive Browser · lokaal** below the left workflow to open its spacious dialog. Escape closes the dialog; the explicit Annuleren button cancels ongoing work. All original import/conversion/settings controls remain available.
2. **Archiefmap kiezen (alleen lezen)**: select your local `D:\TTT2\TTT2 Ultimate\game\content\hdd`. Do not select a network or synced drive. The app indexes matching dataNNN.ofs/bin pairs; it does not load a whole BIN into memory or upload anything.
3. Search **Jin Kazama** or **jin**. These use the source project's `code.nud/.nut/.bon` CRC convention, not invented character IDs. They are explicitly **name hypotheses**: OFS stores hashes, not original filenames. Matching key AND correct magic are necessary, but character identity still needs local review.
4. Select candidates using checkboxes, then **Types scannen**. With a selection only those entries are decoded; without a selection the catalog is scanned. **Annuleren** stops between entries and leaves originals unchanged. Worker processing and progress keep the desktop UI responsive.
5. Expected types are **nud (NDP3)**, **nut (NTP3)** and **bon (BONE)**. Source geometry counts, required texture IDs, available NUT IDs and BON counts are shown as bounded metadata. Entries with unsupported layouts remain recognized but explicitly unsupported, not silently accepted.
6. If name search is empty, clear it and scan the catalog. Browse by `nud`, `nut`, `bon`, archive name, entry identifier or hex key. Search a missing texture as **gidx:12345678** or **gidx:0x12345678** using the actual required ID shown on the model row. No proximity-based or guessed character grouping is performed.
7. Create/select a separate NON-SYNCED output folder, for example `D:\TTT2-exports`, using **Selectie extraheren…**. The tool creates a fresh `TTT2-extract-*` subfolder. It refuses the detected whole installation (`D:\TTT2\TTT2 Ultimate`), not just hdd. It never overwrites a previous output or original file.
8. Read **Manifest en afhankelijkheidscontrole**. Missing texture IDs and bone-range incompatibilities are explicit. A complete texture/range match is only **CANDIDATE_REQUIRES_LOCAL_REVIEW**, not a proven matching skeleton or complete Jin costume. Never assume same bone count proves bind-pose identity. If a model needs more NUTs, use the GIDX search, select the matching records and extract a new set.
9. Select exactly **one NUD**, its matching NUTs and at most one BON from the exported selection, then **Geëxtraheerde selectie importeren**. Bytes are rechecked against exported hashes before handing them to the existing importer. Alternatively select the generated files using normal TTT2 model import. Multiple BONs are deliberately rejected.
10. Inspect model, textures, bind pose and skeleton locally. **Export source GLB**, PS1 preparation, mapping and optimization remain the existing routes. TTT2 privacy mode also restricts subsequent desktop saves to local non-synced folders outside opened installations. No gameplay or original-Jin acceptance is claimed until your local result is checked.

If the archive contains indirect pack layouts or unnamed parts that cannot be assigned confidently, stop at the browser/manual candidate stage. Do not label an arbitrary set Jin. None of these steps requires Python, Blender, terminal commands, internet or original-file uploads.

## Formats, verified source behaviour and limits

Based on MIT upstream `tools/characters/ttt2char/ttt2/archive.py`, pinned6510de48b137c526debcfddebd6a4813fc65f631. The existing upstream notice is distributed with the studio.

- OFS: big-endian chunks `{u32 size, tag, payload}`, required `ofsi` key/word pairs and `ofsd` N+1 encoded offsets. Unknown well-formed chunks are skipped; duplicate/malformed tables, nonmonotonic offsets and BIN overflow reject. Bounded zero alignment tails are accepted. No filename table is inferred.
- BIN: records start at payload offset0x100. Offset low nibble gives actual length modulo16; strip padding is not passed into decompression.
- Each record is XOR-decoded using four independent 32-bit LCG streams: seed four times with0xBDE95/+0x8EF345, advance per16-byte block by1531/+5011. Independent Python/upstream vectors validate byte order and overflow, including partial blocks.
- NRCZ: magic, big-endian declared decoded size,8 flag bytes, zlib payload. Invalid streams, size mismatches and expansion limits fail. Non-NRCZ decoded records remain raw. This is not a generic encrypted/container solver.
- Names: upstream `zlib.crc32(name,0xffffffff)`; pack-member CRC continuation over base4 index digits is available as a codec utility, but pack associations are NOT guessed or automatically extracted as fabricated character sets.
- Later numbered archives win key precedence as in upstream Archives; old records remain browsable with an overridden label and provenance. This is an index policy, not proof a particular mod/runtime actually loads every dataNNN archive.
- Resource safety caps are app limits, not game specifications:32MiB OFS,500k records per index/1m total,64MiB stored record,128MiB decoded record,256 selected files and512MiB extraction/import set. Oversized music/other records can be unreadable/skipped; this does not mean they are model files.
- Existing importer limits still apply: NDP3 version0201, NTP3 version0100 BC1/2/3, BON1/100; shader, animation, rigid-singlebind and helper/scale limitations remain in [README](README.md). Unsupported/swizzled/plain textures and nested packs are not claimed supported.

## Read-only / local-only safeguards

All archive handles are explicitly opened `r`; source identity is checked before/after reads. Original paths cannot be output destinations. Input files and canonical parents are checked for links/replacements. Output aliases into protected installations are rejected. Earlier opened roots remain protected after a failed open; the desktop retains them across worker restarts. Output folders are newly created with unpredictable suffixes; files and manifests use exclusive `wx` creation. Failure/cancellation can leave a separately marked partial output, never a modified original. The tool does not delete or roll back original data.

Network/UNC drives are rejected; Windows drive type is checked locally using built-in PowerShell/.NET (no download or external API). Known OneDrive/Dropbox/Google Drive/iCloud/Box folders are refused. Arbitrary third-party backup/sync services cannot all be detected: you must choose a genuinely non-synced local folder. The app contains no asset upload or telemetry operation and no remote archive service. No exception permits sending originals outside your PC.

Manifest (`t3cs-ttt2-extraction/1`) stays only in the chosen local output. It records generated provenance filenames (NOT reconstructed original names), source archive/index/key/word/offset/stored size, OFS hash, source identities, decoded size/SHA256 and dependency checks with exact texture-provider entry links. Duplicate GIDX providers and malformed selected assets explicitly prevent a complete-candidate label. Do not attach it or assets to public issue reports unless you have independently reviewed what metadata you share; the app does not send it anywhere.

New game/archive/model/texture/image/ZIP extensions and extraction folders are ignored by Git. `scripts/guard-game-assets.mjs` blocks staged containers, renamed known magic, opaque/oversized new binary data and extraction manifests without printing bytes; CI checks tracked containers/new assets. Existing historical images are not rewritten. `.githooks/pre-commit` is enabled in this development checkout; other developer clones can enable it with `git config core.hooksPath .githooks`. This is accidental-commit protection, not a universal copyright detector. Release uploads have an explicit code/authored-only allowlist. The TTT2 branch workflow no longer uses NIKKI_DOWNLOAD_URL or any private model download; only synthetic files run on CI.

## Tests / status

Current local full regression suite: **355 PASS**, including17 new archive/guard cases above the338 importer baseline. Real Electron authored-only browser test verifies folder dialog, search/scan, protected output rejection, decompress/extract, manifest and direct textured/rigged import. Original synthetic input OFS/BIN SHA256 values remain unchanged. Existing TTT2 sourceGLB and project tests also pass in Electron. Automated screenshots are generated ONLY by the authored fixture test driver, never by normal archive scanning.

`npm test`, `npm run test:ttt2-archive` reproduce development tests. The Windows workflow builds the actual portable EXE, verifies it, tests both importer and archive browser in the packaged app, and runs the original UI workflow suite. Hosted Windows is not your physical Windows11 installation. Final source-pinned build/results will be recorded below after completion.

Milestone1: implemented browser/extractor with synthetic verification. Milestone2: complete original Jin set and appearance still require local validation on YOUR Windows PC. No original archives were accessible/read/extracted/uploaded in this cloud session; no original assets are needed for the public build.
