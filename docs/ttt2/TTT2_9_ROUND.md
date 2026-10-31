# TTT2 .9: full source context, independent readability and safe experimental SOURCE

## Proven implementation faults

**Truncation:** readBXML already read the supported full tree, but summarizeItemDatabase then used a256-node/256-character snapshot for models, conditions, other item declarations and OffsetInfo. Graph code converted those presentation flags into `declarations-truncated`, the top blocking message. This was a real implementation defect: an intentionally shortened diagnostic representation was being treated as lost source context. Without original files we cannot identify which of those snapshot buckets fired for the owner's installation; we can prove the complete code path and its correction.

The internal declarations now retain the complete parsed tag/attribute/child structure. Parser resource bounds reject unsupported oversized/invalid input rather than silently trimming it. UI previews use a separate declarationPreview function, explicitly labelled display-only. That preview is never sent back into the resolver. Synthetic400-child model and offset declarations,1200-character values and75-level conditions retain late references and full values. A source-unavailable state is null, not a claim that a file was fully read.

**0/10:** `withFormatCandidate` counted only members within *fully format-compatible pack hypotheses*. An individually readable member in an incomplete pack did not count. The caption then described this as readable file sets, conflating lookup/pack coherence with technical readability. Identity and original variant selection remained unverified independently. There was no demonstrated per-part mandatory NUD/NUT/BON triad in this count; it would be incorrect to claim that as the proven cause.

New per-reference fields separately describe lookup, multiple records, unsupported values, format/technical readability, coherent pack context, identity, selection, dependency coverage, optionality, placement and rendering. `readable`, `not-examined`, `unreadable` and `wrong-format` have distinct counters. No file found or not probed does NOT become 'unreadable'. Candidate body-set completeness is separate from readability of files actually present. Actual causes of the owner's0/10 remain unknown until one consolidated local inspection; no original results are fabricated.

Partial CRC hypotheses now consider every declared index when a full pattern is missing, and require multiple independent matching indices. This can recover a hypothesis even if the first member is absent. Multiple or excessive hypotheses are retained/reported, not arbitrarily selected. Explicit resource states distinguish an incomplete search from absent data. Neither complete nor partial CRC patterns prove original registration.

## Actual new assembly functionality

`experimental-assembly.js` composes multiple explicitly selected valid NUDs into one independent scene, using existing material/texture readers. Each keeps its own source geometry. No body geometry is fabricated or welded.
- Default experimental placement: original decoded source coordinates, clearly unverified as game placement.
- Explicit affine local/world matrices and explicit parent attachments are supported by normal Three.js transform math and synthetic tests. They are NOT decoded from unknown BXML transforms.
- Explicit rigid bone attachment is supported only with a selected parent and valid bone index; no guessed pivots. Skinned-child bone attachment is rejected.
- BON use is explicit per part, range-checked, and never identity-approved. Raw mode applies no BON, retains original bytes, and still rejects invalid source weights.
- NUT providers are explicitly selected per model. No provider is picked by filename. Missing maps yield warnings; duplicate selected GIDX providers are rejected. Shared selected texture data is decoded once within the experimental scene under a pixel budget.
- Part visibility can be toggled without modifying source files. Part stages distinguish explicit choice, loaded geometry, raw/explicit placement, unverified skeleton and provisional materials.
- No original Model A/B predicate is executed. Selecting a record is recorded as an experimental record-only choice, NOT original variant approval.

This is an actual scene assembler, not just a graph or a fake 'complete outfit' switch. A synthetic archive/database→chosen files→two visibly rendered source parts workflow is tested. Original Jin registry/variant/attachment/shader interpretation remains unknown. Automatic standard character import is still blocked.

## Safe local preparation and app isolation

The desktop worker exposes opaque catalog/session APIs, no arbitrary file paths. Only scanned, structurally readable records are selectable. Opening a new folder invalidates old selection tokens. Preparation reopens original archives read-only, validates file identities, rechecks SHA256 against scan results, confirms actual types/structures and validates explicit BON indices and texture ambiguity. Invalid or changed records, stale sessions, cycles, singular/non-finite transforms, unsupported part fields, cancellation and byte/pixel budgets reject the transaction. No game file is written, no extraction is needed to show the experiment.

Experiment limits are resource guards:16 model parts,128 pooled files,32 NUT records per part,256MiB selected decoded file bytes and33554432 decoded texture pixels. They are NOT TTT2/PS1 capacity claims. Existing network/cloud folder rejection and install/output protection are retained. Private experiment JSON schema is blocked from commits.

The experiment uses SOURCE as a temporary independent view. The normal source, project records and prepared model are not replaced. Conversion, project-save and all export paths are blocked while the experiment is displayed; PS1 view is marked not converted. A restore button returns the previous root/view/controls. Normal imports or a new archive folder restore/dispose the experiment safely. The normal manual NUD/NUT/BON workflow remains available outside experimental mode.

## User interface and diagnostics

Standard mode stays Jin→standard outfit→check, with a short honest message. Advanced mode adds a filtered per-reference table, bounded local declaration views and **Experimentele import van gevonden onderdelen**. The catalog is paged/searchable by record, type, key and actual source mesh labels; labels are hints, never Jin identity mappings. Users click records and choose providers; no hashes need be retyped. The UI shows which original model references were not selected/resolved and how many selected materials lack map providers; these are not assertions that game files are missing.

Optional local type scan can populate more candidate models without knowing the original registry. It is offline/cancellable and may take time. Only previously scanned readable assets enter the experimental catalog. Candidate records remain non-authoritative; old index versions are annotated rather than silently preferred.

The compact acceptance text preserves source-read completeness/counts, per-reference technical states, unknown conditions, pack hypotheses, first blocker and current experiment choices/visibility. Large conditions are summarized recursively rather than producing an empty generic message. Full supported resolver data remains internal. No automatic screenshots, uploads or full reports are requested. Native dark selects and keyboard controls remain.

## Original-game evidence and remaining limits

Upstream HEAD rechecked at6510de48b137c526debcfddebd6a4813fc65f631:
- archive.py provides OFS/BIN, NRCZ/scramble and member CRC behavior; its loader uses later sorted archive entries as an override. The second OFSI word is not interpreted there. We do NOT invent a part-registry meaning for it or silently apply custom runtime priority to original selection.
- itemdb.py distinguishes original modular default declarations/conditions/OffsetInfo from added body-only characters whose part lists and conditions are removed.
- roster.cpp registers *added* part packs as code/parts/kind, separate from the title's original registry. No original Jin pack names, condition opcodes, hiding rules, bone remaps or transformations have been proven in this round.

Reference/source license: MIT Petexy/Linexy, THIRD_PARTY_TTT2.txt. No original assets or new dependencies downloaded. No other characters or PS1 reduction changes.

Remaining original-data questions: what the five item labels and ten grouped references mean, which original registry pack keys/versions apply, what the one condition selects, whether part coordinates/bones need original attachment/remapping, which base surfaces are hidden/replaced and how the original face shader layers combine. A modular outfit remains a hypothesis for the original holes, not their sole proven cause. SOURCE correctness and gameplay are NOT claimed.

## Automated tests

Tests include full large/nested declaration retention vs bounded display, partial missing-member recovery, independent technical readability, corruption/type/duplicate distinctions, absent body dependencies vs file readability, explicit modular source placement, shared textures, local/world transforms, rigid bone attachment, explicit BON/raw modes, invalid weights, cyclic/singular/bad parts, transactional failure isolation, stale/hash-changed selections, cancellation,5003-entry index paging without unsolicited decompression and source-byte preservation.

Actual Electron end-to-end tests load an authored normal SOURCE, inspect a generated character database/archive, scan/select two models and NUTs, build/render four triangles at known relative source positions, verify red/green texture pixels, compare visibility-toggle pixel coverage, block conversion/export, resize and restore the same normal SOURCE UUID. Existing FBX/import, skeleton, native export fixture, project, archive, SOURCE GPU/dropdown and original80 UI workflows remain. Synthetic fixture success is not original Jin verification.

Final local refinement: **420/420 Node tests pass**. Advanced assembly nodes and relationships remain searchable; bounded scalar-array previews do not crop resolver data. Character-selection/graph UI regression passes.

## Final Windows validation

Tested application commit: `a3521fb7a94ccee14739f64ec63b7037eb8b6aca` (version0.7.0-dev.9-ttt2.9). [Windows run41209320737](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41209320737) completed SUCCESS in4m5s. All420 unit tests pass locally; Windows full unit step passes too. Distribution verification, portable EXE smoke, packaged NUD/NUT/BON importer, original80 UI workflows, archive browser/extraction, character/assembly inspection, actual multipart SOURCE GPU/texture/visibility/isolation, and SOURCE/dropdown diagnostics all pass. This is synthetic validation, not original Jin validation.

[Download Windows EXE and authored-only evidence ZIP](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41209320737/artifacts/13045906152):99.6MB, retention14days, GitHub sign-in required. Artifact SHA256:`af4ed75159af9054763eddaf3099deaadf12da0af394efeed8bddf923cdc30dd`. Metadata, digest, successful upload and HTTPS redirect checked; authenticated ZIP bytes were not independently re-downloaded in this environment. No original game assets, private reports or secrets are included. Main remains`ca7e89470df1c893beffe9c3fd2c8bb4ad8c8e84`.

The remaining original-only questions and one consolidated future local session are in [TTT2_9_LOCAL_ACCEPTANCE_NL.md](TTT2_9_LOCAL_ACCEPTANCE_NL.md). Automatic complete-outfit import remains blocked; experimental file selection does not prove identity, placement, material correctness or game compatibility.
