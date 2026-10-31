# TTT2 .8: declarative assembly architecture, not an original-game interpreter

## Research boundary

Upstream HEAD was checked:6510de48b137c526debcfddebd6a4813fc65f631, same as the examined source. No original game files, runtime memory, images or private reports were obtained. Exact public code search for ModelBConditions requires sign-in; it supplied no independently usable operator documentation. No original condition interpreter was found in the examined upstream source/documentation. Do not turn this absence into an invented default-A rule.

| Property | Published-source evidence | Implemented meaning | Not established |
|---|---|---|---|
| Default item membership | convert/itemdb.py body_only filters Data.EquipType == デフォルトコスチューム | Existing exact declaration filter | Which five actual Jin items/roles the owner has |
| Model A/B and ModelBConditions | itemdb.py describes sections; added body-only converter clears part lists and removes conditions | Preserve section order, conditions and reference groups; selectedSection stays null | Original predicate operators, selected equipment context, true/false behavior, default activation |
| EffectGroup | itemdb.py preserves model declarations containing effects and reads effect names separately | Effect declaration recorded separately from geometry references | Effects' full loading/visibility behavior; effects not converted into body geometry |
| Part kinds mi/ti/bi/pi | runtime/src/title/roster.cpp kPartKinds/register_added | Preserve typed references, candidate member keys and declared same-node relationships | Actual original registry values, sentinel meaning and active original members |
| Pack member keys | ttt2/archive.py member_key and runtime equivalent | Exact CRC continuation/inversion, ambiguity retained | Character authentication or original active pack registration |
| Added characters | pack.py and convert/model.py merge everything into body files; roster.cpp registers code/parts/kind | Explicitly treated as a different loading path | Those added-pack names cannot be reused as original Jin registry names |
| OffsetInfo, attachment and visibility | BXML format and donor-copy code preserve/remove declarations | Raw bounded context and unresolved binding nodes | Units, pivots, helper transformations, inclusion/replacement/exclusion rules |
| BON structure | readBON plus supported parsed fields | Canonical hierarchy/bind-pose digests; range/equality observations | Correct original binding, remapping, scale/helper runtime semantics or game deformation |

This is source-confirmed behavior of the reference tools. None of the original Jin runtime rules has been validated in-game. References:
- https://github.com/Petexy/Tekken-Tag-2-Ultimate-Edition/blob/6510de48b137c526debcfddebd6a4813fc65f631/tools/characters/ttt2char/convert/itemdb.py
- https://github.com/Petexy/Tekken-Tag-2-Ultimate-Edition/blob/6510de48b137c526debcfddebd6a4813fc65f631/runtime/src/title/roster.cpp
- https://github.com/Petexy/Tekken-Tag-2-Ultimate-Edition/blob/6510de48b137c526debcfddebd6a4813fc65f631/tools/characters/ttt2char/ttt2/archive.py

MIT source notice remains in THIRD_PARTY_TTT2.txt. No new dependencies, copyrighted assets or game downloads.

## Intermediate evidence model

`assembly-graph.js` creates schema t3cs-ttt2-assembly-graph/1, always unverified. Stable nodes and typed edges represent:
- Requested Jin identity and standard outfit. User intent is not file identity.
- Default items, raw Data/instance attributes, model sections and alternatives.
- Original condition trees with unknown truth and no chosen active section.
- Same-path reference groups and typed model/texture/bone/MOP references.
- Pack/member candidates, archive records and possible GIDX providers.
- Skeleton-binding observations, raw offset context, unresolved attachment/visibility/replacement/exclusion.

All unknown instance declarations and OffsetInfo are retained with bounded snapshots and explicit truncation. They are not interpreted by tag-name guesses. There is no arbitrary-offset application, mesh concatenation, hidden-body removal or skeleton welding.

A declaration edge means only that the local database names the relation. A key-pattern edge means a mathematical candidate, not registry evidence. A format-checked member is readable, not an approved outfit component. Every group retains unknown activation. Multiple candidate roots and duplicate records remain explicit. No Model A/B condition is implemented: even an authored tag named AlwaysTrue is unknown in the original domain. Absence of conditions does not independently prove Model A active.

Reference coverage uses *coherent, fully readable pack hypotheses*. It does not combine isolated good members from otherwise broken packs into a complete set. Multiple fully compatible packs report ambiguous candidate coverage. Rejected alternatives are retained diagnostically without masking viable candidates with unrelated failure messages. Zero declared references cannot produce vacuous outfit completion.

Skeleton comparisons are scoped to the bi reference paired with mi in the SAME group. Other parts' BONs cannot silently repair that pairing. With no explicit bi, a base BON is at most an unproven hypothesis. A too-small candidate proves that direct index use fails for that candidate; it does not prove no remapping exists. Same hierarchy/pose digests mean equal parsed layout only; different layouts remain unresolved. All verifiedBinding flags remain false. Digests do not change or replace original bytes.

No schema-loaded boolean can authorize import. Graph complete/canImportCharacter and user-summary canImport remain false in this version. Original identity, registry, condition, attachment, visibility and SOURCE checks still need genuine evidence. The graph prepares those relationships without pretending to execute the unknown engine logic.

## Diagnostics and ordinary UI

`assembly-status.js` produces a short Dutch first-blocker message, candidate coverage and per-item unknowns. Standard mode contains no raw item labels, hashes, archive IDs or JSON. Advanced mode retains the existing raw local evidence, short text, reference/condition inspection and technical browser. The import button stays disabled. Every previous control and workflow is retained.

A blocked state explains the first concrete issue: unreadable/missing database, unsupported reference syntax, missing or ambiguous key pattern, duplicate records, no coherent readable candidate, paired skeleton mismatch, unknown original condition or registry. Full graph details remain local. The asset commit guard rejects standalone assembly-graph JSON as well as previous local evidence schemas.

## Tests and honest limits

New authored tests exercise complete multi-item candidate coverage (never complete original outfit), absent/missing members, known/unknown declarations, both Model A/B alternatives, plausible but unsupported conditions, effects vs geometry, raw offsets/visibility, ambiguous packs, duplicate records, rejected hypotheses, shared textures, paired incompatible skeletons, different/equal layouts, zero-ref cases, graph determinism/valid edges, parsed BON pose fingerprints and forged approval flags. Real synthetic OFS/BIN/NUD/NUT/BON pipeline tests also check graph creation.

There are NO positive tests claiming supported original ModelBConditions predicate evaluation, because no such rule has been established. Exact EquipType filtering is the source-backed selection rule we can test. Fixture coverage is not original-game or visual evidence. Existing invalid archive, skin/import/export fixture, project, UI and native dropdown tests remain.

## Exact remaining local evidence — when testing is possible again

No local test is required to use or review the source improvements. Do not send original assets.

When possible: Standard mode → TTT2 → Model importeren → Jin → Standaardoutfit → Modelonderdelen controleren. Read the short first-blocker message. Close, switch to Advanced, reopen the character dialog, and inspect Outfit-items en part-packonderzoek. The existing short text now includes the first blocker and availability of offset context; the full local evidence also contains the graph.

Still needed: the five actual default labels and associated Data meaning, ten references with same-node/section context, the one complete condition's tags/attributes, original registry-to-pack evidence, any referenced offset/attachment/visibility declarations, and compatible skeleton relationship. The bounded short text is prepared for the first subset; no full BXML/graph/archive listing/report/image is requested. Original registration/condition semantics may require lawful owner-local runtime/code inspection; no such capability or guessed address is added here.

Only after those rules are independently understood can a real assembly executor be implemented and SOURCE visually checked. Until then, stop at explicit unknowns; no other characters, PS1 optimization or cosmetic reconstruction in this change.

## Validated Windows build

**0.7.0-dev.9-ttt2.8**, tested source [b4efcc5efe592d0a8c72792db9bccfa079eb4302](https://github.com/sullythebear/tekken3modelconvertor/commit/b4efcc5efe592d0a8c72792db9bccfa079eb4302). [Windows run41199811304 SUCCESS](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41199811304):402unit tests, portable EXE smoke, packaged importer, all original UI workflows, archive, character/graph/first-blocker diagnostics and SOURCE/dropdown tests pass. Local full402tests and Electron workflows also passed. Original Jin assets/assembly/visuals/gameplay were NOT tested.

[Download portable Windows EXE + authored-only evidence ZIP](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41199811304/artifacts/13041489995),99.4MB, GitHub login required,14day retention. SHA25670e8f8e7681f7a4c234d67b4339dccdace91198bfecdfe456e6cf4d1f84dfbf9. Artifact presence/digest and login redirect checked; authenticated ZIP bytes not re-downloaded here. No original files, private evidence graphs, commercial images or user reports included. Main unchanged.
