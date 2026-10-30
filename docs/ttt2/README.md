# Tekken Tag Tournament 2 local importer

Development source milestone; real Jin and Tekken3 gameplay acceptance remain open. No Python, Blender, compiler or network service is required by the desktop importer. Original files are never modified.

## Windows usage

1. Use local extracted **.nud** (NDP3), matching **.nut** (NTP3) and **.bon** (BONE) files from your own lawfully obtained Wii U character data. Do not supply whole disc/update archives as NUD. Keep a matching costume/skeleton set together; multiple conflicting BON files or duplicate texture IDs fail explicitly.
2. Choose **Import Source: Tekken Tag Tournament 2**, then **Model importeren**. Multi-select the model and its NUT/BON dependencies. The regular auto source also recognizes NUD; model dropdown supports multiple NUDs using the supplied common dependencies. Add another matching NUT through **Textures toevoegen** if needed.
3. Review original preview and existing diagnostic warnings. Missing NUT gives a clearly warned untextured preview; weighted NUD without BON is rejected to prevent silent skin loss.
4. **Export source GLB** writes the original imported mesh, first-layer diffuse representation with embedded PNG, UVs, hierarchy and supported skinning to glTF2 binary. Open in a glTF viewer or Blender for independent inspection. Source files remain byte-identical in saved studio projects.
5. Use the existing PS1 style, detail, atlas, skeleton mapping and conversion controls. Supported TTT2 anatomical joints have explicit source-role metadata, not native row numbers. Ambiguous/unmapped bones remain available in existing mapping tools.
6. Preparation export is not a native playable export. Existing donor/texture/mapping/native validation gates remain unchanged. No TTT2 vertex budget or universal900-triangle limit is added.

The source selector and source-GLB button are additive. All80 original UI controls remain. No global material, texture, anatomical or optimization algorithm was changed for this importer.

## Supported / provisional / unavailable

- NDP3 version0201: float/half normal layouts0,1,2,3,6,7; unweighted/u32+float/u16+half/u8+byte weight layouts; up to4 UV sets with half/float UVs; byte/half RGBA colours; restartFFFF triangle strips with correct parity and degenerate handling. Unknown versions/layouts/primitive flags fail rather than guess. Tangent/bitangent source streams are consumed in stride but not exported as verified tangent frames.
- NTP3 version0100: GIDX lookup and BC1/BC2/BC3 top-mip decoding, including cutout/explicit/interpolated alpha. Mip payloads validated; all source mip levels are not separately exported. Generic tiled/swizzled NUT variants and plain formats8/14/17 are explicitly unsupported. BC blocks little-endian, container big-endian.
- BON versions1/100: parent hierarchy (including validated non-parent-first ordering), translations, EulerRzRyRx radians, inverse binds from local hierarchy, explicit vertex weights. Both geometry and bone translations convert mm to metres with no axis reflection. BON metadata scale and per-bone scales are retained but not speculatively applied (upstream world_matrices omits scale). True helper/spring/facial drivers are not emulated.
- **Material interpretation is provisional.** Full source texture descriptors, flags and shader properties are preserved in userData; the first source texture slot previews diffuse. This is not a validated generic TTT2 shader or proof the first slot is albedo for every shader. Extra layers/auxiliary maps, exact culling/blending/alpha comparator, sampler flags and shader-specific UV orientation need original-asset validation. No normal/mask textures are searched by filename or silently blended into diffuse.
- Unweighted **singleBind** is recorded, not guessed into bone-local animation. Such meshes show a warned raw/model-space preview. Real rigid parts need coordinate-space verification before claiming correct rigging.
- Animations are **not imported**. Upstream supports rawC8/compressed64, MOTA/motion packs and body-channel semantics, but original clip timing, axis-angle vsEuler conjugation, root yaw, helper channels and bind-pose comparison must be verified before emitting Three.js tracks. No empty fabricated animation success.
- OFS/BIN/NRCZ archives and OELA effects were researched, not implemented as selectable character models. This importer never edits/extracts into a game installation.

## Jin acceptance data still needed

Supply the extracted Jin costume NDP3 NUD, all referenced NTP3 NUTs, and exactly matching BONE BON locally. Separate face/hair/body parts may need separate NUD imports; one selected NUD is currently one source model. A reference screenshot/known pose and matching local motion data are needed to verify material slots, UV orientation, rigid singlebind and animation semantics. Do not commit/distribute originals or game textures. No original Jin data was supplied or downloaded in this implementation.

Until those comparisons pass, claim only **synthetic textured/rigged import and GLB roundtrip**, not successful original Jin reconstruction or playable Tekken3 conversion.

## Reproduce tests

`npm ci` then `npm test`; `npm run test:ttt2` builds renderer and runs authored NUD/NUT/BON -> UI -> sourceGLB -> GLTFLoader -> posed-skinned mesh -> existing atlas/conversion. It also reduces a960-triangle authored sphere using existing constraints (current674, experimental request300: constraints may exceed target). No external model download occurs.

Outputs under artifacts/ttt2: results.json, sourceGLB, authored-only screenshots. Unit tests cover BC1–3 alpha,8 vertex layouts, multiUV/colours/weights, missing/duplicate inputs, cyclic hierarchy, invalid offsets/floats/indices/versions/mips, binding and anatomy roles. Existing full-suite/UI tests remain. Windows workflow ttt2-import.yml packages and verifies the actual portable EXE, runs synthetic integration and all original UI workflows in packaged app, then existing private Nikki roundtrip. Artifacts explicitly allow only code, authored screenshots and safe numeric results; no private Nikki files/images/projects are uploaded. A hosted Windows test is not a physical Windows11 test.

## Module / changed-file map

- src/core/ttt2/binary.js: checked endian/half/name access.
- nud.js: geometry/material/strip parsing; nut.js + bc.js: texture IDs and pixels; bone.js: hierarchy; roles.js: source anatomy; import.js: Three.js adapter.
- src/core/importer.js: NUD dispatch and ordinary source diagnostics/lifecycle.
- src/ui/index.html, workspace.js, app.js: source selector, extensions, sourceGLB button, model switching. src/desktop/main.cjs: local picker extensions only.
- tests/fixtures/ttt2.mjs, tests/ttt2-import.test.mjs, scripts/ttt2-test.mjs: authored fixtures, unit and real renderer/GLB/conversion checks.
- package.json/package-lock.json: dev version/test command; no dependency added.
- .github/workflows/ttt2-import.yml: Windows gates; docs/ttt2: analysis, usage, upstream MIT notice.

[Architecture/reference research and plan](ANALYSIS.md). [MIT reference notice](THIRD_PARTY_TTT2.txt). Source MIT does not license Namco game assets.

[Verified Windows build, full test results and authored visual report](VALIDATION.md).

## Local archive browser (ttt2.2)

The newer offline desktop archive browser now supports OFS/BIN discovery, keyed decoding and separate-folder extraction. See [local archive instructions, privacy safeguards and Jin workflow](ARCHIVES.md). Earlier importer-only archive deferrals above describe ttt2.1; no original game validation is implied by the new synthetic tests.
