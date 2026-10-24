# PS1 Character Art Director — 0.6.0, experimenteel

**Deze fase is niet geaccepteerd als voltooid.** De module is geïntegreerd in de bestaande desktopapp, maakt echte gewijzigde geometrie en textures en bevat reproduceerbare vergelijkingen. De gewenste automatische, authentiek Namco-waardige reconstructie is nog niet aangetoond. Het gevraagde Nikki-budget wordt niet gehaald. Echte characterreferenties en gameverificatie ontbreken.

## Gebruik

Importeer je bronmodel zoals voorheen. Kies een preset, pas de vijf schuifregelaars aan en druk op Convert. Automatisch opnieuw bouwen staat standaard aan en kan worden uitgezet. De baseline blijft expliciet beschikbaar. De oude Head Priority geldt uitsluitend voor die baseline; de Art Director gebruikt Face Preservation. Veranderde instellingen blokkeren verouderde exports totdat opnieuw geconverteerd is. Voor de native route is met een actieve artpreset eerst de Art Director-conversie nodig.

De originele preview, conversie en derde simulatieview delen camera's. Het cameramenu biedt front/back/side/three-quarter en een hoofd-close-up als een headbone bekend is. Skeleton en wireframe zijn beschikbaar. De atlaspreview toont de werkelijk geëxporteerde palettepixels. Per anatomische part staat het gerealiseerde en gevraagde aantal triangles.

| Instelling | Werkelijk effect |
|---|---|
| Tekken 3 Authentic / Classic PS1 / Expanded | Verschillende reconstructietoleranties, prioriteiten, vormgeving en texturekwaliteit; **voorlopige artistieke presets**, geen gecertificeerde Namco-profielen |
| Polygon Stylization | Verplaatsing naar hoekige lichaamsvormen en maximale clusteringafwijking; niet uitsluitend een polygonaantal |
| Face Preservation | Aandeel in budget, afwijkingsgrens, landmarkbescherming en grotere hoofd-/oog-/wimpertiles |
| Angular Body Shaping | Kleine begrensde rasterverplaatsingen van de echte lichaamsvertices; het hoofd en haar worden hiervan uitgesloten |
| Texture Pixelation | Werkelijke resampling en kleurniveaus vóór palettequantisatie; herbouwt atlas/TIM-bytes |
| Hair Preservation | Budgetgewicht, ruimtelijke afwijkingsgrens en grootte van de haartile; beschermt bestaande hair-card-randen |
| Region priority | Wijzigt adaptieve budgetverdeling; head/torso/arms/legs/hair/clothing/accessories |
| Local proportions | 0,8–1,2× schalen rond een gedeeld regiopivot, zodat hoofd/ogen niet rond onafhankelijke centra schalen; geen complete herbouw van de bindrig |
| Omit region | Werkelijke verwijdering uit de conversie; zichtbaar als ontbrekende regio in de analyse |
| Whole-mesh classification | Handmatige correctie van de anatomische regiotoewijzing voor een specifieke mesh; bones/skinweights worden niet hernoemd |
| Flat face normals | Verandert de geometrienormals in de voorbereidingsexport; native reconstructie bouwt haar eigen flat normals |
| Export filtering | Nearest/linear sampler in de voorbereiding/GLB; echte PS1-filtering wordt door de runtime bepaald |
| Color quantization / dithering | Echte pixelbewerking en palettebake; native ARC behoudt zijn bestaande 4/8-bit capaciteit |
| Vertex snapping / affine / Gouraud in simulation | **Preview-only shader/lighting**; geen geëxporteerde runtimepatch |
| 320×240 simulation | Preview-bufferresolutie; bewijst geen gamecompatibiliteit |

## Geometriepipeline

De baseline blijft de bestaande meshoptimizer-reductie met beschermde topologieranden. De nieuwe route verdeelt de bron via skin-/regioherkenning en bouwt connectiviteit opnieuw via adaptieve ruimtelijke oppervlakteclustering. Representatieve bronpunten behouden hun UV's, alle skin-influence-sets en materiaalgegevens. Neus, lippen en oogleden krijgen bron-landmarkconstraints. Echte geometrische grenzen worden op positie gemeten, onafhankelijk van dubbele UV-seamvertices. Naburige faces van beschermde punten blijven beschermd, zodat een behouden vertex niet alsnog geïsoleerd verdwijnt.

Daarna volgt attribuutbewuste topologieoptimalisatie met sterke UV-weging en beschermd gewrichts-/silhouet-/landmarkgedrag. De geometrische vormgeving en regionale correcties wijzigen de uitvoerbuffers. Deze route gebruikt de bestaande reductiebibliotheek dus nog als belangrijk hulpmiddel. **Het is nog geen parametrische anatomische templategenerator of nieuw ontworpen Tekken-gezicht met vaste facial loops.** Clustering kan op kleine UV-charts nauwelijks reduceren; dit wordt niet verborgen door een haalbaar budget te claimen.

De bestaande donorroute blijft een andere, daadwerkelijk templategebaseerde reconstructie op originele donor-topologie. Zij projecteert nu de actieve artgeometrie en kan de kleurbewerking/dithering in de echte ARC meenemen. Synthetische tests controleren veranderde ARC-bytes, correcte native decoding, gelijkblijvende capaciteit en behoud van niet-textureleden. Die route kan ontbrekende haar-/accessoiretopologie nog niet toevoegen en is niet met de originele Nina uitgevoerd.

## Textureherbouw

Hoofd en haar krijgen waar passend grotere tiles. Kleine ogen-/wimper-/tandmaterialen krijgen afzonderlijke tiles. Body-materialen kunnen worden gesplitst in torso, linker/rechter arm en linker/rechter been, met eigen UV-uitsneden en texturetransformaties. Een inhoudelijke test controleert dat die nieuwe UV's exact dezelfde brontexturecoördinaten blijven samplen. Geroteerde of afwijkende UV-kanalen worden niet onjuist gecropt. Bron-UV-buffers blijven intact. Alle nieuwe materiaalgroepen blijven binnen de voorbereidingslimiet van 14 tiles, anders faalt de bake zichtbaar.

De bake verwerkt diffuse, alpha, approximate normal shading, RGB555-palettes en optionele geordende 4×4-dithering. Authentic/Expanded gebruiken bij hoge Face Preservation een echte 8-bit hoofd-TIM met 256 kleuren; de overige tiles en Classic blijven 4-bit. De voorbereiding krijgt aparte, niet-overlappende texture-/CLUT-stagingposities; deze vervangen nooit de echte donorallocatie. De native high-to-low bake en statische PBR-detailbake blijven beschikbaar. Nieuwe AO-raybaking is niet geïmplementeerd. De Unreal-materiaal-/haaralpha-aannames van Nikki staan nog steeds in NIKKI_TEST.md; de oorspronkelijke shader ontbreekt.

## Haar, kleding en gezicht: huidige grenzen

Haar wordt via materiaalnamen herkend en bestaande sheets/cards worden met hun grenzen, alpha en UV's behouden. Er is nog geen gevalideerde automatische keuze tussen volumetrische kapsels, nieuwe clusters en cards. Kleding die met huid in één mesh/materiaal zit, wordt niet automatisch betrouwbaar gesegmenteerd. De hele mesh kan handmatig een andere rol krijgen, maar lokale schilderselectie binnen één mesh is nog niet beschikbaar. Ook een automatisch anatomisch skeleton voor volledig onbekende namen wordt niet verzonnen; bestaande handmatige skeletonmapping blijft nodig.

Het gezicht behoudt bron-landmarkpunten en krijgt meer texturecapaciteit. De numerieke landmarkafstand is geen gezicht-herkenningsscore. Een echte facial-loop-retopologie, kaak-/wenkbrauwlandmarks zonder beschikbare bronbones en automatische artistieke identiteitsbeoordeling ontbreken nog. Bij handmatige verhoudingswijzigingen worden de bindbones niet automatisch parametrisch aangepast; controleer pose-rek en jointnaden.

## Authentieke referenties en meetbare profielen

Via **Measure local Tekken reference** kunnen legaal uit de eigen installatie verkregen `.3dm` + `.arc` worden ingelezen. De module meet werkelijke native triangleaantallen en fracties per row, bezette slots en texture-/paletteafmetingen, bewaart een hashgebonden meetrapport en past de rolverdeling op de budgetten toe. Er worden geen gamebytes in een meetrapport opgenomen. Het rapport benoemt dat authenticiteit niet onafhankelijk is bewezen.

Er zijn hier geen originele Nina-, Jin-, Hwoarang-, Xiaoyu- of Paul-modellen aangeleverd. Hoofd/lichaamsverhoudingen en gewrichtsassen kunnen bovendien niet betrouwbaar uit losse botlokale vertices worden afgeleid zonder bindframes. Daarom zijn **geen gemiddelde Namco-verhoudingen of verzonnen polycountmetingen** als feit ingevuld. De presetnamen geven een artistiek doel aan, geen voltooide stijlanalyse. De gebruikersrepository voor Character Builder is uitsluitend als technische formaatdocumentatie gebruikt; geen code is hergebruikt.

## Projecten en profielen

**Save art profile** bewaart de conversieparameters, regionale correcties en eventuele referentiemetingen als JSON. **Save project** bewaart bovendien de originele importbestanden, huidige modelselectie, skeletonmapping, texturetoewijzingen, tint/vertexkleurkeuzes, opacity/cutoff en normalrichting. **Open project** importeert dat opnieuw; daarna wordt opnieuw geconverteerd. Een browserintegratietest controleert daadwerkelijk opslaan, wijzigen en heropenen van een project met regionale prioriteit. De codec begrenst bestandenaantal en totaal ongecomprimeerde data en weigert onverwachte ZIP-paden. De project-ZIP bevat gebruikersassets en hoort niet in publieke bron-/bewijsdistributies.

## Kwaliteit en acceptatie

`npm run test:art` test de zelfgemaakte rig; met `NIKKI_DIR` komt Nikki erbij. De geteste Cesium Man kan worden toegevoegd via `ART_MODELS=synthetic,nikki,cesium` (SHA-gecontroleerde cache uit test:reference). Alle vier methoden gebruiken identieke camera's. De runner schrijft front/side/back/three-quarter, face close-ups, drie poseproeven, simulaties, voorbereidingspakketten en machineleesbare metingen. Exports worden teruggelezen en krijgen hashes van GLB- en TIM-inhoud. Cesium Man is CC BY 4.0; de attributie wordt bij de afgeleide beelden bewaard.

De analyse bevat alpha-bewuste silhouet-IoU, dichtstbijzijnde bron-landmarks, UV-/normal-/degeneratiecontroles, UV-areadichtheidsvariatie, ontbrekende regio's, vervormingsdiagnostiek en budgetcontrole. UV-areadichtheidsvariatie is geen volledige Jacobian- of perceptuele UV-foutmeting. Bronposes zijn geen Tekken-motionstreams. Alle artistieke resultaten blijven expliciet **NOT ACCEPTED / menselijke en gamebeoordeling nodig**. Groen uitgevoerde softwaretests betekenen niet dat dit artistieke doel is bereikt.

Zie `artifacts/art-director/comparison.html` en comparison.json in Validation-0.6.0.zip voor de daadwerkelijke metingen en beelden. Het rapport vergelijkt met de moderne bronnen en de oude reductiemethode; een echte vergelijking met authentieke Namco-assets is nog niet uitgevoerd. Nikki blijft boven het ingestelde budget van 900. De fase is dus ondanks werkende bediening en tests nog niet volledig geslaagd.

## Afgewezen proef: occluded-shell cleanup

Een extra ray/BVH-proef controleert meerdere punten per triangle op nabijgelegen, gelijkgerichte buitenvlakken. Een authored test controleert dat alleen de verborgen binnenlaag verdwijnt. Op Nikki verwijderde de proef onder meer 782 triangles per onderbeen, maar de laarsproblemen verdwenen niet en het silhouet werd iets slechter (front circa 0,924 tegenover circa 0,928 zonder die stap). De proef is daarom standaard uitgeschakeld en uitsluitend als expliciete experimentele optie beschikbaar. Beelden en rapport staan onder experiments/occluded-shells. Ook met de overige verbeteringen zijn laarzen en kledingdetail nog onvoldoende; dit is een concrete reden om de artistieke fase niet te accepteren.
