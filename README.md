# Tekken 3 Conversion Studio

**0.8.0-beta.1 — geteste Windows-beta, geen stabiele 1.0**

Converteer moderne 3D-personages naar herkenbare PlayStation1-stijl: **importeren → converteren → vergelijken → aanpassen → opslaan → exporteren**. Lokale verwerking, overzichtelijke standaardmodus en een doorzoekbaar geavanceerd paneel.

- Import: FBX, OBJ/MTL, GLB/glTF; TGA/PNG/JPEG.
- Export: GLB en PS1-voorbereidingspakket met atlas/TIM. Project-ZIP met bronassets en instellingen.
- Geen Blender of Python nodig voor de Windows-app.
- Native Tekken3/Expanded-export is experimenteel; geen bewezen gameplaycompatibiliteit.
- Niet ondertekende portable x64-app, geen installer. TTT2 is geen onderdeel van deze beta.

[Gebruikershandleiding](docs/product/GEBRUIKERSHANDLEIDING.md) · [Productaudit en beperkingen](docs/product/PRODUCT_READINESS.md) · [Release notes](docs/product/RELEASE_NOTES.md)

[Download portable EXE](https://github.com/sullythebear/tekken3modelconvertor/releases/download/v0.8.0-beta.1/Tekken3ConversionStudio-0.8.0-beta.1-x64.exe) · [HTML-rapport en screenshots](https://github.com/sullythebear/tekken3modelconvertor/releases/download/v0.8.0-beta.1/ConversionStudio-0.8.0-beta.1-report.zip) · [Eén lokale betatest](docs/product/LOKALE_BETATEST_NL.md)

[Windows Actions-builds](https://github.com/sullythebear/tekken3modelconvertor/actions/workflows/product-beta.yml): open de geslaagde run en download het commitgebonden artifact. Beschikbaarheid en testresultaten worden per kandidaat vastgelegd; geen stabiele releaseclaim.

## Ontwikkelen

Node24: `npm ci`, `npm test`, `npm run build`, `npm start`. Productworkflow in Electron: `T3CS_AUTOMATION=1 npm run test:product` (op Windows PowerShell: `$env:T3CS_AUTOMATION='1'; npm run test:product`). Portable build: `npm run dist:win:portable -- --publish never`. Windows-validatie via `product-beta.yml`.

Privéassets, textures en project-ZIP's nooit committen/publiceren. Alleen eigen synthetische modellen en expliciet toegestane diagnostiek in publieke tests.

## Historie

De beta integreert de reguliere converter vanaf `50dd53e`; eerdere dev-rapporten staan onder `docs/`. De beëindigde TTT2-proeflijn blijft bewaard op haar eigen branch. Bestaande branches/releases en main blijven behouden.
