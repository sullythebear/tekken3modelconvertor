import * as THREE from 'three';
// Texture bytes are encoded; material.color is already in the renderer's linear
// working space. Multiply there, then encode once for a diffuse PS1 texture.
export function sourceAlbedoRGB(bytes, material, out = [0,0,0]) {
 const space=material.map?.colorSpace===THREE.SRGBColorSpace?THREE.SRGBColorSpace:THREE.LinearSRGBColorSpace;
 const factor=material.color;
 if(space===THREE.SRGBColorSpace&&(!factor||(factor.r===1&&factor.g===1&&factor.b===1))){out[0]=bytes[0];out[1]=bytes[1];out[2]=bytes[2];return out;}
 const colour=new THREE.Color().setRGB(bytes[0]/255,bytes[1]/255,bytes[2]/255,space);
 if(factor)colour.multiply(factor);
 colour.convertLinearToSRGB();out[0]=colour.r*255;out[1]=colour.g*255;out[2]=colour.b*255;return out;
}
