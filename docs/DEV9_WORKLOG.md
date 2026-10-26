# Dev.9 — hervatbaar ontwikkellog

## Missie en tijdregistratie

Start: 2026-10-25 23:47:05 CET (Europe/Amsterdam), 22:47:05 UTC.
Maximaal acht uur effectieve ontwikkeling; geen minimumduur of toezegging na een harde onderbreking. CI-wachttijd wordt niet als ontwikkeling opgevoerd. De sessie wordt alleen zo lang voortgezet als uitvoering en gebruikslimieten dit toelaten.

Branch: `development/070-dev9`.
Laatste gepubliceerde veilige baseline: `b04f9bcefe7d44793e9107ef8fa7d75719e79033` (dev.8).
Laatste dev.9-checkpoint: zie `git log --oneline development/070-dev9`; dit log wordt vóór iedere checkpointcommit bijgewerkt (de eigen commit kan niet zijn eigen hash bevatten).
Status: meerdere gerichte cycli uitgevoerd. Alleen hieronder expliciet geaccepteerde onderdelen zijn veiliggesteld; handretopologie blijft een afzonderlijk, nog niet artistiek geaccepteerd experiment.

## Regressiebasis

Dev.8: 182 tests; Nikki artistiek 7503 triangles; kandidaten 2482/2484/2510/2551 voor verzoeken 900/1200/1500/2000. Nul onverklaarde boundaries, nul windingconflicten. 825 verklaarde boundaries, 38 positiecontacten (33 coincidente-vlakcontacten/5 surfacevertakkingen). Eén bekkencontact divergeert in guard/reach/crouch/walk/kick. Geen echte gamevalidatie, geen artistieke goedkeuring.

Windows dev.8: save 5,183 s; reopen 6,984 s; eerste conversie 6,749 s; ZIP 49.789.433 bytes; opgetelde working sets 3.23975 GiB; private committed 3.06178 GiB; aparte harness-RSS 629,53 MiB. Eén run; geen unieke-RAM- of statistische winstclaim.

## Werkplan: opeenvolgende cycli

1. Baseline opnieuw testen en bron/uitvoerhanden, schouderweights en het bekkencontact precies lokaliseren. Leg private analyses buiten Git vast; bewaar reproduceerbare analysecodering en veilige meetwaarden.
2. Handen: structurele vingers, contour-/gewrichtsverdeling en nieuwe lokale topologie toetsen bij gelijke kosten. Geen automatische bronhandvergrendeling.
3. Schouders/oksels/kleding: bron versus reconstructie en posecorrespondentie isoleren. Alleen bewezen weight-/topologiefouten corrigeren. Bekkencontact: echte gedeelde-connectiviteit, UV- en weightverschillen onderzoeken.
4. Huid: afzonderlijke geometrie-, normal-, albedo- en gecombineerde renders. Haar: transparantie/verborgen geometrie en ondersteuning controleren; gezicht-/oogpixels beschermen.
5. Regionale reductieblokkades meten, alternatieven vergelijken bij doelen 1500/1750/2000/2250/2500. Werkelijke aantallen en zichtbare schade rapporteren.
6. Alle vier modellen, volledige suite, verpakte Windows-EXE, privé-Nikki-project, prestaties, veilig rapport en geverifieerde downloads. Main niet mergen. Bij onderbreking: werklog/teststatus/volgende stap committen en pushen, geen ongeteste eindrelease.

## Beschikbare invoer en evidence

- Baseline-evidence: `public-review/dev8/`, vooral `dev8/dev8/nikki-authentic/`; `docs/REVIEW_070_DEV8.md`.
- Privé-Nikki lokaal: alleen indien aanwezig `/workspace/test-assets/nikki/nikki-unpacked-YKIQL3`; niet als hervatvoorwaarde gebruiken. Anders bestaand repositorysecret `NIKKI_DOWNLOAD_URL` op de Windows-runner.
- Cesium Man: `artifacts/fixtures/CesiumMan.glb` met attribution; authored modellen via bestaande testhelpers.
- Oude worktrees zijn gemak, geen vereiste: maak zo nodig nieuwe checkouts vanaf gepubliceerde commits.
- Windows/releaseprocedures: `.github/workflows/publish-review.yml`, `scripts/project-roundtrip-test.mjs`, `scripts/portable-smoke.mjs`.
- Nooit originele modellen, textures, gamebytes, privé-URL's, project-ZIP's of source vertexarrays publiceren.

## Cycli en checkpoints

### Cyclus 0 — gestart

- Repository is schoon en HEAD is exact b04f9bc. Nieuwe dev.9-branch gemaakt.
- Volgende concrete actie: 182 tests opnieuw uitvoeren; het bekkencontact en de anatomische handgroepen met broncorrespondentie lokaliseren. Geen verbeteringen geclaimd.

### Cyclus 0 — baseline en diagnose afgerond

- 182 baseline-tests opnieuw PASS (`artifacts/dev9/baseline-unit.xml`).
- Nieuwe gerichte probe `scripts/dev9-probe.mjs` en offline diagnostics; outputs onder `artifacts/dev9/` zijn **privé**, nooit integraal publiceren.
- Eerste probe mislukte door onnodige serialisatie van alle morphtargets (Node heap overflow). Opgenomen in diagnose, niet als app-regressie geteld. Probe beperkt nu expliciet de uitgelezen geometrykanalen; geen grotere heap als camouflage.
- Nikki: 75 morphtargets per bronmesh, alle neutrale influences nul. De volledige bron blijft behouden.
- Offline sampler gecontroleerd met volledige skinsets; zonder bestaande `configureSkinning` was de diagnostische bindmeting onjuist. De loader past nu dezelfde volledige LBS toe; source/converted bindafwijking beide circa 0,000155 bronunits.

### Cyclus 1 — tijdelijke morphtargetkopie vermijden, geaccepteerd

- `cloneWorkingGeometry` kopieert uitsluitend werkkanalen die de bestaande converter behoudt; geen tijdelijke kopie van alle daarna weggegooide morphtargets. Originele previews/assetbytes blijven intact.
- Twee nieuwe tests voor morphbuffers, interleaving, extra skinsets en onafhankelijke werkbuffers PASS.
- 14 gemeenschappelijke gerichte screenshots byte-identiek aan de baseline. Bestandsgrootte/Windows-memory nog niet opnieuw gemeten; nog geen prestatiewinst geclaimd.
- Evidence: `artifacts/dev9/cycle1-working-buffers/` en `tests/working-geometry.test.mjs`.

### Cyclus 2 — bekkencontact repareren, geaccepteerd na gerichte controles

- Oorzaak: bron bevat al samenvallende fysieke faces met afwijkende UV-eilanden en skinweights die één aantoonbare 8-bit quantisatiestap verschillen. Niet door willekeurig vertex-welden opgelost.
- `reconcileCoincidentSkin`: alleen zelfde mesh/materiaal, bewezen duplicaat-triangle, identieke bonesupport, gemeten 255-rooster en kleine foutgrens. Geen geometrie/UV-normalen samenvoegen; hoofd/haar/handen beschermd. Verschillende materialen, grotere verschillen en andere bonesupport blijven intact.
- Nikki: 2 fysieke punten / 25 vertexkopieën consistent gemaakt; maximale L1-weightwijziging circa 0,011765. Alle 13 offline en de 10 live vastgelegde diagnostische poses hebben 0 divergerende contacten. De 38 positiecontacten blijven structureel bestaan; nul onverklaarde boundaries/windingconflicten behouden.
- Volledige suite **189 PASS**, nul fail/skipped (`artifacts/dev9/cycle2-unit.xml`). Live beelden/private broncorrespondenties: `artifacts/dev9/cycle2-seam/`.

### Eerstvolgende concrete actie

Cyclus 3: vijf fingerpatches met ieder één gesloten palm-interface gericht reconstrueren. Anatomische source-bonecurves + rayprojectie, behoud de echte bronringen, skintransfer en echte texturebaking. Eerst prototype; bij schade niet als verbetering publiceren. Daarna schouder-/kledingdiagnose, huid/haar en regionale optimalisatie. Nog geen dev.9-release of Windows-validatie uitgevoerd.

### Cyclus 3 — handexperimenten en onafhankelijke readbackverbetering

- Eerste nieuwe vingeropbouw verwierp de gemeten concave collar; opgelost door de echte boundary-cyclus en 3D-booglengte te behouden, zonder punten op hoek te hersorteren.
- Prototype engageert op beide Nikki-handen: 5 nieuwe vingers per hand, 0 nieuwe open randen/windingfouten. Eerste variant 580/582 handtriangles tegenover 536/486 baseline. De vingercontour is beter verdeeld, maar textureovergang bij de pols verslechtert. **Nog niet geaccepteerd**, geen artistieke voltooiing. Onderzoek nu betrouwbare oorspronkelijke UV-correspondentie bij vrijwel gelijke kosten.
- `materialSampler` leest voor albedo geen ongebruikte normal/roughness/specular/AO-images meer uit. Gerichte getter-traptest bevestigt dat albedo die buffers niet aanraakt, terwijl static-detail ze wel blijft lezen.
- Volledige suite **190 PASS**, 0 fail/skip; `artifacts/dev9/cycle3-sampler-unit.xml`. Nog geen nieuwe Windows-meting of release.
- Huidige veilige motorcheckpoint voorafgaand aan handexperiment: 8d18462. Handmodule/converterkoppeling blijven voorlopig on-gecommit experiment; samplerwijziging onafhankelijk veiliggesteld. Eerstvolgende actie: nieuwe handbeelden beoordelen, textureseams/vingertoppen en poses toetsen; alleen behouden bij zichtbare winst.

### Cyclus 4 — daadwerkelijke huidveld-overdracht, structurele fout gevonden

- `configureSkinning` kloont materialen voor de GPU-weergave van alle influences. Daardoor gingen de transient WeakMap-huidvelden verloren, hoewel de userData-metadata bleef bestaan. Dit verklaart waarom eerdere bron-normalbaking in de echte gecombineerde route grotendeels vlak bleef.
- De materiaalclone neemt nu dezelfde immutable bronvelden mee, zonder extra floatbufferkopie of serialisatie. Nieuwe end-to-end unit-test met twee skinsets en drie herconfiguraties bevestigt de werkelijke belichtingswaarde, niet alleen metadata.
- **191 tests PASS**, 0 fail/skip (`artifacts/dev9/cycle4-unit.xml`).
- Afzonderlijke Nikki-render zonder nieuwe handgeometrie: 7503 triangles, integriteit behouden. Huid heeft nu daadwerkelijk vormschaduw, maar de 64-pixel/RGB555-overgangen zijn zichtbaar grof. Deze correctie is een noodzakelijke functionele reparatie, nog geen bewijs dat de huid artistiek klaar is. Detailvergelijking: `artifacts/dev9/cycle4-skin-field/`.
- Directe UV-interpolatie van de nieuwe vingers is verworpen wegens rode kledingpixels op de duim. De grotere handtile is eveneens verworpen: atlaspacking verlaagde de resolutie van andere huidtiles. De vingerbake wordt nu bij de oorspronkelijke texturekosten met de gerepareerde huidroute opnieuw beoordeeld.
- Volgende concrete actie: beelden `cycle4-hand-lit` vergelijken met `cycle4-skin-field`, daarna betere bron-correspondentie/quantisatie onderzoeken en niet alleen extra geometrie toevoegen. Geen dev.9-release of Windows-uitkomst geclaimd.

### Hervatting en tijdregistratie

- Eerste geregistreerde actieve blok: 22:47:05–23:42:50 UTC op 25 oktober, circa 55m45s; enkele slotcommando's daarna zijn niet afzonderlijk getimed. De lange onderbreking telt niet als ontwikkeltijd.
- Werkmap bereikbaar bij hervatting, alle ongecommitte handbestanden nog aanwezig. Hervatting gemeten op 26 oktober 09:49:58 UTC / 10:49:58 CET. Niet opnieuw begonnen; bestaande proefresultaten opnieuw gelezen.

### Cyclus 5 — nieuwe anatomische handtopologie, checkpoint voor verdere beoordeling

- Vijf gemeten bone-curves, eigen ringtopologie en echte bron-collarinterfaces; volledige source-surface-correspondentie en alle skinsets blijven behouden. Unknown rigs behouden expliciet de bestaande fallback.
- Gescheiden broncomponenten met alleen puntcontact worden niet geweld. Nikki's 250 extra rechterwijsvingerfaces zijn de zilveren ringen, geen verborgen afval. Losse accessoire behouden, begrensd vereenvoudigd naar 56 faces met dezelfde absolute foutmaat als de gehele hand.
- Eerste axiale tip verloor maximaal circa 1,25 bronunits aan distale vorm. Bidirectionele meting bracht dit aan het licht; die variant is verworpen. Gemeten bron-frontier geeft nu maximaal circa 0,54 bronunits, grotendeels handpalm; gemiddelde bronafstand blijft circa 0,08 versus 0,034 bij de oude reductie. **Geen artistieke voltooiing geclaimd**. Verdere ringverdeling bij gelijke kosten blijft nodig.
- Huidige proef: rechterhand 476 / linkerhand 420 faces; samen 896 versus 1022 baseline. Nikki totaal 7377. Accessoire aanwezig, geen rode kledingpixels op duim. Nul onverklaarde boundaries, nul windingconflicten, 825 verklaarde boundaries, 37 positiecontacten; alle 13 live diagnostische poses zonder divergerend contact.
- **196 tests PASS**, 0 fail/skip (`artifacts/dev9/cycle5-unit.xml`). Nieuwe tests gebruiken zelfgeschreven geometrie met naamloze fingerbones, twee influence-sets, beweging, bronintegriteit en een los torusaccessoire. Geen privébrondata in tests.
- `scripts/dev9-hand-quality.mjs` meet beide richtingen met zeven samples per triangle en vijf handposes. Publieke samenvatting bevat alleen afstanden/aantallen, geen bronvertices. `scene-private.json` blijft strikt privé.
- Eerstvolgende concrete actie: kostgelijke distale ringverdeling en echte lineaire texturebemonstering beoordelen; daarna schouder/kleding, huidfacettering, haar en kandidaatbudgetten. Windows dev.9 nog niet getest. Geen release gepubliceerd.

### Vroege Windows-controle gestart

De bestaande private projectworkflow draait nu ook op dev.9. Alleen `results.json` wordt geüpload; bron-download en project-ZIP blijven in een apart tijdelijk pad en worden opgeruimd, foutmeldingen verwijderen URLs. De setup-node-cache bevat uitsluitend npm-dependencies. Deze vroege run controleert het huidige checkpoint; een latere verpakte dev.9-EXE moet afzonderlijk opnieuw getest worden. Er is nog geen Windows-uitslag bekend.

### Cycli 6–8 — kostgelijke vingers, gewrichtskosten en efficiëntere bronreconstructie

- Vier distale vingersecties in plaats van drie, met lineaire brontexelbemonstering. Handen 556/500 = 1056 faces versus 1022 in dev.8 (+3,3%; geheel personage slechts +34). Meer regelmatige vingercontouren en rondere tips; gemeten gemiddelde bronafstand circa 0,071 versus 0,080 in de goedkopere nieuwe variant. De oude bronreductie blijft numeriek dichter bij de bron (circa 0,034); dat wordt niet verborgen of gelijkgesteld aan een artistiek oordeel.
- Nieuwe immutable joint-fields vergelijken echte LBS-proefrotaties zonder het rig te muteren. Een vectorvariant met zes extra attributen overschreed niet de API, maar verdrong wel bestaande gewichtvelden: 8048 faces door extra residual-locks. **Verworpen**. De compacte twee magnitudes behouden alle 24 oorspronkelijke bone-velden binnen de echte 32-attributenlimiet; statische regio's krijgen geen lege velden. Dit zijn kostenhulpen, geen bewijs van Tekken-animaties of volledige pose-foutgrenzen.
- Originele torso/bekken-UV's bleken nog reductie te blokkeren, hoewel de aansluitende fysieke source-surface-bake ze vervangt. Alleen bij een aantoonbaar geldige herprojectie wordt die overbodige UV-kost losgelaten. Tests bevestigen onafhankelijke geometrie en identieke gebakken brontexels bij verschillende doeltriangulatie.
- Huidige artistieke uitvoer: **7481 triangles**. Torso 473 versus 507; bekken/kleding 342 versus 362. Opgeheven rechterbovenarm: gemeten gemiddelde bronafstand circa 0,1328 versus 0,1453 (8,6% lager), linkerarm circa 1,6% lager. Schoudertopologie blijft praktisch gelijk. Torso bronafstand stijgt circa 3% bij minder faces; kledingvervorming is **niet als volledig opgelost aangemerkt**.
- Integriteit: 0 onverklaarde open randen, 0 windingconflicten, 825 verklaarde boundaries. 32 positiecontacten = 28 samenvallende-vlakcontacten / 4 surfacevertakkingen. Alle 13 onderzochte live poses: 0 divergerende contacten. Geen willekeurige vertex-weld om aantallen te verlagen.
- **203 tests PASS**, 0 fail/skip (`artifacts/dev9/cycle8-compact-unit.xml`). Vier-model-gallery voor cyclus 6 PASS; nieuwe cyclus-8-gallery loopt onder `artifacts/dev9/cycle8-models/`.
- Vroege Windows-run op checkpoint 5be0cbb PASS: https://github.com/sullythebear/tekken3modelconvertor/actions/runs/40303214681 . Save 5,302s; reopen 6,620s; eerste conversie 7,392s; ZIP 49.789.433 bytes; alle 24 assets geverifieerd; private temp verwijderd. Summed app working sets 3,27367 GiB, harness 521,26 MiB. Geen winstclaim tegenover dev.8 (3,23975 GiB); private committed bytes staan niet in de publieke annotation. Dit is nog geen test van de definitieve portable EXE.
- Eerstvolgende actie: betere torsoresolutie en bron-normaloverdracht afzonderlijk testen. Huidfacettering en kledingovergangen zijn nog werkpunten. Daarna haar, vijf kandidaatbudgetten en volledige publicatievalidatie. Nog geen dev.9-release.

Checkpointcontrole: cyclus-8-gallery is afgerond voor Nikki 7481 / Cesium 1122 / authored short hair 3496 / crest 2976. De volledige suite is na de precondition-refactor opnieuw **203 PASS** (`cycle8-checkpoint-unit.xml`), nul fail/skip. Nog niet volledig artistiek goedgekeurd; torso-normalbake-experiment start pas na dit checkpoint.

### Cyclus 9 — brongebaseerde torso/huidbake, afzonderlijk gecontroleerd

- Bestaande torso-bake maakte 256×128 bronpixels voor een daadwerkelijke 256×256-atlastile. Volledige verticale resolutie wordt nu benut; geometrie en atlasruimte wijzigen hierdoor niet. Kandidaat-herbaking behoudt de gemeten bronkaartdimensies.
- Bron-normals werden na de torso-bake weggegooid. De bake kan nu echte geïnterpoleerde bron-normals in dezelfde wereldruimte als de huidvelden gebruiken voor milde statische diffuse schaduw. Geen willekeurige ruis, verzonnen AO of moderne glans. Ontbrekende/ongeldige normals behouden albedo. Een marker voorkomt dubbele belichting bij kandidaatherbaking.
- De variant met bronbelichting maar slechts 16 kleuren is verworpen wegens te grove huidkleurvlakken. De behouden bron-normalkaarten gebruiken 256 RGB555-paletkleuren. Andere tiles krijgen geen minder texels. Dit kost **65.536 extra textuurbytes**: 167.040 → **232.576**, palettes 3872 → **4832 bytes**. Dit is staging/preparation, geen bewezen donorcapaciteit; native/runtimevalidatie blijft vereist.
- Vier ablaties hebben **exact dezelfde geometry/UV/normals/skin/bind-hash**, inclusief inverse binds: `3e56e1bf30f971a22b751b4573dd6f3b88896720881fd423edd030687f78f98b`. Alle **24 gemeenschappelijke bronbeelden** zijn byte-identiek. `artifacts/dev9/bake-ablation-provenance.json` bevat alleen hashes/aantallen, geen bronarrays.
- Beschermd gezichtsinterieur geometry/texture hashes ongewijzigd. Alle **14 andere TIM-pixel- en palettehashes** zijn identiek tussen cyclus 8 en 9. Alleen de twee body/garment-tiles verschillen.
- **207 tests PASS**, nul fail/skip. Cyclus-9-gallery PASS voor Nikki 7481, Cesium 1122, short hair 3496 en crest 2976. Nieuwe tests controleren kaartresolutie, echte normaleffecten, wereldruimte, geen dubbele belichting, geen bronmutatie en veilige fallback. Bewijs: `artifacts/dev9/cycle9-models/` en `cycle9-unit.xml`.
- Huid is nog zichtbaar gestileerd/gekwantiseerd; geen artistieke voltooiing geclaimd. De bron-gebaseerde schaduw en fijnere kleurverschillen zijn in de grote beelden te beoordelen.
- Eerstvolgende actie: veilige cutout-onzichtbaarheid en minimale vingertopcontourbescherming in kandidaatoptimalisatie. De lopende cutoutproef is nog een afzonderlijke werkboomwijziging, niet onderdeel van dit body-bake-checkpoint. Daarna volledige vijf-budgetvergelijking, haaranalyse en uiteindelijke Windows-build/publicatie.
