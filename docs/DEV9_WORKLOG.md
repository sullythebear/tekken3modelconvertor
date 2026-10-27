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

### Cycli 10–11 — selectieve kandidaatbescherming en lookupversnelling

- Een algemeen geldige opacity-bovengrens verwijdert uitsluitend geometry die onder de **bestaande binary-cutout-preparation** in elke pose onzichtbaar is. Bij Nikki: eyeshell opacity 0,08 < cutoff 0,5; de bestaande gebakken tile bevat uitsluitend transparante indices. De moderne geblende bron blijft intact. Geen nieuwe haar-cutoff, geen materiaalnaamheuristiek en geen vertrouwde userData-claim als bewijs.
- Lege rendernodes worden transformcontainers met exact dezelfde childvolgorde en bonewereldtransformaties, zodat geen lege GLB-primitives of GPU-skintextures nodig zijn. Tests controleren bronintegriteit, rigid/rig containers, opacitygrenzen, byte-texturebereiken en veilige fallback bij onbekende alpha.
- Alleen vier distale contourpunten per vinger worden als bestaande regionale beschermpunten overgedragen (20 per hand), niet de volledige bronhand. Alle UV-kopieën van diezelfde puntpositie blijven afzonderlijk behouden, zonder weld. Coördinaten zijn niet enumerable in het conversierapport.
- Kandidaat 2000: 2497 echte faces, rechterhand 198 / linkerhand 200, tegenover 2525 zonder de reparaties. Nul onverklaarde boundaries/windingconflicten en nul divergerende contacten. Nieuw source-safe UV-sheetkenmerk gebruikt het bestaande constante materiaal-kostkanaal, zonder extra attributen; handcharts 8/7. Deze variant komt op **2501 faces**; geen hele-hand-fallback.
- Rode UV-lekkage aan de rechterhand verdwijnt met chartconstraints, maar de kleine zilveren ringen verdwijnen bij reductie nog te veel. Dit is **niet als opgelost aangemerkt**. Volgende actie: echte bronkleur van nabije verhoogde details op de onderliggende vinger bakken, plus correcte dilatie buiten de werkelijk gebruikte palm-UV's.
- Per-pixel zoeken door alle vingerfaces vervangen door een deterministische UV-rasterlookup. Geïsoleerde AB/BA Node-test: 358,215 → 264,664 ms median (6 samples/methode na 2 warmuprondes; circa 26,1% korter), **exact dezelfde gebakken RGBA-hash**. Dit is geen Windows-appclaim. Alle **22** gemeenschappelijke Nikki-PNG's vóór/na de lookup zijn byte-identiek; `lookup-image-provenance.json`.
- Benchmark is reproduceerbaar uit GitHub-checkpoint 5888a6a met dezelfde gedeelde helpers en eigen authored fixture, zonder private Nikki-input. Scripts: `dev9-hand-paired-benchmark.mjs`, `dev9-hand-benchmark.mjs`.
- **216 tests PASS**, 0 fail/skip (`cycle11-checkpoint-unit.xml`). Volledige Nikki-kandidaat-gallery + GLB/TIM-inhoudscontroles en native fixtures PASS (`artifacts/dev9/cycle10-optimized/`, 2497 faces vóór chartconstraints). Geen native Nina/gameplaytest.
- Huidige veilige code wordt nu gecheckpoint. Nog geen dev.9-release of definitieve Windows-EXE. Eerstvolgende concrete actie: bron-UV-coverage/gutters en accessory-to-texture-bake verbeteren, daarna alle vijf budgetten en volledige eindvalidatie/publicatie.

### Cycli 12–13 — gebruikte brontexels, details-overdracht en pols-UV's

- Handbake rasteriseert nu uitsluitend werkelijk gebruikte bron-palm-UV's en nieuw geprojecteerde vingerfaces. Constant-/subpixelcharts krijgen een echte broncentroidseed. Gutterdilatie kopieert uitsluitend gemeten kleuren binnen dezelfde chart; ongebruikte kledingpixels komen niet meer in de handpalette. Geen willekeurige kleuren of noise. Afzonderlijke authored tests controleren rode ongebruikte bronpixels, constante UV's en chartgrenzen.
- Kleine gesloten accessoires worden alleen bij gemeten nabijheid tot het echte vingeroppervlak radiaal op dat oppervlak gebakken. Bronaccessoiregeometrie blijft in het artistieke model. Nikki's zilveren ringen zijn nu zichtbaar in de kandidaat, zonder extra faces: 2501 vóór en na. De nieuwe test gebruikt een eigen torus, naamloze bones en een bronatlas met expliciet ongebruikte rode pixels.
- Categorical UV-sheetkosten nu ook op echte limb-UV's. Alleen fysiek opnieuw gebakken torso/bekken-UV's worden vrijgegeven. Dit verwijdert de zichtbare rode onderarmpolsstrook in dezelfde camera bij **2507** faces (+6), terwijl handsilhouet/facepipeline behouden blijven. Geen volledige hand of materiaalpatch vastgezet.
- Alle 13 live contactposes blijven zonder divergerende contacten. **224 unit-tests PASS**, nul fail/skip (`cycle13-unit.xml`). Let op: de inmiddels beperkte sandbox gaf aanvankelijk alleen een misleidende file-level testafsluiting en blokkeerde localhost; de genoemde aantallen komen van daadwerkelijk volledig uitgevoerde tests met toegestane uitvoeringsrechten.
- Nieuwe projectopslagoptimalisatie vergelijkt alle bytes en hergebruikt uitsluitend identieke, reeds aanwezige ruwe bronbuffers. Metadata, scènes en textures worden gewoon opnieuw gelezen. Dubbele namen, verschillende inhoud/ lengte of onbekende bufferformaten worden niet gedeeld. Drie tests dekken subranges, niet-4-byte-staarten, veranderde inhoud en ArrayBuffer. De volledige Nikki-Electron-projectronde loopt nog; geen Windows-geheugenwinst geclaimd.
- Actuele visuele bewijsbestanden privé onder `artifacts/dev9/cycle12-accessory2000` en `cycle13-body-charts2000`; `scene-private.json` NOOIT publiceren. Alleen screenshots en gesaniteerde metingen zijn geschikt voor publicatie.
- Eerstvolgende actie: lopende volledige projectronde controleren, vier-model-gallery afronden, vijf echte kandidaatbudgetten genereren, geheugenontvangst op Windows verifiëren en een expliciet toegestane reportpayload publiceren. Nog geen dev.9-release of artistieke goedkeuring.

### Onderbreking en hervatting (26 oktober)

- Een GitHub-statuscontrole werd niet uitgevoerd doordat de automatische approval-review tegen een gebruikslimiet liep. Dit was geen veiligheidsafwijzing. De eerste lokale poging gebruikte eveneens een niet-bereikbare sandboxproxy; geautoriseerde Git-push via de uitvoeringsrechten was succesvol.
- Laatste volledige test/beeldbestanden vóór onderbreking: circa 13:04–13:05 UTC. Hervatting afzonderlijk gemeten op **15:50:06 UTC / 16:50:06 CET**. De tussenliggende stilstand telt niet als ontwikkeltijd. Werkmap, b0fbe79-checkpoint en ongecommitte experimenten zijn behouden, geen herbouw uitgevoerd.

### Cycli 14–15 — bron-coverage, werkelijk weggegooide CPU-werk en finalebuild

- Bron-UV-coverage wordt nu transient bij de oorspronkelijke normalevelden vastgelegd. Alleen werkelijk gebruikte limbtexels worden bemonsterd vóór palette-training, met echte centroidseeds voor subpixelcharts en bronkleur-dilatie voor ongebruikte gutters. Geen willekeurige huiddetails. Nikki: rechts 379 gemeten / 3717 gedilateerde texels, links 488 / 3608; nul ongevulde texels. Originele UV-wrapping buiten het betrouwbare domein blijft veilig op de bestaande sampler. De bron-UV-array staat uitsluitend in een WeakMap, niet in projecten/GLB/userData.
- Het kandidaatpad voerde een generieke simplificatie uit ná gezamenlijke bodyreductie, en gooide het resultaat meteen weg. Hetzelfde gebeurde vóór onafhankelijke cardcomponentreductie. Die extra berekeningen zijn overgeslagen. Een echte-call-count-test bevestigt één jointbewerking in plaats van drie; alle **22 Nikki-PNG's zijn byte-identiek** vóór/na (`skipped-work-image-provenance.json`). Geen ongefundeerde volledige-appversnellingsclaim.
- Huidige kandidaat 2000: **2507 faces**, 539 verklaarde boundaries, 0 onverklaarde boundaries, 0 windingconflicten, 16 positionele contacten. Alle 13 poses: 0 divergerende contacten. Artistiek model blijft 7481 faces; 32 contacten, geen divergerend bekkencontact in onderzochte poses.
- Volledige Linux/Electron-projectronde PASS: alle 24 assets byte-identiek, **232.047.502 ruwe bytes** bij heropenen bewezen hergebruikt. Save 4788 ms, reopen 6125 ms; ZIP 49.789.433 bytes. Linux-tellers zijn geen Windows-geheugenwinstbewijs.
- Windows-checkpoint b0fbe79: https://github.com/sullythebear/tekken3modelconvertor/actions/runs/40326143559 — **FAIL vóór import**, downloadstreamtimeout, phases=[], 0 geheugensamples; private temp verwijderd. Niet als conversie- of projectregressie geteld en niet als Windows-PASS gepresenteerd. Downloader rapporteert nu overdrachtsfase/host/HTTP/byteaantal zonder URL/id/token en probeert uitsluitend een transient netwerkfout maximaal één keer opnieuw. HTTP-denial en ongeldige ZIP worden niet herhaald; incomplete data wordt verwijderd. Twee authored tests dekken dit.
- Packageversie nu 0.7.0-dev.9, nog geen release/tag. **230 tests PASS**, 0 fail/skip (`final-unit.xml`). Native fixtures, twaalf-influence CPU/GPU-skinnig, UI skeletonmapping, echte Electron-desktop-IPC en source-only portable-smoke zijn opnieuw uitgevoerd en geslaagd. Dat laatste is expliciet geen Windows-EXE-test.
- Eindgalerij draait opnieuw uit dezelfde gebouwde engine voor vier modellen en doelen 1500/1750/2000/2250/2500. Eerste volledige curve: 2475 / 2468 / 2507 / 2618 / 2794 faces. De kleine niet-monotoniciteit is regionale budgetherverdeling onder foutgrenzen; de gevraagde aantallen zijn geen harde native capaciteiten. Nieuwe diagnostiek is test-only vlak/smooth kleiloos materiaal, geen nieuwe productoptie.
- Eerstvolgende actie: eindgalerij afmaken en bron-camera-/facehashes controleren, veilige self-contained payload/manifest afronden, actuele Windows-checkpoint opnieuw uitvoeren en daarna pas publicatie activeren. Kledingvervorming en zichtbare huidfacettering blijven gedeeltelijk onopgelost; artistieke beoordeling is aan gebruiker.

### Cyclus 16 — gecontroleerd haarreductie-experiment verworpen

- De werkelijke cardcomponentvloer is **60**, niet 664. Er zijn 30 verbonden sheets; 29 hebben gemengde skinweights. De grootste twee (660 / 748 source faces) gebruiken veel meer bones dan een eenvoudig rigide kaartvlak. Echte geometrische/UV-foutgrenzen en de gemengde skinning verklaren de praktische vloer.
- Proef met expliciete UV-sheetlabels en alle passende skinvelden (max 24) maakte 28 componenten permissief zonder bridge of integriteitsfout. Eén grote component overschreed de attributencapaciteit en hield de betrouwbare fallback. Uitkomst **679 in plaats van 664 haarcardfaces; 2522 in plaats van 2507 totaal**. Geen overtuigende zichtbare verbetering. De specifieke wijziging is teruggedraaid; corebestanden zijn byte-identiek aan 6b77d2a. `rejected-card-experiment.json` bevat de meetuitkomst; de niet-actieve patch blijft privé als ontwikkelbewijs.
- Windows-checkpoint 6b77d2a **PASS**: https://github.com/sullythebear/tekken3modelconvertor/actions/runs/40354361747 . Drive bevestiging en ZIP (39.660.475 bytes) succesvol bij eerste poging; geen secret-URL/id in de annotation. Alle 24 raw assets /232.047.502 bytes hergebruikt en projectronde geslaagd. Save 5644 ms, reopen 6917 ms, eerste conversie 8487 ms; ZIP 49.789.433 bytes. Summed WS 3.108.228 KiB, private committed 2.913.976 KiB, harness 647.098.368 B. **Source-checkout Electron**, nog niet de definitieve portable. Lagere ene-run-tellers zijn geen statistisch bewezen verbetering; conversie is juist langzamer dan dev.8.
- Zelfde-kostenvergelijking gereed: dev.7 2545, dev.8 2551, dev.9 2507. Alle 18 toepasselijke bron-camera-hashes gelijk; beschermde face-geometry/texture hashes gelijk; alle actuele enginehashes komen overeen met de galerij. De nieuwe grijze normalablaties tonen waarom echte low-poly-facettering en gebakken texelkleuren afzonderlijk beoordeeld moeten worden.

### Cyclus 17 — richtinggevoelige schouderkosten eveneens verworpen

- Anatomisch kleine schouder-/armregio's hebben 14/16 actieve bones en zouden zes vectorvelden binnen 32 kanalen kunnen dragen. De brede torso houdt twee magnitudes, zodat geen brongewichten verdwijnen (de eerdere 8048-face-regressie is dus vermeden).
- De proef kwam op 7479 faces versus 7481, maar de bronafstand van bovenarmen nam in de meeste neutrale/guard/reach/punchposes toe, zowel gemiddeld als op P95; geen overtuigende visuele kledingverbetering. Code én twee experimentele tests zijn teruggezet naar de veilige checkpoint. De bestaande vier joint-field-tests blijven intact. Meetuitkomst: `rejected-directional-experiment.json`.
- De actuele bron-UV-proef (cyclus 18) onderzoekt een andere oorzaak: broncharts waren tijdens artistieke limbdecimatie nog slechts zachte UV-kosten, terwijl de kandidaat inmiddels categorische chartkosten heeft. Eerst een nulmeting van werkelijk gemengde chartdriehoeken, niet blind meer beschermingen toevoegen.

### Cyclus 18 — selectieve bron-UV-validatie behouden

- Nulmeting zonder extra reductiekosten: Nikki's linkeronderarm bevatte **één gegenereerde driehoek over twee afzonderlijke bron-UV-sheets**; de overige gemeten limbregio's hadden nul. Algemene chartconstraints op alle regio's maakten 7483 faces zonder zichtbare okselwinst en zijn daarom niet overgenomen.
- Alleen een daadwerkelijk gemengde regio wordt nu opnieuw gereduceerd met categorische chart-ID's en ambiguïteitslocks. Bij blijvende onduidelijkheid blijft de betrouwbare bron met expliciete fallbackreden behouden. Nikki: **1 → 0**, géén fallback; alle al geldige regio's houden hun bestaande route. Artistiek totaal **7481**, geen extra faces, nul onverklaarde grenzen/winding en alle 13 contactposes zonder divergentie.
- Eigen overlappende kledinglaagfixture met dicht bij elkaar liggende UV-eilanden reproduceert 10 gemengde triangles en repareert deze naar nul; source positions/UVs/weights/connectiviteit zijn byte-/waarde-ongewijzigd. Een tweede test bewijst één gewone reductie voor reeds correcte topology.
- Extra authored handtest met een naamloze, naar buiten geroteerde duim, niet-uniforme meshscale, polsrotatie en gebogen duim is geslaagd. Geen parallelle vingerassumptie of bronmutatie, alle invloedsets blijven geldig.
- De volledige vier-model- en vijf-budgetgalerij is opnieuw gegenereerd. De broncorrectie verandert ook de laatste lossy reductie iets; actuele kandidaat 2000 is **2513** (was 2507), niet stilzwijgend het oude aantal overgenomen. Definitieve budgettabel komt uitsluitend uit de nieuwe rapporten.
- Okselkleding is hiermee niet opgelost: de reparatie betreft een bewezen UV-lek in de onderarm. Die beperking blijft expliciet.

### Cyclus 19 — werkelijk onnodige FBX-parserreferenties vrijgegeven

- De bestaande, structureel gecontroleerde MIT Three.js-loaderpatch geeft na de synchrone parse in `finally` de modulevariabelen `fbxTree`, `connections` en `sceneGraph` vrij. De teruggegeven scène, alle geometry/morphbuffers, skeletons, clips en toekomstige textureupdates blijven eigendom van de scène. Geen tweede parser of nieuwe importarchitectuur.
- Zes tests laden de **echte gepatchte pinned loader**: binary 7400/7500/7700 met twaalf influences zijn exact gelijk aan de legacyroute; een volgende import vernietigt de eerdere scène niet; downstreamtexturefout ruimt globals op en herstel werkt; vertraagde imagehydratie blijft gekoppeld; upstream-sourcewijzigingen laten de buildpatch expliciet falen.
- Nikki vóór/na: **60/60 PNG's byte-identiek**, sourceStats en alle 119.102.400 morphbufferbytes ongewijzigd. `parser-lifetime-evidence.json` bevat uitsluitend meetwaarden/hashes en screenshotsverwijzingen, geen assets of bronvertices.
- Geïsoleerde Chromium-retentiemeting met twee identieke, alleen diagnostische GC-aanroepen: JS usedSize **32.680.760 → 9.070.164 bytes** (23.610.596 B minder). Backing storage **705.591.271 → 705.576.422 B**, vrijwel gelijk. Dit is geen production-GC, geen GPU-/procespiekmeting en geen claim van honderden MiB RAM-winst. Importduur 5301/5351 ms is praktisch gelijk in deze ene proef.
- Volledige suite opnieuw **239 PASS**, nul fail/skip (`final-unit.xml`). Publicatie blijft geblokkeerd tot nieuwe verpakte Windows- en privéprojecttests daadwerkelijk slagen. De private checkpointworkflow draait nu ook bij wijzigingen aan de daadwerkelijke loader/build/downloader-scripts.
- Eerstvolgende concrete actie: actuele privéprojectronde en twaalf-influence browserintegratie herhalen, definitieve reviewpayload controleren, Windows-prerelease met ongewijzigde main publiceren en alle echte downloads verifiëren.

### Publicatievoorbereiding en extra kwaliteitsgates

- Nieuwe eigen receiptfixtures weigeren HTTP-only rendering als offline-bewijs, weigeren externe afhankelijkheden en weigeren gewijzigde/stale manifesten. **242 volledige tests PASS**, 0 fail/skip (`final-unit.xml`).
- Definitieve 4-model- en 5-budgetroutes opnieuw geslaagd na de echte parsercleanup; bron-camera- en beschermde facehashes behouden. De werkelijke budgettabel is nu **2475 / 2474 / 2513 / 2624 / 2794** voor doelen 1500 / 1750 / 2000 / 2250 / 2500.
- Bewezen image-/meetpayload met expliciete allowlist teruggebracht van 151 naar circa 27 MB. Alleen zichtbare PNG's, onafhankelijke bron-camera-bewijsbeelden en count/hash-rapporten blijven in de download. Geen resolutieverlaging; oude public-review-versies blijven intact.
- Cloud Chromium blokkeert `file://` met `ERR_BLOCKED_BY_ADMINISTRATOR`; dit is als **BLOCKED**, niet als appregressie of offline-PASS opgenomen. Lokale HTTP-rendercontrole PASS: 432 beeldverwijzingen, 449 relatieve links, geen page errors/externe dependencies. De workflow moet de HTML **echt via file:// in Windows Edge** openen; alleen daarna mag de receipt aan het finale manifest en de prerelease worden toegevoegd.
- Windowsbron vóór parsercleanup (ee3b9ce / run 40360778023): save 5205 ms, reopen 6816 ms, eerste conversie 6957 ms; summed WS 3.439.376 KiB, private 3.233.572 KiB. Ná cleanup (3af2c83 / run 40361364562): save 4329 ms, reopen 4961 ms, eerste conversie 5350 ms; summed WS 3.174.872 KiB, private 2.962.116 KiB. Beide PASS, alle 24 assets; ZIP identiek qua grootte. Eén eerdere pre-cleanup-run had echter nog lagere WS (3.108.228 KiB): **variatie is aanzienlijk; geen algemene geheugen-/snelheidswinstclaim**.
- Laatste veilige broncheckpoint **3af2c83** op `development/070-dev9`; nieuwere publicatiebestanden bevatten uitsluitend code, screenshots en gesaniteerde resultaten. `main` ongewijzigd. Releaseworkflow heeft beperkte contents:write, vereist de echte Windows-EXE/privéprojectronde, uploadt alleen de gemeten payload en gebruikt geen --clobber. PR-job mag niet mergen.
- Eerstvolgende actie: publicatiecommit pushen, Windows/Edge-uitkomsten en downloadbestanden controleren; bij falen geen geslaagde release melden en de exacte fout herstellen. De lange onderbrekingen blijven uitgesloten van effectieve werktijd. Artistieke goedkeuring en echte gamevalidatie blijven open.

### Cyclus 20 — bronkleurkosten op schouders verworpen

- Afgebakende proef gebruikte echte albedo-informatie in bestaande zachte normal-kostslots, zonder extra attributen of polygonbudget. Schouderregio's bleven sterk door hun bronranden bepaald: **7481 triangles en 24/24 gemeenschappelijke prepared-PNG's exact gelijk**. Geen aantoonbare beeldwinst; specifieke proef volledig teruggedraaid. Geen hogere willekeurige kostenfactoren geprobeerd. Meetuitkomst: `rejected-appearance-experiment.json`.
- De huidige source-rigdiagnostiek meldt ook bij het oorspronkelijke Nikki-model grote edge-ratio's. Die kunnen van zeer korte randen of van onvolledig aangestuurde correctiebones komen; dit wordt niet zonder lokalisatie aan de oksels toegeschreven. Nieuwe aggregate-diagnostiek scheidt ratio's van absolute toename ten opzichte van de karakterhoogte en noteert echte bronclipaantallen. Alleen eigen botrotaties zijn geen echte bronanimaties.

### Publicatie dev.9 gecontroleerd — 928e47f

- Windows-run 40371152290 geslaagd: 242 tests, portable EXE gestart, verpakte Nikki-projectronde met 24 byte-identieke assets, offline Windows Edge file://-rapport met 432 beelden. Beide releasebestanden daadwerkelijk gedownload (HTTP 200), alle 498 manifestbestanden/hashwaarden en ZIP-CRC’s gecontroleerd; geen privé-assets. Tag v0.7.0-dev.9 blijft onveranderd.
- Windows: save 4423 ms, reopen 5291 ms, eerste conversie 6155 ms; ZIP 49.789.433 B. Summed WS 3.318.036 KiB, private committed 3.115.396 KiB; harness 651.497.472 B afzonderlijk. Geen unieke-RAM-claim.
- PR-aanmaak geweigerd door repositorybeleid: GitHub Actions is not permitted to create or approve pull requests (createPullRequest). Main ongewijzigd. Artistieke beoordeling nog niet ontvangen.

### Cyclus 21 — noodzakelijke dev.9.1-correctie voor Bake atlas uit

- Werkelijke UI-reproductie vóór wijziging faalde: een authored opacity-0,08 BLEND-materiaal verdween na kandidaatoptimalisatie wanneer de bestaande Bake atlas-checkbox uit stond. Standaard gebakken route niet getroffen.
- Binary-cutoutbewijs is nu expliciet gekoppeld aan de echte bakemodus. Zonder bakken en zonder eigen materiaal-alphaTest blijft bronblending behouden. Onbekende modi worden conservatief behouden/geweigerd. GLB-export behoudt BLEND en opacity.
- Drie nieuwe tests; **245 volledige tests PASS**, 0 fail/skip. Echte UI beide standen PASS, ongebakken 24 → 24, gebakken 24 → 12. Nieuwe Windows-workflowgate test dit eveneens in de werkelijk verpakte EXE; pas daarna mag een aparte v0.7.0-dev.9.1 verschijnen.
- Eerstvolgende actie: volledige vier-model-/vijf-budgetgalerij controleren op ongewijzigde standaarduitvoer; veilige manifestpayload vernieuwen, patch committen en pushen, Windows-resultaten en beide nieuwe downloads verifiëren. Geen nieuwe artistieke claims of automatische merge.
