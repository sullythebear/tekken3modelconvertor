# Tekken 3 Conversion Studio

Nieuw, onafhankelijk ontwikkeld desktopproject. **De volledige ontwikkelopdracht is nog niet afgerond. Deze release is een werkende assetvoorbereidingstool met native PS1/Tekken-codecs, geen gevalideerde speelbare-characterconverter.** De UI exporteert inmiddels native **kandidaten**; een bewezen speelbaar pakket blijft geblokkeerd zolang donor-bindkalibratie en runtime-integratie niet in de game zijn gevalideerd.

## Windows gebruiken

Open `release/Tekken3ConversionStudio-0.5.0-x64.exe`, of pak de Windows-ZIP volledig uit en open `Tekken 3 Conversion Studio.exe`. De Electron-runtime is inbegrepen: geen Python, Blender, browser, terminal of losse server nodig. Het bouwen van Windows-bestanden is op Linux uitgevoerd; starten op Windows is nog niet geverifieerd. De EXE is niet digitaal ondertekend.

1. Importeer FBX, OBJ/MTL of GLB/glTF met de bijbehorende bestanden.
2. Voeg zo nodig later TGA/PNG/JPEG-textures toe. Controleer materiaaltoewijzingen in de zijbalk; deze zijn handmatig te corrigeren.
3. Bekijk het origineel; draaien en zoomen synchroniseren beide camera's.
4. Stel driehoeksbudget, hoofdprioriteit en geometriefout in en converteer.
5. Lees het technische rapport. Beschermde UV-randen kunnen het gevraagde budget verhinderen; dit wordt gerapporteerd.
6. Exporteer een **voorbereidingspakket** (`.t3prep`, ZIP), met een aanvullend GLB, RGB555 TIM-textures, screenshots en rapport. Dit pakket is niet speelbaar in Tekken 3.

Nieuw in 0.5.0: de echte Nikki-FBX met 23 TGA's is getest, inclusief materiaalherkenning, haar-/wimpertransparantie, ogen/tanden, gezichtspunten en acht skininvloeden. De voorbereiding blijft met 3.860 triangles boven het doel van 900; het rapport vermeldt dit als onvoldoende. ISO/BIN-extractie van lokale originele USA-bestanden werkt alleen-lezen, met export en herimport van een gecontroleerd donor-ZIP. De native reconstructie is met zelfgemaakte fixtures getest, nog niet met echte Nina-bestanden of in Tekken. Zie [Nikki-test](docs/NIKKI_TEST.md) en [native pipeline](docs/NATIVE_PIPELINE.md).

Zie [gebruikershandleiding](docs/USER_GUIDE.md), [werkelijke status](docs/STATUS.md), [testresultaten](docs/TEST_RESULTS.md) en [formaatonderzoek](docs/FORMAT_RESEARCH.md).

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
