# Eenvoudig bewerken — 3D-retouche

Ontwikkelversie 0.8.0-beta.2-refinement.4. De automatische converter blijft het begin; deze optionele editor past daarna lokale gebieden aan. Bewaar een eigen projectkopie.

## Snel beginnen

1. Importeer je model en kies Converteer naar PS1.
2. Open Model verfijnen. Eenvoudig bewerken is standaard actief.
3. Schilder met links op het model. De zachte groenblauwe verf toont je masker. Houd Alt ingedrukt en sleep om het model te draaien; rechts slepen en zoomen blijven beschikbaar.
4. Gum verwijdert verf. Pas Penseelgrootte en Zachte rand aan of kies Masker wissen. Ongedaan maken/Opnieuw herstellen je recente verfstreken.
5. Kies Herstel bekijken voor een veilige bronanalyse, of Vorm aanpassen om direct te vormen. Opslaan en exporteren gebruiken echte correcties; SOURCE blijft intact.

De korte introductie kun je met Begrepen wegklikken; ze verschijnt daarna niet opnieuw op iedere start.

## Herstelpenseel

Schilder het probleemgebied en kies Herstellen of Herstel bekijken. De app onderzoekt de betrouwbare oorspronkelijke oppervlakken en beschikbare vorm- en texturecorrecties.

- Eén bruikbaar herstel: je krijgt een voorstel met Toepassen en Annuleren.
- Meerdere mogelijkheden: kies Vorm herstellen, Texture herstellen of Beide herstellen.
- Onvoldoende betrouwbare informatie: er wordt niets gewijzigd. Vorm aanpassen blijft als handmatig alternatief beschikbaar.

Een verschil met SOURCE kan bij de gekozen PS1-stijl horen. De analyse stelt geen artistieke fout met zekerheid vast en bevestigt niets automatisch. Houd Voor / Na ingedrukt om de eerdere PS1-toestand te zien; laat los om terug te keren. SOURCE blijft daarnaast een afzonderlijke previewreferentie.

Texture herstellen gebruikt de oorspronkelijke kleuren. Waar mogelijk blijft het bestaande pixelraster buiten de verf precies behouden in een aparte lokale texture. Als dat niet veilig lukt, wordt het voorstel geweigerd. Ontbrekende lichaamsdelen worden niet bijgetekend.

## Vormpenseel

Kies Vorm aanpassen en bijvoorbeeld Dikker maken, Dunner maken, Gladmaken, Naar buiten duwen of Naar binnen duwen. Vergroten/verkleinen zijn eveneens beschikbaar. Je ziet alleen Penseelgrootte en Sterkte als normale instellingen.

Schilder met links: tijdens het schilderen zie je een tijdelijk vormvoorbeeld. Na loslaten controleert de app de streek en bewaart die als één omkeerbare correctie. Een onveilige streek wordt niet toegepast. Gebruik minder sterkte, een zachtere/ruimere streek of automatisch Herstellen als de app weigert. Escape of een geannuleerde pointerstreek gooit het tijdelijke voorstel weg.

Dikker/dunner werkt in deze eenvoudige modus conservatief naar buiten/binnen langs het lokale oppervlak. Het raadt geen volledige armdoorsnede of anatomie. Gladmaken gebruikt een begrensde lokale stap en beschermt scherpe randen; het maakt geen professionele sculptingomgeving. Meerdere streken kunnen elkaar wel versterken: beoordeel regelmatig Voor / Na en gebruik undo.

Op heel grove modellen kan de verf fijner zijn dan de vorm die bewerkt kan worden. Schilder dan ruimer. Een fijn masker voegt geen nieuw geometrisch detail toe. Aansluitende vlakken kunnen nodig zijn om de bestaande vormpunten zonder scheuren te bewegen; niet-beschilderde vormpunten worden niet willekeurig verplaatst.

## Details beschermen

Schilder belangrijke vormdetails en kies Details beschermen. Bevestig de bescherming met Toepassen. Het beschermt de daadwerkelijk geraakte vormpunten bij latere kandidaatoptimalisatie; het verhoogt niet automatisch de texture-resolutie en verzint geen nieuwe vormpunten.

## Voor / Na en geschiedenis

Houd Voor / Na ingedrukt, ook met spatie/Enter bij toetsenbordfocus. Camera en belichting blijven gelijk. Bij een voorstel zie je de toestand vóór dat voorstel. Na een correctie zie je de laatst bewaarde eerdere toestand; na een koude projectstart zonder die tijdelijke vergelijkingskopie is de oorspronkelijke artistieke PS1-basis de referentie vóór de opgeslagen lokale correcties.

Verf-undo werkt voor de recente maskerstreken in deze sessie. Na een toegepaste correctie gebruik je undo/redo voor de correctiegeschiedenis. Die correcties blijven in het project behouden. De huidige verfselectie wordt ook opgeslagen; de tijdelijke verf-undo-buffer wordt niet als onbeperkte geschiedenis meegeschreven.

## Geavanceerd blijft beschikbaar

Eén knop Geavanceerd opent de bestaande precieze regio-/polygonselectie, materiaal- en verbonden selecties, SOURCE-informatie, detailniveau, lokale texturekwaliteit, asrichtingen, falloff, correctiecheckboxen, reset en technische meldingen. Eenvoudig bewerken brengt je terug. Dezelfde bewerkingskern wordt gebruikt; converterinstellingen worden daarbij niet gereset.

## Opslaan en exporteren

Bewaar het project en open het later opnieuw: de artistieke basis, verfselectie en correcties worden opnieuw opgebouwd. GLB bevat de werkelijk gewijzigde posities, materialen en texturepixels. Het verfkader, maskerbeeld en de assen zijn geen geëxporteerde geometrie. Oude fase-A/B/C1-projecten blijven leesbaar; nieuwe maskers en nieuwe vormgereedschappen vragen deze of een latere appversie.

Native Tekken 3-export blijft experimenteel en is voor lokale reparaties niet automatisch gevalideerd. Er is geen gameplaygoedkeuring.

## Bekende grenzen

- De zachte verf is een begrensd oppervlaktemasker met 16×16 samples per driehoek, geen oneindig precies pixel- of sculptmasker. Alleen vooraan zichtbare samples worden geschilderd. Materiaal-/UV-grenzen en losse oppervlakken worden niet overgestoken.
- Eén masker hoort bij één mesh; wis het voor een ander onderdeel. Maximaal 1.024 driehoeken in een masker. Bewerkingen en totale maskergeschiedenis zijn begrensd om geheugenproblemen te voorkomen.
- Transparante blendmaterialen, onzekere bronlagen, onveilige overlaps, actieve morphs en niet-inverteerbare skinning kunnen een bewerking blokkeren. Geen nieuwe anatomie, gegokte bottransformaties of verborgen bronvervanging.
- Geschilderd textureherstel ondersteunt behoud van het huidige pixelraster, of een uniform huidige kleur. Niet betrouwbaar te behouden herhalende/overlappende atlasgebieden en samengestelde materialen worden geweigerd; Geavanceerd behoudt de eerdere brede textureherstelopties.
- De botsingscontrole is geen volledige garantie voor coplanaire raakcontacten of alle animatieposes. Zware eindvalidatie en SOURCE-textureherstel kunnen langer duren; annuleren werkt op controlepunten. Het snelle vormvoorbeeld ondergaat pas bij loslaten de volledige controle.
- Electron-zoom wordt getest, maar dat certificeert niet ieder fysiek Windows-monitor-/DPI-scenario.
- De voorbeelden gebruiken eigen synthetische modellen. Commerciële modellen en screenshots blijven privé. Geen universele artistieke of gamecompatibiliteitsclaim.
