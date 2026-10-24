# Afhankelijkheden en licenties

De applicatie is nieuw geschreven. Directe afhankelijkheden zijn exact gepind; alle transitieve versies/checksums staan in package-lock.json.

| Package | Versie | Licentie | Gebruik |
|---|---|---|---|
| delaunator | 5.0.1 | ISC | UV-chart triangulatie |
| robust-predicates | 3.0.3 | Unlicense | robuuste geometrische predicates (transitief) |
| three | 0.186.1 | MIT | rendering, FBX/OBJ/MTL/glTF/TGA import, GLB inspectie-export |
| meshoptimizer | 1.3.0 | MIT | attribuutbewuste reductie, Meshopt glTF decoding |
| fflate | 0.8.3 | MIT | voorbereidingspakket-ZIP |
| electron | 45.0.0 | MIT plus Chromium/Node third-party notices | ingebedde desktopruntime |
| electron-builder | 26.15.3 | MIT | Windows-distributies |
| esbuild | 0.25.12 | MIT | offline rendererbundel |
| playwright-core | 1.58.2 | Apache-2.0 | browser-/desktoptests |

`npm run licenses` legt package-metadata en directe licentieteksten vast in docs/licenses. Deze notices worden met de desktopbundel meegeleverd. Electron levert ook LICENSES.chromium.html; verwijder die niet uit de uitgepakte distributie. De gegenereerde JS bevat esbuild legal comments van de opgenomen bibliotheken. Het dependency-inventaris is geen volledige juridische audit van alle transitieve buildtools.

Een npm production-audit op 23 oktober 2026 rapporteerde nul bekende advisories. De initiële fflate 0.8.2 is vervangen door 0.8.3 vanwege GHSA-px8p-9vwx-vf98. Deze audit is geen bewijs dat alle code of vendored bibliotheken vrij van fouten is.

De Expanded-repository gebruikt PolyForm Noncommercial. Er is geen Expanded/Character Builder-conversie- of runtimecode opgenomen. Alleen formaatfeiten/referenties zijn onderzocht. Compatibele runtime-integratie moet nog apart worden ontwikkeld en op licentievoorwaarden gecontroleerd.

Synthetische testassets zijn procedureel geschreven voor dit project. Geen Nikki-assets, gamebestanden, ROMs, donorheaders of textures zijn toegevoegd aan de broncode/distributie. Tekken is een merk van de rechthebbende; dit project is onafhankelijk.


Vanaf 0.4.0 past de build twee gepinde MIT Three.js-loaders aan via `scripts/extended-loader-patches.mjs`: FBX-triangulatie bewaart alle influence-sets en FBX/glTF stellen normalisatie uit totdat alle sets bekend zijn. Er wordt geen andere parser of Conversion Studio-code overgenomen. Structurele buildasserties en eigen binaire FBX-regressies controleren deze aanpassing; bij dependency-updates moeten ze opnieuw worden uitgevoerd. De oorspronkelijke Three.js MIT-notice blijft meegeleverd.


Externe regressieasset: **Cesium Man**, © 2017 Cesium, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), via [Khronos glTF-Sample-Assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/8f492390ddc7a2ae221a1369ef560589cf8c70fb/Models/CesiumMan). Het Cesium-logo/merk blijft van Cesium. De test downloadt het GLB alleen naar een ontwikkelcache; het model wordt niet met de desktopapp of broncode gebundeld. Screenshots in de validatiebundel zijn afgeleid van dit asset; de beelden met “prepared” zijn aangepast door reductie en atlasbaking. Attributie staat ook naast de beelden in ATTRIBUTION.txt. Deze asset vervangt de verplichte Nikki-test niet.
