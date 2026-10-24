# Nikki — echte referentietest, 0.5.0

Uitgevoerd op 24 oktober 2026 in Linux/Chromium WebGL. **Resultaat: PARTIAL**, runner exitcode 2. Dit is geen geslaagde game-integratie.

De ZIP is daadwerkelijk via de door de gebruiker opgegeven Google Drive-link gedownload. ZIP SHA-256: `cfab424fd9c250b8da2d0f6be5012d228967cdf3ba1cacf8c17ee977fac8a418`. ZIP-CRC gecontroleerd: 24 geldige entries. FBX SHA-256: `6238a03b185cf208b82838d6f5076424095f4d7379b7ca2e1111cc65002b4b13`. De originele bestanden blijven buiten de bron-/bewijsdistributie.

| Controle | Werkelijke uitkomst |
|---|---|
| FBX-geometrie | 6 meshes, 44.112 triangles, 132.336 bronvertices; geen ongeldige posities |
| Skeleton | 433 bones; maximaal 8 invloeden per vertex behouden; 17 anatomische rollen herkend |
| Textures | Alle 23 TGA-bestanden ingelezen als beschikbare assets; 7 diffuse materiaalgroepen gekoppeld, plus transparante corneacover; niet elk packed kanaal is blind toegewezen |
| Atlas | 8 materiaaltiles; huid/kleding/haar/ogen/tanden hebben niet-lege opaque pixels; haar en wimpers hebben alpha-cutouts |
| Vrije reductie | 44.112 → 3.860 triangles bij doel 900: **budget niet gehaald** |
| Gezicht | 13 bron-landmarks, 71 beschermde vertices voor neus, lippen en oogleden |
| Silhouet IoU | Front 0,920; side 0,887; back 0,920; drempel 0,8 gehaald |
| Drie poseproeven | Guard/reach/crouch gerenderd; finite posities, maar uitzonderlijke randrek gedetecteerd; geen gamebewegingen |
| Native Nina-export | Niet uitgevoerd: echte donorbestanden ontbreken |
| Identiteit en gameplay | Niet geaccepteerd/getest; geen speelbaarheidsclaim |

## Materiaalrelaties en aannames

De FBX bevat texture-objecten maar geen directe materiaal→textureverbindingen. De fallback wordt daarom zichtbaar gerapporteerd. De originele MI-proxykleur en vertexkleuren zijn geen bruikbare albedo: ze worden bewaard maar niet als huidkleur weergegeven. Posities, UV-buffers, skinweights en brontransformaties blijven behouden.

Haar gebruikt FaceAcc diffuse/specular, StrandsN-normal en het groene kanaal van Strands voor opacity (cutoff 0,2). Wimpers gebruiken de grijze texture als groen-kanaal-cutout (0,15) en een donkere tint. De oorspronkelijke Unreal-shader is niet beschikbaar: deze interpretaties vereisen menselijke visuele controle en zijn in de editor aanpasbaar.

EyeTeeth wordt via echte pupil-/oog-/tand-/tonginvloeden verdeeld in iris, sclera en tanden; alleen de indexvolgorde wordt gegroepeerd. De compacte iris-UV-chart krijgt een texturetransform, de bron-UV's blijven ongewijzigd. Een brede proxy-specularhighlight is voor deze fallback vervangen door een kleine highlight. Eyeshell is een expliciete transparante cornea-aanname; deze cover wordt niet als opaque oppervlak in de donorprojectie gebakken.

## Waarom het polygonendoel niet gehaald wordt

Een gecontroleerde proef verwijderde uitsluitend ongebruikte vertexkleur-/UV1-attributen uit het geconverteerde resultaat; alle brongegevens en skinsets bleven behouden. De uitkomst bleef 3.860 triangles. Per regio is daarna dezelfde simplifier met foutgrens 1 in plaats van 0,08 gemeten, met behoud van rand- en gezichtsbescherming. Deze meetvariant blijft op 3.570 triangles en wordt **niet** als resultaat gebruikt. Beschermde naden/topologie vormen dus een belangrijke beperking, naast de ingestelde geometriefout. Alleen de tolerantie verhogen of waarschuwingen verwijderen lost dit niet op. Een bewezen geschikte donor-retopologie of nieuw opgebouwde topologie blijft nodig voor het gewenste gamebudget.

## Reproduceren en bewijzen

Stel `NIKKI_DIR` in op de uitgepakte bestanden, of gebruik `NIKKI_ZIP`/`NIKKI_URL`, en voer `npm run test:nikki` uit. De runner controleert echte broncounts, materiaalafmetingen/alpha, behoud van vertexmaskers en acht invloeden, atlasinhoud en niet-lege alpha-bewuste silhouetten. Gecombineerde tests voor GPU-skinning en poseherstel staan in de overige regressies. De drie poseproeven zijn lokale anatomische diagnostiek, geen gedecodeerde Tekken-motionstreams; zowel bron als voorbereiding vertonen hierbij uitzonderlijke randrek.

`artifacts/nikki/results.json` bevat de volledige data. `front/side/back-source.png` en `-prepared.png` gebruiken identieke camerahoeken; `face-source.png`/`face-prepared.png` tonen gezichtsdetails. `guard/reach/crouch-source.png` en `-prepared.png` tonen de bewegingstests. Deze screenshots en rapporten zitten in Validation-0.5.0.zip. Oorspronkelijke modellen, textures en gamebytes worden niet meegeleverd.
