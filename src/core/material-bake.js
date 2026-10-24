import * as THREE from "three";
// A deterministic static-light PBR bake. PS1 rendering cannot retain a dynamic PBR shader.
export function bakeMaterialDetail({
  base,
  geometricNormal,
  mappedNormal = geometricNormal,
  metalness = 0,
  roughness = 0.7,
  specular = [0.04, 0.04, 0.04],
  occlusion = 1,
  light = new THREE.Vector3(-0.3, 0.5, 0.8),
  view = new THREE.Vector3(0, 0, 1),
}) {
  const n = mappedNormal.clone().normalize(),
    g = geometricNormal.clone().normalize(),
    l = light.clone().normalize(),
    v = view.clone().normalize(),
    h = l.clone().add(v).normalize(),
    nl = Math.max(0, n.dot(l)),
    nv = Math.max(0.001, n.dot(v)),
    nh = Math.max(0, n.dot(h)),
    vh = Math.max(0, v.dot(h)),
    ambient = 0.35,
    detail =
      (ambient + (1 - ambient) * nl) /
      (ambient + (1 - ambient) * Math.max(0, g.dot(l))),
    r = THREE.MathUtils.clamp(roughness, 0.04, 1),
    alpha = r * r,
    a2 = alpha * alpha,
    distribution =
      a2 / (Math.PI * Math.max(1e-6, (nh * nh * (a2 - 1) + 1) ** 2)),
    k = (r + 1) ** 2 / 8,
    smith = (nl / (nl * (1 - k) + k)) * (nv / (nv * (1 - k) + k)),
    linear = new THREE.Color().setRGB(...base, THREE.SRGBColorSpace),
    b = linear.toArray(),
    out = [];
  for (let c = 0; c < 3; c++) {
    const f0 = THREE.MathUtils.lerp(specular[c], b[c], metalness),
      f = f0 + (1 - f0) * (1 - vh) ** 5,
      highlight =
        (distribution * smith * f * nl) / Math.max(0.004, 4 * nl * nv);
    out[c] = Math.max(
      0,
      b[c] * detail * (1 - metalness * 0.7) * occlusion + highlight * 0.25,
    );
  }
  return new THREE.Color()
    .setRGB(...out)
    .convertLinearToSRGB()
    .toArray()
    .map((v) => Math.max(0, Math.min(1, v)));
}
export function tangentNormal(
  triangle,
  normalMapValue,
  scale = new THREE.Vector2(1, 1),
) {
  if (!triangle.uvs) throw Error("Normal-mapped source surface lacks UVs");
  const [a, b, c] = triangle.points,
    [u, v, w] = triangle.uvs,
    e1 = b.clone().sub(a),
    e2 = c.clone().sub(a),
    d1 = v.clone().sub(u),
    d2 = w.clone().sub(u),
    det = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(det) < 1e-10)
    throw Error("Normal map has a degenerate source UV tangent frame");
  const n = triangle.normal,
    t = e1
      .clone()
      .multiplyScalar(d2.y)
      .addScaledVector(e2, -d1.y)
      .divideScalar(det);
  t.addScaledVector(n, -t.dot(n)).normalize();
  const bitangent = n
      .clone()
      .cross(t)
      .multiplyScalar(det < 0 ? -1 : 1),
    local = new THREE.Vector3(
      (normalMapValue[0] / 127.5 - 1) * scale.x,
      (normalMapValue[1] / 127.5 - 1) * scale.y,
      normalMapValue[2] / 127.5 - 1,
    ).normalize();
  return t
    .multiplyScalar(local.x)
    .addScaledVector(bitangent, local.y)
    .addScaledVector(n, local.z)
    .normalize();
}
