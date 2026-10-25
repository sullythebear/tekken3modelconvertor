# 0.7.0-dev.7 — gerepareerde anatomische aansluitingen en efficiëntere kandidaten

Artistieke acceptatie: **wacht op menselijke beoordeling**. Geen echte Nina/Expanded-gamevalidatie. Main wordt niet gemerged. Het volledige aangeleverde DOCX is getoetst: zie [claimsaudit](TECHNICAL_CLAIMS_070_DEV7.md). Onbewezen 900-triangle- en 31.000-bytewaarden zijn geen gemeten universele runtimecapaciteit.

## Werkelijke reparaties

- Oude dev.6-audit: 103 onverklaarde randen. Dezelfde versie onder de nieuwe audit: 97; zes overige markeringen zijn bewezen volledig behouden originele EyeShell-meshgrenzen. De 97 echte reconstructiefouten zijn in dev.7 gerepareerd: **0 onverklaard**.
- Windingconflicten **47 → 0**. Alleen oriëntatiepariteit over gedeelde geometrische randen wordt hersteld; dit is geen absolute buitenzijdegarantie voor ieder willekeurig gesloten broncomponent.
- **825 bewust/gecontextualiseerd open randen blijven bestaan**: 621 haar/alpha, 80 gemeten aperturen of bronopeningen, 124 volledig bewezen bron-meshgrenzen. Geen blind cappen van kleding of haar. 38 nonmanifold positiecontacten worden afzonderlijk gemeld (bron: 137); geen claim dat iedere surface manifold of botsingsvrij is.
- Hals: herstelde echte niet-vlakke bronring, periodieke hoekcorrespondentie en T-junction-conformering. Kleding/benen: echte gedeelde broninterfaces in plaats van een gegiste horizontale doorsnede. Laarzen: consistente stripwinding, echte zoolcentrumfan en materiaalbewuste oppervlakteprojectie.
- Bestaand kerngezicht behoudt exact dezelfde unieke geometrische/UV/skinattributes en oorspronkelijke ongekwantiseerde gezichtstexels in de gecontroleerde front-face-UV-regio. Hals, schedelkap, winding en globale palettekeuze worden apart gewijzigd/getest; niet de hele TIM byte-identiek genoemd.
- Huidbaking gebruikt werkelijke bilineaire brontexels en geïnterpoleerde bron-normalvelden vóór RGB555. Geen ruis, nieuwe glans of extra geometrie om facettering te verbergen.

## Geometrie en optimalisatie

Artistiek model: **7.503 triangles** (dev.6: 7.386). De reparatie kost 117 triangles. Het grote voordeel zit in de kandidaatoptimalisatie, niet een lager artistiek aantal.

| Regio, artistiek | Triangles |
|---|---:|
| Hoofd inclusief ogen/wimpers/tanden en nek | 1602 |
| Haarvolume + cards | 2385 |
| Torso | 507 |
| Schouders en armen | 889 |
| Handen/polsen/vingers | 1022 |
| Kleding/bekken | 362 |
| Benen en laarzen/voeten | 736 |
| **Totaal** | **7503** |

De fijnere gemeten onderverdeling staat in het HTML-/JSON-rapport: vingers 846, handpalmen/polsen 176, benen 256, laarzen/voeten 480, gezicht 621, nek 275, schedel 120, ogen/wimpers/tanden 586. Dit zijn bron-/geometriegedreven diagnostische labels, geen native donorbudgetten.

| Experimenteel doel | Werkelijke dev.7-uitvoer |
|---|---:|
| 900 | 2476 |
| 1200 | 2480 |
| 1500 | 2504 |
| 2000 | 2545 |

Alle vier: 0 onverklaarde randen, 0 windingconflicten. Dev.6 bij doel 2000: 4047. De gezamenlijke materiaalbewuste reductie vermijdt het vastzetten van iedere interne anatomische snede. Echte grenzen, categorical material-ID's, begrensde oppervlakfout, skeletgewichtsvelden, gezichtscontouren en vingers blijven bescherming houden. De doelen worden dus expliciet **niet gehaald**, en zijn geen gamecapaciteit.

Bij ongeveer gelijke werkelijke kosten: dev.5.1 **4025**, dev.6 **4047**, dev.7 **4092**. De gallery toont alle drie, zodat herstel niet uitsluitend met meer geometrie wordt verward. Handen in de laagste dev.7-kandidaat behouden 372 triangles versus 868 in de oude dev.6-2000-kandidaat; zichtbare vingers blijven hoekig en vereisen beoordeling.

## Poses en andere personages

De oude testoverdracht gebruikte alleen bonenamen. Nikki heeft 29 dubbele namen. De gedeelde testharness koppelt nu alle 433 bones op hiërarchiepad en draagt alleen bind-relatieve rotatieverschillen over; dit verandert de oude conversie-engines niet. Alle versies zijn opnieuw met dezelfde correcte testharness gerenderd.

In 13 diagnostische poses blijven alle 556 gemeten coincidente gewrichtsposities binnen tolerantie (maximumafstand 2,53e-8 preview-eenheden; tolerantie circa 2,45e-5). Bevat hoofd-, arm-, pols-, duim- en vingerbewegingen waar structurele ketens bestaan. Dit zijn geen echte Tekken-animaties, geen volledige self-intersectiontest en geen gameplaybewijs.

Ook opnieuw gerenderd: Cesium Man **1122**, kort-haar synthetisch **3496**, afwijkend-kapsel synthetisch **2976** triangles; elk 0 onverklaarde randen en 0 windingconflicten. Bij onvoldoende betrouwbare gezichtsdata wordt veilige brongeometrie gebruikt. Bij het afwijkende kapsel wordt een onveilige gegenereerde gezichtskandidaat geweigerd; deze fallback telt niet als nieuwe gezichtstopologieverbetering.

## Tests en Windows

**172 Node-tests**, 0 mislukt/overgeslagen; inclusief alle eerdere regressies. Herhaald: visuele import/conversie, skinning, bronmapping, referentie-import, native fixtureweergave en humanoidfixture, desktop-IPC, Linux Electron-smoke en privé-Nikki-projectronde met byte-identieke 24 assets en verwijderde tijdelijke bestanden.

De releaseworkflow bouwt en start de daadwerkelijke Windows-portable EXE, voert opnieuw de 172 tests, desktoptest en privé-Nikki-projectronde uit. De **daadwerkelijke Windows-resultaten** staan na uitvoering in `WINDOWS-STATUS.md`, `windows-unit.xml`, `windows-portable.json` en `windows-nikki-project.json` in de download; bron-cloudmetingen worden niet als Windowsbewijs gebruikt. Vergelijkbare counters met dev.6: save 5434 ms, reopen 6109 ms, ZIP 49.789.433 bytes, opgetelde working sets 3,44 GiB, private committed 3,26 GiB. Eén run is geen statistisch geheugenbenchmark. Geen claim van unieke residente RAM uit opgetelde working sets.

Nieuwe native controles: ongealigneerde hand-pose-relocatietargets worden geweigerd; manifests labelen de bestaande 31.000-packetguard als voorlopig referentiebeleid. Structuur-/CLUT-/slot-/UV-/relocatietests gebruiken eigen fixtures, geen echte Nina-data.

## Nog te beoordelen / niet opgelost

Handen en kandidaten blijven hoekig; fijne vinger-, huid- en kledingsdetails kunnen verloren gaan. Haarcards behouden transparantieranden en zijn niet geheel gesloten volumes. Numeriek verklaarde grenzen en nul pariteitsconflicten garanderen niet dat iedere kijkhoek of pose artistiek overtuigt. Nonmanifold contacten zijn niet stilzwijgend als gerepareerd aangemerkt. Beoordeel vooral handpalmen, vingers, oksels, nek, huidkleurvakken, korte broek en laarszolen in de grote afbeeldingen.

Geen originele donor, runtimecapaciteit, Nina-bind-/handvariantverificatie of werkelijke gameplay uitgevoerd. Geen BNS-injectie. **Artistieke goedkeuring blijft aan de gebruiker.**

## Reproduceren

`npm ci`; `npm test`; `npm run build`. Maak ongewijzigde dev.5.1/dev.6-worktrees. Met privé `NIKKI_DIR`, `DEV51_WORKTREE`, `DEV6_WORKTREE`: `node scripts/dev7-review.mjs`. `REPORT_ONLY=1` assembleert bestaande meetgegevens. `node scripts/package-dev7-evidence.mjs` publiceert uitsluitend screenshots/tekst, zonder bronbestanden, textures, vertexsegmentarrays of project-ZIP's. De Windows-workflow gebruikt uitsluitend het bestaande `NIKKI_DOWNLOAD_URL` secret; geen bronassets in artifact/cache/release.
