# Native donor reconstruction (0.2.0)

Implemented on 24 October 2026. **This is a native candidate pipeline, not verified Nina/Nikki gameplay integration.** Procedural tests do not certify an original game file.

## Inputs and workflow

1. Import the rigged source and textures. Skin weights must map to supported anatomical bones (all imported influence sets are retained; twelve influences per vertex tested). Rigid objects attached to a mapped bone can also participate.
2. Load original 27-row 3DMK + ARC files. Alternatively, select the original retail USA `SLUS_004.02` and standalone `TEKKEN3.BNS`. The executable SHA-256, table structure, record boundaries and donor capacity table are checked before records 111/113 (Nina P1) or 115/117 (P2) are selected. This verifies the executable/table association, not the authenticity of arbitrary BNS contents.
3. Load a donor-bound calibration JSON or choose **Estimate donor bind · experimental**. Estimation fits shared-vertex seam constraints with bounded coordinate descent and an anatomical orientation prior. Low seam residual does not prove correct bone roll, game animation axes or accessory rest rotations.
4. **Rebuild on donor topology** retargets the high-resolution source into the donor frames, constructs anatomical BVHs and projects donor control vertices onto their matched source surfaces. Joint seam constraints are reconciled before s16 quantization.
5. Original donor UV triangles are rasterized. For every covered texel, the projected surface point is matched to the high-resolution source; actual source UVs/material maps provide the color. Tiles sharing a CLUT are quantized together. Nontexture ARC members, entry offsets and member sizes are preserved.
6. Normal, primitive and UV blocks are rebuilt with flat normals. Nonplanar quads may split into triangles. The vertex-sharing layout and hand-variant blocks are retained; header and hand-table pointer words are remapped. Normal index capacity, final model bytes and GPU packet bytes are checked.
7. **Export native candidate** writes actual `candidate.3dm`, `candidate.arc`, relocations, profile and report. No GLB is substituted. The result is re-decoded during generation; the renderer uses decoded indexed texture pixels, not just vertex colors.

During native comparison the left view shows the **high-resolution source retargeted into donor bind coordinates**, explicitly labelled `SOURCE · DONOR BIND`. The right view shows the decoded candidate. Both use the same reference bounds and camera. **Return to source pose** restores the original import. The native preview is double-sided and unlit: it does not reproduce PS1 culling, GTE rounding, lighting or ordering-table behavior exactly.

## Material modes

Albedo mode preserves base color and alpha cutouts. The optional detail mode reconstructs a tangent frame from source triangle geometry/UVs and samples normal maps, opacity (green), metalness (blue), roughness (green), specular RGB and occlusion (red). A deterministic fixed-light GGX/Schlick detail bake produces bitmap colors. This cannot retain dynamic PBR highlights on PS1 hardware and is not an in-game lighting match. Degenerate tangent frames are rejected.

## Calibration schema

```json
{
  "schema": "t3cs-donor-bind/1",
  "donorSha256": "<SHA256 of the exact original donor model>",
  "frames": {
    "1": ["16 finite numbers: column-major rigid row-local-to-world matrix"],
    "3": ["16 finite numbers"]
  },
  "roleRows": {"spine": 1, "hips": 3},
  "rowRoles": {"20": "head"},
  "provenance": "Describe how the bind frames were established"
}
```

The sample is explanatory, not a usable Nina calibration. Frames are required for every own-vertex row, and for the axial hips/spine mapping. Matrices must be right-handed rigid transforms without scale. Secondary rows default to their parent anatomical role; accessories require an explicit or estimated attachment. Supplied `verified` fields are not trusted or used as gameplay proof.

## BNS copies, backups and restoration

A candidate can be applied to a **separate BNS copy** only if the candidate's donor SHA matches the selected model record and model/ARC sizes fit. The source BNS and executable are not modified. Old record sizes and LBAs remain unchanged; shorter model payloads are zero-padded in their original record. This does not rebuild an ISO or calculate raw-sector EDC/ECC, and does not install an Expanded loader.

The UI can save a two-file original executable/BNS backup with SHA-256 manifest. Restoring validates the ZIP contents and hashes, asks for a destination and explicit confirmation, and creates a transaction backup of existing files before replacing them. The target is limited to `SLUS_004.02` and `TEKKEN3.BNS`; paths from ZIP files are not accepted. Existing exports cannot overwrite imported source files, including resolved symlink aliases. Restore rollback files are recorded under the selected destination's `.t3cs-restore-backups`.

## Deliberate failure cases

The pipeline rejects unresolved cache references, missing anatomical source surfaces, mismatched calibration hashes, unsupported/shared blocks requiring splitting, ambiguous overlapping TIMs, conflicting source colors on mirrored/shared UV texels, s16 overflow, donor slot overflow and packet budget overflow. It does not hide those errors or label the result game-compatible.

Missing donor hair sheets/accessories are not automatically added. Gouraud shading is currently replaced by flat shading. Automatic bind estimation does not solve all underconstrained joints. No real Nina donor, Nikki input or game executable/installation was available in this cloud session. Those remain required to investigate real-file layouts, add missing topology where necessary and verify motion/game integration.

## Bronmapping en native bewegingstests (0.3.0)

`src/core/skeleton.js` ondersteunt expliciete `t3cs-source-mapping/1`-profielen, gebonden aan een deterministische beschrijving van namen, parentindices en lokale bindtransformaties. Toewijzingen worden volledig gevalideerd voordat bone-userData verandert. De volledige expliciete mapping schakelt naamdetectie uit voor niet-geselecteerde botten; reset herstelt naamdetectie. SkeletonUtils-clones bewaren deze metadata, zodat reductieregio's en donor-retargeting dezelfde anatomische keuzes gebruiken.

`src/core/native-motion.js` vormt donorframes door parent-delta × bindframe × lokale rotatie. Secundaire/accessoryrijen erven de delta van hun profielrol. Vertexposities worden opnieuw geëvalueerd uit de native decoderprovenance, inclusief cache-/halfblends. Per bind/guard/reach/crouch-pose worden vertexverplaatsing, finite waarden, driehoekrandrek en afstand tussen seamconstraintkopieën gemeten. Previewbewegingen zijn geen Tekken-animatiedecoder en geen bewijs van runtimecompatibiliteit. De UI houdt geometrie-export onveranderd; elke reconstructie bevat deze diagnostiek in haar kandidaatrapport.


## Invloeden en containerexport (0.4.0)

Zie [SKINNING.md](SKINNING.md) voor de Three.js-importaanpassingen en GPU-/CPU-route. Donor-retargeting gebruikt alle influence-sets en vooraf berekende anatomische matrices. Er is geen vier-invloedenafkapping meer in de gebouwde desktopapp.

De T3CM-writer gebruikt de volledige decoder en vereist exact alle header-/handtabelrelocaties in gesorteerde volgorde. Een ontbrekende of dubbele pointer wordt geweigerd. T3TX ondersteunt 16/256-kleuren-TIMs, identieke gedeelde palettes, conflictcontrole op overlappende CLUT-woorden en samengevoegde runs binnen dezelfde CLUT-rij. Alle gebruikte modelpalettes en UV-corners moeten door de geëxporteerde band worden gedekt. De huidige containerband is 64 halfwords × 256; modellen met een tweede texturepagina worden voor deze route expliciet geweigerd. De 3DMK/ARC-kandidaat blijft apart exporteerbaar. Het UI-manifest meldt loaderIncluded:false, loaderVerified:false en gameVerified:false.

## 0.5.0: lokale donorinvoer zonder gamebestanden mee te leveren

De desktopapp opent ISO9660 vanuit cooked ISO of raw Mode1/Mode2 Form1 BIN alleen-lezen, haalt SLUS_004.02/TEKKEN3.BNS op en voert daarna de bestaande USA-hash-/recordcapaciteitsvalidatie uit. Losse bestanden blijven bruikbaar. Een donor-ZIP bevat alleen de geselecteerde executable, model- en ARC-records en een hashmanifest; herimport accepteert uitsluitend de verwachte slotbestanden en valideert native inhoud. De gebruiker hoeft het grote BNS niet naar de cloud te uploaden. Synthetische ISO/IPC-tests zijn geen echte retaildisc-test. EDC/ECC wordt niet geverifieerd/herbouwd en ISO-injectie is niet geïmplementeerd.

De echte Nikki-import is nu getest (NIKKI_TEST.md); dit valideert de native Nina-route nog niet. Een vereenvoudigde Nikki van 3.860 triangles overschrijdt het ingestelde voorbereidingsbudget. De native route gebruikt de werkelijke donorcapaciteit en topologie, niet die vrije reductie als een schijnbaar compatibel gamebestand.
