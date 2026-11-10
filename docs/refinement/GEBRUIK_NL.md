# Model verfijnen — fase A

Dit is een experimentele uitbreiding van de reguliere converter. Bestaande import, conversie, projecten en exports blijven beschikbaar. Geen TTT2; geen bewezen Tekken 3-speelbaarheid.

1. Importeer je eigen model en converteer het zoals gebruikelijk.
2. Klik boven de preview op **Model verfijnen**. Klik op een zichtbaar oppervlak in het PS1-resultaat. De turquoise overlay toont de selectie. Slepen blijft de camera bedienen.
3. Pas het gebied aan met **Vergroten**, **Verkleinen**, **Verbonden oppervlak** of **Materiaalgebied**. Materiaal- en UV-grenzen beperken verbonden selectie. **Selectie wissen** begint opnieuw. Er worden geen onbewezen lichaamsdeelnamen getoond.
4. Kies **Detailbehoud** en **Bescherm details in selectie**. Bekijk het voorstel en kies toepassen of annuleren. Dit legt constraints vast; het maakt geen nieuwe geometrie. De automatische voorbereiding blijft als ongewijzigde basis bewaard.
5. Kies een experimenteel detaildoel links en **Voorbeeld optimaliseren met detailkeuzes**. Het werkelijk zichtbare resultaat en de export gebruiken deze optimalisatie. Hoge bescherming kan het gevraagde aantal driehoeken overschrijden. Bronbehoud en bestaande kwaliteitslimieten blijven gelden.
6. Gebruik **Ongedaan maken**, **Opnieuw**, de selectievakjes bij de detailkeuzes of **Alle detailkeuzes resetten**. Ook na optimalisatie wordt vanuit dezelfde artistieke basis gerekend. Een gewijzigd voorstel wordt pas definitief na succesvolle berekening. Ctrl+Z/Ctrl+Shift+Z werken als het verfijnpaneel focus heeft; Escape wist het voorstel en de selectie.
7. Sla het project op. Een optionele projectuitbreiding bewaart de artistieke basis, selectie, detailkeuzes, geschiedenis en optimalisatiedoel. Na heropenen verschijnt de voorbereiding opnieuw. Oudere projecten blijven leesbaar.
8. Exporteer GLB of het voorbereidingspakket. De echte resultaatgeometrie/materialen worden geëxporteerd, niet de selectie-overlay. Geometrie en textures worden bij de GLB-export opnieuw ingelezen.

**Bekijken** verlaat de editor. Technische instellingen blijven via de bestaande modus beschikbaar. Voor een volledige nieuwe automatische conversie moet je de lokale detailkeuzes eerst resetten of in een project bewaren; ze worden niet stilzwijgend overschreven.

## Wat deze fase nog niet doet

Geen penseel, sculpting, botbewerking, vormherstel of lokale textureherberekening. Dat zijn latere fasen. De eerste bronkoppeling is een conservatieve steekproef van één geselecteerde driehoek, met oorspronkelijke mesh/materiaal, richting, afstand en ambiguïteitscontrole. Onbekende of overlappende bronnen blijven onzeker. Een gevonden oppervlak is geen bewijs van veilige reparatie van het hele gebied.

Na een topologiewijziging kan de actieve selectie worden gewist; detailkeuzes blijven via de artistieke basis behouden. Dubbele, niet eenduidig herkenbare driehoeken worden geweigerd. Animatie-/morphwijzigingen kunnen de correspondentie verouderen; deze fase voert daarop geen automatische reparatie uit. Op zware modellen kunnen optimalisatie en baking tijdelijk de renderer bezighouden. Projecten blijven onder de bestaande 512 MiB-limiet.

Privémodellen blijven privé. Upload geen modellen, textures, projectbestanden of commerciële screenshots. Het publieke demonstratierapport gebruikt uitsluitend eigen synthetische geometrie.
