0.7.0-dev.5.1: allocation correction with identical dev.5 artistic output; see [review notes](REVIEW_070_DEV5.md). Original releases are preserved.

0.7.0-dev.5: [visual refinement, measured tradeoffs and reproduction](REVIEW_070_DEV5.md). Artistic approval remains pending; candidate counts are not reduced.

0.7.0-dev.4: [visual changes, measured limits and reproduction](REVIEW_070_DEV4.md). Artistic and gameplay acceptance remain pending.

> **Current: 0.7.0-dev.3** — [visual corrections, measured project roundtrip and remaining limits](REVIEW_070_DEV3.md). Cloud regression: 124 tests passed. Published Windows receipts are authoritative for Windows checks. Older notes below are historical.

> Current recovery: **0.7.0-dev.2**, 113 unit/integration tests passed after recovery. See [recovery inventory](RECOVERY_070_DEV2.md) and [current reconstruction review](REVIEW_070_DEV2.md). The following original 0.6.0 notes are historical. Windows CI receipts are included in the published review ZIP; game compatibility and artistic acceptance remain unverified.

# Werkelijke implementatiestatus — 0.6.0

De definitie van voltooid is **nog niet gehaald**. Op 24 oktober 2026 is de donor-reconstructiepipeline toegevoegd en inhoudelijk getest, met de echte Nikki-bron en zelfgemaakte donorfixtures; originele Nina-bestanden en een game ontbreken.

| Onderdeel | Werkelijke status |
|---|---|
| Nieuw zelfstandig desktopproject | Vanaf de lege checkout ontwikkeld; Electron, geen Python/Blender/losse server voor eindgebruikers |
| Windows-distributie | Portable EXE en ZIP via Linux-build; uitvoering op Windows niet geverifieerd |
| FBX/OBJ/glTF en textures | FBX 7400/7500/7700, OBJ/MTL/TGA en gerigde GLB getest; PNG/JPEG met echte pixelcontroles; extern Cesium Man-model met JPEG, 19 botten en bronanimatie eveneens getest |
| Skeleton/skinweights | Bekende anatomische namen plus handmatige rolmapping met opslaan/herladen voor onbekende skeletons; honderden bones; alle influence-sets worden bewaard en gezamenlijk genormaliseerd; CPU/GPU, reductie en GLB-roundtrip met 12 invloeden per vertex getest |
| Bronpreview en bronanimaties | Getest, naast elkaar met dezelfde camera; geen bewijs van gameanimatiecompatibiliteit |
| Anatomische reductie | Werkende regio-/attribuutbewuste budgetreductie; beschermde randen kunnen het budget verhinderen |
| Donor-retopologie | **Nieuw:** bron naar donorframes retargeten, anatomische BVH-oppervlakteprojectie op bestaande donor-topologie en jointnaden herstellen |
| Donor-bindpose | Externe SHA-gebonden frames of automatische experimentele naadfitting; Nina-bindframes en assen niet in de game geverifieerd |
| Texturebaking | **Nieuw:** echte high-to-low oppervlaktebake in donor-UV's, 4/8-bit CLUTs, alpha; gedeelde palettes gezamenlijk gequantiseerd |
| Normal/PBR-detail | **Nieuw:** tangent-space normal en metallic/roughness/specular/AO sampling met optionele vaste lichtbake; geen dynamische PBR op PS1 |
| Native export | **Nieuw:** gekoppelde UI-export van 3DMK + ARC + relocaties. Normals/primitive/UV-blokken herbouwd, handblokken en vertexsharing behouden |
| Native bewegingsdiagnostiek | Guard/reach/crouch met donor-bindframes, cache-blends, randrek en naadopening; interactieve rechterpreview, geen gedecodeerde gamebewegingen |
| Expanded-containerexport | T3CM v2/T3TX met 4/8-bit palettes, gedeelde CLUTs, UV-dekking en complete relocaties via UI; compatibele loader niet meegeleverd of in een game getest |
| Native terugleescontrole | Werkend; geometrie, UV/materialen, cache-halfblends, texturepixels en budgets worden inhoudelijk gecontroleerd |
| Originele USA-archiefroute | **Nieuw:** executable-hash-/capaciteitscontrole, donorrecords extraheren, aparte BNS-kopie maken; synthetisch getest, geen ISO-injectie |
| Backup en herstel | **Nieuw:** UI met SHA-256 ZIP, beperkte bestandsnamen, destinationkeuze/confirmatie en backup van bestaande doelbestanden |
| Speelbaar pakket / Expanded-loader | **Niet afgerond.** Geen ondersteunde runtime-integratie of daadwerkelijke gamebeweging geverifieerd |
| Uitbreiden met ontbrekend haar/kleding/accessoires | Niet automatisch geïmplementeerd in donorroute; bestaande donortopologie kan onvoldoende zijn |
| ML/parametrische methoden | Geen ML-voordeel aangetoond. Geometrische donorprojectie nu reproduceerbaar getest op zelfgemaakte template, geen onafhankelijke Nikki-kwaliteitsbenchmark |
| Nikki-test | Echte FBX + 23 TGA's uitgevoerd: 44.112 triangles, 433 bones, acht invloeden; source/atlas/silhouet en drie testposes gecontroleerd. Voorbereiding 3.860/900 triangles: PARTIAL. Zie NIKKI_TEST.md |
| Echte Nina / game / Windows-run | Niet uitgevoerd; originele bestanden, runtime-installatie en Windows-machine ontbreken |

Zie [NATIVE_PIPELINE.md](NATIVE_PIPELINE.md) voor het algoritme, het kalibratieformaat en de foutgevallen. De UI houdt een native kandidaat en een bewezen speelbaar personage uitdrukkelijk uit elkaar. Het oorspronkelijke voorbereidingspakket blijft een aanvullend GLB/TIM-inspectieformaat.

## Windows-testomgeving toegevoegd

Test-Windows.cmd installeert een private runtime, bouwt/start de Studio, test echte Nikki via Electron-IPC en maakt een PASS/FAIL-rapport. Originele lokale donorbestanden kunnen alleen-lezen worden geëxtraheerd. De runtimeadaptergrens, Windows-capture/toetsinvoer, crash-eventverzameling en menselijke gameplaychecklist zijn aanwezig, maar een geverifieerde Expanded-installatieadapter ontbreekt. De actuele cloudrun eindigt terecht FAIL; zie WINDOWS_TESTING.md.

## Nog benodigde gegevens

Nikki is beschikbaar en getest. Voor echte donor-/gamevalidatie ontbreken originele USA `SLUS_004.02`, Nina P1 3DMK-record 111 + texture-ARC-record 113 en exacte Expanded-build-/patchinformatie. De desktopapp kan deze lokaal extraheren uit een ISO/BIN of losse BNS + executable en opslaan als gecontroleerd donor-ZIP. ISO/BIN-extractie is alleen-lezen; raw-sector EDC/ECC wordt niet geverifieerd of herbouwd.

Na ontvangst van de donor zijn echte-filediagnose, donor-framecontrole, eventuele nieuwe topology voor Nikki, runtime-integratie en daadwerkelijke game-/animatie-/identiteitsvalidatie nog noodzakelijk. De synthetische tests maken die stappen niet automatisch voltooid.

## Art Director 0.6.0

De geïntegreerde module en presets wijzigen echte geometrie en textures; derde preview en projectopslag zijn toegevoegd. Zie ART_DIRECTOR.md. De nieuwe reconstructie blijft experimenteel: Nikki circa 3.700 triangles bij doel 900; geen echte Namco-stijlcalibratie of runtimeverificatie. Parametrische facial loops, volumetrische hair-retopologie, betrouwbare kledingsegmentatie en artistieke eindacceptatie ontbreken. De fase is niet voltooid.
