# Dev.9 — hervatbaar ontwikkellog

## Missie en tijdregistratie

Start: 2026-10-25 23:47:05 CET (Europe/Amsterdam), 22:47:05 UTC.
Maximaal acht uur effectieve ontwikkeling; geen minimumduur of toezegging na een harde onderbreking. CI-wachttijd wordt niet als ontwikkeling opgevoerd. De sessie wordt alleen zo lang voortgezet als uitvoering en gebruikslimieten dit toelaten.

Branch: `development/070-dev9`.
Laatste gepubliceerde veilige baseline: `b04f9bcefe7d44793e9107ef8fa7d75719e79033` (dev.8).
Laatste dev.9-checkpoint: zie `git log --oneline development/070-dev9`; dit log wordt vóór iedere checkpointcommit bijgewerkt (de eigen commit kan niet zijn eigen hash bevatten).
Status: baseline vastgelegd; nog geen dev.9-wijziging als getest of verbeterd aangemerkt.

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
