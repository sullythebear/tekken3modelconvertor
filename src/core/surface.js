import {sourceAlbedoRGB,legacyWhiteIdentity} from './albedo-color.js';
import {bilinearRGBA} from './skin-surface.js';
import * as THREE from "three";
import { bakeMaterialDetail, tangentNormal } from "./material-bake.js";
// CPU BVH shared by donor projection and texture baking. Coordinates are world-space.
export class SurfaceIndex {
  constructor(triangles, { leafSize = 8 } = {}) {
    if (!triangles.length) throw Error("No nondegenerate source triangles");
    this.triangles = triangles;
    const build = (ids) => {
      const box = new THREE.Box3();
      for (const i of ids)
        for (const p of triangles[i].points) box.expandByPoint(p);
      if (ids.length <= leafSize) return { box, ids };
      const size = box.getSize(new THREE.Vector3()),
        axis =
          size.x >= size.y && size.x >= size.z
            ? "x"
            : size.y >= size.z
              ? "y"
              : "z";
      ids.sort((i, j) => triangles[i].center[axis] - triangles[j].center[axis]);
      const half = Math.floor(ids.length / 2);
      return {
        box,
        left: build(ids.slice(0, half)),
        right: build(ids.slice(half)),
      };
    };
    this.root = build(triangles.map((_, i) => i));
  }
  nearest(point, maxDistance = Infinity) {
    let best = maxDistance * maxDistance,
      result = null;
    const stack = [this.root],
      q = new THREE.Vector3(),
      bary = new THREE.Vector3();
    while (stack.length) {
      const node = stack.pop();
      if (node.box.distanceToPoint(point) ** 2 > best) continue;
      if (node.ids) {
        for (const i of node.ids) {
          const t = this.triangles[i];
          t.triangle.closestPointToPoint(point, q);
          const d = q.distanceToSquared(point);
          if (d <= best) {
            best = d;
            t.triangle.getBarycoord(q, bary);
            result = {
              triangle: t,
              point: q.clone(),
              barycentric: bary.clone(),
              distance: Math.sqrt(d),
            };
          }
        }
      } else {
        const a = node.left.box.distanceToPoint(point),
          b = node.right.box.distanceToPoint(point);
        if (a < b) stack.push(node.right, node.left);
        else stack.push(node.left, node.right);
      }
    }
    return result;
  }
  raycast(origin,direction,maxDistance,exclude=null,{acceptTriangle=null}={}){
    const ray=new THREE.Ray(origin,direction),stack=[this.root],point=new THREE.Vector3(),boxHit=new THREE.Vector3();
    let result=null,best=maxDistance;
    while(stack.length){const node=stack.pop();
      if(!ray.intersectBox(node.box,boxHit))continue;
      if(!node.box.containsPoint(origin)&&boxHit.distanceTo(origin)>best)continue;
      if(!node.ids){stack.push(node.left,node.right);continue;}
      for(const id of node.ids){const t=this.triangles[id];if(t===exclude||acceptTriangle&&!acceptTriangle(t))continue;
        if(!ray.intersectTriangle(...t.points,false,point))continue;const distance=point.distanceTo(origin);
        if(distance>1e-7&&distance<best){best=distance;result={triangle:t,distance,point:point.clone()};}
      }
    }return result;
  }
}
export function triangleRecord(
  points,
  { uvs = null, material = null, region = null } = {},
) {
  const triangle = new THREE.Triangle(...points);
  if (triangle.getArea() < 1e-12) return null;
  return {
    points,
    triangle,
    center: triangle.getMidpoint(new THREE.Vector3()),
    normal: triangle.getNormal(new THREE.Vector3()),
    uvs,
    material,
    region,
  };
}
function imagePixels(image) {
  if (!image?.width || !image?.height) return null;
  if (image.data) {
    if (image.data.length !== image.width * image.height * 4)
      throw Error("Only RGBA texture data supported");
    return image;
  }
  if (typeof document === "undefined")
    throw Error("Image texture baking needs the desktop canvas");
  const c = document.createElement("canvas");
  c.width = image.width;
  c.height = image.height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, c.width, c.height);
}
export function materialSampler(materials, { mode = "albedo", filter = "nearest" } = {}) {
  if (!["albedo","static-detail","data"].includes(mode)) throw Error("Unsupported surface sampling mode");
  if (!["nearest", "linear"].includes(filter)) throw Error("Unsupported surface sampling filter");
  const maps = new Map();
  for (const m of materials)
    for (const name of (mode === "static-detail" ? [
      "map",
      "alphaMap",
      "normalMap",
      "metalnessMap",
      "roughnessMap",
      "specularMap",
      "aoMap",
    ] : ["map", "alphaMap"]))
      if (m[name] && !maps.has(m[name]))
        maps.set(m[name], imagePixels(m[name].image));
  const sample = (texture, uv) => {
    const im = maps.get(texture);
    if (!im) return [255, 255, 255, 255];
    const q = uv.clone();
    if(texture.matrixAutoUpdate)texture.updateMatrix();
    texture.transformUv(q);
    if (filter === "linear") return bilinearRGBA(im, q.x, q.y);
    const x = Math.max(0, Math.min(im.width - 1, Math.floor(q.x * im.width))),
      y = Math.max(0, Math.min(im.height - 1, Math.floor(q.y * im.height)));
    return im.data.subarray((y * im.width + x) * 4, (y * im.width + x) * 4 + 4);
  };
  return (hit) => {
    const t = hit.triangle,
      m = t.material,
      uv = new THREE.Vector2();
    if (t.uvs)
      for (let k = 0; k < 3; k++)
        uv.addScaledVector(t.uvs[k], hit.barycentric.getComponent(k));
    if (m.map && !t.uvs) throw Error("Textured source surface lacks UVs");
    const rgba = sample(m.map, uv);
    if(mode==='data')return [rgba[0]*legacyWhiteIdentity,rgba[1]*legacyWhiteIdentity,rgba[2]*legacyWhiteIdentity,rgba[3]];
    const opacity = m.alphaMap ? sample(m.alphaMap, uv)[1] / 255 : 1,
      a =
        (m.transparent || m.alphaTest > 0 ? rgba[3] / 255 : 1) *
        opacity *
        (m.opacity ?? 1);
    let rgb = sourceAlbedoRGB(rgba,m);
    if (mode === "static-detail") {
      const normal = m.normalMap
        ? tangentNormal(t, sample(m.normalMap, uv), m.normalScale)
        : t.normal;
      const metal =
          (m.metalness ?? 0) *
          (m.metalnessMap ? sample(m.metalnessMap, uv)[2] / 255 : 1),
        rough =
          (m.roughness ?? 0.7) *
          (m.roughnessMap ? sample(m.roughnessMap, uv)[1] / 255 : 1),
        spec = m.specular?.toArray() ?? [0.04, 0.04, 0.04],
        s = m.specularMap ? sample(m.specularMap, uv) : [255, 255, 255, 255],
        ao = m.aoMap
          ? 1 - (m.aoMapIntensity ?? 1) * (1 - sample(m.aoMap, uv)[0] / 255)
          : 1;
      rgb = bakeMaterialDetail({
        base: rgb.map((v) => v / 255),
        geometricNormal: t.normal,
        mappedNormal: normal,
        metalness: metal,
        roughness: rough,
        specular: spec.map((v, i) => (v * s[i]) / 255),
        occlusion: ao,
      }).map((v) => v * 255);
    }
    return [...rgb, a < (m.alphaTest || 0.5) ? 0 : 255];
  };
}
