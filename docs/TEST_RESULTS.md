# Art Director 0.6.0 — 24 oktober 2026

De nieuwe presets zijn tegenover de oude baseline uitgevoerd op Nikki, een authored rig en de SHA-gecontroleerde Cesium Man. De vergelijkingen gebruiken dezelfde camera's: front, side, back, three-quarter en face. Voor alle methoden worden ook guard/reach/crouch-beelden en numerieke bronrigdiagnostiek verzameld. Deze zijn geen Tekken-gamebewegingen.

| Nikki, doel 900 | Triangles | Front IoU | Side IoU | Back IoU |
|---|---:|---:|---:|---:|
| Baseline | 3.860 | 0,920 | 0,887 | 0,920 |
| Authentic | 3.705 | circa 0,928 | circa 0,907 | circa 0,926 |
| Classic PS1 | 3.715 | circa 0,928 | circa 0,903 | circa 0,924 |
| Expanded | 3.736 | circa 0,933 | circa 0,909 | circa 0,927 |

De laatste machineleesbare cijfers staan in artifacts/art-director/comparison.json; alpha-/palettebaking kan een pixel verschil veroorzaken. De gezichts-landmarks blijven binnen numerieke tolerantie behouden, maar dat bewijst geen betere artistieke identiteit. Een echte 128×128/256-kleuren hoofd-TIM wordt voor Nikki Authentic/Expanded teruggelezen; dit is meer gezichtskleurdetail dan de oude 4-bit bake. Andere tiles blijven 4-bit.

De 0.6.0-unit-/integratieregressie heeft **94 geslaagde tests**. Nieuwe inhoudscontroles omvatten clustering/landmarks, UV-crop-equivalentie, proporties, texturepixels, begrensde projectroundtrip, metadata-onafhankelijke facial drift, native texturewijzigingen met intacte capaciteit, native referentiemetingen, ray-shellcleanup en niet-overlappende mixed-bit TIM-staging. Browserchecks controleren ook echte projectopslag/heropening, shadercompilatie van de derde view en teruggelezen voorbereidingsexports met GLB-/TIM-hashes.

De bestaande import/texture-, 12-invloeden CPU/GPU-, bronmapping-, native UI-, humanoid- en Linux-desktopregressies zijn opnieuw gecontroleerd. De authored native-/mappingtests kiezen expliciet de oude baseline om de codec-/mappingroute afzonderlijk te testen. De gewone conversie-/shadervergelijkingen testen de nieuwe presets. De native ART-pixeltest controleert dat artinstellingen werkelijk ARC-bytes veranderen zonder recordcapaciteit of niet-textureleden te beschadigen.

**Artistieke acceptatie: niet geslaagd.** Silhouetscores verbeteren op meerdere aanzichten, maar het budget wordt niet gehaald en laarzen/kledingdetail blijven zichtbaar onvoldoende. De shellcleanup-proef verbeterde dat niet en staat standaard uit. Originele Namco-characterreferenties, parametrische facial loops, volledige haar-/kledingreconstructie, daadwerkelijke Nina-gameplay en Windows-uitvoering van 0.6.0 zijn nog niet geverifieerd. De nieuwe softwarefuncties en groene tests maken dat niet voltooid. Zie ART_DIRECTOR.md en de beelden in Validation-0.6.0.zip.

---

# Aanvulling: donor-imagegrenzen en Windows-log

Het aangeleverde Windows-log toont geslaagde bootstrap/build, 80 tests en Nikki-desktopimport/voorbereidingsexport. Donorinput faalde op de oude gecombineerde ISO9660-volume-/blokgroottemelding. De exacte oorzaak van dat lokale bestand is nog niet bekend.

De nieuwe cloudregressie heeft **83 geslaagde unit-/integratietests**. Drie extra tests controleren volledig aanwezige donorbestanden bij een groter opgegeven volume (cooked ISO/raw Mode1/raw Mode2), ontbrekende directory-/bestandssectoren met meetwaarden en het weigeren van ongeldige blokgroottes/lege volumes. De Linux Electron-IPC-test extraheert hetzelfde overdeclared raw Mode2-geval byte-exact met waarschuwing en weigert nog steeds de ongeldige executable. Het bronimage blijft ongewijzigd. Geen oorspronkelijke gamebytes zijn in deze tests gebruikt.

De update is nog niet op het aangeleverde lokale image getest. De nieuwe runner bewaart donor/failure.json met fout en sector-/volumemeetwaarden. Nikki-budget en Expanded-runtime-integratie blijven afzonderlijke onvoltooide onderdelen.

---

# Aanvulling: reproduceerbare Windows-testrunner

80 unit-/integratietests slagen (vier nieuwe tests voor configuratie, exacte runtime-receipts, HTML/FAIL-semantiek en echte subprocessargumenten/logs/timeouts). Alle 11 browsercontroles en de bestaande Linux Electron-desktopregressie slagen opnieuw.

De echte Nikki is aanvullend in Electron geautomatiseerd geïmporteerd/geconverteerd en via desktop-IPC als voorbereidingspakket geëxporteerd en inhoudelijk teruggelezen. Een volledige overkoepelende run met bewust ontbrekende originele gamebestanden voert Nikki toch uit en schrijft correct FAIL met donor/runtime BLOCKED. Er zijn geen rendererfouten gemeld. Nikki blijft 3.860/900 triangles. Deze run is geen Windows-/gameplaybewijs.

Zie WINDOWS_TESTING.md voor éénknopsgebruik, rapportsemantiek, cloudbewijzen en de nog ontbrekende Expanded-adapter. De PowerShell-opname-/inputfunctie en menselijke checklist zijn toegevoegd; uitvoering op Windows staat open.

---

# Testresultaten 0.5.0 — 24 oktober 2026

**76 unit-/integratietests slagen**, zonder skips of failures. Alle 11 browsercontroles slagen, inclusief een echte FBX DiffuseColor-relatie met PNG-verwijzing die de meegeleverde TGA decodeert en de bronbinding behoudt. Native UI-export, authored humanoid (488 native triangles/15 tiles), bronmapping, twaalf-invloeden CPU/GPU/GLB-roundtrip, Cesium Man en Linux Electron-desktopregressies slagen opnieuw. Cesium Man blijft met 1.424 triangles boven doel 1.100; dit wordt niet als gehaald budget gerapporteerd.

Nieuw getest: ISO2048/raw2352 Mode1/Mode2-extractie en begrenzingen, grote reads over sectorbatchgrenzen, donor-package-hashes/capaciteit/inhoud en slotcontrole, Google Drive-bevestigingsdownload met onveilige redirects geweigerd, ZIP-pad-/groottevalidatie, materiaalrollen en behoud van expliciete bronbindingen, verschoven UV-tegels, anatomische oog-/tandgroepen, gezichts-landmarks, callback-fouten met poseherstel, en behoud van actieve renderattributen/extra skinsets bij cleanup. Desktop-IPC leest een authored raw Mode2-image byte-exact, weigert de ongeldige executable in de UI en laat de bronimage ongewijzigd.

**Nikki is daadwerkelijk uitgevoerd** met de aangeleverde FBX + 23 TGA's: 44.112 brontriangles, 433 bones, acht invloeden. Materiaal-, atlas- en drie silhouetcontroles slagen; 13 gezichtslandmarks beschermen 71 vertices. Het reductiebudget faalt: 3.860 triangles bij doel 900. Drie diagnostische poses hebben finite vertices maar uitzonderlijke randrek. Resultaat PARTIAL/exit 2. Zie [NIKKI_TEST.md](NIKKI_TEST.md) voor materiaal-aannames, hashes en camera-/bewegingsbewijzen.

Niet uitgevoerd: originele Nina-donor, daadwerkelijke Tekken-/Expanded-gameplay en -animaties, runtime-loaderintegratie en EXE-uitvoering op Windows. De Windows-distributie is crossgebouwd; PE- en pakketinhoud worden apart gecontroleerd. Geen game-integratieclaim.

Actuele bewijzen: artifacts/unit-results.xml en artifacts/{visual,native,native-humanoid,source-mapping,skinning,reference,desktop,nikki,distribution}/.

---

## Historische resultaten (0.4.0 en ouder)

Onderstaande tellingen en oude Nikki-transferblokkade beschrijven eerdere runs; de actuele 0.5.0-resultaten hierboven vervangen ze.

# Testresultaten 0.4.0 — 24 oktober 2026

**Actuele controles:** 55 unit-/integratietests slagen. De native UI-exporttest en een volledige zelfgemaakte humanoid-reconstructie slagen. Ook de tien bron/texture-browsercontroles slagen. De Linux-desktop-IPC-test controleert import/conversie/export, weigering om bronbestanden te overschrijven en echte backup-restauratie op synthetische bestanden.

Nieuw in 0.4.0: zelfgemaakte binaire FBX 7400/7500/7700 met 12 invloeden per vertex behoudt alle gewichten. Een extra botinvloed wordt numeriek gecontroleerd in CPU-vervorming en donor-retargeting. Een 12-invloeden-GLB wordt gerenderd via de GPU; vergelijking met een onafhankelijk ongeskinned CPU-referentiemesh levert 0 afwijkende pixels boven de tolerantie. Reductie en GLB-roundtrip behouden JOINTS_1/2 en WEIGHTS_1/2, inclusief het gewicht van 0,6 voor bot 12. T3CM/T3TX-tests controleren 8-bit gezicht plus 4-bit kleding, gedeelde palettes, ontbrekende relocaties/UV-dekking en tegenstrijdige palettes. De UI-containerexport wordt teruggelezen en vergeleken met de native model-/relocatiebytes.

Controles uit 0.3.0: handmatige anatomische mapping van onbekende bones, atomaire weigering van dubbele/ongeldige toewijzingen, clone-behoud, bronprofiel-roundtrip en weigering van afwijkende bindposes. Een browser-end-to-end-test hernoemt alle bones, wijst ze in de UI toe, bewaart/herlaadt het profiel en reconstrueert vervolgens de native kandidaat. Native guard/reach/crouch-diagnostiek controleert finite posities, randrek en naadopening. De UI-test controleert dat de posepreview de native exportbytes en bronpreview niet wijzigt, dezelfde camera/schaal behoudt en terugkeert naar identieke bindgeometrie. Dit gebruikt zelfgemaakte fixtures; geen Tekken-motionstream.

Bestaande inhoudscontroles: donorvertex/UV/cache-decoding, half-cacheblends, SHA-gebonden rigide bindframes, experimentele seamfitting, BVH-dichtstbijzijnde punten/barycentrics, echte bron→donor-oppervlakteprojectie, native normal-/pointerherbouw, donor-UV texturebake, originele ARC-memberbehoud, USA-executable/table/capaciteitscontrole, BNS-kopie zonder bronmutatie, backup/herstel met hashes en rollback, tangentnormals en static-detail PBR-mapkanalen.

Het zelfgemaakte humanoid bevat 4.784 brontriangles. Een zelfgemaakt 15-delig donorproxy levert na reconstructie **488 native triangles, 15 opnieuw gebakken TIM-tiles en 17.368/18.720 donorbytes**. Front/side/back-vergelijkingen gebruiken gelijke camera's en dezelfde donor-bindreferentie. Dit is geen onafhankelijk gegenereerde kwaliteitsscore en geen Nikki/Nina-test. De kleine native fixture test bovendien ZIP-export zonder GLB-substituut en leest 3DMK/ARC-pixels weer terug.

De Nina-estimator is synthetisch gecontroleerd op drie bekende seamkoppelingen: residual daalt, maar de uitkomst blijft ongetest in de runtime. Backupherstel is gecontroleerd met synthetische executable/BNS-contents, niet met een echte installatie.

**Nog steeds niet uitgevoerd:** Nikki (32 MiB transferblokkade), een echte Nina-donor, daadwerkelijke Tekken-gameplay en animaties, Expanded-loaderintegratie, en EXE-uitvoering op Windows. Er is geen geslaagde game-integratie geclaimd.

Machineleesbare bewijzen: `artifacts/unit-results.xml`, `artifacts/native/`, `artifacts/native-humanoid/`, `artifacts/desktop/`, `artifacts/source-mapping/`, `artifacts/skinning/`, `artifacts/visual/`. De oorspronkelijke 0.1.0-resultaten hieronder zijn historisch; hogere actuele testaantallen vervangen die telling.

---

# Uitgevoerde tests

Machine: Linux x64 cloud, Node 24.19.0, Chromium 154.0.8037.57, Electron 45.0.0. Uitgevoerd 23 oktober 2026. Windows en Tekken zelf zijn hier niet uitgevoerd.

## Geslaagd

- `npm test`: 23 inhoudelijke unit-/integratietests; geen skips, geen failures. TIM-pixel-/palette-roundtrips; opaque zwart/alpha; ARC-grenzen; native 3DMK-pointers, primitives, relocaties en budgets; T3CM/T3TX-textureband; 320 bronbotten; interleaved vertexbuffers en genormaliseerde byte-skinweights; reductie met behoud van brongeometry/UV/transforms; transactionele patch/restore, corrupte hashes, padtraversal en symlinks.
- `npm run test:visual`: acht functionele/visuele controles in echte headless Chromium/WebGL. Zelfgeschreven binaire FBX 7400/7500/7700-fixtures (32/64-bit nodeheaders) met zlib-arrays: 2 triangles. OBJ/MTL/TGA: 2 triangles, één expliciete texture, 8×8 RGBA/alpha geverifieerd. Procedurele GLB: 4784 naar 1502 triangles bij budget 1500, drie palette-TIMs, 17 botten, geen ongeldige posities. Overschrijding van twee triangles wordt zichtbaar gerapporteerd.
- Synthetische back-view silhouette intersection-over-union 0.942 (minimum 0.75). Dit zegt niets over Nikki's gezicht of gamecompatibiliteit.
- Opaque materiaal met ongebruikt volledig nul TGA-alpha-kanaal blijft zichtbaar, ook na de bake.
- Bronanimatie op beide rigs afgespeeld en identieke bonequaternions gecontroleerd; de aanvullende GLB bevat de clip. Dit is geen Nina/gameanimatie.
- Front/side/back-screenshots: beide camera's numeriek identiek. Statische herhaalde render byte-identiek op dezelfde machine. Geen cross-driver golden-image-regressie geclaimd.
- Exporttest inspecteert daadwerkelijke GLB-magic, drie TIM-bestanden, screenshots en `gameVerified:false` in het `.t3prep`-pakket.
- `node scripts/desktop-test.mjs`: desktopvenster + preload gestart op Linux zonder HTTP-server, versie via IPC gelezen, `window.require` afwezig; OBJ/MTL/TGA via echte desktop-import-IPC geconverteerd en voorbereidingspakket via save-IPC geschreven en inhoudelijk gecontroleerd. Container-only headless/no-sandbox flags; geen bewijs van Windows-start.
- `npm run dist:win` en `npm run dist:win:portable`: Windows-distributies gegenereerd. Bouwbewijs, geen uitvoeringstest.
- `npm audit --omit=dev`: nul bekende productie-advisories na update naar fflate 0.8.3.

Machineleesbare resultaten/screenshots bevinden zich in `artifacts/visual/`, `artifacts/desktop/`, `artifacts/source-mapping/`, `artifacts/skinning/`, `artifacts/benchmark/`. Deze gegenereerde outputs worden niet als broncode bijgehouden.

## Benchmark

Procedureel humanoid, budget 900, fout 0.2:

| Hoofdprioriteit | Werkelijk totaal | Hoofdtriangles |
|---|---:|---:|
| 1 | 902 | 612 |
| 2 | 948 | 722 |
| 4 | 984 | 796 |

Hoofddetail stijgt, maar beschermde borders kunnen totale limieten verhinderen. Dit is geen bewijs van betere menselijke herkenbaarheid, ML-vergelijking of toelaatbaar gamepacketgebruik.

## Geblokkeerd / niet uitgevoerd

- `npm run test:nikki`: runner stopt met exitcode 2 en schrijft BLOCKED. Download van het oorspronkelijke Model.zip is door de tool geweigerd wegens de 32 MiB transferlimiet. Nikki's FBX, 23 TGA's, geometrie, skeleton, identiteit en screenshots zijn daardoor **niet gecontroleerd**. Synthetische assets worden niet als Nikki opgevoerd.
- Native kandidaat tegen een echt origineel Nina-bestand: niet uitgevoerd; er zijn geen donorbestanden beschikbaar. Native tests gebruiken expliciet synthetische headers en geometrie.
- Nina-bindpose, donoranimaties, runtime-palette-/memorycaptures, Expanded custom-loader en echte game: niet uitgevoerd. Er is ook nog implementatiewerk nodig, niet alleen een testinstallatie.
- Windows-EXE op Windows dubbelklikken: niet uitgevoerd; geen Windows-machine/Wine beschikbaar. Windows CI is aangemaakt maar niet gestart.

De oplevering is daarom een **onvolledige implementatie**, geen afgeronde Tekken 3 Conversion Studio volgens de gevraagde definitie.


## Onafhankelijke externe modelregressie (0.4.0)

Cesium Man uit Khronos glTF-Sample-Assets, gepind op commit `8f492390ddc7a2ae221a1369ef560589cf8c70fb` en SHA-256 `b7001eaeea8254bd44773bcd247e78696d94169388fbb2a1800fc69434e777d9`, is geïmporteerd met 4.672 driehoeken, 19 bones, een ingebedde JPEG en een 2-seconden-animatie. Na handmatige mapping van 15 beschikbare anatomische rollen wordt het model voorbereid op 1.424 driehoeken. Doel 1.100 wordt door beschermde randen niet gehaald en blijft als overschrijding gerapporteerd. Vier tijdstippen (0 / 0,5 / 1 / 1,5 s) behouden eindige geometrie en overeenkomstige bottransformaties in bron en resultaat. Oriëntatievergelijking normaliseert de float-quaternions vóór de hoekmeting.

Dit is een onafhankelijke bron-/voorbereidings-/bronanimatietest, geen Nina- of Nikki-test en geen native donor/gamebewijs. Front/side/back en geanimeerde screenshots staan met attributie in artifacts/reference. Het originele externe GLB wordt niet in de applicatie of bron-ZIP verpakt. Aanvullend controleren zelfgemaakte PNG- en JPEG-fixtures expliciete OBJ/MTL-relaties en gedecodeerde rode pixels.

PowerShell 7.4.6 is tijdelijk in de Linux-cloud gebruikt om alle vier Windows-scripts syntactisch te parsen: geslaagd. Ook de officiële Node 24.10.0-checksumlijst is opgehaald en de Windows ZIP-entry is gecontroleerd. Dit valideert geen Windows-UI, bootstrapuitvoering of gamecapture.
