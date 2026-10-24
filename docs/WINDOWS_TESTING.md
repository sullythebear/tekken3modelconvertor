# Lokale Windows-testomgeving

## Eén knop

Gebruik Windows 10/11 x64 met een interactieve desktop en internet voor de eerste dependencydownload. Download/pak de **broncode** uit (of haal de actuele GitHub-checkout op). Dubbelklik in de projectmap op **Test-Windows.cmd**. Je hoeft geen code te schrijven en Node/Python/Blender niet vooraf te installeren.

De eerste keer kies je via vensters:

1. De uitgepakte Nikki-map met `Nikki FN.fbx` en alle 23 TGA's.
2. Je eigen originele USA ISO/BIN, of een donor-ZIP die de Studio eerder heeft gemaakt. Annuleren opent een mapkeuze voor losse `SLUS_004.02` en `TEKKEN3.BNS`.

De launcher bewaart deze keuzes in `.local/windows-test.json`. Opnieuw kiezen: start `Test-Windows.cmd -Configure`. Geen administratorrechten of permanente PATH-/execution-policywijziging nodig. Node 24.10.0 x64 wordt privé gedownload vanaf nodejs.org en gecontroleerd tegen diens HTTPS SHA-256-bestandslijst. `npm ci` gebruikt de lockfile en installeert ook Electron. Geen TLS/checksumcontroles worden uitgeschakeld. De npm-lockfile bevat de bestaande open-sourceafhankelijkheden; zie THIRD_PARTY.md.

Daarna bouwt de runner de renderer, voert unit-/integratietests uit, leest de lokale donor, opent **de echte Electron-app**, importeert Nikki, converteert en exporteert via de desktop-IPC. Het voorbereidingspakket wordt inhoudelijk teruggelezen. Met een geldige donor volgt de native reconstructie en export van 3DMK/ARC; ook die bytes worden gedecodeerd. Een eventuele bindcalibratie kan door een ontwikkelaar via `bindProfile` worden aangewezen. Zonder profiel gebruikt de pipeline de expliciet experimentele schatting; een mislukking blijft FAIL.

Ontbrekende of ongeldige donorbestanden verhinderen de Nikki-bron-/voorbereidingstest niet. Andere fouten stoppen alleen afhankelijke stappen. De originele installatie en image worden niet gewijzigd. Een desktoptestrun sluit zijn eigen Studio-venster na afloop.

## Rapport en bewijs

Na afloop opent `artifacts/windows-local/<run-id>/report.html`. Ernaast staan `report.json`, fase-logs, de gekozen configuratie, donorvalidatie en `nikki/` met source/prepared front/side/back, gezicht en guard/reach/crouch-screenshots. Alle camera's per vergelijking zijn identiek. Electron-consolefouten worden apart bewaard; eventuele Electron-crashdumps gebruiken deze runmap. Niet elke crash levert een dump op.

Het eindresultaat is **PASS of FAIL**, exitcode 0 of 1. Per stap blijft `BLOCKED` zichtbaar, maar een geblokkeerde verplichte stap maakt de totaaluitkomst FAIL. De interne Nikki-runner geeft bewust exit 2 bij PARTIAL; de overkoepelende runner beoordeelt de afzonderlijke resultaten en noemt die exitcode geen volledige acceptatie. Een voorbereiding boven het gevraagde budget blijft FAIL, ook als een exportbestand bestaat. Het HTML-rapport ontsnapt bestands-/fouttekst en voert die niet als HTML uit.

De bewijsmap bevat originele donorbytes en geconverteerde gebruikersassets. Publiceer die map niet automatisch. `.local/` en `artifacts/` zijn genegeerd in Git. Alle runs hebben een unieke map; oude bewijsbestanden worden niet hergebruikt voor een nieuwe PASS.

## Expanded: wat nog niet automatisch werkt

**De runner kan momenteel niet uit zichzelf een bewezen Nikki-installatie in Expanded maken. Er is nog geen geverifieerde runtime-loaderadapter meegeleverd.** Je hoeft niet zelf een adapter te programmeren: dit is nog ontwikkelwerk aan de Studio. Zonder adapter meldt de test `Expanded installation/start: BLOCKED` en start geen ongewijzigde game als schijnbaar geslaagde Nikki-test.

De onderzochte referentie is Expanded 1.1.3 met de Character Builder T3CB-PATCH-14-loader; die combinatie is hier niet uitgevoerd of als geschikt gecertificeerd. De huidige native kandidaat is geen zelfstandig installeerbaar Expanded-pakket. Een BNS of T3CM-payload naar een willekeurige emulator wijzen is onvoldoende: de loader, bindframes, relocaties, textureallocatie en het daadwerkelijke Nina-slot moeten overeenkomen. Een andere Expanded-build vereist opnieuw verificatie. Gepatchte Expanded-executables mogen de originele USA-executablecontrole voor donor-extractie niet vervangen.

De runner heeft alvast een versiegebonden adaptergrens en runtime-capturefunctie. Zodra wij een echte ondersteunde adapter hebben geïmplementeerd en getest, kan dezelfde knop de gamefase uitvoeren. De adapter krijgt een kandidaat en unieke run-ID, installeert in een **aparte testkopie**, en levert een receipt met SHA-256's en de expliciete emulator-launchdetails. De runner controleert die hashes voordat hij een proces start. Een receipt is een installatiebewering van de adapter, geen bewijs dat de PS1-runtime de data correct gebruikt.

## Runtime-capture en invoer

De Windows-helper start alleen de opgegeven executable met losse argumenten en werkmap, zonder shell. Tijdens maximaal 180 seconden verzamelt hij zichtbare vensterscreenshots en standaarduitvoer/fouten. Optionele getimede acties sturen één letter/cijfer of Enter/pijlen/Space/Tab. De helper controleert dat zijn eigen gamevenster focus heeft voordat hij toetsen stuurt. Er zijn geen vaste menutiming of emulator-keybindings gegokt; de adapter/testconfig moet aansluiten op de werkelijk gebruikte emulator. Controller-only games, child-process-launchers, focusrestricties, fullscreen-capture en GPU-overlaygedrag moeten lokaal worden getest. Input bij verloren focus wordt gestopt; andere emulatorsessies worden niet beëindigd. De runner beëindigt na de opname alleen het door hem gestarte proces.

Windows Application Error/WER-events 1000/1001 worden voor de nieuwe gameprocesnaam en starttijd uitgelezen indien toegankelijk. Er worden geen globale crash-/registryinstellingen gewijzigd. De helper verzamelt geen gegarandeerde emulator-minidumps en decodeert geen PS1-exceptions; daarvoor is nog een emulator-specifieke adapter nodig. Procesoverleving en screenshots bewijzen geen juiste animaties. Schermopnames kunnen door andere vensters worden afgedekt en moeten worden bekeken.

Na een succesvolle runtime-capture verschijnt een Nederlandse checklist voor Nina-slot, Nikki-identiteit/textures, beweging/aanvallen/deformaties, beide oriëntaties/geraakt worden en stabiliteit. Alleen werkelijk waargenomen controles mogen worden aangevinkt. Deze beoordeling wordt als **menselijke** acceptatie opgeslagen; zij wordt niet als automatische beeldherkenning gepresenteerd. Ook met een positieve checklist moeten alle technische stappen slagen voor de totaaluitkomst PASS.

## Wat in de cloud is gecontroleerd

De echte Nikki-bron is in Electron geladen, geconverteerd en via desktop-IPC geëxporteerd; voorbereiding teruggelezen, screenshots en consoledata verzameld. De volledige runner is uitgevoerd met echte Nikki en bewust ontbrekende gamebestanden: bron-/voorbereidingstests gaan door, donor/runtime blokkeren en HTML/JSON eindigen correct op FAIL. Nikki blijft 3.860 triangles bij doel 900. Dit probleem is door deze testomgeving niet opgelost.

Unit-tests controleren kandidaat-/run-/slotbinding, installatiehashstructuur, ongeldige paden, FAIL bij BLOCKED en veilige HTML-tekst. Een procesfixture test letterlijke argumenten met shelltekens, stderr, exitcode en beëindiging bij timeout. Windows CI bevat syntaxiscontrole van alle PowerShell-scripts en een **zelfgemaakt venster**, waarmee capture/toetsinvoer kan worden getest zonder Tekken. De CI-wijziging is in deze cloudsessie niet op Windows uitgevoerd; aanwezigheid van de workflow telt niet als PASS.

Alleen lokaal op Windows te verifiëren: de download/bootstrap en Windows-dialogen, echte originele Nina-records, de geschikte Expanded-loader en testkopie-installatie, emulator-input/screenshot/crash-events, daadwerkelijke Nikki-gameplay/animaties en stabiliteit. Zonder die verificatie is het einddoel niet voltooid.

## Adaptercontract voor verdere ontwikkeling

Een optioneel lokaal `runtimeAdapter`-pad in de configuratie wordt alleen op Windows uitgevoerd als PowerShell-script met `-Candidate`, `-RunId` en `-Output`. Dit is een vertrouwde lokale ontwikkelaarsintegratie; de runner voert nooit scripts uit een modelarchief uit. Schrijf naar de outputlocatie een JSON met schema `t3cs-runtime-install/1`, dezelfde `runId`, SHA-256 van de kandidaat-ZIP als `candidateSha256`, `donorId: nina-p1-us`, `expandedVersion`, `loaderVersion`, `installed: true`, `sourceModified: false`, `installedFiles: [{path,sha256}]`, `executable`, `workingDirectory` en stringarray `arguments`. De adapter moet bronbestanden ongemoeid laten en een eigen testkopie gebruiken. De runner controleert de geïnstalleerde hashes; een onbekende loader mag geen positief receipt fabriceren.

De configuratie kan `actions: [{atSeconds: 10, keys: "{ENTER}"}]` en `captureSeconds: 30` bevatten. Dit zijn ontwikkelaarsinstellingen, geen universeel werkende Tekken-menusequentie. Voor de huidige gebruiker is geen handmatige code of adapter vereist om de beschikbare Studio-/Nikki-tests te starten.

PowerShell 7.4.6 is tijdelijk in de Linux-cloud gebruikt om alle vier Windows-scripts syntactisch te parsen: geslaagd. Ook de officiële Node 24.10.0-checksumlijst is opgehaald en de Windows ZIP-entry is gecontroleerd. Dit valideert geen Windows-UI, bootstrapuitvoering of gamecapture.
