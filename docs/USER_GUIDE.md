# Gebruikershandleiding

Dit programma bereidt modellen voor. Deze versie maakt nog geen aantoonbaar speelbaar Tekken 3-personage.

## Importeren

Open de portable Windows-EXE of pak de Windows-ZIP volledig uit en dubbelklik op de applicatie-EXE. Selecteer via **Model & textures** het model én relevante externe bestanden. Bij OBJ hoort het MTL-bestand; bij glTF kunnen BIN-bestanden en textures horen. Voor FBX worden gewone binaire FBX-versies via Three.js geladen, zonder Blender. Niet elke FBX-exportvariant is al getest.

Met **Add textures to current model** kunnen textures later worden toegevoegd. Materiaalverwijzingen uit FBX/glTF/MTL krijgen voorrang. Bestandsnaamherkenning is alleen een voorzichtige fallback en verschijnt in het rapport. Bij **Material texture assignments** kun je diffuse-, opacity-, normal- en specularmaps corrigeren. Na een handmatige wijziging moet je opnieuw converteren. Metallic/mask/roughnessgegevens worden indien geïmporteerd behouden in het origineel; de PS1-bake behandelt ze nog niet volledig.

Een model zonder skeleton kan worden bekeken en geometrisch voorbereid. De ruimtelijke regiotoewijzing is dan een aanname: er wordt geen spelcompatibel skeleton verzonnen. Namen met twee dezelfde semantische botten worden als ambigu gerapporteerd. Volledig generieke bone-namen worden nog niet anatomisch uit de topologie opgelost. De desktoproute bewaart extra influence-sets; 12 invloeden per vertex zijn inhoudelijk getest voor FBX en GLB. Alle sets worden samen genormaliseerd. Onvolledige sets, ongeldige gewichten en ontbrekende botindices worden geweigerd. GPU-textuurlimieten blijven van toepassing.

## Vergelijken en converteren

Sleep in een view om te draaien; scroll om te zoomen. Beide views gebruiken dezelfde camera en dezelfde normalisatie op basis van de bron-bounds. **Reset camera**, **Skeleton** en **Wireframe** ondersteunen inspectie. Een hoofdprioriteit verhoogt het detailbudget voor het hoofd; het garandeert geen gezichtsherkenning. De geometriefout en beschermde randen kunnen verhinderen dat het totale budget exact wordt bereikt.

De atlas heeft 16 kleuren per materiaaltile, alpha-cutouts en gutters. Maximaal 14 materialen passen in de voorlopige Nina-profielallocatie. Een UV-chart binnen één verschoven gehele UV-tegel wordt bij de bake herbaseerd, zonder de bron-UV's te wijzigen. Onopgeloste charts over meerdere tegels worden geweigerd; de reductie met bronmaterialen blijft dan zichtbaar. Een mislukte bake is een waarschuwing, geen geslaagde texture-export. Bij meer materialen is samenvoegen/per-triangle herbakken nog nodig.

**Run pose diagnostics** past tijdelijk drie bronrig-rotaties toe en rapporteert eindige sampleposities en extreme edge-stretch. Dit is geen Tekken-animatiecompatibiliteitstest. Bij een geïmporteerde animation clip kan **Play source clip** beide modellen met die bronanimatie afspelen. Dit blijft bronrig-animatie. De native donorroute ondersteunt nu retargeting en experimentele framefitting; werkelijke donoranimaties en runtimecompatibiliteit zijn nog niet geverifieerd.

## Export en donor

**Capture comparison** maakt front-/zij-/achterbeelden vanuit gelijke camera's. **Export preparation package** maakt een ZIP-container met extensie `.t3prep`. Deze bevat aanvullend GLB, eventueel atlas/TIM-assets, screenshots en een technisch rapport. Er zitten geen originele donorbestanden in. Dit pakket kan niet in Expanded worden geïnstalleerd.

Voor donorinspectie selecteer je de gewenste Nina-costume en laad je de ongewijzigde model- en ARC-bestanden samen. De tool controleert structuur, niet de echte donor-identiteit. Zie FORMAT_RESEARCH.md voor exacte benodigde USA-bestanden. Kandidaat- en BNS-kopie-export wijzigen de originele installatie niet; alleen expliciet bevestigd backupherstel kan bestaande doelbestanden vervangen. Backup/herstel is in 0.2.0 aan de desktop-UI gekoppeld; de native route blijft experimenteel.

## Problemen

- Ontbrekende textures: selecteer alle externe images, controleer oorspronkelijke bestandsnamen en corrigeer materiaaltoewijzingen.
- Ambigue namen: twee assets met dezelfde basename kunnen niet automatisch worden onderscheiden; de import wordt geweigerd.
- Niet behaalde polygonlimiet: verhoog fouttolerantie of pas de brongeometrie aan; het rapport geeft de werkelijke aantallen.
- Game-export geblokkeerd: vereist nog implementatie en verificatie van donorbind/runtime-integratie; een donorbestand laden alleen lost dat niet op.
- Windows-startfout: Windows is in deze Linux-sessie niet getest. Bewaar de foutmelding en de gebruikte Windows-versie voor diagnose.


## Native donorroute (0.2.0)

De app kan nu naast het voorbereidingspakket ook echte native kandidaatbestanden genereren. Laad de originele donor-3DMK/ARC of laat de app Nina's records uit een originele USA-executable en losse BNS extraheren. Gebruik een SHA-gebonden bindprofiel of de experimentele schatting. Kies **Rebuild on donor topology**, controleer de als donor-bind gelabelde vergelijking en het rapport, en exporteer de native kandidaat. De normale driehoeks-/hoofdprioriteitsregelaars horen bij vrije reductie; donor-reconstructie gebruikt de bestaande topologie en gemeten capaciteit van de donor.

De optionele detailbake verwerkt normal-/metallic-/roughness-/specular-/AO-maps met een vaste lichtinstelling. Shared/mirrored UV-conflicten worden geweigerd; ze worden niet met een willekeurige texture overschreven. Zie NATIVE_PIPELINE.md voor alle beperkingen. De native preview toont echte palette-texturepixels, maar simuleert niet alle PS1-rendering.

**Back up loaded game files** maakt een executable/BNS-backup met hashes. **Restore game backup** controleert die, laat je een doelmap kiezen, vraagt expliciet om herstelbevestiging en maakt een terugzetbare backup van al bestaande doelbestanden. Dit is de enige UI-handeling die bestaande gamebestanden bewust kan vervangen. Het exporteren van een BNS-kopie houdt de oorspronkelijke invoer intact en is geen ISO- of Expanded-installatie.

## Bronmapping aanpassen (0.3.0)

Open **Skeleton & motion → Edit source bone mapping** wanneer anatomische namen ontbreken of de automatische mapping ambigu is. Kies per rol de juiste bronbone. Elke bone mag maximaal één rol hebben; extra twist-/vinger-/haarbotten hoeven niet afzonderlijk toegewezen te worden en gebruiken bij donor-retargeting hun dichtstbijzijnde toegewezen voorouder. Ontbrekende rollen staan in het technisch rapport. Niet-toegewezen invloeden zonder zo'n voorouder blokkeren retargeting.

**Apply mapping** past de rollen toe op zowel anatomische reductie als de native donorroute en verwijdert verouderde conversieresultaten. **Save source mapping** bewaart een JSON met botnamen, parentindices, lokale bindtransformaties en rolindices. **Load source mapping** accepteert dat profiel alleen voor dezelfde botstructuur en bind-pose. **Reset to name detection** verwijdert de handmatige mapping. Dit bronprofiel is een ander bestand dan het SHA-gebonden donor-bindprofiel.

Na native reconstructie kun je **Native candidate diagnostic pose** instellen op bind, guard, reach of crouch. Alleen de rechterpreview beweegt; links blijft de bron in donor-bind staan. De geëxporteerde native bindgeometrie verandert niet. De preview gebruikt een anatomische parentstructuur en de ingevoerde donorassen. In het rapport staan verplaatsing, uitzonderlijke randrek en maximale naadopening. Een grote naadopening of vervorming vraagt onderzoek van de bindframes/topologie. Een eindige uitkomst bewijst geen correcte Tekken-animaties; originele gamebewegingen worden hier niet afgespeeld.


## Expanded-containerexport (0.4.0)

Na native reconstructie schrijft **Export Expanded container · loader required** een ZIP met `model.bin` in T3CM v2/T3TX-formaat, manifest en validatierapport. De container bevat de originele donorheader, nieuwe 3DMK, complete relocatielijst, textureband en CLUT-runs. De route ondersteunt 4-bit en 8-bit tiles, inclusief Nina's 256-kleuren-gezichtspalette. Ontbrekende palettes, UV's buiten de geëxporteerde tiles en overschrijding van de ondersteunde eerste texturepagina blokkeren deze export.

Dit is geen zelfstandig installeerbaar officieel Expanded-modpakket. Een compatibele custom-model-loader moet apart aanwezig en getest zijn; de gedocumenteerde referentie is Expanded 1.1.3 met de Character Builder T3CB-PATCH-14-loader. Deze applicatie levert die loader niet mee en heeft hem niet uitgevoerd. Gebruik de payload alleen volgens de regels van een daadwerkelijk compatibele loader. De gewone native 3DMK/ARC-export en de BNS-kopieroute blijven afzonderlijk beschikbaar.

## Lokale donor uit ISO/BIN (0.5.0)

Kies **Extract Nina from ISO / BIN** en open je eigen USA-discimage. Ondersteund: ISO met 2048-byte sectoren, raw BIN met 2352-byte Mode 1/Mode 2 Form 1-sectoren, eventueel met opgeslagen 150-sector lead-in. De app zoekt SLUS_004.02 en TEKKEN3.BNS in ISO9660, controleert daarna de originele USA-executablehash en recordcapaciteiten. Andere regio's, gepatchte executables en dubbelzinnige bestandsnamen worden geweigerd. De image wordt alleen gelezen; er wordt geen ISO geschreven. EDC/ECC-controle of reparatie is niet inbegrepen.

Na succesvolle extractie bewaart **Save extracted donor package** een ZIP met executable, Nina-modelrecord 111, texture-ARC-record 113 en extractiemanifest/hashes. Je kunt deze ZIP later openen via de donorimport. De app controleert slot, executablehash, capaciteit, manifesthashes en de werkelijke model-/texture-inhoud. Dit bewijst geen authenticiteit van de oorspronkelijke BNS of speelbaarheid. Deel deze originele gamebestanden niet met de broncode. Losse BNS + executable blijven ondersteund.

Bij ontbrekende bronmateriaalrelaties rapporteert de app familieherkenning en alpha-aannames. Controleer vooral haar, wimpers en ogen. De materiaaleditor kan tint, vertexkleuren, opacity, alpha-cutoff en de normal-Y-richting aanpassen. Wijzigingen maken de oude conversie ongeldig; converteer daarna opnieuw. Zie NIKKI_TEST.md voor de concrete aannames bij het aangeleverde model.
