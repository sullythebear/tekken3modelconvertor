// Presentation limits only. Never feed this view back into the resolver.
export function declarationPreview(value,{nodes=256,characters=256}={}){
 let remaining=nodes,omittedNodes=0,shortenedValues=0;
 function visit(v){if(remaining--<=0){omittedNodes++;return '[alleen weergave ingekort]';}if(typeof v==='string'){if(v.length>characters){shortenedValues++;return v.slice(0,characters)+'…';}return v;}if(v===null||typeof v!=='object')return v;if(Array.isArray(v)){const out=[];for(let i=0;i<v.length;i++){if(remaining<=0){omittedNodes+=v.length-i;out.push('[alleen weergave ingekort: '+(v.length-i)+' waarden]');break;}out.push(visit(v[i]));}return out;}return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,visit(x)]));}
 const preview=visit(value);return{preview,displayLimited:omittedNodes>0||shortenedValues>0,omittedNodes,shortenedValues,sourceModified:false};
}
