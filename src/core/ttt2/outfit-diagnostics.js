// Whitelisted, bounded text for voluntary owner-local follow-up. No paths, pixels or buffers.
export function compactOutfitDiagnosis(outfit){
 if(!outfit)return 'Geen unieke leesbare itemdatabase. Geen assembly uitgevoerd.';
 const clean=(s,n=120)=>String(s??'?').replace(/[\r\n\t]/g,' ').slice(0,n),lines=['Lokale TTT2 outfit-declaraties — geen bewezen assembly'];
 for(const item of outfit.items.slice(0,8)){
  lines.push(`Item ${item.item+1}: ${clean(item.label)}; Data-velden: ${Object.keys(item.data).map(k=>clean(k,40)).join(', ')}`);
  const groups=new Map();for(const r of item.references.slice(0,32)){const key=clean(r.section,20)+' / '+clean(r.path);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(clean(r.field,4)+'='+clean(r.value,40));}for(const[key,refs]of groups)lines.push('  '+key+': '+refs.join(', '));
  if(item.conditions.length){const text=JSON.stringify(item.conditions);lines.push('  Voorwaarde: '+(text.length<=1500&&!item.diagnosticTruncated?text:'Te groot/afgekapt; geef alleen tags en attribuutnamen uit de lokale weergave door.'));}
  if(item.references.length>32||item.diagnosticTruncated)lines.push('  Diagnostiek begrensd; geen volledige semantische beoordeling.');
 }
 if(outfit.items.length>8)lines.push('Meer items dan de compacte limiet; niet volledig weergegeven.');
 for(const p of outfit.packs)lines.push(`${p.field}: ${p.state}; onafhankelijke indices=${p.independentIndices??0}; sleutelpatronen=${p.candidateCount}; formaatpassende kandidaten=${p.rootChecks.filter(c=>c.formatCompatible).length}; voorlopige pack-sleutels=${p.rootChecks.filter(c=>c.formatCompatible).map(c=>'0x'+c.key.toString(16).padStart(8,'0')).join(',')||'geen'}; onbekende waarden=${p.unsupportedValues}`);
 lines.push('Geen meshes samengevoegd. Originele registratie, voorwaarden en SOURCE nog niet geverifieerd.');
 const text=lines.join('\n');return text.length<=6000?text:'Compacte diagnose overschrijdt de limiet. Geef alleen de vijf itemlabels, referentievelden en voorwaarden-tags uit de lokale weergave door; upload geen volledig rapport.';
}
