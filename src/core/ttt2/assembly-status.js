// User-facing evidence summaries only. Never promote candidate coverage to outfit approval.
const messages={
 'item-database-unavailable':'Er is nog geen unieke leesbare itemdatabase.',
 'declarations-truncated':'De onderdeelbeschrijving is afgekapt; er ontbreekt context.',
 'unsupported-index-value':'Een onderdeelverwijzing heeft een nog onbekende betekenis.',
 'unsupported-index-values':'Een onderdeelverwijzing heeft een nog onbekende betekenis.',
 'partial-key-patterns':'Een pack-kandidaat is deels gevonden; andere referenties blijven onzeker.',
 'partial-search-budget':'De begrensde deelscan is niet volledig; dit bewijst geen ontbrekende bestanden.',
 'too-many-partial-candidates':'Meerdere gedeeltelijke koppelingen blijven mogelijk.',
 'no-indices':'Er zijn nog geen bruikbare onderdeelverwijzingen.',
 'too-many-candidates':'Er zijn te veel mogelijke archiefkoppelingen; er wordt niets gekozen.',
 'no-complete-key-pattern':'Niet alle onderdeelverwijzingen hebben een passende archiefkandidaat.',
 'ambiguous-section-label':'De modelsecties zijn niet eenduidig herkenbaar.',
 'pack-evidence-missing':'De bestandskoppeling is nog niet vastgesteld.',
 'multiple-format-candidates':'Meerdere bestandssets kunnen passen; er wordt niets gekozen.',
 'no-format-compatible-pack':'Nog geen volledig leesbare bestandskandidaat voor deze referenties.',
 'ambiguous-record':'Er zijn meerdere archiefrecords voor dezelfde verwijzing.',
 'missing-record':'Een verwacht kandidaatrecord is niet gevonden.',
 'type-mismatch':'Een kandidaat heeft een ander bestandstype dan verwacht.',
 'unreadable':'Een kandidaatbestand kon niet correct worden gelezen.',
 'mop-reader-unavailable':'Aanvullende bewegingsgegevens worden nog niet geïnterpreteerd.',
 'probe-budget-exceeded':'De veilige onderzoekslimiet is bereikt; de controle is niet volledig.',
 'texture-provider-not-found-in-probes':'Een textureverwijzing is nog niet gekoppeld aan de onderzochte bestanden.',
 'part-skeleton-candidate-unresolved':'Een expliciet verwezen onderdeel-skeleton is nog niet gekoppeld.',
 'skeleton-index-range-incompatible':'Een onderdeel verwijst naar gewrichten die de geteste skeletkandidaat niet bevat; de koppeling is niet vastgesteld.',
 'unsupported-original-conditions':'Een modelvoorwaarde is nog niet ondersteund; er wordt geen variant gekozen.',
 'original-section-activation-unverified':'Welke modelsectie actief hoort te zijn is nog niet bevestigd.',
 'original-registry-unverified':'De oorspronkelijke koppeling tussen personage en outfitbestanden is nog niet bevestigd.',
 'skeleton-bindings-unverified':'De juiste skeletonkoppelingen zijn nog niet bevestigd.',
 'transforms-visibility-replacement-unverified':'Plaatsing, zichtbaarheid en vervanging van onderdelen zijn nog niet bevestigd.',
 'source-not-visually-verified':'Het complete SOURCE-personage is nog niet gecontroleerd.'
};
export function assemblyStatus(graph){
 if(!graph)return{status:'blocked',canImport:false,title:'Outfit nog niet betrouwbaar samengesteld',firstBlocker:'Voer de lokale onderdelencontrole uit.',items:[],counts:{identified:0,candidateReferences:0,declaredReferences:0,unknownConditions:0}};
 const selection=graph.nodes.filter(n=>n.kind==='selection'),items=graph.nodes.filter(n=>n.kind==='item');
 return{status:'blocked',canImport:false,title:'Outfit nog niet betrouwbaar samengesteld',firstBlocker:messages[graph.firstBlocker?.code]??'De samenstellingsregels zijn nog niet volledig bevestigd.',blockers:[...new Set(graph.blockers.map(b=>messages[b.code]??'Een technische afhankelijkheid is nog niet bevestigd.'))],items:items.map((n,i)=>({ordinal:i+1,identity:'Nog niet bevestigd',selection:selection.find(s=>s.id===n.id+'/selection')?.conditionState==='unknown'?'Modelvoorwaarde onbekend':'Actieve modelsectie niet bevestigd'})),counts:{identified:0,candidateReferences:graph.referenceCoverage.withFormatCandidate,readableReferences:graph.readability?.readable??0,notExaminedReferences:graph.readability?.notExamined??0,unreadableReferences:graph.readability?.unreadable??0,wrongFormatReferences:graph.readability?.wrongFormat??0,declaredReferences:graph.referenceCoverage.declared,unknownConditions:selection.filter(s=>s.conditionState==='unknown').length},note:'Leesbare kandidaten zijn geen complete outfit. Er is nog niets samengesteld of als speelbaar gevalideerd.'};
}
