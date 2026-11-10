# Productaudit — 0.8.0-beta.1

## Gekozen integratie en bewijs

Integratiebranch: `development/080-beta`. Basis: `50dd53e` op `development/070-multi-character`. Deze bevat de reguliere multi-character-converter, repeat/mirror/clamp-baking, texturetransforms/UV-kanalen, verbeterde ongerigde handclassificatie, bronmateriaal/culling-behoud en de minimalistische doorzoekbare UI. De geschiedenis t/m `88f0fc9` op `development/070-ttt2-import` is afzonderlijk onderzocht; wijzigingen aan de importer/app/desktop gaan over TTT2 en worden niet automatisch overgenomen. Alleen de algemene donkere native select/optiestijl en Electron dark theme worden doelgericht overgenomen.

TTT2-code, tests, branches en rapporten blijven op hun bestaande branch behouden. De beta start vóór die ontwikkelrichting: geen TTT2-import, worker, IPC, data, afhankelijkheid of interface. De 311 relevante oorspronkelijke Node-tests blijven behouden. Geen history rewrite, geen main-wijziging. De oorspronkelijke 80 UI-controls blijven aanwezig; directe GLB-export en een wegklikbare startkaart worden toegevoegd.

## Functiestatus

| Functie | Status | Bewijs / beperking |
|---|---|---|
| FBX/OBJ/GLB/glTF en lokale textures | Beta | Bestaande importtests en productworkflow; niet ieder extern formaatprofiel ondersteund |
| Repeat/mirror/clamp UV-atlas, transforms, meerdere UV-sets | Stable candidate | Gerichte synthetische materiaal-/baking-regressies; geen universele artistieke garantie |
| PS1-stijl reconstructie/presets | Beta | Bestaande regio/gezicht/haar/hand-tests; karakterafhankelijke kwaliteit blijft visueel te beoordelen |
| 3D-vergelijking en standaard/geavanceerde UI | Stable candidate | Behoud UI-inventaris, tests op drie resoluties; werkelijk Windows-resultaat hieronder vastleggen |
| Project ZIP schema1 | Beta | Legacy blijft leesbaar; nieuwe CRC32-controle op assets, strenge entries/limieten; volledige cold-reopen-test |
| Directe geconverteerde GLB | Beta | Voor opslaan herimport; onafhankelijke container/referentiecontrole en volledige herimport in producttest |
| Voorbereidingspakket / atlas PNG / TIM | Beta | Bestaande codec/exporttests; pakket is geen speelbare mod |
| Skeletonmapping en diagnostische poses | Beta | Synthetische skinning/mappingtests, geen donor-gameplaytest |
| Donortopologie/native/Expanded/BNS | Experimental | Bestaande fixtures behouden; runtime, bindcalibratie en echte gameplay niet geverifieerd |
| Geverifieerde Tekken 3-speelbaarheid | Blocked | Originele donor/runtime- en gameplayvalidatie ontbreekt |
| Commerciële modellen | Beta | Privéconversies waar secrets beschikbaar zijn; geen artistieke goedkeuring of nieuwe visuele claims |
| Installer / digitale ondertekening | Blocked | Alleen portable; niet ondertekend, installer niet getest of toegevoegd |

## Concrete productcorrecties

- Projectopslaan toont geen succes meer bij annuleren van de opslaan-dialoog.
- Generieke desktop-save accepteert GLB; directe GLB-export in normale workflow, herimport vóór opslag.
- Opslaan schrijft exclusief een tijdelijk bestand in dezelfde map, flush/sync/sluit, controleert grootte en vervangt met één rename. Bij fout/annulering vóór commit blijft bestaand doel behouden; tijdelijk bestand opgeruimd. Dit is geen garantie tegen fysieke schijffouten/stroomuitval.
- Nieuwe projecten krijgen CRC32 per bronasset; beschadigde assets en orphan entries worden geweigerd. CRC is integriteitscontrole, geen beveiligde handtekening. Oude schema1-bestanden zonder CRC blijven leesbaar.
- Donkere dropdownrijen inclusief geselecteerde/uitgeschakelde staten, native dark theme, zichtbare focus.
- Startkaart met eigen voorbeeld, import/project/hulp; wegklikbaar, onthouden zonder verplichte popup.

## Conversie en visuele regressiebasis

Geen reconstructie-algoritmen, stijlpresetwaarden, bronhandstrategie of material/atlasalgoritmen gewijzigd voor deze productronde. Geen personagespecifieke namen als beslisregel toegevoegd. Nikki's eerdere artistieke resultaat is door gebruiker geaccepteerde regressiebasis, geen nieuwe door ons gemeten garantie. Cena-handen, Marston-oog en Rhea-materialen blijven onbewezen op actuele beelden. Privétests mogen hun numerieke resultaten bevestigen maar niet artistieke problemen opgelost verklaren. Commerciële beelden blijven privé en worden niet gepubliceerd.

## Opslag, veiligheid en prestaties

Projectlimiet 512MiB gecomprimeerd én uitgepakt, max512 assets. Schrijftest omvat Unicode, vervanging, fouten, annulering en tempcleanup. Langpadbeleid, antivirusinteractie, echte schijfvol/rechten en fysieke stroomuitval op Windows zijn niet universeel gesimuleerd; blijven acceptatierisico's. Grote privé-Nikki-projecttest herhaalt alle24 byte-identieke bronassets en rapporteert duur/geheugen indien secret aanwezig.

Geen onbewezen RAM-/snelheidswinst claimen. CRC32 vergt een extra lineaire passage zonder extra assetkopie; kosten worden in de opslagmeting meegenomen. Working sets worden opgeteld (gedeelde pagina's mogelijk dubbel), private committed bytes apart. Standaardconversie is nog rendererwerk en kan zware modellen tijdelijk blokkeren; workerrefactor niet zonder prestatiebewijs ingevoerd. Annulering blijft op bestaande controlepunten, niet elke synchrone bakingoperatie direct onderbreekbaar.

## Test- en publicatiebeleid

`npm test`, `npm run test:product`, bestaande UI-workflows en native fixtures; Actions `product-beta.yml` test werkelijk verpakte app en self-extracting portable EXE. Producttest: voorbeeld/import → conversie → resoluties → modusswitch → projectsave → app afsluiten → nieuwe app → cold reopen → conversie → directe GLB-save → onafhankelijke container/referentiecontrole → herimport. Privéregressies alleen via bestaande secrets en tijdelijke mappen; artifacts expliciet toegestaan: eigen screenshots, productgetallen/JUnit, EXE. Geen bronarchief/project-ZIP/texture/commerciële afbeelding.

Publiceer geen stabiele release. Actions levert commitgebonden kandidaat. Beta-aanvaarding blijft afhankelijk van de echte Windows-run; ontbrekende tests of kritieke regressies betekenen ontwikkelbuild met blocker, geen succesvolle beta.

## Lokale productvalidatie (werkstation, geen Windows-claim)

315/315 Node-tests geslaagd; alle311 reguliere baseline-tests behouden. Werkelijke Electron-productronde geslaagd met eigen rigged fixture:4784 brontriangles →3496 voorbereide triangles bij experimenteel doel900. Dit toont de workflow, niet een gehaald polygonbudget. Project49062bytes, GLB640444bytes; cold-reopen en herimport geslaagd. Original80 UI-workflows inclusief echte project-/voorbereidingsexport slagen. Screenshots op1366/1920/2560px gemaakt;1366px visueel bekeken, geen horizontale overflow. Oorspronkelijke synthetische vorm bevat afzonderlijke componenten; geen compleet commercieel model getoond of beoordeeld.

Onafhankelijke GLB-validator controleert container/BIN-lengtes, bufferViews/accessors, volledige indexrange, materiaal-/afbeeldingreferenties en skin-joints/bindaccessors. Beschadigde indexfixture wordt geweigerd. Het hulpvenster is lokaal en geïsoleerd; aanvankelijk verhinderde de algemene navigatieblokkade ook de handleiding, nu uitsluitend deze exacte document-URL toegestaan.

Logging: uitsluitend lokale startup/responsiviteit/renderer-exitmetadata in gebruikersprofiel `logs/runtime.jsonl`, rotatie rond1MiB. Geen automatische externe crash-upload. Opslag annuleren na bevestiging is niet als onmiddellijk interruptibele UI-bewerking geïmplementeerd; de native dialoog kan worden geannuleerd en de atomaire schrijver heeft geteste abortcontrole vóór commit.

Aanvullend lokaal bewezen: geannuleerde echte opslaan-dialoog behoudt projectbytes; corrupte project-ZIP laat bestaande SOURCE-statistieken intact. Werkelijke desktop-OBJ/MTL/TGA-import/conversie/export en bron-overschrijfblokkade PASS; native fixture export/texel/relocatie-readback PASS na correcte Electron-save-route; synthetische humanoid488triangles/15rows PASS. Secundair UV-kanaal importeert/bakt de juiste blauwe texel; repeat/mirror/clamp/transformed/manual-matrix/nonindexed-repeat tests geven maximaal0kleur- en0poseafwijking voor de eigen fixtures. Geen verbetering van echte commerciële ogen/handen/materialen hiermee geclaimd.

## Definitieve Windows-validatie en download

**Gepubliceerde beta-prerelease:** [v0.8.0-beta.1](https://github.com/sullythebear/tekken3modelconvertor/releases/tag/v0.8.0-beta.1). Geteste broncommit [`974a6e6ca07810b8411ff91b61c208e0d09c902d`](https://github.com/sullythebear/tekken3modelconvertor/commit/974a6e6ca07810b8411ff91b61c208e0d09c902d). [Windowsrun42844692366](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/42844692366) SUCCESS,6m14s. Alle315 Windows-JUnit-testcases zonder failures/errors; daarnaast portable zelfextractie, distributiehashes, packaged product/cold-reopen/cancel/corrupt-project/GLB-indexreadback, echte OBJ/MTL/TGA-dialogen/bronbescherming, secundaire UV/repeat/mirror/clamp/transforms, oorspronkelijke80 UI-workflows en native synthetische fixtures geslaagd.

Private Nikki-projectronde PASS met24 byte-identieke bronassets en verwijderde tijdelijke data. Commerciële source/conversie-/private renderprobes PASS; **artistieke acceptatie NOT_REVIEWED**. Geen nieuwe claim dat Marstons oog, Rhea-materialen of Cena-handen visueel opgelost zijn. Bron- en Authentic-aantallen:

| Testmodel | Bron | Authentic tussenmodel |
|---|---:|---:|
| Nikki |44112|7481|
| Cena (bekende bron6186) |6186|3692|
| Marston (bekende bron17176) |17176|6459|
| Rhea (bekende bron81469) |81469|15503|

De commerciële records zijn in het veilige CI-rapport met hun bestaande modelhash-ID opgeslagen; bovenstaande namen volgen de bekende testarchiefinventaris. Geen automatische modelnaamgestuurde algoritmeregels. Aantallen zijn artistieke tussenmodellen, geen native-speelbaarheidsbewijs.

### Windowsmetingen, één run

Nikki: import6.95s, eerste conversie7.04s, opslaan6.57s, heropenen7.87s, tweede conversie6.15s. ZIP49789666bytes (49.8MB). Piek opgetelde app-working-sets3143468KiB ≈3.00GiB; private committed2980580KiB ≈2.84GiB. Shared pages kunnen bij working sets dubbel tellen; private commit is geen uniek resident RAM. Geen reproduceerbare snelheids-/RAM-winst geclaimd; extra CRC-controle en andere runneromstandigheden verhinderen een zuivere vergelijking met oudere ontwikkelmetingen.

Eigen productfixture:4784→3496triangles, eerste conversie0.91s, save0.10s, cold reopen0.25s, tweede conversie1.03s, GLB-export/readback0.16s. Project49062bytes; GLB640444bytes,15meshes/1ingebedde afbeelding onafhankelijk gecontroleerd. Deze kleine fixture is geen representatie van ieder complex model.

### Echte downloadcontrole

- [Portable EXE](https://github.com/sullythebear/tekken3modelconvertor/releases/download/v0.8.0-beta.1/Tekken3ConversionStudio-0.8.0-beta.1-x64.exe):102932576bytes; SHA256`6c1ae18b640e4cd158dc510a37a5a63c90556929e2c325500b1cc0074214eefb`.
- [HTML-rapport, eigen screenshots, handleiding en meetresultaten](https://github.com/sullythebear/tekken3modelconvertor/releases/download/v0.8.0-beta.1/ConversionStudio-0.8.0-beta.1-report.zip):956093bytes; SHA256`40b0b2f62ef4cbe6fc56905a1103bac2d603d1fd71b628fb1bf83d1208432e4c`. Uitpakken en `report.html` openen.
- [SHA256SUMS](https://github.com/sullythebear/tekken3modelconvertor/releases/download/v0.8.0-beta.1/SHA256SUMS.txt).

Beide volledige bestanden via publieke HTTPS daadwerkelijk gedownload en hash vergeleken: MATCH. Rapport-ZIP bevat uitsluitend de11 vaste veilige entries, geen privéassets/projecten/commerciële PNG's. PE-certificaatdirectory EXE is0: niet digitaal ondertekend. Geen installer. Geen stabiele release of main-merge.

Windows CI is een Windows-runner, geen directe menselijke acceptatietest op de eigen Windows11-pc/DPI/GPU. [Eén lokale betatest](LOKALE_BETATEST_NL.md) beschikbaar voor die laatste controle. Sluiten zonder opslaan herstelt geen onopgeslagen wijzigingen; geen automatische crashrecovery beloofd. Volgende releasevoorstel: beta.2 na deze acceptatie, met gericht prestatieprofiel en alleen bewezen algemene materiaal-/anatomiecorrecties.
