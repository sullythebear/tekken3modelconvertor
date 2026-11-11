import test from 'node:test';
import assert from 'node:assert/strict';
import {refinementFeedback} from '../src/core/refinement-feedback.js';
const cases=[
 ['Selecteer eerst een gebied.','empty-mask'],
 ['Ontbrekende of niet-ondersteunde SOURCE-texture; geen fictieve kleur ingevuld.','source-unavailable'],
 ['Niet alle texels hebben een betrouwbare bronkoppeling; selecteer een kleiner gebied.','uncertain-source'],
 ['Er is geen zichtbaar verschil gevonden.','no-effect'],
 ['Geen betrouwbaar betere regionale vorm; voorstel geblokkeerd.','no-effect'],
 ['Deze sterkte maakt onveilige driehoeken.','unsafe-change'],
 ['Dit masker raakt geen texturepixels. Kies een groter penseel.','resolution'],
 ['Het geschilderde gebied bevat geen veilig bewerkbare vormpunten.','resolution'],
 ['De houding is veranderd sinds de conversie.','pose'],
 ['Verfijning geannuleerd.','cancelled'],
 ['Onvoldoende lokale atlasruimte.','unsupported-region'],
 ['Unexpected read failure','technical'],
];
for(const [text,category] of cases)test('Refinement feedback distinguishes '+category+': '+text,()=>{const error=new Error(text),result=refinementFeedback(error);assert.equal(result.category,category);assert.ok(result.message.length>20);assert.equal(error.message,text);assert.ok(!result.message.includes('Error:'));});
