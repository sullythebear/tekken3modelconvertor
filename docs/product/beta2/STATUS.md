# 0.8.0-beta.2 — Visual Quality & Anatomy Repair

## Status en afbakening

Ontwikkelcheckpoint op `development/080-beta2-visual-quality`, vanaf de werkende beta.1 plus documentatiecheckpoint85da7c5. Geen publieke beta.2-release: commerciële beelden zijn in deze cloudomgeving niet geautoriseerd leesbaar en niet visueel beoordeeld. Bestaande beta.1 en main blijven behouden. Geen TTT2-ontwikkeling.

## Technisch onderbouwde oorzaken en wijzigingen

### Marston: bronvormverlies bij onbekende rig

De oude `vertexRegion` gebruikte bij onbekende botnamen wel posed vertices voor de hoogte, maar sloot skinned meshes uit van de geometrische armfallback. De bestaande veilige herkenning voor rechtopstaande, lateraal gestrekte armen werd alleen voor statische modellen gebruikt. Ook een breed overgeërfde spine/hips-naam kon de lokale extremiteitsanalyse overslaan. In de bekende Marston-metadata waren0anatomische rollen gemapt en0animatieclips aanwezig.

De gerichte correctie gebruikt dezelfde zichtbare coördinaten en dezelfde begrensde ruimtelijke armregel wanneer de rig geen betrouwbare lokale rol levert. Directe betrouwbare semantische rollen blijven voorrang houden. Als die arm-/handbotkoppeling ontbreekt, blijft de oorspronkelijke regionale topology/positie/skin-data behouden; de reducer en interne handherverdeling worden geheel overgeslagen. Er worden geen botposities, bindmatrices of vormen verzonnen. De optionele kandidaatoptimalisatie neemt deze bescherming over en rapporteert waarom een doelbudget wordt overschreden.

Eerste gecontroleerde echte-modelvergelijking bevestigde herstel van de gemeten arm-/handbanden naar SOURCE-afmetingen binnen numerieke afronding. Dat is geen bewijs van gemapte punch/guard-animaties: Marston heeft geen meegeleverde clips en de jointbetekenis blijft onbekend. Synthetische skinning/bindpose- en gedeeltelijke-mappingtests blijven afzonderlijk.

### Rhea: lokale gezichtsdetails

De bestaande generieke hoofdroute kende geen eigen UV-uitsnede en beschermde hoogcontrasterende texturegrenzen niet lokaal. In de eerdere veilige metadata werd bijvoorbeeld een generiek hoofdoppervlak7508→464triangles. Dat is een aantoonbare verliesroute, maar zonder daadwerkelijke beeldinspectie geen volledige diagnose van ieder lipstickartefact.

Kandidaatcorrectie: alleen voor nog niet semantisch herkende, ondoorzichtige, getextureerde hoofdregio's met brontexture >=1024px wordt een eigen brongetrouwe UV-uitsnede gemaakt. Exacte sampler-equivalentie is getest met mirrored/repeat/offset-transforms; geen modulo/clamp op UV-vertices. Native bronpixels sturen lokale contrastconstraints op bestaande vertices. Geen lipstickkleurherkenning, fake kleur, losse shader of personagenaamuitzondering. Bij onvoldoende pixeldata worden geen landmarks verzonnen.

De toegepaste cuts krijgen256kleuren en hogere source-sampling; oorspronkelijke geometrie-UV's, materiaalherkomst en skinsets blijven behouden. De bestaande gemapte gezichtsreconstructie wordt niet vervangen. Lagere-resolutiemodellen houden hun bestaande route, na een eerste te brede kandidaat die onnodig extra Cena-polygonen opleverde.

Een dicht getextureerde generieke hoofdregio kan nog veel vertices beschermen. Extra geometrie is expliciet meetbaar en nog niet artistiek gerechtvaardigd door groene tests. Dit blijft een aandachtspunt voor review, geen bewezen optimaal PS1-model.

## Bewaking en bewijsniveaus

- **Technisch getest:** posed classificatie, partiële mapping, originele handvertexposities, bronimmutabiliteit, geen extra open randen in de fixture, behoud bij vervolgreductie, contrastlokalisatie en exacte UV-sampling.320Node-tests lokaal geslaagd; volledige Windows-uitkomst afzonderlijk vastleggen.
- **Numeriek onderzocht:** bron/kandidaat in dezelfde posed objectruimte; afmetingen en doorsnedebanden, handoppervlakafstanden, lokale face/mouth/arm-rasterfouten. Boxvolume is alleen een proxy; geen echte gesloten anatomische volumemeting.
- **Private beelden:** SOURCE, diffuse, bronatlas zonder reconstructie, prepared geometry met bronmaterialen, complete atlas, normals, materiaal-ID, wireframe, zij-/driekwart-/lower-head-/arm-/handbeelden. Camera's worden uitsluitend vanuit SOURCE bepaald. Lower-head is een voorlopige uitsnede, geen gedetecteerde liplandmark.
- **Nikki:** aparte private baseline/current-renders en bytevergelijking van fysieke full/diffuse/normal-beelden; materiaal-ID-debugkleuren uitgezonderd. Bronassets blijven byte-identiek gecontroleerd.
- **Niet beweerd:** menselijke artistieke goedkeuring, een volledig herstelde lipstickcontour, gevalideerde Marston-gevechtsanimaties of Tekken3-gameplaycompatibiliteit.

## Privéreview openen

Log met je repositorybeheerdersaccount in op GitHub → Releases. Open de nieuwste **PRIVATE character diagnostics [runnummer] — DO NOT PUBLISH** conceptrelease. Download `Private-Character-Review.zip`, pak lokaal uit en open `index.html`. Vier model-ID's:6238a03b185cf208=Nikki,97cd06d570f34e56=Cena,ac97d32c3727e377=Marston,d0762a8df6f72497=Rhea. De HTML plaatst beta.1 en kandidaat naast elkaar.

**Publiceer dit concept nooit.** Het bevat commerciële diagnostische beelden voor private review, geen originele modellen/textures/projecten. Anonieme toegang moet door de workflow geweigerd zijn. Publieke artifacts bevatten uitsluitend de EXE, eigen synthetische screenshots en technische meetresultaten. Geen upload van je bronbestanden of screenshots gevraagd.

## Nog open

Artistieke lipcontour, broninterpretatie van complexe transparantie/PBR, onnodige bescherming op texturepatronen, daadwerkelijke clipvervorming met onbekende rig en native gameplay. Een lagere gemiddelde RGB-fout of overeenkomende bounding box is geen artistieke acceptatie. Bekijk met name de mondclose-ups en polsaansluitingen vóór verdere versimpeling.
