// The atlas uses one chart per material. A shared nonzero texture coordinate set
// is valid; different sets within the same material need per-triangle rebaking.
export function bakeUVAttribute(material) {
  const textures=['map','alphaMap','normalMap'].map(k=>material?.[k]).filter(Boolean);
  const channels=textures.map(t=>t.channel??0);
  if(channels.some(c=>!Number.isInteger(c)||c<0))throw Error('Invalid source texture coordinate channel');
  if(new Set(channels).size>1)throw Error('Material maps use different UV sets; per-triangle rebaking is required. Source materials remain available without an atlas.');
  const channel=channels[0]??0;
  return channel?`uv${channel}`:'uv';
}
export function requireBakeUV(geometry,material) {
 const name=bakeUVAttribute(material),uv=geometry.attributes[name];
 if(!uv&&['map','alphaMap','normalMap'].some(k=>material?.[k]))throw Error(`Source material requires missing ${name} coordinates; texture baking was not guessed.`);
 return uv;
}
