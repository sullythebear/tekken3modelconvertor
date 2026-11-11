// Presentation only. Preserve the original error separately for Advanced diagnostics.
export function refinementFeedback(error) {
 const text=String(error?.message??error??'');
 const result=(category,message)=>({category,message});
 if(/geannuleerd/i.test(text))return result('cancelled','Bewerking geannuleerd. Het vorige resultaat is behouden.');
 if(/geen zichtbaar verschil|geen betrouwbaar betere regionale vorm/i.test(text))return result('no-effect','Er is geen aantoonbare verbetering gevonden. Er is geen correctie vastgelegd.');
 if(/geen (gebied|selectie)|selecteer eerst|selection.*missing/i.test(text))return result('empty-mask','Schilder eerst een gebied op het model.');
 if(/ontbrekende.*SOURCE-texture|ontbrekende.*brontexture/i.test(text))return result('source-unavailable','De oorspronkelijke texture is hier niet beschikbaar of wordt nog niet ondersteund. Er is niets gewijzigd.');
 if(/houding|pose/i.test(text))return result('pose','De houding is veranderd. Kies dezelfde houding of converteer opnieuw.');
 if(/vormpunten|binnenvertices|geen texturepixels|ruimer texturegebied|selectie is te klein/i.test(text))return result('resolution','Dit gebied bevat onvoldoende bewerkbare details. Schilder iets ruimer; het model is nog niet gewijzigd.');
 if(/onveilige driehoeken|doorsnijding|veilige selectiegrens|verslechtert/i.test(text))return result('unsafe-change','Deze wijziging is niet veilig en is geweigerd. Probeer minder sterkte of een ander gebied.');
 if(/bronkoppeling|tegenstrijdige projecties|overlappende texturegebieden|correspondentie/i.test(text))return result('uncertain-source','Dit gebied kan niet betrouwbaar aan het origineel worden gekoppeld. Gebruik een kleiner gebied of pas de vorm zelf aan.');
 if(/atlasruimte|zonder verlies|blendmaterialen|nog niet veilig|niet-inverteerbare|zichtbaarheid\/culling|maximaal/i.test(text))return result('unsupported-region','Dit gebied kan met deze bewerking nog niet veilig worden verwerkt. Kies een kleiner gebied of een ander gereedschap.');
 return result('technical','De bewerking is door een technische fout niet toegepast. Je eerdere resultaat is behouden. Details staan bij Geavanceerd.');
}
