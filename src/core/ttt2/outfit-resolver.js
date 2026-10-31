// Pack-candidate resolution only. No geometry assembly or invented original pack names.
import {memberKey} from './archive-codec.mjs';
export const PART_FIELDS=Object.freeze({mi:'nud',ti:'nut',bi:'bon',pi:'mop'});
export function parseMemberIndex(value){if(typeof value!=='string'||!(/^(0|[1-9][0-9]*)$/.test(value)||/^0x[0-9a-f]+$/i.test(value)))return null;const n=Number(value);return Number.isSafeInteger(n)&&n>=0&&n<=0xffffffff?n:null;}
// Exact inverse of the CRC continuation in memberKey; does not identify a fighter.
export function recoverPackKey(entryKey,index){if(!Number.isInteger(entryKey)||entryKey<0||entryKey>0xffffffff)throw Error('Invalid entry key');if(!Number.isSafeInteger(index)||index<0||index>0xffffffff)throw Error('Invalid member index');const digits=[];while(index){digits.push(index%4);index=Math.floor(index/4);}let c=(entryKey^0xffffffff)>>>0;for(let i=digits.length-1;i>=0;i--){for(let b=0;b<8;b++){const bit=c>>>31;c=(((c^(bit?0xedb88320:0))<<1)|bit)>>>0;}c=(c^digits[i])>>>0;}return(c^0xffffffff)>>>0;}
export function inferPackCandidates(keys,indices,{maxRoots=8}={}){
 if(!Number.isInteger(maxRoots)||maxRoots<1||maxRoots>64)throw Error('Invalid candidate limit');const unique=[...new Set(indices)];if(unique.length>64)throw Error('Outfit diagnostic index limit');if(!unique.length)return{state:'no-indices',roots:[],candidateCount:0};if(unique.some(x=>!Number.isSafeInteger(x)||x<0||x>0xffffffff))throw Error('Invalid member index');
 const keySet=new Set(keys),roots=[];let candidateCount=0;
 for(const key of keySet){const base=recoverPackKey(key,unique[0]);if(unique.every(i=>keySet.has(memberKey(base,i)))){candidateCount++;if(roots.length<maxRoots)roots.push(base);}}
 // Never select from a truncated subset of roots.
 return{state:candidateCount>maxRoots?'too-many-candidates':candidateCount?'hash-candidates':'no-complete-key-pattern',candidateCount,roots:candidateCount>maxRoots?[]:roots,independentIndices:unique.length,scope:'Exact key-pattern match only; not original registry or outfit evidence'};
}
export function planOutfitReferences(summary,keys){
 if(summary.defaultInstances.length>128||summary.defaultInstances.reduce((n,i)=>n+i.references.length,0)>256)throw Error('Outfit diagnostic item/reference limit');
 const items=summary.defaultInstances.map((item,i)=>({item:i,label:item.label,data:item.dataAttributes??{},groups:item.modelGroups??[],conditions:item.conditions??[],diagnosticTruncated:!!item.diagnosticTruncated,references:item.references.map(r=>({...r,index:parseMemberIndex(r.value)}))}));
 const packs=[];for(const[field,type]of Object.entries(PART_FIELDS)){const refs=items.flatMap(item=>item.references.filter(r=>r.field===field).map(r=>({...r,item:item.item,label:item.label})));if(!refs.length)continue;const valid=refs.filter(r=>r.index!==null),unsupported=refs.filter(r=>r.index===null);packs.push({field,type,references:refs,unsupportedValues:unsupported.length,...(unsupported.length?{state:'unsupported-index-values',roots:[],candidateCount:0,independentIndices:new Set(valid.map(r=>r.index)).size}:inferPackCandidates(keys,valid.map(r=>r.index)))});}
 return{items,packs,registryVerified:false,variantSelectionVerified:false,canAssemble:false,scope:'Declared default items, sections and conditions. No A/B choice, sentinel interpretation, offset application or character identity inferred.'};
}
