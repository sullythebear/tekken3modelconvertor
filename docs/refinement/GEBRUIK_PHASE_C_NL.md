# Model verfijnen — handmatige correcties (C1)

Ontwikkelversie 0.8.0-beta.2-refinement.3. Bewaar een eigen projectkopie. Dit is geen gegarandeerd speelbaar Tekken 3-model.

1. Importeer en converteer het model. Kies **Model verfijnen**.
2. Kies **Selecteren** om te klikken, of **Penseel** om met de linkermuisknop te schilderen. Kies Toevoegen/Verwijderen en de penseelgrootte. Het lichte kader geeft de penseelgrootte aan; de groenblauwe vlakken zijn de werkelijke selectie. Alleen verbonden, vooraan zichtbare driehoeken worden geselecteerd. Dunne lagen, materiaal- en UV-grenzen worden niet overgestoken. Een driehoek wordt als geheel geselecteerd; dit is geen pixelmasker.
3. Houd **Alt** ingedrukt om met links de camera te draaien zonder te schilderen. Rechts slepen blijft beschikbaar. Laat de muisknop los vóór je van gereedschap wisselt. Vergroot/verklein de selectie of gebruik Materiaalgebied/Verbonden oppervlak waar passend.
4. Kies bij **Vorm aanpassen** Dikker/dunner, Vergroten/verkleinen of Verplaatsen. Kies een richting: X horizontaal, Y verticaal, Z diepte, in modelruimte. De gekleurde assen in het vormvoorbeeld geven deze richtingen aan. Verplaatsen vereist een expliciete as. Automatische dikterichting volgt de langste richting van de selectie; dit is geen anatomische herkenning. Kies voor een arm zo mogelijk de volledige gewenste omtrek, niet één los vlak.
5. Kies een scherpe, normale of zachte overgang. **Selectiegrens verzachten** kiest de zachte vormovergang; het voegt geen ongemerkt geselecteerde oppervlakken toe. De geometrische rand blijft altijd vast om gaten/naden te vermijden.
6. Beweeg **Vormsterkte** (−30 tot +30%). Het voorbeeld verandert zonder de automatische conversie opnieuw uit te voeren. Dikte en schaal zijn relatief aan het lokale centrum. Verplaatsing is een percentage van de geselecteerde ruimtelijke omvang, niet centimeters. De preview wordt steeds uit het ongewijzigde resultaat opgebouwd; sliderbewegingen stapelen niet op.
7. Vergelijk **Voor/Na**. Kies **Correctie toepassen** voor volledige validatie, of **Annuleren/Vormsterkte resetten**. Het voorstel kan bij toepassing alsnog worden geweigerd als het nieuwe doorsnijdingen veroorzaakt. Kies dan een kleinere sterkte, ruimere selectie of zachtere overgang. Een weigering bewaart het vorige model.
8. Undo/redo, geschiedenischeckboxen en Alle lokale correcties resetten blijven beschikbaar. De bestaande SOURCE-vorm- en textuurreparaties en detailbescherming blijven werken. Een correctie kan afhankelijk zijn van eerdere geometrie; schakel afhankelijke correcties eerst uit. Ze worden nooit stilzwijgend overschreven.
9. Sla het project op. Na volledig afsluiten en heropenen wordt dezelfde geschiedenis opnieuw opgebouwd. GLB bevat de werkelijk gewijzigde geometrie, UV's, materialen en gewichten; selectie/penseelkader/assen worden niet geëxporteerd.

## Grenzen

- De editor werkt op bestaande topologie en maakt geen ontbrekende vingers of vlakken bij. Te kleine selecties zonder veilige binnenvertices worden geweigerd. Vereenvoudigde driehoeken zonder exacte herkomst vereisen **Artistiek model bekijken**.
- UV-, materiaal-, open en niet-manifold grenzen blijven vast. Een volledig geselecteerd gesloten oppervlak kan als geheel schalen/verplaatsen. Nabije losse oppervlakken bewegen niet mee.
- Rigbewerkingen gebruiken de werkelijke inverse skintransformatie; morphs, singulariteiten en instanced/batched meshes worden niet gegokt. Dit garandeert geen goede vervorming in iedere animatiepose.
- De botsingscontrole detecteert nieuwe segmentdoorsnijdingen, geen volledige coplanaire/animatiebotsingsgarantie. Kleine schuine/raakcontacten en verborgen kwaliteitsproblemen vereisen visuele controle.
- Per penseeldab maximaal 4.000 zichtbare driehoeken; grote gebieden schilder je in meerdere streken. Vormvoorstellen maximaal 12.000 geselecteerde driehoeken. Zware checks kunnen de renderer tijdelijk bezighouden; annulering werkt op controlepunten.
- C1 bevat **geen Gladmaken of Trekken/duwen**. Die C2-functies worden pas na afzonderlijke ontwikkeling en validatie beschikbaar.
- Geen reguliere beta.2- of gameplaygoedkeuring. Commerciële modellen en screenshots blijven privé.

SOURCE-herstel en lokale texturen: [handleiding fase B](GEBRUIK_PHASE_B_NL.md).
