# Voorbeeld bekijken — kritieke bugfix

Versie: `0.8.0-beta.2-refinement.7` (ontwikkelbuild).
Applicatiebron: [`6f4c240ebe41177d9108260ccf7c67fc7cbeef52`](https://github.com/sullythebear/tekken3modelconvertor/commit/6f4c240ebe41177d9108260ccf7c67fc7cbeef52).
Branch: `development/080-interactive-refinement`.

## Vastgestelde oorzaken

**Verborgen uitleg.** Een normale import → atlasconversie → schilderen → Voorbeeld bekijken kon terecht worden geweigerd, terwijl de uitleg buiten het zichtbare gescrolde instellingenpaneel stond. Bij 150% rendererzoom lag de melding op CSS-y −26,67 tot 6,92; het zichtbare paneel begon op y 86. Daardoor was de reden voor de weigering onzichtbaar. Na de correctie staat dezelfde uitleg zichtbaar naast de knop.

**Verkeerde materiaalversie bij SOURCE-herstel.** De renderer gebruikte de gebakken atlas; de SOURCE-herstelcontrole gebruikte de ongebakken `converted.root`. Op een normaal geïmporteerde contrastrijke texture was dat verborgen materiaal nog vrijwel gelijk aan SOURCE. De controle kon het voorstel daarom als onnodig of verslechterend weigeren, terwijl juist de zichtbare atlas detail verloren had. Voorstel én replay gebruiken nu de getoonde atlas wanneer die geldig beschikbaar is. Beschadigde of ontbrekende atlasmaps behouden de bestaande SOURCE-terugvalroute.

**Camerapositie.** Het wisselen naar een preview kopieerde de SOURCE-camera naar de resultaatcamera. Daardoor kon het net gekozen detail uit beeld schuiven. De resultaatcamera blijft nu behouden; de acceptatietest verandert haar positie expliciet vóór de aanvraag en controleert die erna.

Dit zijn gereproduceerde/uit de uitvoering aantoonbare fouten. Zonder het oorspronkelijke gebruikersproject is niet bewezen welke combinatie daarvan op die Windows-pc optrad. Er zijn geen privéassets gevraagd of opgehaald voor deze reproductie.

## Waarom 439 tests onvoldoende waren

- Bestaande SOURCE-Easy-tests schakelden atlasbaking uit en veroorzaakten schade rechtstreeks op de ongebakken resultaatmaterialen. Zij testten daardoor niet de discrepantie met de zichtbare atlas.
- De eerdere atlasacceptatie testte de nieuwe omgeving-/kloonroute, niet normale SOURCE-retouche op de atlas.
- Aanwezige feedbacktekst en een werkende geschiedenis werden gecontroleerd, maar niet de werkelijke zichtbaarheid van de foutmelding na het scrollen naar de knop op 150% zoom.
- Screenshots werden gemaakt, maar de oude tests eisten geen verschil van de daadwerkelijke gerenderde canvasbeelden naast onafhankelijke datawijzigingen.

## Concrete wijzigingen

- Annuleren en Masker wissen behouden geen verouderde succesmelding. Ook Geavanceerd houdt een zichtbare eindmelding bij een weigering of fout.
- Beschermingsvoorstellen roepen de gevalideerde handler direct aan, zodat het uitschakelen van knoppen tijdens Berekenen de interne uitvoering niet blokkeert. De bestaande retoucheer-/kloonregressies en een extra UI-controle dekken dit.
- Vast feedback-/actiegedeelte: Berekenen met voortgang, Gereed, duidelijke weigering of technische fout. Een leeg masker geeft onmiddellijk uitleg; het is geen stille klik.
- Afzonderlijke preview-request-ID's, dubbele-aanvraagblokkering, annulering en weigeren van verouderde resultaten. Het opruimen van een oud voorstel mag een nieuwere scene niet terugzetten.
- In Geavanceerd: begrensde diagnose van knop, gereedschap/methode, masker, selectie, getoonde materialen, algoritme, gewijzigde pixels/punten, scene-koppeling en renderaanroep.
- Diagnose opslaan is na een aanvraag beschikbaar. Het JSON-bestand bevat alleen toegestane tellers/statuscodes en buildidentiteit: geen modelnamen, paden, assethashes, UV's, maskerwaarden, textures of vertexposities. De exacte technische fouttekst blijft lokaal in Geavanceerd.
- SOURCE-atlascommando's gebruiken expliciet geschiedenisversie 4. Oudere apps weigeren die; refinement.7 leest oudere projectgeschiedenissen 1–3. Bewaar een projectkopie voordat je nieuwe correcties toevoegt.
- Werkelijke pixelverschillen en opgeslagen bindruimteverplaatsingen worden gemeten. Geen nieuwe sculptingfunctie of versoepelde geometrie-/UV-veiligheidscontrole.
- Een ander hoofdgereedschap wist het tijdelijke masker. Een andere herstelmethode kan hetzelfde gebied opnieuw beoordelen.

## Real User Preview Acceptance

Eigen GLB-fixture met meerdere materialen, een textuurpaneel met fijne contrastdetails, een bolvormig hoofd en cilindrische mouwen. Het bestand gaat door het gewone bestandsveld, de werkelijke converter en textureatlas. Geen geïnjecteerde selectie of aangepaste resultaatmaterialen in deze acceptatietest.

De test vereist gelijktijdig:

1. zichtbare onmiddellijke berekeningsfeedback;
2. een daadwerkelijk in beeld staand resultaat, keuze of concrete weigering;
3. bij succes gewijzigde native texturepixels of positiegegevens;
4. een aan de renderer gekoppeld resultaat en verschillende werkelijke Voor/Na-canvasbeelden;
5. expliciet Toepassen/Annuleren en undo/redo;
6. koude heropening met exacte geometry- en texturegegevens;
7. onafhankelijk gedecodeerde GLB-PNG's en positieaccessors plus herimport.

SOURCE, Automatisch, Dikker, Dunner en Gladmaken leveren op de fixture een voorstel. De specifieke fijne patroonfixture geeft voor omgeving geen geschikte donor en voor de gekozen kloonregio een veilige oppervlak-/UV-weigering: dat wordt als **zichtbare weigering**, niet als geslaagd herstel gerapporteerd. De bestaande aparte omgeving-/kloonfixtures blijven de geslaagde texturebewerkingen en hun exacte koude/exportpixels controleren.

## Gemeten lokale resultaten

| Controle | Resultaat |
|---|---:|
| SOURCE-atlas: daadwerkelijk gewijzigde native pixels | 1364 |
| Kleinste/grootste niet-nul pixelpiekverschil | 1 / 181 |
| Gemiddeld RGB-verschil over beschilderde doeltexels | 20,2590 |
| Regionale SOURCE-albedofout vóór → na | 40,5245 → 15,6240 |
| Vormcorrectie: gewijzigde bewerkingspunten | 79 |
| Grootste opgeslagen bindruimteverplaatsing | 0,004789262 |
| Gemiddelde opgeslagen bindruimteverplaatsing | 0,001753882 |
| Veranderingen buiten toegestane regio | 0 |
| Koude geometry-/textureheropening | exact |
| Onafhankelijke GLB-pixels/posities | exact |

Pixelpiek is de grootste kanaalafwijking per gewijzigd RGBA-pixel; de regionale gemiddelde kleurafwijking gebruikt RGB. Positieafstanden staan in opgeslagen bindruimte-eenheden, niet in gegarandeerde meters of geposeerde wereldruimte. Dit zijn eigen synthetische meetresultaten, geen artistieke beoordeling van commerciële personages.

448 relevante Node-tests slagen lokaal. Daarnaast slagen de nieuwe zichtbare UI-acceptatie en de bestaande Easy-schilder-, SOURCE-combinatie- en atlasretoucheer-/kloonworkflows lokaal. De Node-telling is ondersteunend bewijs, niet het acceptatiecriterium voor de gebruikersbug.

## Windows

Exacte applicatiebron wordt gecontroleerd in [run 43309430564](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/43309430564).
**Geslaagd**, exacte applicatiebron `6f4c240ebe41177d9108260ccf7c67fc7cbeef52`.

- 448 relevante Node-tests geslaagd.
- Werkelijke portable EXE: opstart-, conversie- en exportsmoke geslaagd.
- Dezelfde daadwerkelijk verpakte `win-unpacked` app: volledige product-, regio-editor-, SOURCE-, handmatige en Easy-workflows geslaagd; daarnaast de nieuwe **Real User Preview Acceptance** geslaagd. Deze laatste controleert zichtbare feedback en canvasbeelden samen met onafhankelijke texture-/geometriegegevens, Annuleren/Toepassen, bescherming, undo/redo, koude heropening en GLB-herimport.
- Bestandsdialogen, OBJ/MTL/TGA, bronoverschrijfbeveiliging, UV1/repeat, oorspronkelijke UI en native synthetische fixtures geslaagd.
- Privé-Nikki-projectintegriteit en resourcecontroles geslaagd. Privé-commerciële conversies en de vergelijking met dezelfde beta.1-invoer geslaagd. Dit is bestaande conversieregressie, geen nieuwe artistieke goedkeuring van reparaties op die modellen.
- Afgeschermde commerciële beeldreview bleef toegang-gecontroleerd en ongepubliceerd. Privébestanden zijn uit de runner verwijderd. Openbare evidence is beperkt tot eigen synthetische voorbeelden en toegestane technische resultaten.

[Download portable Windows-EXE + synthetische HTML-rapporten](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/43309430564/artifacts/13985827164).
Artifact: `ConversionStudio-easy-refinement-6f4c240ebe41177d9108260ccf7c67fc7cbeef52`, 115 MB, bewaartermijn 30 dagen.
Artifact-SHA256: `da1c0fbd865987d47dd9d7dc15cf875bc0fc1ff608060422c7b93ba4db24835d`.

GitHub-login vereist. Upload, metadata en digest zijn gecontroleerd; de ZIP is hier niet apart via een ingelogde artifactdownload opgehaald. De Windows-runner heeft de app daadwerkelijk uitgevoerd. Pak het gehele artifact uit. De EXE staat onder `release/`; het nieuwe rapport staat onder `artifacts/preview-acceptance/index.html`, het bestaande retoucheer-/kloonrapport onder `artifacts/easy-refinement/index.html`.

Eerdere mislukte of geannuleerde kandidaten tellen niet als validatie. De tijdens deze ronde gevonden optimalisatie- en beschermingsregressies zijn hersteld en in de geslaagde eindrun opnieuw gecontroleerd; zie het onderzoekslog. `main` bleef `ca7e89470df1c893beffe9c3fd2c8bb4ad8c8e84`. Bestaande releases en tags zijn niet gewijzigd; er is geen reguliere beta/stabiele release gepubliceerd.

## Wat nog niet bewezen is

- Het oorspronkelijke privégebruikersproject is niet opnieuw doorlopen; deze build biedt daarvoor de assetvrije diagnoseknop als het probleem blijft bestaan.
- Omgeving/klonen behouden de bestaande materiaal-, UV-, donor- en groottebeperkingen. Een duidelijke weigering maakt een ongeschikte regio niet alsnog herstelbaar.
- Rendererzoomtests certificeren niet alle fysieke Windows-monitor-/DPI-combinaties.
- Geen nieuwe commerciële artistieke goedkeuring of Tekken 3-gameplayvalidatie.

## Eén korte lokale controle

1. Importeer en converteer je model; open Model verfijnen.
2. Kies Retoucheerpenseel → Vanuit origineel, schilder en klik Voorbeeld bekijken.
3. Er moet direct Berekenen verschijnen, gevolgd door een echt voorstel of een zichtbare uitleg naast de knop. Vergelijk Voor/Na; bevestig alleen een gewenst voorstel.
4. Herhaal desgewenst met Vanuit omgeving of Vorm aanpassen. Als het probleem blijft bestaan, kies Diagnose opslaan. Alleen dat kleine JSON-bestand is bedoeld voor diagnose; geen project, model, texture, screenshot of volledig rapport nodig.

Zie ook de [Nederlandse handleiding](GEBRUIK_EASY_NL.md) en het [onderzoekslog](PREVIEW_FIX_WORKLOG.md). De build bevat het eigen synthetische HTML-rapport onder `artifacts/preview-acceptance/index.html`.
