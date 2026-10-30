# TTT2 SOURCE correctness investigation — ttt2.3

User observation (local original Jin, not inspected in cloud): SOURCE35030triangles, preparation14863; torso holes, upper/lower separation and face colour problems occur already in SOURCE. Conversion budget is not changed: first isolate import/rendering.

## Established vs not established

| Area | Established in code/synthetic tests | Original Jin conclusion |
|---|---|---|
| Alpha | Old importer applied a >= threshold to EVERY enabled comparator, including ALWAYS. Function7 is ALWAYS in the upstream GX2/Latte comparison table; the previous blanket threshold was invalid for that convention. Special-case ALWAYS to no alpha rejection; retain normal GE cutouts. Actual GPU fixture: ALWAYS pixel248,0,0,255 vs GE background16,24,35 for identical BC3 alpha64/ref128. | Owner supplied no alpha-test warning; this is NOT established as Jin's cause. Other comparator interpretations remain provisional, not all repaired. |
| Blend | Explicit GL0x302/0x303 was ignored and rendered opaque; now straight-alpha preview. Authored GPU overlay changes black0/0/0 to underlying blue128/176/255. | Jin warning confirms native factors exist, but actual numeric pair and shader alpha provenance still need local check. |
| Backface culling | Current TTT2 materials are DoubleSide. Default SOURCE therefore does not reject ordinary backfaces. Winding/normal disagreement can affect shading. | No proof culling/winding causes these holes. Do not blindly flip/duplicate triangles. |
| NUD layouts/strips | Eight weighted layouts match pinned upstream fields; restart/parity/degenerates have authored tests. Adapter keeps each parsed primitive's geometry, without simplification. New metadata records vertex/UV type, raw index count, restarts and decoded triangles. | No original parser roundtrip/visual verification.35030 alone does not prove correct topology or complete costume. |
| BON/bind | Constructed inverse binds preserve neutral weighted positions in authored tests; new report measures sampled bind displacement. Original bone header range is retained as metadata, not guessed into a bone-index offset. | Zero displacement is only self-consistency, NOT evidence the supplied BON is correct. Unweighted singleBind placement is still unapplied/unverified; no speculative transform is added. |
| Textures | Strict GIDX binding, bounded BC1/2/3 decoding, missing-reference checks and source-slot metadata remain. No cosmetic colour copying. | First-layer/first-slot diffuse remains provisional; vertex colour/alpha, shader properties, UV transforms, additional layers and missing IDs can explain differences, but none is established for Jin yet. |
| Asset set | Manifest links texture references to actual providers, flags missing/duplicate IDs and ambiguous BONs. | jin.nud/nut/bon may satisfy reference/range checks but that does NOT prove all costume parts/shader resources/bind poses are present. No additional archive record is invented. |

NUD comparator7 treatment follows the documented numeric comparison convention; the full original Jin material->runtime shader path has not been independently traced. No claim that this single generic correction repairs Jin's torso or face.

## Owner-local procedure (no original files/images/uploads)

Use the new Windows build. Freshly import the same local set, pause poses/animations and work on SOURCE before converting. Do not change polygon budgets to hide a SOURCE failure.

Open **Instellingen → Diagnostiek → TTT2 SOURCE-diagnose** (settings search `TTT2 SOURCE` also finds the category). Compare the same camera:

1. **Originele importweergave**: current imported material appearance.
2. **Volledige geometrie · zonder textures/cutouts**: if surfaces return, the vertices/triangles exist; investigate materials/alpha/colour rather than filling holes. This is an isolation test, not a repaired character.
3. **Indexbuffers · wireframe zonder cutouts**: look for absent triangles, long unwanted diagonals and disconnected components. Do not upload images.
4. **Materialen · cutouts/transparantie uit**: if this alone fills holes, coverage is implicated; it does not identify which native shader should use which alpha channel.
5. **Materialen · vertexkleuren uit**: if this fixes skin/face/holes, the vertex colour/alpha interpretation needs investigation. Source vertex colours are preserved, not deleted.
6. **Alleen diffuse · geen vertexkleuren/licht**: separate source diffuse mapping from lighting and vertex modulation. Wrong colours here still require texture/UV/slot checks, not a copied face colour.
7. **Ruwe geometrie · zonder skinning/cutouts**: compare rest raw positions to the geometry mode. Unweighted rigid positioning and missing costume parts remain distinct hypotheses; do not infer BON correctness from self-consistent inverse binds.

All controls clone preview materials/skeletons only; original geometry, UVs, weights and files remain. Return to Original before pose/native calibration workflows. Starting conversion or preparation-package export automatically restores Original so diagnostics are not mistaken for output. No automatic screenshots or asset collection.

**Lokaal diagnoserapport opslaan** saves `ttt2-source-diagnosis.json` to a guarded local folder outside the installation. It contains counts/bounds/flags/material descriptors/UV ranges, sampled alpha/colour statistics, texture-ID metadata and bind checks; no source buffers, vertex/index arrays or image bytes. It is LOCAL ONLY and blocked by the Git asset guard. Do not upload the report, original assets, projects or screenshots. Original files are never modified.

Please report only the following typed observations, not files:

- Do torso holes remain in geometry mode, no-cutouts mode and no-vertex-colour mode? Does upper/lower separation remain in raw-no-skin mode?
- Does the face become correct in diffuse-only or no-vertex-colour mode?
- From findings: alwaysAlphaMaterials (active first material), rigidSingleBindNotApplied and missingPreviewTextureIds count. missingTextureIds includes ALL declared auxiliary/variant maps and alone is not evidence that the visible diffuse is missing. From an affected material, the alpha function/reference and vertex/UV type numbers if identifiable locally.

These observations determine the next justified repair. If IDs are missing, use the existing local GIDX archive search. If no IDs are missing, do not assume more files are required solely because rendering is wrong. If raw geometry is genuinely absent, inspect local archive candidates without guessing names or moving originals to cloud.

## Validation boundary

All new tests use owned synthetic NUD/NUT/BON; no original Jin data or image was read in this environment. Full baseline355 tests retained plus9 new SOURCE regressions (364 total). Actual Electron test covers GPU coverage, all preview modes, local report save and restoration before conversion; original80 UI controls/workflows remain. Windows results will be recorded after source-pinned checks. No original-Jin, real Windows11/gameplay or artist approval claim.

## Owner warning evidence and blend follow-up

Owner supplied text-only warnings: BON scale arrays are present;12 arm/face primitives report native blend/cull fields. No alpha-test-comparator, unweighted-singleBind or missing-first-NUT warning was supplied. Therefore the ALWAYS bug is NOT established as the cause of this Jin failure. Nina donor/Expanded/animation warnings concern later export and do not explain fresh SOURCE.

Additional generic repair: explicit standard GL SRC_ALPHA0x302 / ONE_MINUS_SRC_ALPHA0x303 was previously ignored and rendered opaque. Now this exact pair receives straight-alpha diffuse blending with depthWrite=false (preview policy, not proof of the game's depth-write flag). Sentinel0/0 and ONE/ZERO remain opaque; other pairs remain uninterpreted with numeric warnings. No character-specific exception, recolour or geometry surgery. Authored actual GPU test: a transparent black overlay previously produced0/0/0 and hid the blue surface; corrected output128/176/255 reveals that same underlying geometry. Jin's actual factor values and full pixel-shader alpha provenance remain UNKNOWN; this is not original-Jin visual approval.

New warnings expose src/dst/cull hex values. Local report retains zoff/sort/bounds metadata without guessing depth offsets or moving meshes by their bounding centres. Its ALWAYS count uses the active first material, not unused variants. missingPreviewTextureIds is separate from all declared/auxiliary/variant missing IDs; unused maps do not alone prove missing visible diffuse. Mesh labels permit local lookup of the reported arm/face primitive.

Next owner-local evidence: fresh import in the new build; are holes/separation/face colours changed? If not, report only geometry/no-cutout/no-vertex-colour/raw-no-skin effects and the new hex blend warnings. Keep reports, images and assets on the local PC.

## Published synthetic validation / local test build

Version0.7.0-dev.9-ttt2.3, app source [bef32e933593ba691bfe0de029b3f06dbfba1b41](https://github.com/sullythebear/tekken3modelconvertor/commit/bef32e933593ba691bfe0de029b3f06dbfba1b41). Full local364testsPASS,0failed/skipped/cancelled. [Windows41117852208](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41117852208) SUCCESS: portableEXE, packaged importer/GLB, originalUI, offline archive and SOURCE GPU/diagnostic tests. Only authored inputs; no private/game downloads.

[Download WindowsEXE and authored test evidence ZIP](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/41117852208/artifacts/13005594931),99.3MB, GitHub login required, retention14days. Artifact SHA2568e4c69fbec32ba63b71b52fd464d5326e6931371bf7c9603f4ba3a0a9617bbea. Presence/digest checked on run; cloud cannot re-download authenticatedZIP bytes. No original report/image/asset included. Source diagnostic JSON is never in upload allowlist.

No originalJin SOURCE visual acceptance yet. Next action is owner-local fresh import in this build and typed mode outcomes/newhexwarnings only. Do not supply original assets or upload the local report. Main unchanged; subsequent documentation-only checkpoint does not change tested code.

## Geometry-first follow-up (owner's local Jin findings)

Owner reports holes persist with solid geometry, no cutouts, no vertex colours; separation persists without skinning; diffuse-only face remains wrong. All12 reported native blends are ONE/ONE (1/1), not the previously tested straight-alpha pair. Ten culls are0x405; face primitive5/6 cull0. SOURCE already uses double-sided materials. These observations do not prove missing NUD triangles, but rule out treating the earlier alpha fix as a demonstrated Jin repair. ONE/ONE remains explicitly uninterpreted; changing it cannot be claimed to repair raw geometry. No bones, mesh positions, UVs or surfaces changed here.

Upstream code comparison at6510de48b137c526debcfddebd6a4813fc65f631: descriptor offsets relative to48; separate index/vertex/vertex-add clumps; weighted vs unweighted layouts; strips with parity through degenerate connectors and restartFFFF agree. Independent upstream NumPy read of24 authored layouts (6position/normal layouts x4weight layouts, two full-float UV sets) agrees on positions and expanded triangles. This tests authored data, NOT Jin, unknown layout variants or completeness of an extracted asset set. Mesh sphere/centre are retained as bounds, not assumed transforms. No proven binary-parser repair is claimed.

New local numeric fields per primitive:
- `id.layout`: absolute clump offsets, actual vertex and position strides, weighted flag and primitive flag.
- `adapterParity`: decoded counts vs SOURCE counts, changed position components after mm-to-metres Float32 conversion, changed indices. Nonzero identifies an adapter discrepancy; zero only proves consistency with OUR decoder.
- `geometryAudit`: used/unused vertices, indexed components and largest8 component bounds in metres; indexed and exact-position boundary/nonmanifold/same-direction edge counts. Exact-position topology does not weld or change anything. Per-primitive boundaries may be completed by another primitive or be legitimate openings.
- visibility, frustumCulled and drawRange. Null drawRange count means unrestricted, not zero.

Additional preview control `no-frustum` disables only frustum rejection on cloned meshes. If it restores a whole missing part, investigate culling bounds rather than fabricating triangles. It does not disable camera near/far clipping or depth testing. Diffuse diagnostic now preserves blend/depth parameters so an isolation view does not itself change occlusion policy; synthetic regression covers this.

### Owner-local next measurements — do NOT upload the report

Use a fresh import, save the diagnostic JSON only to an unsynced local directory, inspect locally. Type only these small measurements if requesting follow-up:
1. Does `no-frustum` restore any whole part? Does raw wireframe show triangles crossing the chest gaps?
2. For torso/chest and upper-leg primitives only: meshLabel; vtype/uvtype; layout.primitiveFlag and strides; decodedVertices/decodedTriangles, countMatches, changedPositionComponents/changedIndices.
3. For those same primitives: rawBoundsMetres; used/unused vertices; indexComponents; indexed/exact-position boundary and sameDirection counts. For two visibly separated parts, only their component bounds. Bounds establish coordinate gaps, not their intended correction.
4. For incorrect face primitives: first material's flags; first texture ID and missingPreviewTextureIds; UV min/max; map dimensions/flipY/wrap metadata and sampled meanRGBA. Also locally check whether additional material variants/texture IDs exist. Auxiliary layers alone do not prove which shader slot is diffuse.

No JSON, assets, vertex/index dumps, images or screenshots should leave the owner's PC. These numbers cannot alone prove whether an extra archive record is required: a primitive inventory/layout match plus local wireframe identifies absent vs misplaced decoded surfaces; complete character dependencies still require local archive metadata evidence. Keep additional asset groups separate; do not concatenate records or pick BON files by guessed names.
