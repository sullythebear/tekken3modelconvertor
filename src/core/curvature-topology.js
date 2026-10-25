// Conforming edge insertion driven by measured 3D chord error. Constraints and
// outer chart boundaries remain untouched; this is not uniform subdivision.
export function refineSurfaceCurvature(points,triangles,project,insert,{constraints=[],tolerance,maxInsertions=100,accept=()=>true}={}){
 const key=(a,b)=>a<b?`${a},${b}`:`${b},${a}`,cache=new Map(),sample=q=>{const k=`${q.x.toFixed(9)},${q.y.toFixed(9)}`;if(!cache.has(k))cache.set(k,project(q).point);return cache.get(k);};
 const cross=(a,b,p)=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x),on=(p,a,b)=>Math.abs(cross(a,b,p))<1e-10&&p.x>=Math.min(a.x,b.x)-1e-10&&p.x<=Math.max(a.x,b.x)+1e-10&&p.y>=Math.min(a.y,b.y)-1e-10&&p.y<=Math.max(a.y,b.y)+1e-10;
 let inserted=0,initialMaximumError=0,lastMaximumError=0,discontinuousSamples=0;
 for(let pass=0;pass<4&&inserted<maxInsertions;pass++){
  const edges=new Map();for(const t of triangles)for(let k=0;k<3;k++){const a=t[k],b=t[(k+1)%3],id=key(a,b);if(!edges.has(id))edges.set(id,{a,b,count:0});edges.get(id).count++;}
  const candidates=[];let maximum=0;
  for(const {a,b,count}of edges.values()){
   if(count!==2||constraints.some(([c,d])=>on(points[a],points[c],points[d])&&on(points[b],points[c],points[d])))continue;
   const q=points[a].clone().lerp(points[b],.5);if(!accept(q))continue;
   const pa=sample(points[a]),pb=sample(points[b]),middle=pa.clone().lerp(pb,.5),error=sample(q).distanceTo(middle);
   if(error>Math.max(tolerance*3,pa.distanceTo(pb)*.65)){discontinuousSamples++;continue;}
   maximum=Math.max(maximum,error);if(error>tolerance)candidates.push({q,error});
  }
  if(!pass)initialMaximumError=maximum;lastMaximumError=maximum;if(!candidates.length)break;
  candidates.sort((a,b)=>b.error-a.error);
  for(const {q}of candidates){if(inserted>=maxInsertions)break;const before=points.length;insert(points,triangles,q);inserted+=points.length-before;}
 }
 return {inserted,tolerance,initialMaximumError,lastMeasuredErrorBeforeInsertion:lastMaximumError,discontinuousSamples,insertionLimit:maxInsertions,method:'Measured source-surface chord error; constrained conforming edge insertion'};
}
