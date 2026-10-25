# 0.7.0-dev.8 — brongeprojecteerde handen en huidbaking

**Artistieke beoordeling blijft open. Geen echte Nina/Expanded-gameplay geverifieerd.** Main wordt niet gemerged. Dev.7 is behouden; geen nieuw gameonderzoek of algemene UI-functies toegevoegd.

## Wat werkelijk is veranderd

De handpipeline verbetert eerst lokale diagonalen met behoud van vertices, UV-winding, oppervlakoriëntatie en trianglecount. Vervolgens verdeelt ze binnenste samples iets gelijkmatiger en projecteert terug op de echte bronhand. Polsranden, UV-/gewichtsnaden en te grote vervormingsvoorstellen blijven vast. UV's en alle categorische skinweight-kanalen worden via brontriangle-correspondentie overgedragen; geen bone-ID-interpolatie.

Bij Nikki zijn 22 rechter- en 24 linkerhanddiagonalen gewijzigd. Na lokale kwaliteitscontroles worden 30 rechter- en 32 linkerhandvertices verplaatst, maximaal circa 0,1413 broncoördinaateenheden (0,6% van de hand-bounding-boxdiagonaal), **zonder extra triangles**. Gemiddelde driehoekkwaliteit stijgt rechts 0,6272→0,6304 en links 0,6306→0,6350; de slechtste driehoekkwaliteit verslechtert niet. Dit zijn kleine geometrische verbeteringen, geen bewijs van een artistiek voltooide hand. Fijne contouren en nagels blijven hoekig.

De normale atlaspreview gebruikt een MeshBasicMaterial. Dynamische vertexnormals veranderen die gebakken kleuren dus niet. De huidbake gebruikt nu de uit bron-UV's gemeten tangentframes om normal-mapdetails in de richting van het echte bronoppervlak te belichten. De tangentmap beïnvloedt nu een begrensde lokale lichtverhouding rond de behouden bronbelichting; overlappende of onbetrouwbare UV-frames gebruiken de oude veilige bemonstering. Een eerste absolute tangent-bake lichtte de huid te veel op en is verworpen. Originele kleurinformatie blijft behouden; geen ruis, nieuwe glans of verzonnen huiddetails.

Handtiles worden **128×64 in plaats van 64×64** binnen dezelfde 512×512-atlas. Andere tiles behouden hun dimensies. Face/eyes/lashes behouden exact hun pixelindex- en palettehashes ten opzichte van dev.7, naast het beschermde geometrische kerngezicht. Een eerdere vierkante 128×128-huidvariant beschadigde de verdeling voor wimpers, iris en laarzen en is **verworpen**. De gallery labelt deze tussenmetingen expliciet als verworpen oorzaakanalyse. `ablation-provenance.json` bevestigt identieke geometrie en skinning voor de drie normal-/texturebake-controles; veranderingen daar komen niet van meer geometrie.

## Integriteit: geen statistische cosmetica

Artistiek Nikki-model: **7503 triangles**, gelijk aan dev.7. Onverklaarde randen **0→0**; windingconflicten **0→0**; verklaarde open randen **825→825**. Geen open kleding dichtgemaakt.

| Open randen, bestaande bewijsindeling | Aantal |
|---|---:|
| Haar/alpha-gerelateerd | 621 |
| Gemeten aperturen of behouden bronopeningen | 80 |
| Volledig bewezen behouden bron-meshgrenzen | 124 |

Per regio: haarondersteuning 94, hair cards 443, torso 16, bekken/kleding 32, hoofdonderdelen 240. Deze structuurclassificatie is geen automatische artistieke goedkeuring van iedere haarvolume-opening. De relevante overlays zijn opgenomen.

De **38 nonmanifold positiecontacten blijven 38**. De nieuwe audit onderscheidt **33 contacten met samenvallende vlakken** en **5 vertakkingen binnen een surface**. Verdeling: hair cards 17, torso 11, bekken/kleding 7, rechterschouder 1, rechterhand 2. Samenvallende positie betekent niet identiek materiaal, UV of skinning. De strenge verwijderingscontrole vindt **0 veilig exact equivalente duplicaten**; er wordt niets weggefilterd voor een mooier getal.

Alle 38 contacten worden ook met echte skinned endpointposities bemonsterd. Eén bekkencontact wijkt in guard/reach/crouch/walk/kick boven de zeer strenge tolerantie uiteen, maximaal circa 0,01877 broncoördinaateenheden (circa 0,0092% van de modeldiagonaal). Andere samples blijven binnen tolerantie. Dit is gerapporteerd, niet gerepareerd of als bewezen legitiem weggeschreven. Geen volledige collision- of self-intersectioncertificering.

De 556 gemeten anatomische aansluitingen blijven tijdens de 13 diagnostische poses binnen tolerantie. Deze poses zijn geen Tekken-animaties. Schouder-/okselkleding vertoont bij extreme poses nog vervorming, ook in de bron. Dev.8 claimt geen herstel daarvan en verandert betrouwbare bronweights niet willekeurig. Kleding-skinning en mogelijke ontbrekende correctieve brondata blijven werkpunten.

## Werkelijke polygonverdeling

| Artistieke regio | Triangles |
|---|---:|
| Gezicht 621 + nek 275 + schedel 120 + oog/mondonderdelen 586 | 1602 |
| Haarvolume 480 + cards 1905 | 2385 |
| Torso | 507 |
| Schouders en armen | 889 |
| Handen/polsen/vingers | 1022 |
| Kleding/bekken | 362 |
| Benen 256 + laarzen/voeten 480 | 736 |
| **Totaal** | **7503** |

Werkelijke kandidaten bij doelen 900/1200/1500/2000: **2482 / 2484 / 2510 / 2551** triangles. Dit is iets meer dan dev.7 (2476 / 2480 / 2504 / 2545), geen nieuwe reductiewinst.

Geometrie blijft beschermd waar oppervlakte-, materiaal-, UV- en skinningfout verdere reductie tegenhouden. Experimentele doelen en werkelijke aantallen staan afzonderlijk in de gallery en technical-summary.json. De doelen zijn geen donorcapaciteit. Geen nieuwe universele 900-triangle- of 31.000-packetbytegrens ingevoerd.

De gallery vergelijkt dev.6, dev.7 en dev.8 ook bij ongeveer 4047/4092/4092 werkelijke triangles. Hiermee wordt extra geometrie als verklaring voor verbetering gecontroleerd. Handposities en texturekwaliteit worden naast bron- en wireframebeelden getoond. Dev.8 claimt geen verdere grote aantalsreductie tegenover dev.7.

## Tests en prestaties

**182 tests PASS**, nul mislukt/overgeslagen. Behoud van alle 172 eerdere tests; nieuwe checks omvatten handtopologie, UV-folding, oppervlakteprojectie met vaste grenzen, lokale tangent-normalbake, bewegende positiecontacten, veilige duplicaatcriteria en atlasruimte zonder gezicht-/laarsresolutieregressie.

Nikki, Cesium Man en beide synthetische kapsels opnieuw getest en gerenderd. De laatste drie artistieke modellen tellen 1122, 3496 en 2976 triangles; hun veilige fallbacks blijven behouden. Ook herhaald: import/conversie, texturebaking, skinning met extra kanalen, native-fixture-export, mapping, desktop-IPC, projectopslag en Linux source-Electron-smoke. Privé-Nikki-sourceproject: PASS met 24 byte-identieke assets, ZIP 49.789.433 bytes en verwijderde tijdelijke data.

De daadwerkelijke Windows-resultaten worden uitsluitend uit de releaseworkflow overgenomen: `windows-unit.xml`, `windows-portable.json`, `windows-nikki-project.json`, `WINDOWS-STATUS.md`. Baseline dev.7: save 5188 ms, reopen 6912 ms, opgetelde app-working-sets 3.2632 GiB, private committed 3.0806 GiB, afzonderlijke harness-RSS 629.6 MiB. Dezelfde 250ms-counterbemonstering; geen unieke resident-RAMclaim of statistische winst uit één run. De extra bron-tangentvelden kosten expliciet geheugen; geen vooraf geclaimde geheugenverbetering.

## Reproduceren en privacy

`npm ci`, `npm test`, `npm run build`. Met ongewijzigde dev.6/dev.7-worktrees, `DEV6_WORKTREE`, `DEV7_WORKTREE` en privé `NIKKI_DIR`: `node scripts/dev8-review.mjs`. De drie verworpen/diagnostische bakecontroles zijn reproduceerbaar via `node scripts/dev8-ablations.mjs` en worden geometrisch getoetst door `node scripts/dev8-ablation-provenance.mjs`.

Het opnieuw aangeleverde DOCX is byte-identiek aan de volledig gelezen dev.7-bron (SHA-256 368637bbb0f962e050b1395013a1fbb26a1916f000cc201e64cb73c4b82b59ae). De bestaande claimsaudit blijft gelden; aanbevelingen daarin zijn geen nieuwe instructies of bewezen native beperkingen.

De Windows-workflow gebruikt het bestaande NIKKI_DOWNLOAD_URL-secret. Geen originele modellen, textures, download-URL, gamebestanden, source vertexarrays of privé-project-ZIP's in artifacts of releases. Bronbestanden worden niet gecachet. Screenshots zijn afgeleide visuele bewijsbestanden.

**Nog te beoordelen:** de bescheiden handverfijning, huidkleurovergangen, fijne hoekigheid, kleding bij extreme poses en het resterende bewegende bekkencontact. Geen artistieke voltooiing of gameplaycompatibiliteit geclaimd.
