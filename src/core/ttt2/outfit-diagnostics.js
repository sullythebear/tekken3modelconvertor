// Bounded owner-local text. Display limits never change resolver data or approval.
export function compactOutfitDiagnosis(outfit,graph=null){
 if(!outfit)return 'Geen unieke leesbare itemdatabase. Geen assembly uitgevoerd.';
 const clean=(s,n=120)=>String(s??'?').replace(/[\r\n\t]/g,' ').slice(0,n),lines=['Lokale TTT2 outfit-declaraties — geen bewezen assembly',`Bronparser: volledige structuur=${outfit.sourceDataComplete!==false}; nodes=${outfit.sourceNodeCount??'?'}; bytes=${outfit.sourceBytes??'?'}. Weergavebegrenzing is geen ontbrekende brondata.`];
 if(graph){lines.push('Eerste blokkade: '+clean(graph.firstBlocker?.code??'onbekend'));lines.push('Leesbaarheid: '+JSON.stringify(graph.readability??{}));lines.push('Techniek per referentie: '+(graph.referenceDiagnostics??[]).slice(0,24).map(r=>r.field+'='+r.index+':'+r.technical+'/'+r.lookup).join('; '));}
 for(const p of outfit.packs)lines.push(`${p.field}: ${p.state}; indices=${p.independentIndices??0}; sleutelpatronen=${p.candidateCount}; formaatpassend=${p.rootChecks.filter(c=>c.formatCompatible).length}; voorlopige keys=${p.rootChecks.filter(c=>c.formatCompatible).map(c=>'0x'+c.key.toString(16).padStart(8,'0')).join(',')||'geen'}; onbekende waarden=${p.unsupportedValues}`);
 for(const item of outfit.items.slice(0,8)){
  lines.push(`Item ${item.item+1}: ${clean(item.label)}; Data-velden: ${Object.keys(item.data).slice(0,12).map(k=>clean(k,40)).join(', ')}`);
  const groups=new Map();for(const r of item.references.slice(0,32)){const key=clean(r.section,20)+' / '+clean(r.path);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(clean(r.field,4)+'='+clean(r.value,40));}for(const[key,refs]of groups)lines.push('  '+key+': '+refs.join(', '));
  if(item.conditions.length){const json=JSON.stringify(item.conditions);if(json.length<=1200)lines.push('  Voorwaarde: '+json);else{const stack=[...item.conditions],descriptions=[];let count=0;while(stack.length){const n=stack.pop();count++;if(descriptions.length<8)descriptions.push(clean(n.tag,60)+' '+Object.entries(n.attrs??{}).slice(0,6).map(([k,v])=>clean(k,30)+'='+clean(v,64)).join(','));stack.push(...n.children);}lines.push('  Voorwaardeweergave: '+clean(descriptions.join(' | '),1000)+`; totaal ${count} nodes, volledige boom intern behouden.`);}}
  if(item.references.length>32)lines.push('  Alleen tekstweergave begrensd; volledige referenties intern behouden.');
 }
 if(outfit.items.length>8)lines.push('Meer items dan de tekstweergavelimiet; volledige data intern behouden.');lines.push('Geen automatische game-assembly. Registratie, voorwaarden, skeleton en SOURCE niet geverifieerd.');
 const result=[];let length=0,omitted=0;for(const line of lines){if(length+line.length+1>5600){omitted++;continue;}result.push(line);length+=line.length+1;}if(omitted)result.push(`Alleen tekstweergave begrensd: ${omitted} regels niet weergegeven; resolverdata volledig behouden.`);return result.join('\n');
}
