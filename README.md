0.7.0-dev.6: source-connected body/hand reduction and source-derived skin baking; see [review notes](docs/REVIEW_070_DEV6.md). Human artistic review and real game validation remain pending.

0.7.0-dev.5.1: allocation correction with identical dev.5 artistic output; see [review notes](docs/REVIEW_070_DEV5.md). Original releases are preserved.

0.7.0-dev.5: [visual refinement, measured tradeoffs and reproduction](docs/REVIEW_070_DEV5.md). Artistic approval remains pending; candidate counts are not reduced.

0.7.0-dev.4: [visual changes, measured limits and reproduction](docs/REVIEW_070_DEV4.md). Artistic and gameplay acceptance remain pending.

> **0.7.0-dev.3:** [visual corrections and private Windows test](docs/REVIEW_070_DEV3.md). Artistieke goedkeuring en echte Tekken-gamevalidatie staan nog open.

> **0.7.0-dev.2 recovery:** [source recovery inventory](docs/RECOVERY_070_DEV2.md) · [reconstruction and review instructions](docs/REVIEW_070_DEV2.md). Development evidence requires human visual acceptance; game compatibility is unverified.

# 0.7.0-dev.1 reconstruction checkpoint

New UV-surface reconstruction targets damaged Nikki boot shafts. Face/hair experiments retain fallbacks and are not artistically accepted. See [implementation and reproduction](docs/RECONSTRUCTION_070.md). This is not a completed 0.7 release or verified game integration.

# Tekken 3 Conversion Studio

Nieuw, onafhankelijk ontwikkeld desktopproject. **De volledige ontwikkelopdracht is nog niet afgerond. Deze release is een werkende assetvoorbereidingstool met native PS1/Tekken-codecs, geen gevalideerde speelbare-characterconverter.** De UI exporteert inmiddels native **kandidaten**; een bewezen speelbaar pakket blijft geblokkeerd zolang donor-bindkalibratie en runtime-integratie niet in de game zijn gevalideerd.

## Art Director 0.6.0 — experimenteel

Geïntegreerde stijlpresetbediening, feature-/silhouetbewuste oppervlakteclustering met attribuutoptimalisatie, regionale vorm- en UV-correcties, gewogen atlas, echte dithering/texturebake, derde simulatieview en project-/profielopslag. Alle instellingen zijn gekoppeld aan de vermelde uitvoerstap; previeweffecten zijn afzonderlijk gemarkeerd. Zie [Art Director](docs/ART_DIRECTOR.md).

Nikki, een zelfgemaakte rig en Cesium Man zijn met baseline plus drie presets vergeleken. De nieuwe route behoudt op meerdere aanzichten meer silhouet, maar Nikki blijft met circa 3.700 triangles ruim boven doel 900. Authentieke Namco-referenties, nieuwe facial-loop-topologie en bewezen gameplay ontbreken. **Deze artistieke fase is nog niet geaccepteerd.** De softwaretests zijn geen artistiek kwaliteitsbewijs.

## Windows gebruiken

Open `release/Tekken3ConversionStudio-0.6.0-x64.exe`, of pak de Windows-ZIP volledig uit en open `Tekken 3 Conversion Studio.exe`. De Electron-runtime is inbegrepen: geen Python, Blender, browser, terminal of losse server nodig. Het bouwen van Windows-bestanden is op Linux uitgevoerd; starten op Windows is nog niet geverifieerd. De EXE is niet digitaal ondertekend.

1. Importeer FBX, OBJ/MTL of GLB/glTF met de bijbehorende bestanden.
2. Voeg zo nodig later TGA/PNG/JPEG-textures toe. Controleer materiaaltoewijzingen in de zijbalk; deze zijn handmatig te corrigeren.
3. Bekijk het origineel; draaien en zoomen synchroniseren beide camera's.
4. Stel driehoeksbudget, hoofdprioriteit en geometriefout in en converteer.
5. Lees het technische rapport. Beschermde UV-randen kunnen het gevraagde budget verhinderen; dit wordt gerapporteerd.
6. Exporteer een **voorbereidingspakket** (`.t3prep`, ZIP), met een aanvullend GLB, RGB555 TIM-textures, screenshots en rapport. Dit pakket is niet speelbaar in Tekken 3.

Nieuw in 0.5.0: de echte Nikki-FBX met 23 TGA's is getest, inclusief materiaalherkenning, haar-/wimpertransparantie, ogen/tanden, gezichtspunten en acht skininvloeden. De voorbereiding blijft met 3.860 triangles boven het doel van 900; het rapport vermeldt dit als onvoldoende. ISO/BIN-extractie van lokale originele USA-bestanden werkt alleen-lezen, met export en herimport van een gecontroleerd donor-ZIP. De native reconstructie is met zelfgemaakte fixtures getest, nog niet met echte Nina-bestanden of in Tekken. Zie [Nikki-test](docs/NIKKI_TEST.md) en [native pipeline](docs/NATIVE_PIPELINE.md).

Zie [gebruikershandleiding](docs/USER_GUIDE.md), [werkelijke status](docs/STATUS.md), [testresultaten](docs/TEST_RESULTS.md) en [formaatonderzoek](docs/FORMAT_RESEARCH.md).

## Lokale Windows-test met één knop

Dubbelklik in de actuele broncode op **Test-Windows.cmd**. De eerste keer kies je Nikki en je originele lokale gamebestanden via vensters. De launcher installeert een private Node-runtime, bouwt/start Electron, test import/conversie/export en opent een PASS/FAIL-rapport met logs en screenshots. Een vooraf geïnstalleerde ontwikkelomgeving is niet nodig. Zie [Windows-testomgeving](docs/WINDOWS_TESTING.md).

De Studio-/Nikki-test is in de cloud in Electron uitgevoerd. **Een geverifieerde Expanded-runtime-adapter ontbreekt nog:** de game-installatie/-start blijft dan BLOCKED en het totaalrapport FAIL. De runner presenteert een ongewijzigde Nina of alleen een gestarte emulator niet als een speelbare Nikki.

## Ontwikkelen en bouwen

Vereist voor ontwikkelaars: Node.js 24, npm, Internet voor de eerste dependency-/Electron-download. Gebruik de bestaande checkout; geen extra worktree nodig.

```sh
npm ci
npm test
npm run test:visual
npm run test:native
npm run test:desktop
npm start
npm run dist:win
npm run dist:win:portable
```

`npm start` opent het desktopvenster; het start geen HTTP-server. De visuele test gebruikt een tijdelijke, alleen op loopback bereikbare testserver, die de runner zelf afsluit. Deze server behoort niet tot de desktopapplicatie. Linux-cloudtests gebruiken het aanwezige Chromium; op andere systemen: `npx playwright-core install chromium` of stel `CHROMIUM_PATH` in.

Voor cloudomgevingen met een read-only thuismap en HTTPS-proxy:

```sh
NODE_USE_ENV_PROXY=1 ELECTRON_GET_USE_PROXY=1 electron_config_cache=/workspace/.electron-cache npm ci --cache /workspace/.npm-cache
NODE_USE_ENV_PROXY=1 ELECTRON_GET_USE_PROXY=1 ELECTRON_BUILDER_CACHE=/workspace/.electron-builder-cache npm run dist:win -- --config.electronDownload.cache=/workspace/.electron-cache
```

Zie [Windows-buildproces](docs/BUILD.md). De Windows CI-workflow is aanwezig maar is vanuit deze sessie niet op GitHub uitgevoerd.

## Architectuur

- `src/core/importer.js`: Three.js FBX/OBJ/MTL/glTF import, materiaalrelaties, resources en analyse.
- `src/core/skeleton.js`: semantische naamherkenning, bron-skinweights en pose-diagnostiek.
- `src/core/converter.js`: regioverdeling en detailbudgetten, attribuutbewuste reductie met behoud van bronrig.
- `src/core/atlas.js`: materiaaltile-bake, alpha-cutouts, 16 kleuren per tile, PS1-palette/TIM.
- `src/core/ps1.js`: TIM- en ARC-codecs, RGB555, deterministische palettequantisatie.
- `src/core/donor.js`, `bind.js`, `bind-estimator.js`, `surface.js`, `template.js`: native donor-decoding, bindframes, experimentele seamfitting en echte oppervlakteprojectie/texturebake.
- `src/core/native-rebuild.js`: native normals en pointer-/handtabelremapping.
- `src/core/bns.js`, `game-backup.js`: gecontroleerde USA-recordroute, aparte BNS-kopie, backupformat.
- `src/core/native.js`: eigen 27-rijen 3DMK-writer, relocaties en geometrie-/budgetvalidatie.
- `src/core/exporter.js`: native kandidaatpakketten en T3CM/T3TX-containercodec. Vereist reeds gekalibreerde botlokale geometrie; gekoppeld aan de native UI-kandidaatroute; een runtime-loader ontbreekt.
- `src/core/backup.mjs`: hashgecontroleerde transactionele bestandspatches en herstel; via de desktop-UI gebruikt voor herstel van gamebackups.
- `src/desktop`: Electron-hoofdproces en geïsoleerde preload; alleen bestandsdialogen en beperkte export-IPC.
- `src/ui`: offline interface en gesynchroniseerde WebGL-views.
- `tests`, `scripts`: inhoudsvalidatie, synthetische import/visuele tests, Nikki-runner en Windows-build.

Geen bestaande Conversion Studio- of Character Builder-code is als basis overgenomen. De door de gebruiker genoemde Character Builder en andere bronnen zijn alleen geraadpleegd voor formaatfeiten en bestaande onderzoeksresultaten. Er worden geen originele gamebestanden of Nikki-assets meegeleverd. Afhankelijkheden en licenties staan in [THIRD_PARTY.md](docs/THIRD_PARTY.md).
