// Authored item database; generated in memory, no game XML or assets.
export function bxmlFixture({conditional=false,reference=true}={}){
 const el=(tag,attrs={},children=[])=>({tag,attrs,children}),roots=[el('InstanceInfo',{},[el('Instance',{label:'authored-upper'},[el('Data',{EquipType:'デフォルトコスチューム'}),el('Model',{section:'A'},reference?[el('Part',{mi:'7',ti:'8',bi:'9'})]:[]),...(conditional?[el('Model',{section:'B'},[el('Part',{mi:'10'})]),el('ModelBConditions',{},[el('Condition',{value:'authored'})])]:[])]),el('Instance',{label:'authored-alternate'},[el('Data',{EquipType:'authored-other'}),el('Model',{section:'A'},[el('Part',{mi:'99'})])])]),el('OffsetInfo')];
 return writeBxmlFixture(roots);
}
export function writeBxmlFixture(roots){
 const nodes=[],NONE=0xffffffff;
 function walk(n,depth){const i=nodes.length;nodes.push({...n,depth,next:NONE,child:NONE});let prev;for(const c of n.children){const j=walk(c,depth+1);if(prev===undefined)nodes[i].child=j;else nodes[prev].next=j;prev=j;}return i;}
 let prev;for(const root of roots){const i=walk(root,0);if(prev!==undefined)nodes[prev].next=i;prev=i;}
 const chunks=[],strings=new Map();let size=0;function string(s){if(!strings.has(s)){strings.set(s,size);const b=new TextEncoder().encode(s+'\0');chunks.push(b);size+=b.length;}return strings.get(s);}
 const attrs=[],rows=nodes.map(n=>{const tag=string(n.tag),first=attrs.length,entries=Object.entries(n.attrs);for(const[k,v]of entries)attrs.push([string(k),string(v)]);return[tag,n.depth,n.next,n.child,0,entries.length,entries.length?first:NONE];}),start=32+rows.length*28+attrs.length*8,b=new Uint8Array(start+size),v=new DataView(b.buffer);b.set(new TextEncoder().encode('BXML'));v.setUint32(4,b.length);v.setUint32(8,start);v.setUint32(16,rows.length);rows.forEach((row,i)=>row.forEach((x,j)=>v.setUint32(32+i*28+j*4,x)));attrs.forEach((row,i)=>row.forEach((x,j)=>v.setUint32(32+rows.length*28+i*8+j*4,x)));let at=start;for(const c of chunks){b.set(c,at);at+=c.length;}return b;
}
