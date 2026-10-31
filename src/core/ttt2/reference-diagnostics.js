export function referenceDiagnostics(nodes,edges,outfit){
 const byId=new Map(nodes.map(n=>[n.id,n]));return nodes.filter(n=>n.kind==='part-reference').map(ref=>{
  const members=edges.filter(e=>e.from===ref.id&&e.relation==='may-resolve-to').map(e=>byId.get(e.to)).filter(Boolean),pack=outfit?.packs.find(p=>p.field===ref.field),readable=members.filter(m=>m.state==='format-checked'),records=[...new Set(members.flatMap(m=>m.records??[]))];
  const technical=readable.length?'readable':members.some(m=>m.state==='unreadable')?'unreadable':members.some(m=>m.state==='type-mismatch')?'wrong-format':'not-examined';
  const lookup=ref.index===null?'unsupported-index':members.some(m=>m.state==='ambiguous-record')?'multiple-records':records.length?'records-found':pack?.state??'unresolved';
  const missing=readable.filter(m=>m.type==='nud').flatMap(m=>outfit?.textureCorrespondences?.find(c=>c.modelKey===m.key)?.notFoundInProbedProviders??[]);
  return{id:ref.id,field:ref.field,index:ref.index,lookup,technical,readableRecordIds:[...new Set(readable.flatMap(m=>m.records??[]))],candidateRecords:records.length,packCompleteness:members.some(m=>m.packFormatCompatible)?'readable-pack-hypothesis':'not-established',identity:'unverified',selection:'unknown',dependencies:missing.length?'not-found-in-probed-providers':'not-fully-verified',missingProbedTextureIds:[...new Set(missing)],optional:'unknown',placement:'not-tested',rendering:'not-tested'};
 });
}
