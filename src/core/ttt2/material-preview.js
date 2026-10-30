import * as THREE from 'three';
// Only recognize explicit standard GL pairs. No guessing from names or texture colours.
export function configureTTT2Blend(material,native){if(!native||(!native.src&&!native.dst)||(native.src===1&&native.dst===0))return 'opaque';if(native.src===0x0302&&native.dst===0x0303){material.transparent=true;material.blending=THREE.NormalBlending;material.depthWrite=false;return 'straight-alpha';}return 'uninterpreted';}
