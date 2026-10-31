# Jin outfit resolver: declarations → candidate member packs

## Evidence state

Owner-local .6.1 result:1 BXML candidate,5 default items,10 reference fields,1 conditional item. No original BXML, models, textures, skeleton, screenshot or report was supplied to development/CI. The meaning of those five labels and the actual condition tree therefore remains unknown here. Ten reference fields do NOT mean ten separate missing files.

Confirmed by pinned MIT upstream6510de48b137c526debcfddebd6a4813fc65f631:
- `ttt2/archive.py`: member key = pack key's CRC continued over the member index's base4 digits, least significant first, as bytes0–3 (index0 leaves the key unchanged).
- `runtime/src/title/roster.cpp` kPartKinds/kBodySuffixes/register_added: model/texture/bone/MOP part packs; item fields mi/ti/bi/pi refer to those kinds. Added-pack names are NOT the original game's registry names.
- `convert/itemdb.py`: original default Instances contain model declarations and ModelBConditions. The body-only added-character converter explicitly clears part lists and removes conditions.

Hypothesis under investigation: those additional declarations/conditions select geometry absent from the base NUD or substitute/hide base variants. No Jin-specific garment, sentinel, offset or condition semantics are asserted. Upstream describes upper/lower/head/effect defaults, but we do NOT assign those meanings to the owner's five items without their actual metadata.

## Implemented

`outfit-resolver.js` performs exact CRC inversion, without guessing filenames or trying made-up original pack names. For each supported numeric field it collects distinct member indices and intersects the inferred pack keys against the actual locally indexed archive keys. All declared A/B indices are considered as declarations, not selected active geometry. A match establishes only an archive-key pattern under that index interpretation and one-pack-per-kind hypothesis.

Important limitations:
- A single unique index can be paired with every archive key. Format matching does not authenticate a pack. Multiple independent indices are stronger evidence, never original registry proof.
- No pattern can mean missing keys, different pack/variant context, or wrong/unimplemented field semantics; it does not establish absent game data.
- Unknown/negative/sentinel values are exposed and block probing for that field, not interpreted as no part. Only exact uint32 decimal/0x syntax is supported; no guessing.
- No arbitrary first candidate is selected. Too many roots returns an explicit limit state and no sampled subset. Duplicate key records remain ambiguous, irrespective of the browser's archive-order label.
- A matching member is checked read-only for expected magic and supported structural parsing. GIDX correspondences include both probed part NUTs and the base NUT, including coverage split across providers. These are possible providers, not verified shader/variant/version associations.
- MOP, unknown conditional semantics, skeleton identity, part transforms, hiding/substitution and the original registry remain unresolved. No meshes are merged/extracted, A/B selected, bones changed or holes filled.

Limits are resource guards, not game-format requirements:128 default items,256 references,64 distinct indices per kind,8 candidate roots per kind,128 payload probes and256MiB decoded probes. Conditions/group snapshots are bounded to256 nodes and256characters per value; truncation is explicit and cannot lead to approval. Sources use the existing read-only handles, archive identity checks and destination protections. No network/telemetry/upload function added.

`bxml.js` now preserves default Data attributes, grouped model nodes and exact condition structures locally; references have an item/section/node path to distinguish paired fields and variants. `outfit-diagnostics.js` emits an explicitly bounded, whitelisted short text for voluntary follow-up. It excludes archive inventories, filesystem paths, buffers and pixels. Original metadata is not published by the app; user manually selects/copies only the short necessary text if requested.

## Import gate

`Personage importeren` remains disabled. Candidate roots, file parsing and GIDX matches are not sufficient to set registryVerified/variantSelectionVerified/canAssemble. Unknown conditions are never treated as true/false or 'always A'. The explicit original character identity, correct member registration, variant/hiding/transform/skeleton rules and a complete local SOURCE must be established before activation. Current development is a candidate resolver plus targeted local diagnosis, NOT a completed Jin assembly resolver.

Standard mode retains the simple TTT2→character→outfit workflow and hides technical details. Advanced mode preserves every existing archive and manual-import feature. Existing rendering, face materials and PS1 conversion algorithms are untouched.

## Local test — Dutch

1. Start de nieuwe portable build. Kies **Standaardmodus → Tekken Tag Tournament 2 → Model importeren**.
2. Kies de bestaande lokale gamemap, **Jin Kazama → Standaardoutfit → Modelonderdelen controleren**. Alle verwerking blijft lokaal; originele archieven worden niet gewijzigd.
3. Sluit de dialoog, kies **Geavanceerde modus**, open **TTT2-personage kiezen** opnieuw. De lokale controleresultaten blijven beschikbaar.
4. Open **Outfit-items en part-packonderzoek · alleen lokaal**. Controleer de vijf labels, de modelgroepen/referenties, de ene voorwaardenboom en kandidaat-packstatussen.
5. Klik **Korte tekst selecteren** bij **Korte lokale vervolgdiagnose**. Geef uitsluitend die korte tekst door als vervolgonderzoek nodig is. Deze bevat de vijf labels, Data-veldnamen, gegroepeerde referentiewaarden, de kleine voorwaarde en aantallen/voorlopige keys. Als de voorwaarde te groot is: alleen tags en attribuutnamen, geen volledig rapport.

Upload GEEN originele assets, BXML, archiefinhoud, screenshots of volledig JSON-rapport. De oude5/10/1 totalen hoeven niet opnieuw te worden gestuurd. Deze gerichte tekst is nodig om de itembetekenis, indexsyntax en conditieoperatoren te onderzoeken. Een groene formatcheck of één pack-kandidaat is geen visuele SOURCE-goedkeuring.

## Tests

Authored tests cover exact CRC inversion (including independent upstream vector), uint32 extremes, multiple independent indices, ambiguous roots, bounded results, invalid/sentinel syntax, preserved item/section/group/condition context, actual synthetic OFS/BIN member discovery and parsing, duplicate-record refusal, shared base textures, GIDX correspondence and no automatic assembly.32 additional generated seed/index pairs agree with independent Python zlib. No original assets involved.

Electron tests cover local item/pack display, short-text selection, Standard/Advanced routing, hidden technical data, original archive/import/dropdown workflows and all80 baseline controls. Windows packaged validation is recorded below after the source-pinned run completes. No original Jin SOURCE, garment placement or gameplay validation is claimed.

## Windows validation / download

Version **0.7.0-dev.9-ttt2.7**, tested source [5f72be51ac8ed57c579295b1c6e890b8ca2e8872](https://github.com/sullythebear/tekken3modelconvertor/commit/5f72be51ac8ed57c579295b1c6e890b8ca2e8872). [Windows run41196816155 SUCCESS](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41196816155):388unit tests, packaged portable smoke/importer/original UI/archive/character evidence/SOURCE/dropdown checks all pass. Original Jin outfit assembly/visuals are NOT tested.

[Download Windows portable EXE + authored-only evidence ZIP](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41196816155/artifacts/13040612785),99.4MB; GitHub login required,14day retention. Artifact SHA256edddf1f960b2509fc3baac9000eac662487248986e05a83021e1af22b54e0adb. Presence, digest and login redirect checked; authenticated ZIP bytes not re-downloaded here. No originals, private reports or commercial images included. Main remains unchanged.

Additional authored algebra check: one actual pack with same-length member indices4and5 produces two matching CRC-root hypotheses. The resolver retains ambiguity; even multiple matching keys must not be promoted to original registry evidence. This is a reason to preserve the explicit import gate, not choose the first match.
