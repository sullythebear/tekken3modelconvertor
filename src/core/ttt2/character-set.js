// Evidence policy, not a character database. A display tile or CRC never proves identity.
export const TTT2_CHARACTERS=Object.freeze([{id:'jin',name:'Jin Kazama',outfits:[{id:'standard',name:'Standaardoutfit'}]}]);
export function assessCharacterCandidates(candidates){
 const roles=['nud','nut','bon'],issues=[];
 for(const role of roles){const rows=candidates.filter(x=>x.expectedType===role);if(!rows.length)issues.push('missing-'+role);if(rows.length>1)issues.push('ambiguous-'+role);for(const row of rows)if(row.type!==role||row.error||!row.summary)issues.push('unreadable-'+role);}
 const ready=roles.every(role=>{const a=candidates.filter(x=>x.expectedType===role);return a.length===1&&a[0].type===role&&!a[0].error&&!!a[0].summary;});
 const models=candidates.filter(x=>x.expectedType==='nud'&&x.type==='nud'),textures=candidates.filter(x=>x.expectedType==='nut'&&x.type==='nut'),bones=candidates.filter(x=>x.expectedType==='bon'&&x.type==='bon');
 const providers=new Map();for(const t of textures)for(const id of t.summary?.textureIds??[]){if(!providers.has(id))providers.set(id,[]);providers.get(id).push(t.id);}
 const required=[...new Set(models.flatMap(x=>x.summary?.requiredTextureIds??[]))],missing=required.filter(id=>!providers.has(id)),duplicate=[...providers].filter(([,p])=>p.length>1).map(([id])=>id);
 const skeletonRangeCompatible=ready&&models.every(m=>(m.summary.maxBone??-1)<(bones[0]?.summary.bones??0));if(missing.length)issues.push('missing-textures');if(duplicate.length)issues.push('ambiguous-textures');if(ready&&!skeletonRangeCompatible)issues.push('bone-range');
 const databases=candidates.filter(x=>x.expectedType==='bxml');if(databases.length!==1||databases[0].type!=='bxml'||!databases[0].summary||databases[0].error)issues.push('item-database-unresolved');
 const db=databases.length===1?databases[0].summary:null;
 if(db?.partReferenceCount)issues.push('part-packs-unresolved');if(db?.conditionalInstances)issues.push('variant-conditions-unresolved');issues.push('original-character-registry-unresolved','skeleton-identity-unverified','outfit-assembly-unverified');
 return{identity:ready?'candidate':'unknown',identityEvidence:'CRC name hypothesis plus format/reference checks only; not independent character/outfit identification',outfit:'unresolved',canImportCharacter:false,issues:[...new Set(issues)],dependencies:{requiredTextureIds:required,missingTextureIds:missing,duplicateTextureIds:duplicate,skeletonRangeCompatible,skeletonIdentityVerified:false},stages:[{id:'found',state:candidates.length?'candidate':'missing'},{id:'readable',state:ready&&candidates.every(x=>x.type===x.expectedType&&x.summary&&!x.error)?'checked':'incomplete'},{id:'identity',state:ready?'candidate':'unknown'},{id:'parts',state:'unresolved'},{id:'outfit',state:'unresolved'},{id:'source',state:'not-reviewed'},{id:'ps1',state:'not-run'},{id:'game',state:'not-tested'}]};
}
