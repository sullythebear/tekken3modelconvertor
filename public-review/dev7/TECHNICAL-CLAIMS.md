# Technische toets van het aangeleverde Tekken 3-overzicht — dev.7

Het volledige DOCX `Tekken 3 — Formaten & Conversieplan Volledig Overzicht.docx` is gelezen, inclusief tabellen en beide delen. Het document is een onderzoeksbron; zijn werkopdrachten zijn geen uitvoerautorisatie en zijn ontwerpaanbevelingen geen bewezen formaatregels. Het originele DOCX en gamebestanden worden niet gepubliceerd.

## Bewijsniveau

De eigen codecs en zelfgemaakte fixtures bevestigen intern reproduceerbaar gedrag, geen retail-gamecompatibiliteit. Onafhankelijke bronvergelijking gebruikt de reeds geraadpleegde Character Builder-documentatie op [f04385f](https://github.com/sullythebear/tekken3characterbuilder/tree/f04385f490a3518ab91bfaf3531f0f1080650074), uitsluitend als referentie, en Expanded op [fc835dc9](https://github.com/omarma/tekken3-expanded/tree/fc835dc9bd30cc6dd207067b1e269f47f70f6170). Geen oorspronkelijke Nina-data of draaiende Expanded-installatie beschikbaar. Zie FORMAT_RESEARCH.md voor provenance en versieafhankelijkheden.

## Bevestigd — structuur en expliciete voorwaarden

| Claim | Controle en toepassing |
|---|---|
| 3DMK: 27 rijen × 14 LE i32, +24; magic +8; header 1536 op +16 | `native.js:read3DMK`, onafhankelijke formaatbeschrijving en corrupte-header-fixtures. Magic staat **niet op byte nul**. Deze specifieke familie wordt ondersteund; geen universele garantie voor iedere asset. |
| Bone-local s16-vertices, normalschaal 4096; joint-offsets ouderframe | `donor.js`, `bind.js`, `native-rebuild.js`, template/skinning-tests. Wereld- of FBX-skinweights zijn geen direct native coördinatenstelsel. Werkelijke Nina-as/roll/bindkalibratie ontbreekt. |
| UV-componenten 8-bit, slot-indexruimte 128 | Eigen parser/writer en referentie-bitvelden. UV-/material-blockreferenties worden gevalideerd. Dit zegt niets over verplichte één-chart-per-part-indeling. |
| Vier primitivefamilies kosten 32/40/40/52 packetbytes | Referentie-packetfamilies, `donor.js:polygonList`, `native.js:validateNativeGeometry`; quads tellen twee geometrische triangles maar één packet. Kosten zijn niet gelijk aan bytes in het 3DMK-bestand. |
| ARC count + offset/size-paar; niet-texturemembers behouden | `ps1.js`, `donor.js`, roundtrip/overlap-tests. Geen reden om modelrecord 111 in texture-ARC 113 te stoppen. |
| Indexed TIM 4/8-bit, RGB555 CLUT | `ps1.js` encode/decode + inhoudsroundtrips, donor-materialtexels. PS1 kent ook directe kleurformaten; onze writer ondersteunt niet automatisch elk TIM-type. |
| T3CM/T3TX is custom-loadercontainer | `exporter.js`, relocatie-/truncatietests en referentie-writerstructuur. Geen standaard PS1-formaat en geen bewijs dat vanilla Expanded het importeert. |

## Gedeeltelijk bevestigd — revisie- of implementatiegebonden

| Claim | Beperking |
|---|---|
| USA executable 303 records op 0x14C00, Nina m=10 records 111/113 | Referentiebron en eigen hash-gebonden USA-profiel `bns.js`. Synthetische disc-fixtures bevestigen parser/veilige kopie. Geen retail-executable hier uitgevoerd; niet toepassen op iedere regio/revisie. De volledige 52/48/75/122/6 scannerverdeling is niet opnieuw gemeten. |
| Rijwoorden 0/1/2, 3–5, 7–9, 10, 12, 13 | Bronvergelijking ondersteunt veldrollen. Een rij is een runtime-deel/cache-/variantstructuur, niet één universeel anatomisch gewricht. Accessoirerotaties en echte bindframes vereisen lokale data. |
| Hand-pose-pointertabellen | Pointer-only structuur en volledige relocaties worden gecontroleerd; entries zijn geen telling gevolgd door pointers. Dev.7 weigert nu ook ongealigneerde targets. Geen garantie dat alle posevarianten van Nina hier semantisch/visueel getest zijn. Deze tabellen optimaliseren niet vanzelf moderne vingers. |
| 64×256 halfwoorden textureband, 14 CLUTs op rij 1 | Ondersteunde kandidaat-/loader-layout, geen universele VRAM- of karakterregel. 16 kleuren per materiaal-tile is onze bakekeuze; oorspronkelijke modellen kunnen ook 256-kleuren huidpalettes gebruiken. |
| UV verwijst naar VRAM | Lokale 8-bit UV-coördinaten worden met texturepage/material bits en CLUT-adres geïnterpreteerd; geen absolute VRAM-coördinaat op zichzelf. |
| Flat en Gouraud normals, pixelated PS1-weergave | Geen standaard bilineaire hardwarefiltering. Brontexturen bilineair **bemonsteren tijdens offline baking** is iets anders dan de runtimefilter. Alle surfaces geforceerd flat maken is geen authentieke universele regel. |
| Expanded 1.1.3 + T3CB-PATCH-14 | Gedocumenteerde referentieroute; hier geen geïnstalleerde, geteste loader of gameplay. |

## Onbewezen, onjuist of verouderd — niet als harde eis overgenomen

- **Geen vertex-sharing / alleen onafhankelijke platte triangles:** onjuist als algemene formaatclaim. De bestaande donor-parser verwerkt eigen vertices, borrow/cache/half-seams en vier polygonfamilies. De eenvoudige writer is beperkter dan het formaat. Joint-seams mogen dus niet opzettelijk worden opengesneden; dev.7 herstelt echte aansluitingen.
- **Precies donortrianglecount per part, niet meer en niet minder:** niet aangetoond. Onze templateprojectie behoudt topologie als veilige strategie, niet omdat iedere afwijking verboden zou zijn. Native herbouw kan niet-planaire quads splitsen en behoudt expliciet varianten/relocaties binnen gemeten byte-/referentiegrenzen.
- **900 triangles of 31.000 bytes als harde gamecapaciteit:** niet aangetoond. Referentiedocument `t3-model-style.md` noemt circa 1000–1150 triangles, meerdere families, stock packetgebruik tot 32.580 en een eigen conservatieve 31.000-grens na een gerapporteerde crash bij 33.596. Dit is extern testverslag, niet door ons gereproduceerd bewijs of universele grens. Bestaande 31.000-guards blijven een **voorlopige veiligheidsregel**; dev.7 labelt dit expliciet in native-candidate manifests (`runtimeCapacityVerified:false`). Geen 900-grens ingevoerd.
- **Één UV-eiland per lichaamsdeel, 16 kleuren per part, 3–4 huidtonen, geen gradients:** artistieke aanbevelingen, geen aangetoonde formaatvereisten. Niet opgelegd; echte bronhuidvariatie blijft behouden.
- **Transparantie is de STP-bit:** onvolledig/onjuiste verklaring. Kleurwoord 0 is transparant; 0x8000 behoudt zwart als niet-nul texel. Bit15 heeft semi-transparencybetekenis afhankelijk van primitive/render-mode. Onze alpha-cutout-preview is geen volledige PS1-blendsemantiek.
- **Elke character-ARC bevat model + TIM + mogelijk VAB:** niet bewezen voor deze records. Model, audio en texture-ARC worden afzonderlijk door het executable-adresboek gevonden. Behoud onbekende members, verzin geen bundeling.
- **Seams bewust zichtbaar, altijd harde snijlijnen; accessoires weggooien; altijd handmatig retopo/schilderen:** ontwerpmeningen, strijdig met automatische conversie en niet uit native structuur afleidbaar. Niet geïmplementeerd als verplichting.
- **Sharing niet gedecodeerd / BNS-kopie niet geïmplementeerd:** verouderd voor huidige converter. Eigen fixtures testen sharing, varianten, relocaties en vaste-size BNS-kopie zonder originele bron te wijzigen. Dat bewijst geen retail-injectie, ISO/ECC, LBA-relocatie of gameplay. Dev.7 voert geen BNS-injectie uit.
- **Donorlichaamstypen en gemiddelde aantallen:** geen nieuw gemeten authentieke dataset; niet gekalibreerd of als anatomische waarheid opgeslagen. Geen nieuw gameonderzoek gestart.

## Gerichte consequenties voor dev.7

Meshreparaties vinden plaats in het artistieke bron-/skeletstelsel. Alleen aangetoonde coincidente anatomische grenzen worden gekoppeld; UV's en skinweights blijven per surface behouden. Het zijn geen fictieve native joint-offsetpatches. Optimalisatie deelt doorlopende surfaces waar materiaal-, skinning- en geometrische foutgrenzen dit toelaten. Handen krijgen contourbescherming, geen onvoorwaardelijk behoud van de volledige high-polybron.

Nieuwe native regressies testen misaligned handtable-targets en expliciete voorlopige packetbudgetprovenance. Bestaande TIM/CLUT/ARC-, primitive-, normal-, slot-, relocation-, mapping- en exportfixtures blijven behouden. Geen BNS-/originele gamegegevens opgenomen of gewijzigd. Werkelijke donorcapaciteit en runtimegedrag blijven afzonderlijk te meten met rechtmatig lokaal aangeleverde bestanden.
