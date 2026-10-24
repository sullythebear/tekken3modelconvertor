# Reproduceerbaar Windows-buildproces

Getest: Node 24.19.0 / npm 11.9.0 in Linux-cloud, met package-lock.json. Electron 45 heeft een expliciete installstap nodig; die is als postinstall geregistreerd. Dependency-integriteit komt uit de npm-lockfile; Electron controleert de officiële checksums. TLS- of checksumvalidatie is niet uitgeschakeld.

## Op Windows 10/11 x64

```powershell
npm ci
npm test
npx playwright-core install chromium
npm run test:visual
npm run test:native
npm run test:mapping
npm run test:skinning
npm run test:reference
npm run build
node scripts/desktop-test.mjs
npm run dist:win
npm run dist:win:portable
```

De test-/buildinstructies zijn opgeslagen; uitvoering op Windows staat nog open. Electron 45 vereist een ondersteunde Windows-versie. Controleer de actuele Electron-systeemvereisten als oudere Windows-versies nodig zijn.

Uitvoer: `release/Tekken 3 Conversion Studio-0.5.0-win.zip` (volledig uitpakken) en `release/Tekken3ConversionStudio-0.5.0-x64.exe` (portable NSIS-container met de Electron-runtime). Geen externe server, Python, Blender of Node-runtime nodig voor eindgebruikers. Er is nog geen Authenticode-certificaat ingesteld. Geen automatische update/publicatie.

De Linux-build kan dezelfde distributies genereren. De uiteindelijke cloudrelease gebruikt `ELECTRON_BUILDER_COMPRESSION_LEVEL=1` om onnodig dure maximumcompressie te vermijden; dit verandert alleen de verpakkingsgrootte/snelheid. Cloudcachepad:

```sh
NODE_USE_ENV_PROXY=1 ELECTRON_GET_USE_PROXY=1 ELECTRON_BUILDER_COMPRESSION_LEVEL=1 ELECTRON_BUILDER_CACHE=/workspace/.electron-builder-cache npm run dist:win:portable -- --config.electronDownload.cache=/workspace/.electron-cache
```

De Linux-desktoptest gebruikt uitsluitend voor de container `--no-sandbox` plus een headless Ozone-display. Die argumenten zijn niet in de Windows-app/startinstructies ingebouwd. Renderer Node-integratie blijft uit; de preload exposeert alleen beperkte IPC.

## Nikki

Pak je eigen Model.zip uit buiten de repository en stel `NIKKI_DIR` in op die map:

```powershell
$env:NIKKI_DIR = 'C:\Assets\Nikki'
npm run test:nikki
```

Runner verwacht `Nikki FN.fbx` en 23 TGA-bestanden. Hij maakt import-/conversierapporten en front/side/back-screenshots. Exitcode 2 betekent geblokkeerd of onvolledige eindvalidatie: zonder daadwerkelijke gametest geeft de runner nooit een volledig groen end-to-end-resultaat.

CI: `.github/workflows/windows.yml` bouwt en test op Windows en uploadt artifacts bij een push/workflow_dispatch. Deze workflow is niet vanuit deze sessie gestart; aanwezigheid is geen bewijs van een geslaagde Windows-run.


Native Nikki-kandidaattest kan aanvullend worden uitgevoerd met `NIKKI_DONOR_MODEL` en `NIKKI_DONOR_ARC` (originele donorbestanden), optioneel `NIKKI_BIND_PROFILE`. Als het bindprofiel ontbreekt wordt expliciet de experimentele schatting gebruikt. Alternatief: `NIKKI_GAME_DIR` met originele `SLUS_004.02` en losse `TEKKEN3.BNS`. Die route controleert de USA-executablehash. De runner gebruikt lokale bestandspaden voor grote source-assets in plaats van honderden MB JSON te versturen. Exitcode 2 blijft PARTIAL/BLOCKED zolang identiteit/game niet daadwerkelijk zijn geverifieerd.


De optionele externe regressie `npm run test:reference` downloadt Cesium Man vanaf een gepinde Khronos-commit, controleert SHA-256 en cachet het bestand onder artifacts/fixtures. Deze ontwikkeltest heeft bij de eerste run HTTPS-toegang tot raw.githubusercontent.com nodig; de desktopapp zelf blijft offline. Zie THIRD_PARTY.md voor de CC BY 4.0-attributie. De twaalf-invloeden-test heeft geen externe modelassets nodig.

## Nikki via ZIP of Google Drive (0.5.0)

Naast NIKKI_DIR accepteert de runner NIKKI_ZIP (lokale ZIP) of NIKKI_URL (HTTPS Google Drive-link). De downloader ondersteunt bevestigingsformulieren en valideert bestandsgrootte/ZIP-signatuur/SHA-256; de uitpakker weigert padtraversal en leest alleen model-/texturebestanden. Instructies in het archief worden niet uitgevoerd. Een bestaande ZIP wordt hergebruikt. Voor native tests kan NIKKI_DONOR_PACKAGE wijzen naar de donor-ZIP uit de desktopapp. De echte Nikki-uitvoering en beperkingen staan in NIKKI_TEST.md.
