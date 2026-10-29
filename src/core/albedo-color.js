import * as THREE from 'three';
// Preserve the previous identity-factor roundoff at palette boundaries.
export const legacyWhiteIdentity=new THREE.Color(1,1,1).convertLinearToSRGB().r;
// Texture bytes are encoded; material.color is already in the renderer's linear
// working space. Multiply there, then encode once for a diffuse PS1 texture.
export function sourceAlbedoRGB(bytes, material, out = [0,0,0]) {
 const space=material.map?.colorSpace===THREE.SRGBColorSpace?THREE.SRGBColorSpace:THREE.LinearSRGBColorSpace;
 const factor=material.color;
 // Existing FBX/OBJ Phong projects were calibrated to this modulation. Keep
 // their appearance stable; the standards-correct path is for PBR/unlit input.
 if(material.isMeshPhongMaterial){const encoded=(factor??new THREE.Color(1,1,1)).clone().convertLinearToSRGB();out[0]=bytes[0]*encoded.r;out[1]=bytes[1]*encoded.g;out[2]=bytes[2]*encoded.b;return out;}
 if(space===THREE.SRGBColorSpace&&(!factor||(factor.r===1&&factor.g===1&&factor.b===1))){out[0]=bytes[0]*legacyWhiteIdentity;out[1]=bytes[1]*legacyWhiteIdentity;out[2]=bytes[2]*legacyWhiteIdentity;return out;}
 const colour=new THREE.Color().setRGB(bytes[0]/255,bytes[1]/255,bytes[2]/255,space);
 if(factor)colour.multiply(factor);
 colour.convertLinearToSRGB();out[0]=colour.r*255;out[1]=colour.g*255;out[2]=colour.b*255;return out;
}
