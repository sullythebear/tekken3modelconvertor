# Easy Refinement 2.1 — Verf en betrouwbare retouch

Ontwikkelversie: `0.8.0-beta.2-refinement.8`. Branch: `development/080-interactive-refinement`. Appbron: `fad3fc73b494abbfd6fd9f15abf797d67e8e9b07`. Geen reguliere release, TTT2-werk of gewijzigde gameplayclaim.

## Bewezen implementatie

Verf gebruikt een eigen validatiepad: een ondersteunde kleurtexture met geldige UV’s is voldoende. Geen SOURCE-correspondentie, donor of verbetering ten opzichte van SOURCE vereist. Het bestaande zichtbare oppervlakpenseel schrijft gewogen native RGBA-pixels in geïsoleerde lokale trianglecharts. UV-/materiaalnaden worden waar geometrisch verbonden in aparte patches verdeeld. Gedeelde oorspronkelijke UV-pixels worden niet rechtstreeks overschreven. Posities, normals en skinweights blijven intact; alpha wordt behouden en bij replay gecontroleerd.

De preview bevat echte nieuwe textures. Toepassen voert gevalideerde replay uit en bewaart alle streken als één historyrecord; Annuleren verwijdert alleen de tijdelijke verf. Kleur en gereedschap blijven behouden. Gum onthult de toestand vóór deze correctie. Pipet leest albedo in plaats van belichte schermkleur. RGB555 is standaard; gewone RGB, HEX en zachtheid zijn geavanceerde opties.

Geschiedenisversie 5 bevat materiaal-/vlakidentiteit, invoertexture- en UV-signaturen, deterministische charts, nieuwe pixels en instellingen. Versies 1–4 blijven leesbaar. Oude apps kunnen nieuwe verfrecords niet afspelen: bewaar een kopie van bestaande projecten.

## Zelfstandig uitgevoerde tests

458 Node-tests slagen, inclusief SOURCE-null painting/replay, dekking, gum, pipet, materiaalgrens, gedeelde UV’s, repeat/mirror/transforms, alpha-cutout, skinweights en gewijzigde-inputweigering. Geen bestaande tests verwijderd.

Normale GLB-bestandsimport → echte PS1-atlasconversie → Verf via muis → Toepassen → undo/redo → opslaan → app volledig afsluiten → koude heropening → GLB-export → onafhankelijke PNG-decodering → herimport: PASS in lokale Electron. De voorbereidingsexport bevat eveneens exact gecontroleerde reparatie-PNG’s. Dit zijn eigen synthetische fixtures, geen artistieke goedkeuring van commerciële modellen.

| Lokale test | Native rode pixels in preview | Rode canvaspixels | Door gum verwijderde rode pixels | Gewijzigde pixels eerste correctie | Patches |
|---|---:|---:|---:|---:|---:|
| Geïmporteerd patroonvlak met atlas | 4.296 | 13.597 | 939 | 7.821 | 1 |
| Materiaal-/UV-naad met gedeeld achtervlak | 1.438 | 13.524 | 165 | 2.803 | 2 |

Ook gecontroleerd: 50% dekking, echte pipetkleur, Cancel zonder wijziging, twee opeenvolgende verflagen, exacte pixels na undo/redo, SOURCE onaangetast, gedeeld achtervlak exact onveranderd, 1366×768/1920×1080/2560×1440. Screenshots en pixeldata zijn afzonderlijk gecontroleerd. HTML: `artifacts/texture-paint/index.html` en `artifacts/texture-paint-seams/index.html`.

Lokale CPU-tijden per dab: patroonvlak mediaan 6,25 ms / maximum 152,4 ms; naadfixture mediaan 3,45 ms / maximum 409,6 ms. Dit zijn renderer-CPU-metingen onder parallelle software-rendering, geen GPU-/frame-latentie of garantie voor grote modellen. Eerste chartallocatie en layoutwijzigingen zijn duurder; stabiele layouts updaten texturebuffers zonder conversie.

## Retouch: bewezen correctie en resterende weigeringen

De algemene automatische assessor had ná een geldige herstelberekening nog een extra drempel van meer dan drie RGB-waarden verbetering. Daardoor werd een veilig subtiel SOURCE-resultaat verborgen, terwijl expliciet retoucheren hetzelfde resultaat accepteerde. Alleen die redundante drempel is verwijderd. Een gecontroleerde +2 RGB-fixture doorloopt nu Auto → preview → Apply → koude heropening → export. Geen veiligheidscheck voor betrouwbare correspondentie, werkelijk effect, alpha of UV’s is verwijderd.

| Situatie | Status / volgende handeling |
|---|---|
| Geldige subtiele SOURCE-kleurverbetering | Extra Auto-weigering opgelost; synthetisch getest |
| Geen betrouwbare SOURCE-correspondentie | Terecht geen geforceerd SOURCE-herstel; probeer omgeving of Verf |
| Geen geschikte donor / te groot masker | Geen willekeurige donor; kleiner gebied of expliciete kloonbron |
| Ambigue UV-eilanden bij retouch/clone | Bestaande strenge beperking blijft; Verf kan eigen geïsoleerde charts maken |
| Geen meetbaar effect | Geen lege correctie; kies andere kleur/dekking of bewerking |
| Unsupported samengestelde shader/PBR | Eerst gebakken atlas gebruiken |

Bij relevante weigeringen biedt de eenvoudige editor een expliciete knop naar Verf, alleen op eligible kleurtextures. Die knop schildert nooit automatisch. De bestaande Real User Preview Acceptance met normale import, atlas, zichtbare weigering, SOURCE-/vormherstel en export slaagt lokaal.

## Grenzen

- Momenteel artistiek resultaat; opnieuw optimaliseren van een bevroren atlaslaag met gewijzigde topologie blijft geblokkeerd.
- Maximaal 2048 pixels per texturezijde, circa 1 miljoen native chartpixels per sessie, 2048 geraakte triangles, 256 streken, 16 MiB opgeslagen verfpayload. Bij limiet: kleinere correctie eerst toepassen.
- MeshBasic-kleurtextures / gebakken atlas ondersteund; samengestelde PBR/shaderlagen en alpha-blendmaterialen nog niet. Cutoutalpha blijft behouden; Verf maakt geen transparantie.
- Zware lokale charts kunnen nog merkbare allocatiepieken geven; geen universele realtimeprestatieclaim.
- Nieuwe patches blijven op bestaande native texeldichtheid, maar dupliceren geselecteerde charts en kunnen project-/exportomvang vergroten. De oorspronkelijke globale atlas wordt niet vergroot.
- `t3prep` bevat de aangepaste GLB en aparte reparatie-PNG’s. De basisatlas/TIM is niet stilzwijgend vervangen door alle lokale patches; geen nieuwe native Tekken 3-compatibiliteit.
- Bescherming blijft beperkt tot ondersteunde volgende bewerkingen; handmatig Verf is een bewuste kleuractie, geen universeel beschermd-maskermechanisme.
- Een afgebroken/foutieve penseelbewerking verwerpt de tijdelijke laag en meldt dat; bevestigde correcties blijven behouden.
- Geen nieuwe menselijke artistieke review van Nikki/Cena/Marston/Rhea geclaimd; synthetische resultaten bewijzen geen perfecte conversie van ieder privémodel.

## Windows

[Windows-run 43326321484](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/43326321484): volledig afgerond met SUCCESS. De werkelijk verpakte portable EXE is gestart en met echte pointerevents beschilderd; native rode pixels en exportmaterialen zijn gecontroleerd. De aanvullende volledige gebruikersworkflows draaien tegen dezelfde verpakte win-unpacked applicatiebron: Verf, pipet, gum, dekking, Cancel/Apply, twee verflagen, undo/redo, koude heropening, onafhankelijke GLB-/PNG-pixels, materiaal-/UV-naden en ongewijzigd gedeeld achtervlak. Ook de subtiele automatische SOURCE-correctie, bestaande healing/clone/vormtools, zichtbare preview/weigering, bestandsdialogen, originele UI, UV/repeat en native synthetische fixtures slagen. De bestaande preview-acceptatie omvat 150% zoom; nieuwe Verf-schermen zijn vastgelegd op de drie gevraagde resoluties. Geen afzonderlijke fysieke-DPI/hardwarematrix of universele framerateclaim.

Privé-Nikki-projectintegriteit, commerciële conversies, exacte beta1-inputvergelijking, afgeschermde gepaarde review en tijdelijke-dataopruiming: SUCCESS. Geen commerciële beelden in het publieke artifact; geen nieuwe menselijke artistieke goedkeuring geclaimd.

[Download Windows portable EXE + synthetische HTML-rapporten](https://github.com/sullythebear/tekken3modelconvertor/actions/runs/43326321484/artifacts/13993358945). GitHub-login vereist; 30 dagen bewaartermijn. Artifactnaam: `ConversionStudio-easy-refinement-fad3fc73b494abbfd6fd9f15abf797d67e8e9b07` (119 MB). Artifact-SHA256: `75c22bbc498b375ab8342412c5d05d842c929b01619f010324cc3ea7d65f2178`. Metadata en succesvolle upload gecontroleerd; geen onafhankelijke geauthenticeerde herdownload van het ZIP-archief geclaimd.

Pak het artifact uit. Start `release/Tekken3ConversionStudio-0.8.0-beta.2-refinement.8-x64.exe`. Open lokaal `artifacts/texture-paint/index.html` en `artifacts/texture-paint-seams/index.html` voor echte synthetische voor/na-beelden, meetgegevens en exportcontroles. De Nederlandse handleiding is ook offline in de app beschikbaar.

Appcommit: [fad3fc73b494abbfd6fd9f15abf797d67e8e9b07](https://github.com/sullythebear/tekken3modelconvertor/commit/fad3fc73b494abbfd6fd9f15abf797d67e8e9b07). Voorafgaande checkpoints: `801365f` (zelfstandig pixelpad) en `cac5192` (UI/pipet/gum/naadtests). Remote main blijft `ca7e89470df1c893beffe9c3fd2c8bb4ad8c8e84`; geen bestaande release of tag gewijzigd. Dit is een ontwikkelcheckpoint, geen reguliere beta-release.

## Kort lokaal gebruik

1. Importeer en converteer; laat de atlas ingeschakeld.
2. Open Model verfijnen → Verf, kies bijvoorbeeld rood.
3. Schilder; de werkelijke tijdelijke kleur verschijnt direct. Gebruik Gum voor foutjes, Pipet voor bestaande kleur en Dekking voor mengen.
4. Houd Voor/Na vast om te vergelijken. Toepassen bewaart de laag; Annuleren verwijdert de tijdelijke verf.
5. Sla een projectkopie op; exporteer GLB voor de daadwerkelijk gewijzigde geometry-/texturematerialen.

Zie ook [Nederlandse handleiding](GEBRUIK_EASY_NL.md).
