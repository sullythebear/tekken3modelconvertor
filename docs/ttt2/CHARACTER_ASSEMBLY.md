# Jin: body candidates are not a complete outfit

## Evidence and current diagnosis

No original game file, image or local report was obtained by the development/CI environment. Owner reports59 primitive meshes,22262 vertices,35030 triangles,59 materials/textures,138bones,0missingUV/invalidpositions,0decoder/adapter changes and no missing first-slot GIDX. All solid/no-alpha/no-colour/raw/no-frustum variants retain the holes and separation. These observations establish that the adapter did not drop/change the selected decoded arrays. They do NOT independently validate NUD semantics, identity or completeness.

The lead hypothesis is now incomplete **outfit assembly**, not a rendering repair. It is not yet a demonstrated Jin-specific cause. No holes are filled, bones moved, meshes combined, texture slots switched or new render workarounds added in this change.

| Claim | Evidence | Limit |
|---|---|---|
| `jin` is used for an original TTT2 character's face | pinned upstream `convert/skin.py`, `SHARED`, `ttt2_face` reads `code.nud`/`code.nut` | Corroborates the code and face source, not original archive identity or standard outfit completeness |
| CRC matches `jin.nud/nut/bon` | archive algorithm and owner's selected keys | A 32bit key is not a filename/identity certificate. Multiple records, collisions, update policy and outfit context remain relevant |
| Texture providers match GIDX | existing dependency checks, owner no missing preview ID | Texture addressing, not character identity, shader interpretation or complete geometry |
| BON indices fit | existing positive influence range checks | Not skeleton identity, correct pivots or bind semantics |
| Original fighters can use additional costume models | `convert/itemdb.py` describes default Instances, Model sections A/B and part lists; its body_only deliberately clears them | Not yet proof which Jin instance/part/condition supplies a missing chest or trousers |
| One NUD can be a complete model in an added pack | `convert/model.py` explicitly merges other-game meshes into body files, no costume parts | This is NOT evidence that an original fighter's base NUD is a complete standard outfit |
| Item database and part packs have runtime roles | `runtime/src/title/roster.cpp`, kBodySuffixes, kPartKinds, register_added | Added packs' `code/parts/model` names must NOT be assumed to be original pack registry keys |

Reference source is Petexy/Linexy MIT, pinned6510de48b137c526debcfddebd6a4813fc65f631; see THIRD_PARTY_TTT2.txt. Relevant upstream files:
- https://github.com/Petexy/Tekken-Tag-2-Ultimate-Edition/blob/6510de48b137c526debcfddebd6a4813fc65f631/tools/characters/ttt2char/convert/itemdb.py
- https://github.com/Petexy/Tekken-Tag-2-Ultimate-Edition/blob/6510de48b137c526debcfddebd6a4813fc65f631/tools/characters/ttt2char/ttt2/bxml.py
- https://github.com/Petexy/Tekken-Tag-2-Ultimate-Edition/blob/6510de48b137c526debcfddebd6a4813fc65f631/runtime/src/title/roster.cpp

## What the current extractor actually links

Name search creates CRC candidates. Scan verifies magic and supported layouts. Extraction labels by provenance, never recovered filename. `assessSet` links all declared GIDX values and tests bone range. It does NOT link by archive proximity. `importFiles` requires one NUD, supplied NUTs and at most one BON; it does not read the item database or load additional geometry automatically. SOURCE imports every decoded primitive, without evaluating outfit section/visibility conditions. These are concrete missing capabilities, not proof that all59 Jin primitives should be displayed together.

The pre-existing `overridden` label is based on filename archive ordering. Guided checking retains every matching record and refuses to silently pick one; original/modded runtime load priority is not independently verified. Extracted three-file sets are always review candidates.

## Implemented evidence route (not a completed assembly resolver)

- Bounded, read-only BXML parser: sizes, UTF8 strings, tables, graph references, hierarchy depths, shared/cyclic/orphan nodes and resource limits checked. No XML entity expansion, external references or network.
- Default item summaries select exactly the EquipType string used by upstream, retain labels, Model A/B declarations, mi/ti/bi/pi references and presence of ModelBConditions. Neither field values nor conditions are executed as an assembly recipe.
- Local worker checks ONLY all matching candidates for `jin.nud`, `.nut`, `.bon`, `.xml`. Rehashes and parses them; no exhaustive scan/extraction, no original writes. Ambiguous keys/magic failures, missing/duplicate textures, invalid bone ranges and unknown part/registry/variant links remain blockers.
- Eight separate states: found, readable, identity, parts, outfit, SOURCE review, PS1 preparation, actual game test. Readability never advances the later states. Identity is at most candidate; complete character import is unavailable until a trustworthy original registry/assembly resolver exists. There is intentionally no checkbox that promotes evidence to verified.
- Imported standalone TTT2 files carry explicit unverified assembly metadata and an outfit warning, including in compact status. Existing advanced partial-file imports/conversion remain available for research. They are not complete-character success.

## Local Windows usage (Dutch)

1. Start de nieuwe portable EXE. Kies **TTT2-personage kiezen**.
2. Klik **Gamemap selecteren**. Kies je eigen TTT2-installatiemap, `game`, of rechtstreeks `content/hdd`. De app herkent alleen de bekende layouts. Bij meerdere installaties moet je expliciet de juiste hdd-map kiezen.
3. Kies **Jin Kazama**, **Standaardoutfit**, **Modelonderdelen controleren**.
4. Bekijk de acht statussen. `Mogelijke Jin-bestanden gevonden` betekent geen bewezen standaardoutfit. **Personage importeren** blijft geblokkeerd zolang de onderdelen niet betrouwbaar samengesteld kunnen worden.
5. Voor lokale technische controle: sluit de dialoog, wissel naar **Geavanceerde modus**, open de Jin-dialoog en kies **Technische archiefbrowser openen**. Alle bestaande hash-, type-, handmatige extractie/import- en primitivecontroles blijven behouden.
6. De lokale itemdatabase-informatie staat onder **Lokale identificatie en afhankelijkheden**. Je kunt in de archiefbrowser ook `jin.xml` zoeken; metadata wordt in geheugen gelezen, niet als een uitvoerbaar model geïmporteerd.

Alleen als vervolg nodig is: typ of er0/1/meerdere BXML-kandidaten zijn en de drie totalen `defaultInstances.length`, `partReferenceCount`, `conditionalInstances`. Eventueel één relevante Instance-label met zijn A/B-secties en aantal referenties; geen volledige lijst. Deze cijfers lokaliseren de volgende vraag, niet automatisch het ontbrekende onderdeel. Geen assets, database, volledig rapport, screenshots of archiefinhoud uploaden.

## Still required before complete Jin import

The original character registry's part-pack keys; correct default-instance selection and conditions; hiding/substitution/variant semantics; member resolution; compatible part geometry transforms and skeleton mapping. All must be investigated with original metadata locally, not fabricated from added-pack paths or mesh-label guesses. No complete Jin SOURCE or outfit visual acceptance is claimed. Face material semantics and the PS1 budget overrun remain separate unresolved issues. Native Tekken3 compatibility is still unverified.

## Safety and testing

Existing read-only source handles, stat/hash checks, protected-installation and local/non-network/non-synced destination rules retained. No game assets or character portraits shipped. Display catalogue contains one text-only Jin tile; no invented character database. Standard mode hides technical browser and evidence; advanced mode preserves them. Existing native dark dropdown styles/keyboard handling retained.

Only authored generated archives/BXML/NUD/NUT/BON are used in tests and CI. Synthetic success proves guards/readers/UI behavior, not original Jin identity or visual correctness. Public artifacts contain code, synthetic results and existing authored-only evidence; never local character evidence or item databases. BXML magic and local evidence schema are added to the commit guard.

## Implementation map and validated Windows candidate

- `src/core/ttt2/bxml.js`: bounded BXML/default-item declaration reader.
- `src/core/ttt2/character-set.js`: single display entry and non-promoting evidence policy.
- `src/core/ttt2/archive-local.mjs`, `archive-codec.mjs`: known folder discovery, BXML magic, candidate inspection in memory; existing extraction protections retained.
- `src/desktop/{main.cjs,preload.cjs,archive-worker.mjs}`: trusted local worker operation; no network/file upload API.
- `src/ui/ttt2-characters.js`, `archive-browser.js`, `app.js`, `workspace.js`, `style.css`: guided tile/status workflow, shared folder session, advanced technical access and unverified SOURCE notice. No geometry/render algorithm changes.
- `tests/ttt2-character-set.test.mjs`, authored fixture generators and `scripts/ttt2-character-test.mjs`: declaration/ambiguity/safety/Windows UI coverage; staged asset guard extended for BXML and local character evidence.
- Synthetic-only CI: packaged character test added. A bounded failure-documentation route needs contents:write, writes only one fixed docs path on this branch, checks the exact source head, and never force pushes. No source/game/private downloads.

380/380 unit tests pass locally and on Windows. Packaged portable smoke, original80 UI workflow inventory, authored archive/importer, guided character evidence and SOURCE/dropdown tests PASS in [Windows run41140574305](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41140574305). Tested source [888e132624b828c57335360e7cbc56a1b5ffaf7a](https://github.com/sullythebear/tekken3modelconvertor/commit/888e132624b828c57335360e7cbc56a1b5ffaf7a). Version0.7.0-dev.9-ttt2.6.

[Download portable Windows EXE + authored-only evidence ZIP](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41140574305/artifacts/13017694192),99.4MB, GitHub login required,14day retention. Artifact SHA2563c90e7c61fc5c65dc1ebb4fb16c56c6b8855b6cf74ebbd9dffff94c753296502. Presence/digest verified on GitHub; authenticated ZIP bytes not downloaded here. No Jin/game/private report or image included. An initial Windows unit failure was traced to the test comparing short vs canonical temp paths; expected path corrected using realpath, preserving application security. Summary script syntax was separately corrected and regression-tested. Failure history retained.

In advanced mode the compact local measurement line gives candidate/default-item/reference/conditional totals directly. Reference counts count declarations, including possibly inactive/sentinel entries; they are NOT a count of missing files. These four totals are sufficient for the next diagnostic question; do not upload the database, full evidence or archive content. A complete original Jin SOURCE, correct face shaders, successful PS1 budget and actual Tekken3 gameplay are still unverified.
