# Formaatonderzoek en openstaande integratie

Onderzocht op 23 oktober 2026. Dit document onderscheidt bronclaims van tests in dit project.

## Bronnen en provenance

1. [Character Builder formaatdocumentatie](https://github.com/sullythebear/tekken3characterbuilder/blob/f04385f490a3518ab91bfaf3531f0f1080650074/docs/knowledge/own-models.md), commit `f04385f490a3518ab91bfaf3531f0f1080650074`. Op expliciet verzoek van de gebruiker geraadpleegd als documentatie; geen implementatie overgenomen. De formaat-/containerbeschrijvingen en documentatie van donors zijn gebruikt als specificatiereferentie. De T3CM/T3TX-veldbeschrijving is ook gecontroleerd in de referentie-writer; geen writercode gekopieerd.
2. [Tekken 3 Expanded](https://github.com/omarma/tekken3-expanded), geïnspecteerde main `fc835dc9bd30cc6dd207067b1e269f47f70f6170`, documentatie/format parsers. Deze bron heeft een **PolyForm Noncommercial**-licentie; geen runtime/convertercode opgenomen of gelinkt als afhankelijkheid.
3. [Tek3Ex bestandskaart](https://github.com/xan1242/Tek3Ex/blob/master/useful-stuff/FileMap.md), ARC/BNS-concepten. De bestandnummering op de Japanse disc is niet zonder meer op de USA-disc toepasbaar.

## Doelkeuze Expanded

De referentie-Builder documenteert custom-character-tests op **Expanded 1.1.3**. Dat is de meest concrete gevonden integratiebasis, tag `v1.1.3`, SHA `8f087333834df76bfe893007999e0fe1a68d9352`. Dit is onze voorlopige onderzoeksbasis, geen door dit project gecertificeerde ondersteunde release.

De remote heeft inmiddels ook `v1.3.0` (`706682e95ec7d66cc07ecf6dceb939163c72f932`). Nieuwste/stabiel betekent hier niet automatisch compatibel met de custom-loaderpatches. Er is geen vanilla Expanded-versie aangetoond die ons nieuwe Nina-pakket direct importeert. De Builder-route vereist eigen T3CB-patches; de documentatie noemt patch 14 voor textureherupload per frame. Die patches zijn niet gekopieerd, geïnstalleerd of als aanwezig aangenomen. Expanded is bovendien een PC-recompilatie, niet de originele PS1-disc.

## Native 3DMK

Header: 27 rijen, schaal, `3DMK` op +8, headergrootte 1536 op +16. Rijtabellen starten op +24, 14 little-endian i32 per rij.

| Rijwoord | Betekenis volgens referentie |
|---|---|
| 0 | normalsblok |
| 1 | polygonblok |
| 2 | UV/materialenblok |
| 3..5 | jointoffset in ouderframe; game behandelt Z met tegengesteld teken |
| 6 | partinformatie |
| 7..9 | accessoire rustrotatie |
| 10 | draw flag |
| 12 | vertexblok van de **volgende** rij |
| 13 | hand-pose-pointertabel |

Eigen writer: lokale s16-vertices, onafhankelijke vlakke triangles, normalschaal 4096, materiaal/UV-tabel en relocaties. Maximaal 128 slots per rij, maximaal 255 UV-entries, 8-bit UV-componenten. Vlakke triangles kosten volgens bron 32 GPU-packetbytes; andere families 40/40/52. Het gebruikte voorlopige packetbudget 31000 is bronafgeleid en niet universeel voor iedere scene/versie geverifieerd.

De parser controleert hoofd-/rijpointers; hand-pose-tabellen worden als aanwezig gemarkeerd, maar niet volledig gedecodeerd. De writer behoudt donor-jointmetadata, schrijft eigen blokken en verwijdert hand-pose-tabellen. Vertex-sharing, 50/50-jointseams, accessories en handvarianten worden nog niet geschreven. Dat beperkt de writer tot structurele kandidaten, geen complete automatisch speelbare personages.

## Textures en containers

TIM: echte geïndexeerde PS1 4/8-bit images met little-endian RGB555 CLUTs. Kleurwoord 0 is transparant; opaque zwart wordt 0x8000. Onze previewbake gebruikt per materiaal een 16-kleuren-tile. De eerste spelerpagina is maximaal 64×256 halfwoorden = 32768 bytes. De voorlopige Nina-bake gebruikt maximaal 14 CLUTs van 16 kleuren op rij 1. Dit moet tegen de eigen donor-ARC en runtime worden bevestigd.

ARC: u32 entrycount, daarna offset/size-paren en de payloads. Nontexture-members mogen niet verdwijnen bij echte game-repacking. Onze asset-ARC-codec is geen BNS/ISO-repacker.

T3CM: custom container met versie, donor-modelnummer, nieuwe modelgrootte, relocatiecount, originele 1536-byte donorheader, nieuwe 3DMK en relocaties. Versie 2 voegt T3TX toe: 64×256 textureband en CLUT-runs. Dit is **geen stock PS1-modelcontainer**; een compatibele runtimepatch moet hem laden en textures op het juiste moment verversen.

`buildNativeCandidate` schrijft echte native structuren en labelt ze `gameCompatible:false`. De caller moet reeds gekalibreerde bone-local geometrie leveren. De UI levert alleen een voorbereidingspakket totdat die kalibratie/integratie bestaat. Er is geen verborgen GLB-naar-game-export.

## Benodigde eigen bestanden

Voor USA `SLUS_004.02`: `SLUS_004.02` plus geëxtraheerde, ongereloceerde Nina costume-1 modelrecord 111 en texture-ARC-record 113 uit TEKKEN3.BNS. De formule in de USA-referentie is model m: 71+4m (model), 73+4m (ARC); Nina costume 1 m=10. Costume 2 m=11 gebruikt records 115/117. Geluidsrecords zijn voor deze eerste mesh-/texturetest niet nodig. Nummers moeten tegen executable/modelmap worden bevestigd; de UI kan donor-identiteit nog niet bewijzen.

Ook nodig: de exacte Expanded-versie/build en aanwezige custom-loaderpatches; later donoranimaties of runtime pose-/rendercaptures voor bindkalibratie, seamcontrole en meerdere gevechtsbewegingen. Een volledige ISO of ROM-verzameling is niet gevraagd.

## Wat niet is vastgesteld

- Bron-Nikki FBX-bindposes tegenover Nina's echte boneframes, incl. as-/roll-/schaalconventies.
- Donor-slotcapaciteit vanuit executable versus alleen geëxtraheerde bestandsgrootte.
- Nikki-identiteit, texturedekking, runtime-palettebezetting en gezichtsanimatietextures.
- T3CM-loadercompatibiliteit met een beschikbare geïnstalleerde Expanded-versie.
- Originele PS1-discinjectie, BNS-relocatie/LBA-updates en emulator/hardwaregedrag.

Zonder deze gegevens zou automatische game-export onbetrouwbare resultaten opleveren. De exportknop blijft daarom geblokkeerd; dit is een ontbrekend kernonderdeel, geen voltooide integratie.


## Implementatieaanvulling 24 oktober 2026

0.2.0 leest nu vertexvarianten, cache/scratch-borrows, half-cachedeposits, primitives en PS1 UV/materialblokken. Donorprojectie behoudt die sharing en herbouwt flat-normal-, primitive- en UV-blokken. Niet-vlakke quads kunnen worden gesplitst. Pointer-only handtabellen worden als zodanig gevalideerd en hun entries mee gereloceerd; ze beginnen niet met een countwoord. De gebruikerreferentie `docs/knowledge/t3-model-style.md` is gebruikt voor de normal-index-bitposities en cornerorder. Er is geen writer/loadercode uit die repository overgenomen.

De USA-BNS-profielconstanten zijn aan de onderzochte Expanded-formaatinformatie getoetst: executable SHA-256 `fbda8b68e5799dbef4af39a161783bc670c15b0aa0e87dce65e210717da19b8c`, BNS-tabelbestandsoffset 0x14C00, 303 records van 8 bytes, logische sector 2048, modelcapaciteitstabel op bestandsoffset 0x8629C. Alleen het originele USA-executable wordt automatisch geaccepteerd; synthetische tests gebruiken een expliciet apart profiel en krijgen geen retail-verificatieclaim.

De native UI schrijft nu echte 3DMK/ARC-kandidaten en kan een aparte BNS-kopie maken. Dit vervangt eerdere vermeldingen dat alleen vooraf opgebouwde parts-JSON naar een writer konden worden gestuurd. Wat nog steeds niet is vastgesteld: daadwerkelijke Nina-layoutdekking, runtime-bindframes/accessoryrotaties, Nikki-identiteit en animaties, Expanded-loader, originele disc/ECC-integratie en werkelijke gameplay. Zie NATIVE_PIPELINE.md en STATUS.md voor de actuele status.

## 0.5.0: verificatiestatus

De echte Nikki-bron is gedownload en getest; eerdere transferblokkades in dit onderzoekslog zijn historisch. Zie NIKKI_TEST.md. De nu geïmplementeerde lokale ISO/BIN-reader is getest op zelfgemaakte ISO9660/raw-sectorfixtures. Er is nog geen originele Nina-donor of Expanded-runtime uitgevoerd. De gedocumenteerde loaderreferentie Expanded 1.1.3 + T3CB-PATCH-14 blijft een onderzoeksreferentie, geen door deze app gecertificeerde stabiele custom-importinstallatie. Een naam of versie kiezen levert zonder daadwerkelijke runtime-test geen compatibiliteitsbewijs.
