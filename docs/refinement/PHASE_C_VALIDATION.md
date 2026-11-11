# C1 — handmatige verfijning, validatie

Versie **0.8.0-beta.2-refinement.3**. Applicatiebron [df7a2863e5ac02ed35279d3ea6af697aac075b3c](https://github.com/sullythebear/tekken3modelconvertor/commit/df7a2863e5ac02ed35279d3ea6af697aac075b3c), branch `development/080-interactive-refinement`. Een latere documentatiecommit verandert de buildbron niet. `main`, beta.1 en de fase-A/B-checkpoints blijven behouden. Geen TTT2.

## Werkend C1

- Echt 3D-selectiepenseel: verbonden geodesische groei, zichtbaarheid per driehoekcentrum, toevoegen/verwijderen, zichtbare grens en penseelkader. Materiaal-/UV-grenzen en losse lagen worden niet overgestoken. Alt-links bedient de camera zonder te schilderen.
- Dikker/dunner, vergroten/verkleinen en verplaatsen in modelruimte, met expliciete richtingen en een visuele assenreferentie. De dikterichting kan geometrisch worden geschat; dat is geen anatomische identificatie.
- Scherpe/normale/zachte vormovergang op basis van oppervlakteafstanden, met vastgezette selectie-/UV-/materiaalranden.
- Snelle herbruikbare preview zonder herconversie per sliderbeweging. Iedere preview start uit de vastgelegde geometrie; geen cumulatieve sliderdrift. Voor/Na, toepassen, annuleren en resetten.
- Werkelijke positiecorrecties via bestaande omkeerbare vormcommando's. Undo/redo, inschakelen/uitschakelen, bronbescherming, oude projecten, koude heropening en GLB blijven behouden. Het oorspronkelijke SOURCE-model verandert niet.

**C2 is niet geïmplementeerd:** geen Gladmaken of Trekken/duwen. Er zijn geen niet-werkende knoppen voor die functies. Dit is het afzonderlijke C1-ontwikkelcheckpoint, geen claim dat heel fase C gereed is.

## Tests

**374 Node-tests geslaagd**, zonder mislukkingen of overgeslagen tests: de bestaande 354 plus 20 C1-regressies. Nieuwe tests dekken o.a. statische/gerigde bewerkingen, inverse skinning bij onbekende jointnamen, cilindrische pols, losse vingerachtige oppervlakken, UV-/materiaalgrenzen, een gesloten niet-menselijk object, nieuwe garmentdoorsnijdingen, actieve morphweigering, corrupte instellingen, exacte atlaspreviewherkomst en afhankelijke commando's.

De daadwerkelijke Electron-gebruikersroute:

1. Eigen synthetisch polsoppervlak importeren en automatisch converteren.
2. Echt muisschilderen; verwijderen en toevoegen; Alt-camera verandert de selectie niet.
3. Alle drie de gereedschappen als voorstel bekijken. Slider heen/weer levert exact dezelfde previewposities op.
4. Diktecorrectie toepassen; undo/redo behoudt exact dezelfde positiearrays.
5. Project opslaan, app volledig afsluiten, nieuw proces starten en project heropenen.
6. GLB exporteren; bufferreferenties/indices controleren en alle 8.640 positiecomponenten onafhankelijk uit de GLB lezen en exact vergelijken met de gerepareerde exportgeometrie; daarna herimporteren.
7. UI controleren op 1366×768, 1920×1080 en 2560×1440, zonder horizontale overflow.

Oorspronkelijke product-, fase-A-, fase-B- en desktopworkflows zijn behouden en lokaal geslaagd. De Windows-status en download worden hieronder afzonderlijk vastgelegd, zodat lokale Electron-tests niet als portable bewijs worden gepresenteerd.

## Eigen demonstratie en metingen

Het eigen model bevat **960 driehoeken**. De penseelstreek selecteert **52 vooraan zichtbare driehoeken**; de toegepaste 10%-diktekeuze wijzigt **30 binnenvertices**. Geen extra driehoeken, gewijzigde buitenposities, nieuwe boundary edges, omgekeerde/ontaarde driehoeken of gedetecteerde nieuwe segmentdoorsnijdingen. Bron blijft onveranderd. Exacte koude projectreplay en exacte geëxporteerde posities zijn gecontroleerd. Dit is geen bewijs van commerciële artistieke kwaliteit. Uit de opgeslagen voor/na-posities van de 30 gewijzigde vertices is de gemiddelde radiale afstand tot de gekozen as afzonderlijk berekend: 0,20058 → 0,21380 lokale eenheden (+6,59%; de zachte overgang dempt de ingestelde 10%). Alle gewijzigde punten bewegen in dit voorbeeld radiaal naar buiten. Dit is geen volumemeting van een volledig personage.

De HTML-galerij bevat normale en draadmodel-Voor/Na met dezelfde camera en belichting, de penseelselectie en drie schermformaten. Alleen eigen synthetische beelden.

Lokale Linux/Electron-meting: gehele gesimuleerde penseelstreek circa **846 ms**, sliderroute circa **337 ms**, inclusief automatisering, debounce en testwachttijd. Dit zijn geen frame-responstijden. De Node-corebenchmark zonder live zichtbaarheidraycasts mat bij 512/4.096 driehoeken respectievelijk circa **27/129 ms** voor de previewkern, **45/286 ms** voor een gevalideerd voorstel en **2/10 ms** voor de penseelgroei. Bij de grotere run was de post-run RSS circa144MiB. Eenmalige synthetische procesmetingen, inclusief mogelijk nog niet opgeruimde objecten; geen totale Electron/GPU-belasting of bewezen versnelling. De artifact bevat de afzonderlijke Windows-metingen.

## Bekende grenzen

Selectie is per driehoek; frontmost-centrumcontrole is geen pixelprecies zichtbaarheidsmasker. Maximaal4.000driehoeken per penseeldab en12.000per vormvoorstel. Open/UV-/materiaalgrenzen blijven vast; kleine gebieden hebben soms geen veilige binnenvertices. Onzekere vereenvoudigingsherkomst vraagt om **Artistiek model bekijken**. De dikteas/doorsnedecentrum zijn geometrische schattingen; kies een duidelijke richting en redelijke lokale selectie.

Zware eindvalidatie/replay/atlasintegratie kan de renderer tijdelijk bezighouden; annulering werkt op controlepunten. Voorlopige previews ondergaan bij Toepassen nog de zwaardere controle. Er is geen volledige coplanaire/raakcontact-/animatiebotsingsgarantie. Morphs, instanced/batched meshes en niet-inverteerbare skinning worden geweigerd. Een nieuwe geometriecorrectie kan een eerdere textureprojectie ongeldig maken; dan faalt de transactie en blijft het vorige resultaat behouden. Geen ontbrekende topologie wordt bijgemaakt. Native/gameplaycompatibiliteit blijft ongeverifieerd.

[Handleiding](GEBRUIK_PHASE_C_NL.md) · [Architectuur](PHASE_C_ARCHITECTURE.md) · [Hervatbaar werklog](PHASE_C_WORKLOG.md).

## Windows-oplevering

[Windows-run 43029672592](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/43029672592) is **volledig geslaagd** op de genoemde applicatiebron. De portable EXE is echt gestart; aanvullende workflows draaiden op de inhoud van dezelfde Windows-verpakking. Alle volgende poorten slaagden:

- Node-suite, rendererbuild, Windows-verpakking, inhoud-/versieverificatie en daadwerkelijke portable start.
- Oorspronkelijke productworkflow, fase A, fase B en nieuwe C1-workflow met koude projectheropening en onafhankelijke GLB-controles.
- Echte bestandsdialogen/bronoverschrijfbeveiliging, secundaire/herhalende UV's, oorspronkelijke UI en synthetische native fixtures.
- Privé-Nikki-projectintegriteit, commerciële inputs, exacte beta.1-bronvergelijking, huidige conversies en privévergelijkingsrapport.
- Toegangsgecontroleerde **ongepubliceerde** review, veilige openbare allowlist, opruimen van privédata en artifactupload.

De commerciële tests zijn technische regressies en geen handmatige C1-bewerking of nieuwe artistieke goedkeuring van die modellen. Geen commerciële beelden of bronassets zijn aan de openbare artifact toegevoegd.

### Download en lokaal bekijken

[Windows portable + eigen HTML-demonstratie](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/43029672592/artifacts/13860672881).

Pak de volledige ZIP uit. Start `release/Tekken3ConversionStudio-0.8.0-beta.2-refinement.3-x64.exe`. Open `artifacts/manual-refinement/index.html` voor C1-voor/na/draadmodellen, selecties en schermformaten; `results.json` en `benchmark.json` bevatten de eigen Windows-meetgegevens. De artifact bevat ook het bestaande fase-A/B-productbewijs. De offline handleiding is vanuit de editor bereikbaar.

GitHub-aanmelding vereist; Actions bewaart deze artifact30dagen. Artifact-ID, naam en digest zijn op de geslaagde runpagina gecontroleerd. De downloadroute redirect correct naar de artifact; anonieme toegang eindigt in404. De ZIP is niet onafhankelijk met een aangemeld account teruggedownload.

Artifact-ZIP-SHA256 (niet de losse EXE): `174a20946063825805408c3a0fe18962f6472ca795f6361b2e2c87184635740a`.

Voor bevoegde repositorymedewerkers staat de commerciële review in de aangemelde Releases-weergave als **PRIVATE character diagnostics 43029672592 — DO NOT PUBLISH**. De workflow controleerde conceptstatus en geweigerde anonieme pagina-/assettoegang. Publiceer deze conceptrelease nooit. Download de review-ZIP uitsluitend voor lokale privébeoordeling.

Geen reguliere beta.2-release/tag of gameplayclaim; dit is een afzonderlijk gevalideerde C1-ontwikkelbuild. C2 blijft een volgende ontwikkel- en validatiefase.
