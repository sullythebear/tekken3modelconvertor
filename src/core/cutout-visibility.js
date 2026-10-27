import * as THREE from "three";

// A conservative upper bound for the existing binary-cutout preparation and
// material sampler. This says nothing about the original blended source view.
// No texture pixels, material names or imported userData are trusted as proof.
export function cutoutOpacityBound(material, { cutoff = 0.5, binaryCutout = true } = {}) {
  const opacity = material.opacity ?? 1,
    threshold = material.alphaTest > 0 ? material.alphaTest : binaryCutout ? cutoff : null;
  const retain = (reason) => ({
    invisible: false,
    maxAlpha: Number.isFinite(opacity) ? opacity : null,
    threshold,
    reason,
  });
  if (typeof binaryCutout !== "boolean") return retain("Unknown rendering mode; source rendering retained");
  if (!binaryCutout && !(material.alphaTest > 0))
    return retain("No binary cutout is active for this material; source rendering retained");
  if (
    !Number.isFinite(opacity) ||
    opacity < 0 ||
    opacity > 1 ||
    !Number.isFinite(threshold) ||
    threshold <= 0 ||
    threshold > 1
  )
    return retain("Invalid or unsupported opacity/cutout parameters");
  if (opacity >= threshold)
    return retain("Opacity upper bound can still pass the cutoff");
  const maps = [
    ...(material.transparent || material.alphaTest > 0 ? [material.map] : []),
    material.alphaMap,
  ].filter(Boolean);
  for (const texture of maps) {
    const image = texture.image;
    if (
      texture.type !== THREE.UnsignedByteType ||
      texture.format !== THREE.RGBAFormat ||
      !Number.isInteger(image?.width) ||
      !Number.isInteger(image?.height) ||
      image.width <= 0 ||
      image.height <= 0
    )
      return retain(
        "Alpha source does not have a proven normalized byte range",
      );
    if (
      image.data &&
      ((!(image.data instanceof Uint8Array) &&
        !(image.data instanceof Uint8ClampedArray)) ||
        image.data.length !== image.width * image.height * 4)
    )
      return retain("Unsupported alpha channel storage");
  }
  return {
    invisible: true,
    maxAlpha: opacity,
    threshold,
    reason:
      "Entire material opacity bound is strictly below the PS1 preparation cutoff in every pose; blended source remains intact",
  };
}

// Keep transform/rig containers and child order while omitting zero-primitive
// render nodes. This operates only on the owned candidate clone, not the source.
export function stripEmptyRenderMeshes(root) {
  const empty = [];
  root.traverse((n) => {
    if (
      n.isMesh &&
      (n.geometry.index?.count ??
        n.geometry.attributes.position?.count ??
        0) === 0
    )
      empty.push(n);
  });
  let removed = 0;
  for (const mesh of empty) {
    const container = new THREE.Object3D().copy(mesh, false),
      parent = mesh.parent,
      index = parent?.children.indexOf(mesh);
    for (const child of [...mesh.children]) container.add(child);
    if (parent) {
      parent.remove(mesh);
      parent.add(container);
      parent.children.splice(parent.children.indexOf(container), 1);
      parent.children.splice(index, 0, container);
    } else root = container;
    mesh.geometry.dispose();
    removed++;
  }
  root.updateWorldMatrix(true, true);
  return { root, removed };
}
