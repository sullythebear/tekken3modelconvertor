# TTT2 import analysis and implementation plan

Reference reviewed: Petexy/Tekken-Tag-2-Ultimate-Edition commit 6510de48b137c526debcfddebd6a4813fc65f631 (2026-10-30). Research only: no original game assets downloaded. Existing source analysed before edits; starting studio 50dd53e, clean working tree. Main unchanged.

## Existing architecture / reuse

Electron main/preload provide offline Windows dialogs and allowlisted IPC; renderer is bundled JavaScript/Three.js. importer.js loads FBX directly (no Blender), OBJ/MTL and GLTFLoader with MeshoptDecoder, TGA via TGALoader, external local dependencies via LoadingManager. It returns root/animations/skeleton/weights/stats/warnings/files/dispose. Extended influence skinning, source UVs and materials are preserved. converter.js combines anatomical reconstruction and meshoptimizer reduction; material-bake/art-atlas/atlas provide source-aware PS1 texture conversion with repeated UVs. Skeleton analysis and mapping are separate from import. exporter/native/PS1 codecs validate donor-constrained native candidates and custom-loader T3CM/T3TX: neither arbitrary GLB nor import proves game compatibility. UI workflow and 80 original controls must remain; source files are saved byte-for-byte by studio-project without an extension allowlist.

## Upstream findings (code evidence, not independent original-asset validation)

- nud.py: big-endian NDP3 version0201, 48-byte header/mesh/polygon records, separate index/vertex/weighted vertex clumps, float32/half normals and UVs, byte/half/float weights, restartFFFF strips; materials reference NUT GIDX IDs. Read/write claims are upstream claims, not our Jin test.
- nut.py / bc.py: NTP3 version0100, linear BC1/2/3 blocks and mip sizes, GIDX metadata. Other plain formats exist but upstream decode explicitly refuses them. BC block data is little-endian even though container is big-endian. No Wii U generic swizzle assumption.
- bone.py: little-endian BONE, parent table, local t/r, Rz Ry Rx radians, names, scale arrays and metadata scale. world_matrices deliberately ignores bone scale arrays. Studio must record these fields without silently applying speculative extra deformation.
- animation.py: rawC8 and compressed64 channel decoder with different rotation conventions and fixed body/hand/face channel semantics. motion.py wraps MOTA/motion packs. Parsing alone is insufficient for a validated Three.js clip: binding, helper/face drivers, root yaw, timing and spring behaviour need actual asset comparison. Defer animation import explicitly.
- archive.py: OFS/BIN read-only lookup, scrambling, NRCZ/zlib, keyed costume members; requires appropriate index/data files and member identities. No need to modify/install game files. Initial importer accepts extracted NUD/NUT/BON only; archives are not silently treated as models.
- alo.py: OELA particle/effect library, not character mesh topology. No character import dependency.
- convert/model.py: converts Tekken7/8 -> TTT2 donor templates, not a universal TTT2 renderer. TTT2 uses mm, Y-up, +Z forward per skeleton/retarget docstrings. Texture slot/shader selection and donor materials are domain-specific.
- convert/skeleton.py and retarget.py: donor-specific TTT2 joints, helper/facial conventions and motion retargeting; not valid Tekken3 skeleton specification.
- convert/skin.py: empirical Tekken7/8 skin-colour correction into TTT2; inappropriate for decoding original TTT2 colours.
- decimate.py/c: native C/ctypes quadric wedge reduction with UV/material/skinning/flip constraints and TTT2 vertex quotas. No PS1/native-Tekken3 budget established by it. Reuse existing studio meshoptimizer/anatomical pipeline rather than require Python/C compiler or port a second decimator.

## Licensing

Root LICENSE is MIT, Copyright(c)2026 Petexy/Linexy, no conflicting file headers seen in the examined modules. Formats ported to original JS readers with required upstream notice in THIRD_PARTY_TTT2.txt. Upstream Python depends on numpy, Pillow and runtime native compilation for decimation; none added to studio. Existing Three.js (MIT), meshoptimizer (MIT), fflate (MIT) and runtime dependencies unchanged. Copyright in game assets is separate and not licensed by MIT source.

## Plan / scope

1. New bounded binary readers and BC decoder with independent synthetic malformed/layout/alpha fixtures.
2. Adapter produces existing Three.js scene, preserves multiple UVs/colours/material metadata and weighted BON skeleton; scales mm to metres consistently. Unknown flags/material shader semantics warned; no guessed slot identified as proven albedo. Ambiguous BON/texture IDs fail explicitly. Missing dependencies allow warned static preview, not claimed rig completeness.
3. Extend existing picker/model switch/project routes for NUD/NUT/BON. Add source selector and source GLB export only; old controls stay. Existing conversion/native gates unchanged.
4. Authored binary -> scene -> GLB -> GLTFLoader roundtrip and real browser preview/conversion; regression suite/UI test. Document Jin data and remaining material/animation/rigid-singlebind validation. No original Jin files supplied: synthetic tests cannot satisfy real Jin acceptance.
