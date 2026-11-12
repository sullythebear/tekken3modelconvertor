# Omgevingsherstel en Kloonpenseel — refinement.6

Validatiedatum: 12 november 2026.

Ontwikkelversie: `0.8.0-beta.2-refinement.6`.
Branch: `development/080-interactive-refinement`.
Applicatiecheckpoint: [`e8a543230323b3b89d9b017431cc8883a501dd38`](https://github.com/sullythebear/tekken3modelconvertor/commit/e8a543230323b3b89d9b017431cc8883a501dd38) (voorgaande checkpoints: `c7b2e4a`, `3eaea4e`, `7c3d91b`).
Dit is een ontwikkelcheckpoint, geen reguliere beta of stabiele release.

## Geïmplementeerd en lokaal gecontroleerd

- **Vanuit omgeving:** deterministische donorpatchmatching op lokale, verbonden, gelijkgerichte oppervlakken met hetzelfde materiaal en doorlopende UV's. De onbeschilderde context bepaalt een donor; de echte donorpixels worden met het geschilderde gewicht gemengd. Geen gemiddelde-kleurvulling of algemene blur.
- **Kloonpenseel:** Alt+klik of Kies bron; vaste bron-doeltranslatie in modelruimte, barycentrische UV-sampling over meerdere geschikte triangles. De bron is zichtbaar en wordt bij Toepassen of verlaten van de editor gewist. Geen geometriekloning.
- **Automatisch retoucheren:** bestaande SOURCE-texturetechniek en omgevingsherstel worden conservatief gecontroleerd. Als beide bruikbaar zijn, kiest de gebruiker. Geen ongefundeerde universele kwaliteitsscore.
- Beide nieuwe texturebewerkingen maken echte PNG-texturepatches, één bevestigde geschiedenisstap, met Preview, Toepassen, Annuleren en Voor/Na. Het tijdelijke masker wordt gewist; het gereedschap blijft actief. Geen lege correctie bij ontbrekende bron, donor, verschil of betrouwbaarheid.
- Eerder actieve beschermingsmaskers blokkeren doelen en donoren voor de **nieuwe** texturebewerkingen. Dit is geen universele bescherming van de oudere SOURCE- en geometriegereedschappen. Ook subtrianglebescherming zonder geometrische hoekpunten werkt.
- Donorlocaties, UV's, afhankelijkheden en definitieve pixels worden opgeslagen; heropening kiest geen nieuwe donor. Een onveranderd UV-gebied kan een latere veilige vormcorrectie volgen.
- Een intacte basisatlas wordt exact met de editorbasis opgeslagen, inclusief TIM-metadata. Daarmee is replay niet afhankelijk van opnieuw samplen via een ander browserafbeeldingstype. Beschadigde previewmaps blijven via de bestaande SOURCE/herbakroute herstelbaar.
- Geschiedenisversies 1/2 blijven leesbaar. Nieuwe retoucheercommando's gebruiken versie 3: oudere editorversies weigeren die, in plaats van ze verkeerd als SOURCE-herstel af te spelen.
- Crop-padding bevat echte samplerbuurpixels; repeat/mirror/clamp worden per texel bemonsterd. Geen modulo op UV-hoekpunten. RGB555-invoer blijft bij zachte compositing RGB555; er wordt geen universele CLUT-limiet verzonnen.

## Aangetoonde oorzaken

1. Omgevingsherstel en textureklonen ontbraken in refinement.5; die zijn nu via dezelfde bestaande voorstel-, geschiedenis-, project- en exportketen aangesloten.
2. Koude heropening kon dezelfde brontexture en UV's maar andere opnieuw gebakken atlaspixels geven. De exact gemeten oorspronkelijke atlas wordt nu behouden. De precieze interne browserresamplingoorzaak wordt niet als bewezen gepresenteerd.
3. De Windows-regressietest voor SOURCE-herstel verwijdert opzettelijk previewtextures. Het aanvankelijk bevriezen van die beschadigde atlas veroorzaakte de melding 'Ongeldige vastgelegde atlasafbeelding'. Alleen intacte atlasmaterialen worden nu vastgelegd; de bestaande volledige SOURCE-hersteltest slaagt lokaal opnieuw.
4. Randherhaling van een uitgesneden patch veranderde buurtexels bij lineaire filtering. Padding volgt nu de echte invoersampler, met gerichte repeat- en buurpixeltests.

## Lokale resultaten

- **439/439 Node-tests geslaagd**, inclusief alle bestaande regressies, 26 surface-retouchtests en 4 atlasopslagtests.
- Electron: omgevingsherstel + klonen met ongebakken materialen én met de werkelijk weergegeven gebakken atlas; Preview wijzigt de vastgelegde toestand niet; Annuleren behoudt die toestand; undo/redo, bescherming, koude projectheropening en onafhankelijk gedecodeerde GLB-PNG's zijn exact.
- Atlasworkflow: voorbereidingspakket bevat geldige basis-TIMs en exact bevestigde afzonderlijke repair-PNG's; gerepareerd GLB onafhankelijk gecontroleerd en opnieuw geïmporteerd.
- Bestaande volledige Phase B SOURCE-vorm/textureworkflow slaagt na de atlasfallbackcorrectie: koude pixels en geëxporteerde pixels exact; optimalisatie blijft werken.
- Eigen huidachtige synthetische fixture: absolute RGB-fout in het bekende beschadigde 4×4-gebied **4728 → 20**, zeven kleurwaarden behouden. Periodieke kledingfixture: meer dan 95% foutreductie. Dit bewijst de gecontroleerde fixtures, geen artistieke goedkeuring van commerciële modellen.
- Een lokale meting: materiaalworkflow Preview omgeving 894 ms, klonen 278 ms; atlasworkflow 1749/415 ms. Dit zijn losse Linux/Electron-fixturemetingen, geen Windows/GPU-latentie of aangetoonde algemene versnelling.
- Bevestigingsknoppen zichtbaar bij 1366×768, 1920×1080 en 2560×1440. De bestaande Easy-workflow controleert Electron-rendererzoom 100/125/150%; dat certificeert niet alle fysieke monitor-DPI-configuraties. Eigen synthetische voor/na-beelden bekeken: de roze beschadiging verdwijnt in het lokale kledingpatroon. Geen commerciële screenshots gepubliceerd.

## Windows-validatie

Exacte applicatiebron wordt gecontroleerd in [Windows-run 43232103838](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/43232103838).
**Geslaagd**, exacte applicatiebron `e8a543230323b3b89d9b017431cc8883a501dd38`.

- Werkelijk verpakte portable EXE: opstart-/conversie-/exportsmoke geslaagd.
- Dezelfde verpakte `win-unpacked` app: volledige productworkflow, fase A, SOURCE-vorm/textureherstel, handmatige editor, bestaande Easy-workflows en beide nieuwe retoucheer-/kloonworkflows geslaagd. Ook koude heropening, undo/redo, bescherming en onafhankelijke PNG-pixelcontroles in GLB geslaagd.
- Bestandsdialogen, OBJ/MTL/TGA, overschrijfbeveiliging, UV1/repeat, oorspronkelijke UI en native synthetische fixtures geslaagd. Geen gameplayclaim.
- Privé-Nikki-projectintegriteit en resourcecontrole geslaagd. Privé-commerciële conversies, identieke beta.1-baseline en vergelijking geslaagd. Deze bestaande conversieregressies bewijzen geen nieuwe artistieke beoordeling van retoucheerbewerkingen op die personages.
- Afgeschermde beeldreview bleef een toegang-gecontroleerde **ongepubliceerde** conceptrelease. Privébronbestanden werden verwijderd; openbare evidence gebruikt een vaste allowlist.

[Download Windows portable EXE + synthetisch HTML-rapport](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/43232103838/artifacts/13951791628).
Artifact: `ConversionStudio-easy-refinement-e8a543230323b3b89d9b017431cc8883a501dd38`, 112 MB, 30 dagen bewaartermijn.
Artifact-SHA256: `ee160fb50da4987a5c6a1e1196e1d87bf05a30caf2294587bc6cd360637fd251`.

GitHub-login vereist. Upload, metadata en digest zijn gecontroleerd; de artifact-ZIP is hier niet onafhankelijk via een ingelogde download opgehaald. De uitvoerbare app zelf is door de Windows-runner getest. Pak het volledige artifact uit; open de EXE in `release/` en het HTML-rapport in `artifacts/easy-refinement/index.html`.

Eerdere mislukte runs gelden niet als validatie. `main` bleef `ca7e89470df1c893beffe9c3fd2c8bb4ad8c8e84`; geen reguliere release of bestaande tag gewijzigd.

## Grenzen

- Eén verbonden materiaal/UV-gebied per correctie; geen stilzwijgende samenvoeging van verschillende patches, kledinglagen of materialen.
- UV-tegelovergangen worden veilig geweigerd. Binnen één ondersteunde affine repeat/mirror/clamp-regio werkt sampling; willekeurige UV-naadtransporten niet.
- Clone Stamp gebruikt een conservatieve lokale translatie tussen nabij parallelle oppervlakken, geen algemene krommingsregistratie. Ongeschikte donororiëntatie/overlap wordt geweigerd.
- Nieuwe directe bewerkingen accepteren diffuse/binaire-cutoutlagen. Complexe PBR-, emissie-, vertexkleur-, transparantie- of gecombineerde shaderlagen moeten eerst via de bestaande atlas worden gebakken.
- Invoerafbeelding maximaal 1024×1024; werkgebied maximaal 262.144 texels, geschilderd doel maximaal 4096 texels. Zoekgebied, donortriangles en geschiedenis zijn begrensd. Grotere gebieden geven een melding; geen vastlopende onbeperkte zoekactie.
- Zware matching is begrensd en annuleerbaar met checkpoints, maar nog niet naar een Worker verplaatst.
- Bevroren atlasreplay vereist dezelfde basispose; posewijziging wordt gemeld, niet gegokt. Een andere optimalisatietopologie moet eerst terug naar het artistieke model.
- Bestaand gecombineerd SOURCE-vorm+textureherstel behoudt twee geschiedenisrecords. Nieuwe retoucheer- en klooncorrecties hebben elk één record.
- Bevestigde bescherming kan uitgeschakeld/gewist worden; per-pixel weggummen uit een reeds bevestigde beschermingslaag is nog niet toegevoegd. Gum werkt op het tijdelijke masker.
- Geen algemene artistieke goedkeuring, gameplayvalidatie of nieuwe native-exportclaim.

## Eén korte eigen testsessie

1. Importeer en converteer een model; kies Model verfijnen.
2. Kies Retoucheerpenseel → Vanuit omgeving, beschilder een klein gebied en kies Preview. Houd Voor/Na vast; kies Toepassen of Annuleren.
3. Kies Kloonpenseel, Alt+klik of Kies bron op een geschikt gebied van hetzelfde materiaal. Beschilder een nabij doel, Preview → Toepassen. Bron wordt gewist; kies voor de volgende correctie opnieuw een bron.
4. Test undo/redo, bescherm een klein gebied en probeer daar een overlappende nieuwe retoucheerbewerking.
5. Bewaar project, sluit de app, heropen en exporteer GLB. Controleer de textures ook in een externe viewer. SOURCE blijft intact.

Zie [Nederlandse handleiding](GEBRUIK_EASY_NL.md). Het synthetische HTML-rapport staat in de build onder `artifacts/easy-refinement/index.html`; de nieuwe voor/na-beelden staan in de twee `surface-retouch`-mappen.
