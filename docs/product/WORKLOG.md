# 0.8 beta werklog

Branch development/080-beta, eerste checkpoint b0507c7. Remote-reguliere baseline50dd53e gecontroleerd tegen GitHub; recentste UI/multi/TTT2-branch-heads vergeleken. Mainca7e894 ongewijzigd.

Behouden: reguliere converter, multi-material/repeat-UV/anatomie/UI/project/native-fixtures. Niet overgenomen: alle TTT2-runtime/import/IPC/UI/testafhankelijkheden. Gedeelde dropdowncontrastfix en assetcommitguard doelgericht behouden.

Geïmplementeerd: beta-versie, directe GLB/herimport, atomaire file-save met flush en annuleringstatus, backwards-compatible assetCRC, startkaart/eigen voorbeeld, offline geïsoleerde handleiding, eigen gegenereerd icoon, lokale begrensde runtime-eventlogging, productaudit/release notes, synthetisch product E2E met nieuw appproces, onafhankelijke GLB-buffer/index/material/skincontrole, Windows-pipeline met strikt veilige publicatielijst en optionele private regressies.

Lokale Node315/315PASS. Product E2E PASS vóór aanvullende isolated-help-check; original80 UI workflow PASS. Eerste productcheck vond onzichtbare geavanceerde control in Standaardmodus: test gebruikte verkeerde route, verwijderd. Aanvullende helpcheck vond echte navigatieblokkade: exact lokaal document nu toegestaan, test PASS. Dropdowncheck verwachtte normale kleur op geselecteerde optie: gecorrigeerd naar apart checked kleurpaar. Geen conversiecodeparameters veranderd om tests groen te krijgen.

Eerstvolgende actie: laatste lokale product/help-isolatietest, normale native fixtures controleren, tweede veilige checkpoint pushen, definitieve Windows product/portable/private regressies afwachten en werkelijk gemeten resultaten publiceren. Eerste Windowsrun42841711564 opb0507c7 passeert unit/portable/product/UI, rest nog gaande. Geen gebruikersacceptatie of commerciële visuele vooruitgang geclaimd.

Aanvullende producttest met help-isolatie/native toetsenbord/dropdowncontrast PASS. Eerste Windowsrun42841711564 is FAILED bij native-visual: test wachtte op browser-download-event terwijl packaged Electron via IPC lokaal schrijft. Zelfde defect lokaal gereproduceerd; test nu twee expliciete routes met inhoudelijke codec/texel/relocatiecontroles behouden. Productcode/native-exporter is niet aangepast om de test te omzeilen. Volgende actie: definitief gecorrigeerde Windows-run en private regressies.
