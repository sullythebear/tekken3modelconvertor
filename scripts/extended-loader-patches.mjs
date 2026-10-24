// Adapt pinned MIT Three.js loaders without maintaining a second parser.
// Structural assertions fail builds when an upstream change invalidates this patch.
export function patchFBX(text) {
  function once(before, after) {
    if (text.split(before).length !== 2) throw Error('FBX skin extension patch no longer matches pinned Three.js');
    text = text.replace(before, after);
  }
  once('model.normalizeSkinWeights();', '// Joint sets are normalized together by configureSkinning.');
  once('const buffers = this.genBuffers( geoInfo );', `geoInfo.skinStride = 4;
    for (const weights of Object.values(geoInfo.weightTable)) geoInfo.skinStride = Math.max(geoInfo.skinStride, Math.ceil(weights.length / 4) * 4);
    const buffers = this.genBuffers( geoInfo );`);
  once("geo.setAttribute( 'skinIndex', new Uint16BufferAttribute( buffers.weightsIndices, 4 ) );", `for (let set = 0; set < geoInfo.skinStride / 4; set++) {
      const select = values => values.filter((_, i) => Math.floor((i % geoInfo.skinStride) / 4) === set);
      geo.setAttribute(set === 0 ? 'skinIndex' : 'joints_' + set, new Uint16BufferAttribute(select(buffers.weightsIndices), 4));
      geo.setAttribute(set === 0 ? 'skinWeight' : 'weights_' + set, new Float32BufferAttribute(select(buffers.vertexWeights), 4));
    }`);
  once("geo.setAttribute( 'skinWeight', new Float32BufferAttribute( buffers.vertexWeights, 4 ) );", '// All influence sets emitted above.');
  once("const texture = this.parseTexture( textureNodes[ nodeID ], images );", `const links = connections.get(Number(nodeID));
        if (!links?.parents.some(link => fbxTree.Objects.Material?.[link.ID] || fbxTree.Objects.LayeredTexture?.[link.ID])) continue;
        const texture = this.parseTexture( textureNodes[ nodeID ], images );`);
  once("material.name = name;", `material.name = name;
    material.userData.t3csFBXTextures = connections.get(ID).children
      .filter(child => fbxTree.Objects.Texture && fbxTree.Objects.Texture[child.ID])
      .map(child => ({relationship: child.relationship, filename: fbxTree.Objects.Texture[child.ID].FileName}));`);
  once("const extension = textureNode.FileName.split( '.' ).pop().toLowerCase();", "const extension = (this.manager.t3csResolveTexture?.(textureNode.FileName) ?? textureNode.FileName).split('.').pop().toLowerCase();");
  const start = text.indexOf('\t\t\t\tif ( weights.length > 4 ) {');
  const end = text.indexOf('\t\t\t\t// if the weight array is shorter', start);
  if (start < 0 || end < start) throw Error('FBX truncation block not found');
  text = text.slice(0, start) + text.slice(end);
  once('while ( weights.length < 4 )', 'while ( weights.length < geoInfo.skinStride )');
  once('for ( let i = 0; i < 4; ++ i )', 'for ( let i = 0; i < geoInfo.skinStride; ++ i )');
  const first = text.indexOf('\t\t\t\tbuffers.vertexWeights.push( faceWeights[ i0 * 4 ] );');
  const lastLine = '\t\t\t\tbuffers.weightsIndices.push( faceWeightIndices[ i2 * 4 + 3 ] );';
  const last = text.indexOf(lastLine, first);
  if (first < 0 || last < first) throw Error('FBX triangulation weights block not found');
  text = text.slice(0, first) + `for (const corner of [i0, i1, i2]) for (let k = 0; k < geoInfo.skinStride; k++) {
    buffers.vertexWeights.push(faceWeights[corner * geoInfo.skinStride + k]);
    buffers.weightsIndices.push(faceWeightIndices[corner * geoInfo.skinStride + k]);
  }` + text.slice(last + lastLine.length);
  return text;
}
export function patchGLTF(text) {
  const needle = 'mesh.normalizeSkinWeights();';
  if (text.split(needle).length !== 2) throw Error('GLTF skin extension patch no longer matches pinned Three.js');
  return text.replace(needle, '// Normalize all joint sets together after import.');
}
