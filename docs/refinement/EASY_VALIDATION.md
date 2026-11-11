# Easy Refinement — ontwikkelvalidatie

Versie **0.8.0-beta.2-refinement.4**, branch `development/080-interactive-refinement`. Geteste applicatiebron voor de eindronde: [cae9e380e63a9441cb7c386e209efafcf0f8b2f4](https://github.com/sullythebear/tekken3modelconvertor/commit/cae9e380e63a9441cb7c386e209efafcf0f8b2f4). Een latere documentatiecommit verandert die buildbron niet. `main`, eerdere releases en fase-A/B/C1-checkpoints zijn behouden. Geen TTT2 of nieuwe externe dienst.

## Wat daadwerkelijk is geïmplementeerd

- Eenvoudig bewerken is standaard: vier hoofdacties, een kleine contextbalk, geschiedenis en één knop Geavanceerd. De oude precieze gereedschappen en instellingen blijven aanwezig. Compacte bediening en de geschiedenis zijn op de kleine testviewport zonder scrollen zichtbaar na schilderen.
- Zacht 3D-verfmasker in plaats van volledige driehoekkleuring als primaire selectie. Schilderen/gum, grootte/zachte rand, meerdere streken en masker-undo/redo. Werkelijke zichtbare samples met materiaal-/UV-/connectiviteitsgrenzen en bestaande BVH. Het masker is fijner dan de onderliggende vormpunten, maar niet oneindig precies.
- Direct vormpenseel voor lokaal dikker/dunner, gladmaken en naar buiten/binnen duwen; vergroten/verkleinen blijven beschikbaar. Tijdelijk voorstel tijdens de streek, volledige controle en één opgeslagen correctie bij loslaten. Annulering/onveiligheid behouden het eerdere model.
- Herstelpenseel onderzoekt de bestaande veilige vorm-/texturevoorstellen. Eén optie geeft een bevestigbaar voorstel; meerdere geven maximaal vorm/texture/beide; onzekere koppeling geeft een handmatig alternatief. Geen semantische garantie dat iedere PS1-afwijking een fout is; geen automatische SOURCE-bevestiging.
- Werkelijke gemaskeerde texturepatches met behoud van huidige, onbeschilderde targettexels waar dat aantoonbaar mogelijk is. Onveilig te behouden layouts worden geweigerd. Oude brede textureherstelopties blijven in Geavanceerd beschikbaar.
- Voor/Na vasthouden zonder verfkleuren/helpers en zonder cameraverspringing. Afwijkende houdingen blokkeren zowel vergelijking als lokale voorstellen. Geen gegokte pose-uitlijning. Het oorspronkelijke SOURCE blijft afzonderlijk beschikbaar en onveranderd.
- Omkeerbare commando's, checkboxen/reset, koude projectreplay en export van de echte geometrie/materialen/texturepixels. Oude projecten blijven leesbaar.

## Regres­sies en scopes

**396 Node-tests geslaagd**, zonder mislukkingen of overgeslagen tests. Alle374 C1-basistests zijn behouden;22 gerichte tests toegevoegd. Ze omvatten fijne maskers op grove vlakken, ontbreken van veilige vormpunten, gum, zichtbaarheid, UV1/cutouts, gespiegelde meshes, maskerranden, geheugen-/geschiedenislimieten, gewogen vormherstel, zachte vormstreken, scherpe randen, gesplitste maar equivalente hoekpunten, echte texturepixels buiten het masker en houdingverschillen.

Een concrete integratiefout is met een eerst falende test bewezen en hersteld: lokale texturepatches kregen bij rigs met meer dan vier invloeden niet opnieuw de bestaande all-influence GPU-materiaalkoppeling. De gewichten bleven wel aanwezig. De bestaande skinningconfiguratie wordt na alle patchlagen opnieuw geïnstalleerd op de canonieke en atlasroot. De test controleert shaderhook, alle influence-sets, ongewijzigde gewichten en de analytisch verwachte CPU-positie. Dit is een synthetische Node-regressie, geen nieuwe artistieke animatiegoedkeuring op commerciële rigs.

## Geautomatiseerde gebruikersscenario's

| Scenario | Werkelijke controle |
|---|---|
| Verkeerd geschilderd gebied | Echt muisschilderen, deel gummen, masker-undo/redo, verder schilderen, dezelfde selectie na modusswitch en koud heropenen |
| Onbekende SOURCE-koppeling | Provenance ontbreekt bewust in eigen fixture: geen automatisch voorstel/commit, begrijpelijke fallback; handmatig vormen werkt wel |
| Te dun oppervlak | Directe buiten-/binnenstreken, smoothing, push/pull; elke muisstreek precies één commando, annuleren midden in een streek rolt terug |
| Bekende vormschade | Beschilderen, veilige SOURCE-vormoptie, expliciete bevestiging, koud dezelfde numerieke posities, GLB-controle en herimport |
| Lipachtig texturepatroon | Veilige textureoptie zonder onnodig vormcommando; echte patch, koude pixelgelijkheid, onafhankelijke PNG-decodering uit GLB en herimport |
| Beide soorten schade | Keuze Beide, achtereenvolgens gevalideerde vorm-/texturecorrecties, samen bevestigen, koude replay en identieke geëxporteerde PNG |
| Bestaande workflows | Converterproduct, fase A, fase B, geavanceerd C1, projecten/export, dialogen, UV/repeat, oorspronkelijke UI en native synthetische fixtures |

Nieuwe Electron-scripts: `easy-refinement-test.mjs`, `easy-repair-test.mjs` (ook `--both`), `easy-source-shape-test.mjs`. De nieuwe maskers/commando's worden echt via de app opgeslagen. GLB-buffers/referenties en PNG-pixels worden onafhankelijk gelezen; herimport gebruikt daarna de bestaande importer. Er is geen Blender- of gameplayvalidatie toegevoegd. Numerieke signed-zero-normalisatie bij JSON-opslag is geen zichtbare vormverandering.

## Eigen lokale observaties

De demonstraties gebruiken eigen procedurale vlakken met exact bekende kleur-/vormschade, geen commerciële screenshots. De aanvullende arm/hand/rig/nonhuman/topologiegevallen zitten in de bestaande en nieuwe synthetische kerntests.

- Bekend vormdefect: gemiddelde regionale afstand circa0,02121→0,01784; lokale zachte correctie, geen volledige bronvervanging of herstel buiten de verf.
- Lipachtige texture: gemiddelde regionale RGB-afwijking in een lokale run circa75,5→8,31. Gecombineerd voorstel circa75,5→8,18. Zachte maskerranden behouden bewust een deel van de eerdere kleur. Geen universele artistieke score.
- Voor de eigen kleine interactieve fixture:37 gemeten CPU-dabs, mediaan circa4,4ms, maximum18,4ms;29 preview-updates, mediaan15ms/max33,1ms;5 validaties, mediaan210ms/max283ms. Dit zijn één lokale Linux/Electron-observatie, geen GPU-/frame-/end-to-end-latentieclaim en geen vergelijking met de veel grotere privépersonages. De uiteindelijke Windows-waarden staan afzonderlijk in de artifact.
- Binnen de eigen routes blijven polygonen en onbeschilderde vormpunten behouden. De fijne maskers voegen geen vormpunten toe. Koude GLB-positiechecks en PNG-pixelchecks slagen.

## UX-controle en resterende stappen

Een geautomatiseerde gebruiker kan zonder assen, gewrichten of UV-instellingen schilderen en een vormstreek uitvoeren. De actieve tool is zichtbaar; Gum heeft een afwijkende cursor; undo en Geavanceerd blijven bereikbaar. Het verfmasker wordt bij vergelijking verborgen om kleurverschillen niet te verdoezelen. Schildergrootte blijft consistent tussen Easy/Advanced. De korte introductie verdwijnt na bevestiging of de eerste streek.

Er is **geen externe gebruikerstest met echte beginners** uitgevoerd. Visuele inspectie betreft de eigen demonstratie; commerciële artistieke goedkeuring blijft open. Automatisch herstel vereist bewust nog schilderen → inspectie → eventueel keuze → bekijken → bevestigen. Dat zijn meer stappen dan direct vormschilderen, omdat SOURCE-herstel niet stilzwijgend hoort te beslissen. Lastige atlaslayouts kunnen nog een kleiner masker of Geavanceerd vereisen. Gewijzigde houdingen vragen om dezelfde houding/opnieuw converteren. Eén masker werkt op één mesh; wis het om een ander onderdeel te behandelen.

## Grenzen

16×16 eindige samples per driehoek, maximaal1.024maskerfaces en begrensde totale maskergeschiedenis. De fijne selectie kan meer detail tonen dan de geometrie aankan; dan volgt een weigering/ruimer schilderen. PBR/composiet-/blendmaterialen, tegenstrijdige overlaps en actieve morphs kunnen veilig herstel blokkeren. De eenvoudige dikteknop gebruikt conservatieve lokale normaleffecten, geen onbewezen anatomische doorsnede. Smoothing heeft begrensde stappen en randenbescherming, geen universele volume-/vingervormgarantie na onbeperkt herhalen.

Botsingscontrole certificeert niet ieder coplanair contact of iedere animatiepose. Grote modellen, BVH-opbouw en eindvalidatie/atlasreplay kunnen nog tijdelijk tijd/geheugen kosten; annulering werkt op controlepunten. Opgetelde working sets zijn geen uniek geheugengebruik. Zachte texturemenging en losse PNG-patches zijn geen gecertificeerde native CLUT/TIM-indeling. Native/gameplay blijft experimenteel en voor lokale reparaties geblokkeerd volgens bestaande gates.

[Handleiding](GEBRUIK_EASY_NL.md) · [Architectuur](EASY_ARCHITECTURE.md) · [Hervatbaar werklog](EASY_WORKLOG.md).

## Windows-oplevering

[Windows-run 43065377221](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/43065377221) is **volledig geslaagd** op de genoemde poseveilige applicatiebron. Portable start is echt uitgevoerd; aanvullende workflows gebruikten de inhoud van dezelfde Windows-verpakking. De volgende poorten slaagden:

- Node-suite, rendererbuild, portable verpakking, inhoud/versie/PE-verificatie en echte portable start.
- Oorspronkelijke productworkflow en fase A, B, C1 met koude project-/GLB-routes.
- Alle vier Easy-routes: paint/directe streken, SOURCE-textureherstel, gecombineerd herstel en SOURCE-vormherstel; inclusief de onafhankelijke positie-/PNG-controles.
- Bestandsdialogen/bronoverschrijfbeveiliging, UV1/repeat, oorspronkelijke UI en native synthetische fixtures.
- Privé-Nikki-projectintegriteit, commerciële inputs, exacte beta.1-bronvergelijking, huidige conversies en privévergelijkingsrapport.
- Toegangsgecontroleerde ongepubliceerde review, veilige openbare allowlist, opruimen van privédata en artifactupload.

Lay-outs op 1366×768, 1920×1080, 2560×1440 en de actieve editor met 100/125/150% Electron-rendererzoom zijn gecontroleerd. Dit certificeert niet alle fysieke Windows 11-monitor/DPI-combinaties. De commerciële poorten zijn regressiebewijs, geen nieuwe handmatige artistieke goedkeuring of volledige animatietest van de nieuwe penselen op die personages.

### Download en lokaal bekijken

[Windows portable + eigen HTML-demonstratie](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/43065377221/artifacts/13875073793).

Pak de volledige ZIP uit. Start `release/Tekken3ConversionStudio-0.8.0-beta.2-refinement.4-x64.exe`. Open `artifacts/easy-refinement/index.html` voor de nieuwe editor, voor/na-vergelijkingen, de vier gebruikersroutes en hun echte Windows-metingen. De naastliggende `results.json`-bestanden behouden hun meetmethode/scope; de artifact bevat ook het bestaande product/A/B/C1-bewijs en unit-XML.

GitHub-aanmelding vereist; Actions-bewaartermijn 30 dagen. Artifact-ID, naam en digest zijn op de volledig geslaagde runpagina gecontroleerd. De downloadroute redirect correct naar de artifact; anonieme toegang eindigt in 404. De ZIP is niet onafhankelijk met een aangemeld account teruggedownload.

Artifact-ZIP-SHA256 (niet de losse EXE): `7e300b3b1741f645a47d91bbe91b04d6b024ccbd1b76d6c4e07f0a72ad4ed349`.

Commerciële review blijft uitsluitend in de aangemelde Releases-weergave voor bevoegde repositorymedewerkers: **PRIVATE character diagnostics 43065377221 — DO NOT PUBLISH**. De workflow controleerde conceptstatus en geweigerde anonieme pagina-/assettoegang. Publiceer deze conceptrelease nooit. In de openbare artifact staan geen originele commerciële modellen, textures, project-ZIP's of ongeautoriseerde screenshots.

Er is geen reguliere stabiele/beta.2-release of gameplayclaim gemaakt. Dit is de afzonderlijk geteste Easy-ontwikkelbuild.
