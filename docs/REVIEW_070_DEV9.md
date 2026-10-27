# 0.7.0-dev.9 — visuele beoordeling, geen artistieke voltooiingsclaim

Deze versie bouwt voort op dev.8 (`b04f9bcefe7d44793e9107ef8fa7d75719e79033`). `main`, oude branches, tags en releases zijn niet vervangen. Bronmodellen, TGA-textures, project-ZIP's, download-URL's en originele gamebestanden zijn niet opgenomen.

Open na uitpakken **index.html** en vervolgens het volledige vergelijkingsrapport. Alle afbeeldingen staan lokaal naast het HTML-bestand; er is geen server of internet nodig. Grote afbeeldingen zijn aanklikbaar. De technische meetgegevens staan in `dev9/technical-summary.json`, de bestandscontrole in `evidence-manifest.json` en de echte Windows-ontvangstbewijzen in `WINDOWS-STATUS.md` en de bijbehorende JSON-bestanden.

## Wat aantoonbaar is veranderd

- Nieuwe, bron-geprojecteerde vingerringen met gemeten botcurves, bron-collars, distale contouren en volledige skinweight-overdracht. Handpalmen gebruiken betrouwbare brongeometrie. Naamloze en onbekende rigs krijgen expliciete, veilige fallbacks.
- Rondere duimen en vingertoppen bij vrijwel dezelfde artistieke handkosten: **1056 tegenover 1022 triangles**. De artistieke screenshots laten dit direct zien; de gebruiker moet het artistieke oordeel nog geven. De oude reductie is op sommige ruwe bronafstandsmetingen dichter bij de high-poly-bron; die beperking wordt niet verborgen.
- Nabije gesloten vingeraccessoires blijven geometrisch behouden en hun echte bronkleur wordt op het onderliggende vingeroppervlak gebakken. Daardoor blijven Nikki's zilveren ringen ook in de gereduceerde kandidaat zichtbaar.
- Gebruikte hand-/huid-UV's bepalen de bemonstering en palette-training. Ongebruikte kledingpixels worden niet als hand- of huidkleur gebruikt. Brontexel-dilatie vult alleen gutters, zonder willekeurige ruis of verzonnen huiddetails.
- Eén aangetoond bron-UV-lek in de linkeronderarm wordt selectief gerepareerd: **1 → 0 gemengde sheettriangles**, zonder meer faces of bronfallback. Reeds geldige regio's houden dezelfde reductie. Kandidaatoptimalisatie bewaakt eveneens UV-sheetidentiteit.
- Bron-normalvelden gingen verloren bij GPU-skinmateriaalclones. Die echte functionele fout is gerepareerd. De torso gebruikt bovendien de volledige al toegewezen texelhoogte en brongebaseerde diffuse kleurvariatie, zonder moderne glans.
- Het eerder divergerende bekkencontact is teruggevoerd op gekwantiseerde brongewichten op bewezen dubbele faces. Alleen die kleine afwijkingen zijn gereconcilieerd; geen blind positioneel weld.
- Weggegooide generieke simplificaties en onnodige transient morphkopieën zijn vermeden. Projectheropening hergebruikt pas na vergelijking van **alle bytes** identieke ruwe inputs.
- De tijdelijke FBX-parseboom en laatste scene worden niet meer door loader-moduleglobals vastgehouden. De werkelijke brongeometry, textures, skeletons, clips en **119.102.400 morphbufferbytes** blijven behouden.

## Geometry en integriteit

| Artistieke regio | Dev.8 | Dev.9 |
|---|---:|---:|
| Hoofd en nek, inclusief ogen/wimpers/tanden | 1602 | 1602 |
| Haar, inclusief cards | 2385 | 2385 |
| Torso | 507 | 473 |
| Schouders en armen | 889 | 887 |
| Handpalmen, polsen en vingers | 1022 | 1056 |
| Kleding en bekken | 362 | 342 |
| Benen, voeten en laarzen | 736 | 736 |
| **Totaal** | **7503** | **7481** |

Artistiek: **0 onverklaarde open randen**, **0 windingconflicten**, 825 verklaarde boundaries, **32 positionele contacten** (28 samenvallende-vlakcontacten / 4 surfacevertakkingen). Alle 13 onderzochte diagnostische poses hebben nul divergerende contacten. Deze categorieën zijn geen automatische collision- of gameplaycertificering.

| Experimenteel doel | Werkelijke kandidaat |
|---|---:|
| 1500 | 2475 |
| 1750 | 2474 |
| 2000 | 2513 |
| 2250 | 2624 |
| 2500 | 2794 |

Doelen zijn **geen bewezen Tekken-capaciteiten**. Regionale quota veranderen onder contour-, joint-, UV-, aperture- en geometrische foutconstraints; het resultaat hoeft daardoor niet strikt monotone aantallen te hebben. Bij lagere doelen worden details niet blind verwijderd om een getal te halen. De technische rapporten tonen echte aantallen en constraints per regio.

De vergelijking bij ongeveer gelijke werkelijke kosten gebruikt dev.7 **2545**, dev.8 **2551** en dev.9 **2513** faces. Dev.9 lijkt dus niet beter alleen doordat er meer geometrie is gebruikt. Voorafgaande gecoördineerde hals-collarvereenvoudiging wordt apart gemeten in `optimization.collarReduction`; daarom kan de som van de kandidaat-inputregio's lager zijn dan het oorspronkelijke artistieke totaal.

Het beschermde gezichtsinterieur en zijn onbewerkte texture zijn hash-identiek aan dev.8. Alle 18 toepasselijke bron-camera-/licht-/schaalcontroles zijn byte-identiek. Vlakke/smooth grijze normalrenders en de body-bake-ablaties onderscheiden geometry van echte texelkleuren. Geen previewshader wordt als native exporteigenschap gepresenteerd.

## Tests en herhaalbaarheid

- **245 unit-/integratietests PASS**, 0 fail, 0 skip: zie `cloud-unit.xml`. De Windows-suite wordt afzonderlijk uitgevoerd en opgenomen als `windows-unit.xml`.
- Nikki FBX + 23 TGA's; Cesium Man; twee authored kapsels. Alle vier volledige modelroutes, GLB-inhoud en TIM-data zijn opnieuw gecontroleerd.
- Binary FBX 7400/7500/7700, twaalf influences, CPU/GPU **0 pixel mismatch**, source mapping, native synthetische fixtures, desktop backup/extract/import/export-IPC en source-Electron-smoke opnieuw geslaagd.
- De volledige privé-Nikki-projectronde verifieert alle **24 bronassets byte-identiek**; project-ZIP **49.789.433 bytes**. Bij heropenen worden **232.047.502 ruwe bytes** pas na volledige vergelijking gedeeld. Dit is geen zelfstandig bewijs van een even grote RSS-besparing.
- De gepubliceerde EXE wordt door de workflow werkelijk op Windows gestart en getest. De privéprojectronde draait daarna in de werkelijk verpakte Windows-app. Publicatie van de prerelease is afhankelijk van een geslaagde projectronde; mislukte inputtests produceren geen geslaagde release.
- Voor eigen herhaling: `npm ci`, `npm test`, `npm run build`; de bestaande Windows-testbundel en projectworkflow blijven beschikbaar. De privégalerij is reproduceerbaar met `NIKKI_DIR=... RENDER=1 ART_CAUSE_DIAGNOSTICS=1 node scripts/dev9-review.mjs`. Oude dev.7/dev.8-beelden komen uit de bestaande gepubliceerde veilige galerijen en worden op bron-camera-hashes gecontroleerd.

## Prestaties en geheugenscope

De echte Windows-metingen staan in `WINDOWS-STATUS.md`, met dezelfde 250 ms `app.getAppMetrics`-sampling als dev.8. Summed working sets kunnen gedeelde pagina's dubbel tellen. Private committed bytes zijn geen uniek resident RAM. Harness-RSS staat apart. Eén run is geen statistisch betrouwbare snelheids- of geheugengarantie.

Afzonderlijke diagnostiek na twee gelijke test-only GC-aanroepen: vastgehouden Chromium-JS-heap **32.680.760 → 9.070.164 bytes** na parsercleanup. Backing storage bleef vrijwel gelijk (**705.591.271 → 705.576.422 bytes**). Importduur 5301/5351 ms. Dit is nadrukkelijk geen production-GC of app-/GPU-piekbenchmark. Alle **60 Nikki-PNG's** en bron-morphbuffers bleven identiek. Zie `dev9/parser-lifetime-evidence.json`.

De historische lookup-only handbakeproef (checkpoint `349dece` tegenover `5888a6a`) was bij een eigen fixture circa 26% korter met identieke RGBA. De huidige handbake heeft daarna functionele coverage-/accessoirewijzigingen gekregen; de oude meting geldt niet automatisch voor de huidige volledige pipeline. De echte Windows-conversie kan juist langer duren door de rijkere reconstructie.

## Bewust verworpen experimenten

- Haarcards met extra UV-/skinvelden: 2522 in plaats van 2507 faces in die tussenproef, geen overtuigende beeldwinst; teruggedraaid. De echte componentvloer is 60, maar bron-UV's, geometrische foutgrenzen en gemengde gewichten beperken praktische reductie.
- Richtinggevoelige schoudervelden: slechts twee faces goedkoper en grotere bovenarmfouten in de meeste poses; teruggedraaid, ondanks groene gerichte tests.
- Algemene chartbescherming op alle bronregio's: meer faces zonder zichtbare okselwinst; alleen de aangetoonde fout wordt nu behandeld.
- Body-diffuse met 16 kleuren: te grove huidkleurvlakken; verworpen ten gunste van 256 brongebaseerde kleuren.
- Eerdere vector-attributen die echte bonevelden verdrongen, vierkante handtiles die andere materialen texels kostten en directe vinger-UV-interpolatie met rode kledingpixels zijn niet opnieuw geïntroduceerd.

## Resterende problemen en acceptatie

- Extreme schouder-/okselposes vervormen kleding nog zichtbaar. Posekosten geven een beperkte verbetering, geen volledige oplossing van bronsegmentatie of kledingretopologie.
- Huid blijft zichtbaar low-poly en RGB555-gekwantiseerd. De 64×64-armtiles beperken detail; willekeurige ruis of glans is geen oplossing.
- Geoptimaliseerde handen verliezen detail; de nieuwe bron-geprojecteerde vingers zijn geen perfecte high-poly-kopie. Beoordeel de open, gebogen en pols-/duimbeelden.
- Haar is niet overtuigend verder verbeterd of goedkoper gemaakt. De veilige bestaande lange haarpartijen en alpha-route blijven behouden.
- Geen nieuwe overtuigende hiel-/zoolreparatie; eerdere nuttige laars- en korte-broekverbeteringen zijn behouden.
- Bodybaking gebruikt **65.536 extra stagingtexturebytes**: totaal 232.576 texturebytes / 4832 palettebytes. Beschikbare donor-/runtimecapaciteit is niet gemeten.
- Geen originele Nina-donor, Expanded-installatie of echte Tekken-animaties beschikbaar. **Geen geverifieerde native Nina-/Expanded-gameplay.** Synthetische native fixtures en succesvolle GLB-export gelden daar niet als bewijs voor.
- **Artistieke goedkeuring blijft uitsluitend aan de gebruiker.** Deze prerelease is een controleerbare ontwikkeloplevering, geen artistiek voltooide of bewezen speelbare converter.

De effectieve werktijd, checkpoints en volgende hervatactie staan in `DEV9_WORKLOG.md`; de lange sessieonderbrekingen tellen niet als ontwikkeltijd.

## HTML-toegankelijkheid

De cloudcontrole controleert alle 432 afbeeldingverwijzingen en 449 relatieve links; HTTP-weergave en navigatie zijn geslaagd zonder externe afhankelijkheden. Het cloudbeheer blokkeert daarentegen `file://`-navigatie (`ERR_BLOCKED_BY_ADMINISTRATOR`). Dat wordt niet als geslaagde offline-browserproef gepresenteerd. De publicatiejob voert daarom aanvullend de echte `file://`-proef uit in Windows Edge en voegt alleen bij succes `windows-gallery-browser.json` toe. De prerelease wordt pas daarna gepubliceerd.

## Bronrig en schouderdiagnose

Nikki bevat in de huidige input **0 bronanimatieclips en 0 animatietracks**. Onder de eigen arms-raised-FK-proef hebben ook oorspronkelijke schouder/armranden rekverhoudingen tot circa 6,45. De conversie behoudt zulke bronovergangen, maar langere low-poly-randen vergroten hun absolute verlenging. Het rapport toont beide afzonderlijk en trekt geen artistieke conclusie uit edge-aantallen bij verschillende tessellatie. Dit verklaart een deel van de blokkade, maar verklaart de zichtbare converterartefacten niet weg.

Een betrouwbare aanvullende invoer is een echte armraise-, guard- of punch-clip op dezelfde bronrig, inclusief eventuele twist-/corrective-bones, of gevalideerde overeenkomstige jointtransformaties. Zonder die referentie wordt aangenomen correctiebone-aansturing niet als geverifieerde animatiecompatibiliteit gepresenteerd.

## Noodzakelijke correctie 0.7.0-dev.9.1

Na de afzonderlijk gepubliceerde dev.9 is een fout gereproduceerd bij **Bake atlas uit**: de kandidaatoptimalisatie behandelde zwak blended bronmateriaal ten onrechte als een binaire cutout en verwijderde zichtbaar materiaal. De bestaande UI geeft nu de werkelijke bakemodus door. Zonder actieve cutout blijven transparante bronmaterialen behouden; een expliciete materiaal-alphaTest blijft geldig. De standaard gebakken route en de artistieke reconstructie veranderen niet.

Een eigen GLB met opacity 0,08 reproduceerde de fout vóór de correctie. De echte UI-test controleert nu beide checkboxstanden en de BLEND/opacity-inhoud van de GLB-export: zonder bakken 24 → 24 triangles en behoud van blending; met bakken 24 → 12 en alleen verwijdering van bewezen onzichtbare faces. Drie nieuwe regressietests brengen de volledige suite op **245 PASS**, nul fail/skip. De Windows-publicatie vereist dezelfde test opnieuw in de werkelijk verpakte applicatie, met een aparte `windows-cutout-mode.json`-receipt. Dev.9 en zijn tag/downloads blijven ongewijzigd.
