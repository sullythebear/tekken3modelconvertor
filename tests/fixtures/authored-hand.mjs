import * as THREE from "three";
export function authoredHand(accessory = false) {
  const hand = new THREE.Bone(),
    bones = [hand],
    position = [],
    uv = [],
    joints = [],
    weights = [],
    extra = [],
    extraWeights = [],
    indices = [];
  const vertex = (p, u, bone) => {
    const id = position.length / 3;
    position.push(...p);
    uv.push(...u);
    joints.push(bone, 0, 0, 0);
    weights.push(bone ? 0.8 : 1, 0, 0, 0);
    extra.push(0, 0, 0, 0);
    extraWeights.push(bone ? 0.2 : 0, 0, 0, 0);
    return id;
  };
  const palm = [
    vertex([-1, -0.6, 0], [0, 0], 0),
    vertex([1, -0.6, 0], [1, 0], 0),
    vertex([1, 0.15, 0], [1, 1], 0),
    vertex([-1, 0.15, 0], [0, 1], 0),
  ];
  indices.push(palm[0], palm[1], palm[2], palm[0], palm[2], palm[3]);
  for (let d = 0; d < 5; d++) {
    const a = new THREE.Bone(),
      b = new THREE.Bone(),
      c = new THREE.Bone();
    a.position.set((d - 2) * 0.38, 0.2, 0);
    b.position.y = 0.4;
    c.position.y = 0.4;
    hand.add(a);
    a.add(b);
    b.add(c);
    const base = bones.length;
    bones.push(a, b, c);
    const rings = [];
    for (let row = 0; row <= 8; row++) {
      const s = row / 8,
        ring = [];
      for (let col = 0; col < 16; col++) {
        const theta = (col / 16) * Math.PI * 2,
          r = 0.09 * (1 - 0.3 * s);
        ring.push(
          vertex(
            [
              (d - 2) * 0.38 + r * Math.cos(theta),
              0.2 + s * 1.1,
              r * Math.sin(theta),
            ],
            [col / 16, s],
            base + Math.min(2, Math.floor(s * 3)),
          ),
        );
      }
      rings.push(ring);
    }
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 16; col++) {
        const a = rings[row][col],
          b = rings[row][(col + 1) % 16],
          c = rings[row + 1][(col + 1) % 16],
          d = rings[row + 1][col];
        indices.push(a, b, c, a, c, d);
      }
    const tip = vertex([(d - 2) * 0.38, 1.3, 0], [0.5, 1], base + 2);
    for (let col = 0; col < 16; col++)
      indices.push(rings[8][col], rings[8][(col + 1) % 16], tip);
  }
  for (let t = 0; t < indices.length; t += 3)
    [indices[t + 1], indices[t + 2]] = [indices[t + 2], indices[t + 1]];
  if (accessory) {
    const torus = new THREE.TorusGeometry(0.13, 0.02, 6, 24);
    torus.rotateX(Math.PI / 2);
    torus.translate(0, 0.8, 0);
    const offset = position.length / 3;
    for (let i = 0; i < torus.attributes.position.count; i++)
      vertex(
        new THREE.Vector3()
          .fromBufferAttribute(torus.attributes.position, i)
          .toArray(),
        new THREE.Vector2()
          .fromBufferAttribute(torus.attributes.uv, i)
          .toArray(),
        7,
      );
    for (const id of torus.index.array) indices.push(offset + id);
    torus.dispose();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(joints, 4));
  g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(weights, 4));
  g.setAttribute("joints_1", new THREE.Uint16BufferAttribute(extra, 4));
  g.setAttribute(
    "weights_1",
    new THREE.Float32BufferAttribute(extraWeights, 4),
  );
  g.setIndex(indices);
  g.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({ color: 0xd0a080 }),
    mesh = new THREE.SkinnedMesh(g, material);
  mesh.add(hand);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.updateMatrixWorld(true);
  return { g, material, mesh, hand };
}
