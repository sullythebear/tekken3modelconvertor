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
