// Presentation only. Preserve the original error separately for Advanced diagnostics.
export function refinementFeedback(error) {
 const text=String(error?.message??error??'');
 const result=(category,message)=>({category,message});
 if(/geannuleerd/i.test(text))return result('cancelled','Bewerking geannuleerd. Het vorige resultaat is behouden.');
 if(/verandert het geselecteerde gebied niet|geen zichtbaar verschil|geen betrouwbaar betere regionale vorm/i.test(text))return result('no-effect','Er is geen aantoonbare verbetering gevonden. Er is geen correctie vastgelegd.');
 if(/brongebied met Alt/.test(text))return result('clone-source','Kies eerst een brongebied met Alt + klik, of gebruik Kies bron.');
 if(/Selecteer één materiaal/.test(text))return result('material-boundary','Het masker raakt meerdere materialen of texturepatches. Wis het masker en schilder binnen één gebied.');
 if(/ander materiaal|andere UV-naad/.test(text))return result('incompatible-material','Dit brongebied gebruikt een ander materiaal of een andere UV-naad. Kies een passend brongebied.');
 if(/onvoldoende (geschikte|passende) textureinformatie/.test(text))return result('no-donor','Rond dit gebied is onvoldoende geschikte textureinformatie beschikbaar. Kies een kleiner gebied of het kloonpenseel.');
 if(/kloonbron kruist/.test(text))return result('surface-limit','De bron past hier niet veilig op het doeloppervlak. Kies een dichter brongebied binnen hetzelfde materiaal en dezelfde UV-naad.');
 if(/beschermd|bescherming/.test(text))return result('protected','Dit gebied is beschermd of de bescherming kan niet betrouwbaar worden gekoppeld. Pas het masker aan of schakel de bescherming uit.');
 if(/UV-naad|herhaalde tegel|texturelaag|verbonden oppervlak|kloonbron kruist|texture.*groot|herstelgebied.*groot|textuurpatch|texturepatch|texturepixels per correctie/.test(text))return result('surface-limit','Deze texturebewerking kan hier niet veilig worden uitgevoerd. Gebruik een kleiner gebied binnen hetzelfde materiaal en dezelfde UV-tegel.');
 if(/eerdere texture|vastgelegde artistieke atlas|artistieke model voor deze lokale/.test(text))return result('dependency','Een eerdere texture, vorm of atlasinstelling past niet meer bij dit voorstel. Bekijk het artistieke model en maak de correctie opnieuw.');
 if(/Te veel lokale bewerkingspunten|texturepatch is te groot|texture is te groot|herstelgebied is te groot|verbonden texturegebied is te groot/i.test(text))return result('capacity','Deze correctie overschrijdt het veilige geheugenbudget. Kies een kleiner oppervlak of een lagere texture-resolutie.');
 if(/Gebruik de gebakken atlas/.test(text))return result('material-layer','Gebruik eerst de gebakken PS1-atlas voor dit samengestelde materiaal. De huidige texture is niet gewijzigd.');
 if(/geen kleurtexture/.test(text))return result('target-texture','Dit oppervlak heeft geen bewerkbare kleurtexture. Gebruik eerst de gebakken PS1-atlas.');
 if(/geen (gebied|selectie)|selecteer eerst|Schilder eerst|selection.*missing/i.test(text))return result('empty-mask','Schilder eerst een gebied op het model.');
 if(/ontbrekende.*SOURCE-texture|ontbrekende.*brontexture/i.test(text))return result('source-unavailable','De oorspronkelijke texture is hier niet beschikbaar of wordt nog niet ondersteund. Er is niets gewijzigd.');
 if(/houding|pose/i.test(text))return result('pose','De houding is veranderd. Kies dezelfde houding of converteer opnieuw.');
 if(/vormpunten|binnenvertices|geen texturepixels|ruimer texturegebied|selectie is te klein/i.test(text))return result('resolution','Dit gebied bevat onvoldoende bewerkbare details. Schilder iets ruimer; het model is nog niet gewijzigd.');
 if(/onveilige driehoeken|doorsnijding|veilige selectiegrens|verslechtert/i.test(text))return result('unsafe-change','Deze wijziging is niet veilig en is geweigerd. Probeer minder sterkte of een ander gebied.');
 if(/bronkoppeling|tegenstrijdige projecties|overlappende texturegebieden|correspondentie/i.test(text))return result('uncertain-source','Dit gebied kan niet betrouwbaar aan het origineel worden gekoppeld. Gebruik een kleiner gebied of pas de vorm zelf aan.');
 if(/atlasruimte|zonder verlies|blendmaterialen|nog niet veilig|niet-inverteerbare|zichtbaarheid\/culling|maximaal/i.test(text))return result('unsupported-region','Dit gebied kan met deze bewerking nog niet veilig worden verwerkt. Kies een kleiner gebied of een ander gereedschap.');
 return result('technical','De bewerking is door een technische fout niet toegepast. Je eerdere resultaat is behouden. Details staan bij Geavanceerd.');
}
