# Phase B — validatie van de ontwikkelkandidaat

Versie **0.8.0-beta.2-refinement.2**, branch `development/080-interactive-refinement`. Applicatiebron: [3eb1d1ec4c39659b4f39edfe901898b6aae5137c](https://github.com/sullythebear/tekken3modelconvertor/commit/3eb1d1ec4c39659b4f39edfe901898b6aae5137c). Dit document staat eventueel in een latere documentatiecommit; de build gebruikt de genoemde applicatiebron. `main` en beta.1 blijven ongewijzigd. Geen TTT2 of fase-C-gereedschappen.

## Uitgevoerde controles

- **354 Node-regressietests** geslaagd; de 334 relevante fase-A-tests blijven behouden.
- Lokale echte Electron-routes voor het oorspronkelijke product, fase A, fase B en OBJ/MTL/TGA-bestandsdialogen geslaagd.
- Regiobrede SOURCE-correspondentie, statische en gerigde vormprojectie, polsdoorsnede, grensbehoud, parallelle/overlappende bronlagen, poseverschillen en gewijzigde bronidentiteit getest.
- Textuurherstel met oorspronkelijke UV's, UV1, repeat/mirror/clamp, texturetransforms, echte RGB-vertexkleuren, cutouts en afzonderlijke normaalmap-UV getest. Niet-ondersteunde combinaties worden geweigerd.
- Voor/Na, annuleren, toepassen, toetsenbord-undo/redo, correcties schakelen, detailbescherming en heroptimalisatie getest.
- Project opgeslagen, proces volledig afgesloten, opnieuw geopend en correcties opnieuw opgebouwd. GLB-structuur, referenties en geometrie gecontroleerd; ingebedde PNG onafhankelijk van de Three.js-importer gedecodeerd en pixel voor pixel vergeleken; GLB vervolgens hergeïmporteerd.
- UI-beelden op 1366×768, 1920×1080 en 2560×1440; geen horizontale overflow in de synthetische route.

Een eerste Windows-integratieronde vond een eigen importinitialisatiefout: `load()` gebruikte een variabele uit `setBusy()`. Die is gericht hersteld. Importtests eisen nu de werkelijke succesvolle importstatus; alleen een reeds toegewezen SOURCE-object is onvoldoende. De oorspronkelijke desktoproute slaagt lokaal na de correctie. De mislukte ronde is geen opgeleverde build.

## Eigen synthetische voor/na-demonstratie

De fixture is een bekend getextureerd oppervlak met gecontroleerd aangebrachte vorm- en materiaalschade, geen commercieel personage. Voor/na gebruikt dezelfde camera en belichting.

| Controle | Voor | Na |
|---|---:|---:|
| Gemiddelde afstand tot SOURCE, lokale fixture-eenheden | 0,0153403 | 0,00113463 |
| Maximale afstand | 0,035 | 0,00534722 |
| Gemiddelde albedoafwijking, RGB-byte-eenheden | 65,0063 | 2,47917 |
| Maximale albedoafwijking | 111,223 | 2,66667 |
| Driehoeken | 288 | 288 |

247 binnenvertices veranderen; de vastgezette grens en posities buiten de selectie blijven gelijk. Geen nieuwe boundary edges, omgekeerde/ontaarde driehoeken of gedetecteerde nieuwe segmentdoorsnijdingen. Textuurherstel verandert geen geometrie of andere atlaspixels. De afzonderlijke patch is 64×64, met 3 pixels padding. De geëxporteerde texturepixels komen exact overeen met de toegepaste patch. RGB555-kwantisatie verklaart resterende kleurafwijking; detail wordt niet verzonnen.

Deze meetwaarden zijn regionale controles, geen universele kwaliteitsscore. De vlakke fixture is geen bewijs van een volledig personagesilhouet. Aanvullende pols-, skinning- en overlapfixtures testen afzonderlijke geometrische gevallen.

## Prestaties en grenzen

Lokale Node-coremeting: 128 driehoeken circa 78 ms; 8.192 driehoeken/57.344 correspondentiesamples circa 2,27 s. Bij de grotere meting bedroeg de RSS-snapshot na de bewerking circa 320 MiB en gebruikte heap circa 160 MiB. Dit zijn eenmalige synthetische procesmetingen, inclusief mogelijk nog niet opgeruimde objecten, geen totale desktop/GPU-belasting en geen bewezen prestatiewinst. De Windows-artifact bevat de eigen Windows-metingen apart.

Vormherstel projecteert bestaande binnenvertices; het vervangt geen ontbrekende vingers of oppervlakken. Onzekere bronlagen, verschillende poses, niet-inverteerbare skinning en onbetrouwbare vereenvoudigingsherkomst blokkeren het voorstel. Textuurherstel ondersteunt albedo/binaire cutouts, geen volledige PBR-shader of blendtransparantie. Lokale patches gaan echt mee in GLB en als aparte PNG's in het voorbereidingspakket; de native basisatlas/TIMs worden hiermee niet automatisch geschikt gemaakt. Native export voor deze correcties blijft geblokkeerd.

Maximaal 12.000 geselecteerde driehoeken. Zwaar CPU-werk tussen annuleringspunten kan de renderer tijdelijk bezighouden; transactionele kopieën en correspondenties kosten geheugen. De doorsnijdingscontrole is geen volledige coplanaire of geanimeerde botsingsgarantie. Commerciële artistieke goedkeuring en gameplaycompatibiliteit zijn niet vastgesteld.

Handleiding: [GEBRUIK_PHASE_B_NL.md](GEBRUIK_PHASE_B_NL.md). Technische grenzen: [PHASE_B_ARCHITECTURE.md](PHASE_B_ARCHITECTURE.md).

## Windows-oplevering

[Windows-run 43010128681](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/43010128681) is volledig geslaagd. De portable EXE is daadwerkelijk gestart; aanvullende product- en editorroutes draaiden tegen de inhoud van dezelfde Windows-verpakking. Ook Nikki-projectintegriteit, de exacte beta.1-baseline, de huidige commerciële conversies, de privévergelijking en de toegangscontrole voor de ongepubliceerde review slaagden. Privébestanden zijn daarna opgeruimd. Geen commerciële artistieke goedkeuring afgeleid uit deze technische poorten.

[Download Windows-app en eigen HTML-demonstratie](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/43010128681/artifacts/13850058515). De artifact bevat:

- `release/Tekken3ConversionStudio-0.8.0-beta.2-refinement.2-x64.exe`.
- `artifacts/local-repairs/index.html`, afbeeldingen, `results.json` en `benchmark.json`.
- Fase-A/productrapporten, Windows-testbewijs en distributieverificatie.

Pak de volledige ZIP uit en open het HTML-bestand lokaal zodat de afbeeldingen beschikbaar blijven. GitHub-aanmelding vereist; Actions-bewaartermijn 30 dagen. Artifact-ID en digest zijn in de geslaagde run gecontroleerd; de downloadroute is gecontroleerd en leidt voor anonieme toegang naar de afgeschermde artifactroute. De ZIP is niet onafhankelijk met een aangemeld account teruggedownload.

Artifact-SHA256: `532dc10e50da5722593785b4b8b0b89bc988f077408e7a008738b08b2b42e8ad` (de artifact-ZIP, niet de losse EXE).

De commerciële review staat onder **PRIVATE character diagnostics 43010128681 — DO NOT PUBLISH** in de aangemelde Releases-weergave voor bevoegde repositorymedewerkers. De workflow heeft zowel de conceptstatus als geweigerde anonieme pagina-/assettoegang gecontroleerd. Download daar `Private-Character-Review.zip`, pak lokaal uit en open `index.html`. Publiceer deze conceptrelease nooit. Dit is regressiebewijs zonder nieuwe commerciële reparatie-/artistieke claim.

Er is geen reguliere beta.2-release of gameplayclaim gemaakt. Dit is de afzonderlijke fase-B-ontwikkelbuild.
