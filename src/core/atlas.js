import {requireBakeUV} from './bake-uv.js';
import {dilateChartTexels} from './uv-raster.js';
import {sourceSkinLighting,bilinearRGBA,sourceSkinCoverage} from './skin-surface.js';
import {readbackCache} from './readback-cache.js';
import {filteredRGBA,cutoutThreshold,resampleDataMap} from './texture-filter.js';
import {materialUVDomains} from "./uv-domain.js";
import {artAtlasLayout,pixelateRGBA,artTextureColors,stagingTIMLayout} from './art-atlas.js';
import {configureSkinning} from "./skinning.js";
import * as THREE from "three";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { collectMaterials } from "./importer.js";
import { quantize, writeTIM } from "./ps1.js";
function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}
function pixels(texture, size, dataMap=false) {
  const im=texture?.image;if(!im)return null;
  if(dataMap&&im.data)return resampleDataMap(im,size);
  const c=canvas(size,size),ctx=c.getContext('2d',{willReadFrequently:true});
  let scratch=null;
  if (im.data) {
    const src = canvas(im.width, im.height),
      sc = src.getContext("2d");
    let data = im.data;
    if (data.length !== im.width * im.height * 4)
      throw Error("Unsupported texture channel layout");
    sc.putImageData(
      new ImageData(data.BYTES_PER_ELEMENT===1?new Uint8ClampedArray(data.buffer,data.byteOffset,data.byteLength):new Uint8ClampedArray(data), im.width, im.height),
      0,
      0,
    );
    ctx.drawImage(src, 0, 0, size, size);scratch=src;
  } else ctx.drawImage(im, 0, 0, size, size);
  const result=ctx.getImageData(0, 0, size, size);
  if(scratch)scratch.width=scratch.height=1;
  c.width=c.height=1;return result;
}
function coordinate(texture, u, v) {
  if(texture.matrixAutoUpdate)texture.updateMatrix();
  const t = new THREE.Vector2(u, v);
  texture.transformUv(t);
  return t;
}
export async function bakeAtlas(
  converted,
  { size, alphaCutoff = 0.5, onProgress = () => {}, art = null } = {},
) {
  size??=art&&!['v060','dev1'].includes(art.reconstruction)?512:256;
  const root = clone(converted.root);
  root.traverse(m=>{if(m.isMesh)for(const material of Array.isArray(m.material)?m.material:[m.material])requireBakeUV(m.geometry,material);});
  const materials = [...collectMaterials(root)];
  if (materials.length > 32)
    throw Error(
      `Found ${materials.length} materials. Preparation staging supports 32 separate CLUT rows. Native donor capacity is validated separately.`,
    );
  const domains = materialUVDomains(root, materials);
  const grid = Math.ceil(Math.sqrt(materials.length)),
    defaultCell = Math.floor(size / grid / 4) * 4,
    gutter = 2,
    atlas = canvas(size, size),
    ctx = atlas.getContext("2d"),
    rgba = new Uint8Array(size * size * 4),
    tiles = [],
    warnings = [];
  const layout=art?artAtlasLayout(materials,size,art):materials.map((m,i)=>({side:defaultCell,x:(i%grid)*defaultCell,y:Math.floor(i/grid)*defaultCell}));
  const timLayout=art?stagingTIMLayout(materials.map((m,i)=>({width:layout[i].width??layout[i].side,height:layout[i].height??layout[i].side,colors:artTextureColors(m.name,art,m)}))):null;
  const samplingSize=m=>art&&m.userData?.t3csSkinSurface?1024:art&&/hair|faceacc|strand/i.test(m.name)?Math.max(16,Math.round(512*(1-art.pixelation/120))):512;
  const requests=materials.flatMap(m=>[{texture:m.map,size:samplingSize(m)},{texture:m.alphaMap,size:samplingSize(m),data:true},{texture:m.normalMap,size:samplingSize(m),data:true}]),cache=readbackCache(requests,pixels),cachedPixels=cache.read;
  for (let i = 0; i < materials.length; i++) {
    const cell=layout[i].width??layout[i].side,cellHeight=layout[i].height??layout[i].side;
    const sampleSize=samplingSize(materials[i]);
    const m = materials[i],
      origin = domains.get(m),
      tile = canvas(cell, cellHeight),
      tc = tile.getContext("2d"),
      image = tc.createImageData(cell, cellHeight),
      base = cachedPixels(m.map, sampleSize),
      alpha = cachedPixels(m.alphaMap, sampleSize,true),
      normal = cachedPixels(m.normalMap, sampleSize,true),
      color =
        m.color?.clone().convertLinearToSRGB() ?? new THREE.Color(1, 1, 1);
    if (m.metalnessMap || m.roughnessMap || m.specularMap)
      warnings.push(
        `${m.name}: metallic/roughness/specular maps retained in source; PS1 bake uses diffuse + alpha + approximate normal shading.`,
      );
    const coverage=art&&origin[0]===0&&origin[1]===0?sourceSkinCoverage(m,cell,cellHeight,gutter):null;
    let coverageStats=null;
    for (let y = 0; y < cellHeight; y++)
      for (let x = 0; x < cell; x++) {
        const pixel=y*cell+x;if(coverage&&!coverage.valid[pixel])continue;const seed=coverage?.seeds.get(pixel);
        const u = seed?.u ?? Math.max(
            0,
            Math.min(1, (x - gutter) / (cell - 1 - 2 * gutter)),
          ),
          v = seed?.v ?? (
            1 -
            Math.max(0, Math.min(1, (y - gutter) / (cellHeight - 1 - 2 * gutter)))),
          sample = (img, tex) => {
            if (!img) return [255, 255, 255, 255];
            if(art&&/lash|hair|faceacc|strand/i.test(m.name)&&(m.alphaMap||m.transparent||m.alphaTest>0)){
              const footprint=.25/(cell-1-2*gutter),coordinates=[];
              for(const dx of [-footprint,footprint])for(const dy of [-footprint,footprint]){
                const q=coordinate(tex,Math.max(0,Math.min(1,u+dx))+origin[0],Math.max(0,Math.min(1,v+dy))+origin[1]);coordinates.push([q.x,q.y]);
              }
              return filteredRGBA(img,coordinates,{alphaWeighted:tex===m.map});
            }
            const uv = coordinate(tex, u + origin[0], v + origin[1]),
              sx = Math.max(
                0,
                Math.min(img.width - 1, Math.floor(uv.x * img.width)),
              ),
              sy = Math.max(
                0,
                Math.min(img.height - 1, Math.floor(uv.y * img.height)),
              ),
              p = (sy * img.width + sx) * 4;
            return m.userData?.t3csSkinSurface?bilinearRGBA(img,uv.x,uv.y):img.data.subarray(p, p + 4);
          };
        const c = sample(base, m.map),
          a = sample(alpha, m.alphaMap);
        let shade = 1,mappedNormal=null;
        if (normal) {
          const n = sample(normal, m.normalMap),
            nx = (n[0] / 127.5 - 1) * (m.normalScale?.x ?? 1),
            ny = (n[1] / 127.5 - 1) * (m.normalScale?.y ?? 1),
            nz = n[2] / 127.5 - 1;
          if(m.userData?.t3csSkinSurface)mappedNormal=new THREE.Vector3(nx,ny,nz).normalize();
          shade =
            0.7 +
            0.3 *
              Math.max(
                0,
                (-0.3 * nx + 0.5 * ny + 0.8 * nz) /
                  Math.max(0.01, Math.hypot(nx, ny, nz)),
              );
        }
        shade=m.userData?.t3csSkinSurface?sourceSkinLighting(m,u,v,mappedNormal,shade):shade*sourceSkinLighting(m,u,v);
        const p = (y * cell + x) * 4;
        image.data.set(
          [
            c[0] * color.r * shade,
            c[1] * color.g * shade,
            c[2] * color.b * shade,
            (m.transparent || m.alphaTest > 0 ? c[3] / 255 : 1) *
              (alpha ? a[1] / 255 : 1) *
              (m.opacity ?? 1) >=
            (art&&/lash/i.test(m.name)?cutoutThreshold(m,alphaCutoff):(m.alphaTest > 0 ? m.alphaTest : alphaCutoff))
              ? 255
              : 0,
          ],
          p,
        );
      }
    if(coverage)coverageStats={...dilateChartTexels(image.data,coverage.valid,new Uint8Array(cell*cellHeight),cell,cellHeight),sourceTriangles:coverage.sourceTriangles,subpixelSourceSeeds:coverage.seeds.size};
    const colors=artTextureColors(m.name,art,m);
    const q = quantize(art?pixelateRGBA(image.data,art.pixelation,art.dither,cell,art.colorLevels):new Uint8Array(image.data), colors);
    tc.putImageData(
      new ImageData(new Uint8ClampedArray(q.rgba), cell, cellHeight),
      0,
      0,
    );
    const ox = layout[i].x,
      oy = layout[i].y;
    ctx.drawImage(tile, ox, oy);
    for (let y = 0; y < cellHeight; y++)
      rgba.set(
        q.rgba.subarray(y * cell * 4, (y + 1) * cell * 4),
        ((oy + y) * size + ox) * 4,
      );
    tiles.push({
      material: m.name,
      sourceCoverage:coverageStats,
      sourceSkinBake:m.userData?.t3csSkinBake??null,
      sourceUVOrigin: origin,
      clut: art ? ((480+i)<<6)|48 : 64 + i,
      x: ox,
      y: oy,
      width: cell,
      height: cellHeight,
      palette: q.palette,
      indices: q.indices,
      tim: writeTIM({
        width: cell,
        height: cellHeight,
        indices: q.indices,
        palette: q.palette,
        x: timLayout?timLayout[i].x:ox / (colors===256?2:4),
        y: timLayout?timLayout[i].y:oy,
        clutX: art ? 768 : i * 16,
        clutY: art ? 480+i : 1,
      }),
    });
    onProgress({
      step: "Texture baking / RGB555 quantization",
      fraction: (i + 1) / materials.length,
    });
    await new Promise((r) => setTimeout(r, 0));
  }
  cache.clear();
  const texture = new THREE.CanvasTexture(atlas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  if(art?.filter==='linear'){texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearFilter;}
  const newMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    alphaTest: alphaCutoff,
    side: THREE.DoubleSide,
  });
  root.traverse((mesh) => {
    if (!mesh.isMesh) return;
    const input = mesh.geometry,
      g = input.toNonIndexed(),
      uv =
        g.attributes.uv ??
        new THREE.Float32BufferAttribute(
          new Float32Array(g.attributes.position.count * 2),
          2,
        ),
      mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material],
      groups = g.groups.length
        ? g.groups
        : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
    for (const group of groups) {
      const material = mats[group.materialIndex], tile = tiles[materials.indexOf(material)], origin = domains.get(material), cell=tile.width,cellHeight=tile.height, sourceUV=requireBakeUV(g,material)??uv;
      for (let j = group.start; j < group.start + group.count; j++) {
        const u = Math.max(0, Math.min(1, sourceUV.getX(j) - origin[0])),
          v = Math.max(0, Math.min(1, sourceUV.getY(j) - origin[1]));
        uv.setXY(
          j,
          (tile.x + gutter + u * (cell - 1 - 2 * gutter)) / size,
          1 - (tile.y + gutter + (1 - v) * (cellHeight - 1 - 2 * gutter)) / size,
        );
      }
    }
    g.setAttribute("uv", uv);
    if(art?.flat)g.computeVertexNormals();
    g.clearGroups();
    mesh.geometry = g;
    mesh.material = newMaterial;
  });
  warnings.push(
    "Atlas stage resamples material maps. Anatomical stages report their source-surface albedo baking separately; normal lighting remains an approximation.",
  );
  if(art)warnings.push('Preparation 4/8-bit TIMs use staging VRAM/CLUT coordinates, not the game allocation. Native export retains the donor texture layout.');
  configureSkinning(root);
  return {
    root,
    canvas: atlas,
    rgba,
    tiles,
    readbackStats:{...cache.stats},
    warnings,
    textureBytes: tiles.reduce((n,t)=>n+t.width*t.height*(t.palette.length===256?1:.5),0),
    paletteBytes: tiles.reduce((n,t)=>n+t.palette.byteLength,0),
  };
}
