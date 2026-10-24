import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
function property(v) {
  if (typeof v === "bigint") {
    const b = Buffer.alloc(9);
    b.write("L");
    b.writeBigInt64LE(v, 1);
    return b;
  }
  if (typeof v === "string") {
    const s = Buffer.from(v),
      b = Buffer.alloc(5);
    b.write("S");
    b.writeUInt32LE(s.length, 1);
    return Buffer.concat([b, s]);
  }
  if (ArrayBuffer.isView(v)) {
    const kind = v instanceof Float64Array ? "d" : "i",
      data = Buffer.from(v.buffer, v.byteOffset, v.byteLength),
      z = deflateSync(data),
      b = Buffer.alloc(13);
    b.write(kind);
    b.writeUInt32LE(v.length, 1);
    b.writeUInt32LE(1, 5);
    b.writeUInt32LE(z.length, 9);
    return Buffer.concat([b, z]);
  }
  const b = Buffer.alloc(5);
  b.write("I");
  b.writeInt32LE(v, 1);
  return b;
}
const node = (name, props = [], children = []) => ({ name, props, children });
function encode(n, start, wide = false) {
  const name = Buffer.from(n.name),
    props = Buffer.concat(n.props.map(property)),
    head = Buffer.alloc(wide ? 25 : 13);
  let position = start + head.length + name.length + props.length;
  const children = [];
  for (const c of n.children) {
    const b = encode(c, position, wide);
    children.push(b);
    position += b.length;
  }
  if (children.length) {
    children.push(Buffer.alloc(wide ? 25 : 13));
    position += wide ? 25 : 13;
  }
  if (wide) {
    head.writeBigUInt64LE(BigInt(position), 0);
    head.writeBigUInt64LE(BigInt(n.props.length), 8);
    head.writeBigUInt64LE(BigInt(props.length), 16);
    head.writeUInt8(name.length, 24);
  } else {
    head.writeUInt32LE(position, 0);
    head.writeUInt32LE(n.props.length, 4);
    head.writeUInt32LE(props.length, 8);
    head.writeUInt8(name.length, 12);
  }
  return Buffer.concat([head, name, props, ...children]);
}
export function binaryFBX(version = 7400, influenceCount = 0, {linkedTexture = false} = {}) {
  const nodes = [
    node(
      "FBXHeaderExtension",
      [],
      [node("FBXHeaderVersion", [1003]), node("FBXVersion", [version])],
    ),
    node(
      "Objects",
      [],
      [
        node(
          "Geometry",
          [1n, "Geometry::ReferenceQuad", "Mesh"],
          [
            node("Vertices", [
              new Float64Array([-1, 0, 0, 1, 0, 0, 1, 2, 0, -1, 2, 0]),
            ]),
            node("PolygonVertexIndex", [new Int32Array([0, 1, -3, 0, 2, -4])]),
            node(
              "LayerElementNormal",
              [0],
              [
                node("MappingInformationType", ["ByPolygonVertex"]),
                node("ReferenceInformationType", ["Direct"]),
                node("Normals", [
                  new Float64Array([
                    0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
                  ]),
                ]),
              ],
            ),
            node(
              "LayerElementUV",
              [0],
              [
                node("MappingInformationType", ["ByPolygonVertex"]),
                node("ReferenceInformationType", ["IndexToDirect"]),
                node("UV", [new Float64Array([0, 0, 1, 0, 1, 1, 0, 1])]),
                node("UVIndex", [new Int32Array([0, 1, 2, 0, 2, 3])]),
              ],
            ),
          ],
        ),
        node(
          "Model",
          [2n, "Model::ReferenceQuad", "Mesh"],
          [node("Version", [232])],
        ),
      ],
    ),
    node("Connections", [], [node("C", ["OO", 1n, 2n])]),
  ];
  if (linkedTexture) {
    const objects = nodes.find(n => n.name === "Objects").children, links = nodes.find(n => n.name === "Connections").children;
    objects.push(node("Material", [3n, "Material::OriginalBody", ""], [node("Version", [102]), node("ShadingModel", ["phong"])]));
    objects.push(node("Texture", [4n, "Texture::AuthoredTexture", "TextureVideoClip"], [node("Type", ["TextureVideoClip"]), node("FileName", ["body.png"]), node("RelativeFilename", ["body.png"])]));
    objects.push(node("Video", [5n, "Video::AuthoredImage", "Clip"], [node("Filename", ["body.png"]), node("RelativeFilename", ["body.png"])]));
    links.push(node("C", ["OO", 3n, 2n]), node("C", ["OP", 4n, 3n, "DiffuseColor"]), node("C", ["OO", 5n, 4n]));
  }
  if (influenceCount) {
    const objects = nodes.find(n => n.name === "Objects").children;
    const connections = nodes.find(n => n.name === "Connections").children;
    const identity = new Float64Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
    objects.push(node("Deformer", [10n, "Deformer::Skin", "Skin"]));
    connections.push(node("C", ["OO", 10n, 1n]));
    for (let i = 0; i < influenceCount; i++) {
      const cluster = BigInt(100 + i), bone = BigInt(1000 + i);
      objects.push(node("Deformer", [cluster, `SubDeformer::Joint${i}`, "Cluster"], [
        node("Indexes", [new Int32Array([0,1,2,3])]),
        node("Weights", [new Float64Array(4).fill((i + 1) / (influenceCount * (influenceCount + 1) / 2))]),
        node("TransformLink", [identity]),
      ]));
      objects.push(node("Model", [bone, `Model::Joint${i}`, "LimbNode"], [node("Version", [232])]));
      connections.push(node("C", ["OO", cluster, 10n]), node("C", ["OO", bone, cluster]));
    }
  }
  const header = Buffer.concat([
    Buffer.from("Kaydara FBX Binary  \0\x1a\0", "binary"),
    Buffer.from([0xe8, 0x1c, 0, 0]),
  ]);
  header.writeUInt32LE(version, 23);
  let offset = header.length;
  const result = [header];
  for (const n of nodes) {
    const b = encode(n, offset, version >= 7500);
    result.push(b);
    offset += b.length;
  }
  result.push(Buffer.alloc(version >= 7500 ? 25 : 13), Buffer.alloc(160));
  return Buffer.concat(result);
}
export function tga(width = 8, height = 8) {
  const header = Buffer.alloc(18);
  header[2] = 2;
  header.writeUInt16LE(width, 12);
  header.writeUInt16LE(height, 14);
  header[16] = 32;
  header[17] = 0x28;
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      pixels.set([30, 100, x % 2 ? 240 : 160, x === 0 && y === 0 ? 0 : 255], p);
    }
  return Buffer.concat([header, pixels]);
}
export async function writeFixtures(dir = "artifacts/fixtures") {
  await mkdir(dir, { recursive: true });
  await writeFile(`${dir}/reference-binary.fbx`, binaryFBX());
  for (const version of [7500, 7700])
    await writeFile(`${dir}/reference-${version}.fbx`, binaryFBX(version));
  await writeFile(`${dir}/body.tga`, tga());
  await writeFile(
    `${dir}/reference.obj`,
    "mtllib reference.mtl\no Face\nv -1 0 0\nv 1 0 0\nv 1 2 0\nv -1 2 0\nvt 0 0\nvt 1 0\nvt 1 1\nvt 0 1\nvn 0 0 1\nusemtl Body\nf 1/1/1 2/2/1 3/3/1\nf 1/1/1 3/3/1 4/4/1\n",
  );
  await writeFile(
    `${dir}/reference.mtl`,
    "newmtl Body\nKd 1 1 1\nmap_Kd body.tga\n",
  );
  return dir;
}
