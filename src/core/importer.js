import {importTTT2} from './ttt2/import.js';
import {textureRole, resolveFallbackMaterials} from "./material-resolution.js";
export {textureRole} from "./material-resolution.js";
import {configureSkinning} from "./skinning.js";
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TGALoader } from "three/addons/loaders/TGALoader.js";
import { MeshoptDecoder } from "meshoptimizer";
import { analyzeSkeleton, inspectWeights } from "./skeleton.js";
function mixedAlpha(data) {
  return (
    data.some((a, i) => i % 4 === 3 && a < 250) &&
    data.some((a, i) => i % 4 === 3 && a > 5)
  );
}
function hasTextureAlpha(im) {
  if (!im) return false;
  if (im.data?.length === im.width * im.height * 4) return mixedAlpha(im.data);
  if (typeof document !== "undefined" && im.width) {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(im, 0, 0, 64, 64);
      return mixedAlpha(ctx.getImageData(0, 0, 64, 64).data);
    } catch {
      return false;
    }
  }
  return false;
}
const ext = (n) => n.toLowerCase().split(".").pop();
export const key = (n) =>
  decodeURIComponent(n.replaceAll("\\", "/")).split("/").pop().toLowerCase();
export async function importCharacter(files, modelName) {
  if (!files.length) throw Error("Select a model and its local dependencies.");
  const model =
    files.find((f) => f.name === modelName) ??
    files.find((f) => ["fbx", "obj", "glb", "gltf", "nud"].includes(ext(f.name)));
  if (!model) throw Error("No supported model selected (FBX, OBJ, GLB, glTF, TTT2 NUD).");
  const urls = new Map(),
    byName = new Map(),
    missing = new Set(),
    collisions = new Set();
  for (const f of files) {
    const k = key(f.name);
    if (byName.has(k)) collisions.add(k);
    byName.set(k, f);

  }
  if (collisions.size) {
    for (const u of urls.values()) URL.revokeObjectURL(u);
    throw Error(`Ambiguous duplicate filenames: ${[...collisions].join(", ")}`);
  }
  // Create immutable Blob copies only when a loader actually requests them.
  // In particular the parsed FBX and unused maps need no Blob duplicate.
  const fileURL = f => {if(!urls.has(f.name))urls.set(f.name,URL.createObjectURL(new Blob([f.data])));return urls.get(f.name);};
  const imageFiles = files.filter(f => ["tga", "png", "jpg", "jpeg"].includes(ext(f.name)));
  const resolveFile = url => {
    const exact = byName.get(key(url)); if (exact) return exact;
    const stem = key(url).replace(/\.[^.]+$/, "");
    const choices = imageFiles.filter(f => key(f.name).replace(/\.[^.]+$/, "") === stem);
    return choices.length === 1 ? choices[0] : null;
  };
  const manager = new THREE.LoadingManager();
  manager.t3csResolveTexture = url => resolveFile(url)?.name;
  let pending = 0;
  const idle = new Set(), startItem = manager.itemStart.bind(manager), endItem = manager.itemEnd.bind(manager);
  manager.itemStart = url => { pending++; startItem(url); };
  manager.itemEnd = url => {
    try { endItem(url); }
    finally { pending--; if (pending === 0) for (const resolve of [...idle]) resolve(); }
  };
  const waitForImages = () => pending === 0 ? Promise.resolve() : new Promise((resolve, reject) => {
    const done = () => { clearTimeout(timer); idle.delete(done); resolve(); };
    const timer = setTimeout(() => { idle.delete(done); reject(Error("Texture loading did not finish within 30 seconds")); }, 30000);
    idle.add(done);
  });

  manager.addHandler(/\.tga(?:$|\?)/i, new TGALoader(manager));
  manager.setURLModifier((url) => {
    if (url.startsWith("data:") || url.startsWith("blob:")) return url;
    const f = resolveFile(url);
    if (f) return fileURL(f);
    missing.add(key(url));
    return "data:application/octet-stream;base64,";
  });
  manager.onError = (url) => missing.add(key(url));
  const warnings = [];
  let root,
    animations = [];
  try {
    const data =
      model.data instanceof ArrayBuffer
        ? model.data
        : model.data.byteOffset===0&&model.data.byteLength===model.data.buffer.byteLength?model.data.buffer:model.data.buffer.slice(model.data.byteOffset,model.data.byteOffset+model.data.byteLength);
    if (ext(model.name) === "nud") {
      const ttt2=importTTT2(files,model); root=ttt2.root; animations=ttt2.animations; warnings.push(...ttt2.warnings);
    } else if (ext(model.name) === "fbx") {
      root = new FBXLoader(manager).parse(data, "");
      animations = root.animations ?? [];
    } else if (ext(model.name) === "obj") {
      const loader = new OBJLoader(manager);
      const mtl = files.find((f) => ext(f.name) === "mtl");
      if (mtl) {
        const mats = new MTLLoader(manager).parse(
          new TextDecoder().decode(mtl.data),
          "",
        );
        mats.preload();
        loader.setMaterials(mats);
      } else
        warnings.push(
          "OBJ has no MTL: original material relationships are unavailable.",
        );
      root = loader.parse(new TextDecoder().decode(data));
    } else {
      const loader = new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder);
      const gltf = await loader.parseAsync(data, "");
      root = gltf.scene;
      animations = gltf.animations;
    }
    // LoadingManager counters are private. Track actual itemStart/itemEnd pairs;
    // a DataTexture placeholder has width=1 but no decoded pixels yet.
    await waitForImages();
    for (const mat of collectMaterials(root)) for (const slot of ["map", "normalMap", "alphaMap", "specularMap", "metalnessMap", "roughnessMap", "aoMap"]) {
      const texture = mat[slot];
      if (texture && !textureReady(texture)) {
        mat.userData.t3csUnresolvedTextures ??= [];
        mat.userData.t3csUnresolvedTextures.push({slot, name: texture.name});
        mat[slot] = null;
        warnings.push(`${mat.name}: unavailable ${slot} image; inactive until its source file is supplied.`);
      }
    }
    const loaded = new Map();
    await resolveFallbackMaterials(root, imageFiles, async (file, role) => {
      const id = file.name + ":" + (role === "diffuse" || role === "specular" ? "srgb" : "data");
      if (!loaded.has(id)) {
        const loader = ext(file.name) === "tga" ? new TGALoader(manager) : new THREE.TextureLoader(manager);
        const texture = await loader.loadAsync(fileURL(file));
        texture.name = file.name;
        texture.colorSpace = role === "diffuse" || role === "specular" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        loaded.set(id, texture);
      }
      return loaded.get(id);
    }, warnings);
    const skinning = configureSkinning(root, {normalize: true});
    if (skinning.extendedMeshes) warnings.push(`Preserved up to ${skinning.maxInfluences} skin influences per vertex across all joint sets.`);
    root.updateMatrixWorld(true);
    for (const mat of collectMaterials(root)) {
      if (mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
        const hasAlpha =
          ["fbx", "obj"].includes(ext(model.name)) &&
          hasTextureAlpha(mat.map.image);
        if (!mat.transparent && hasAlpha) {
          mat.alphaTest = Math.max(mat.alphaTest, 0.35);
          mat.side = THREE.DoubleSide;
          warnings.push(
            `${mat.name}: inferred alpha-cutout from mixed source alpha; verify hair and eyelashes visually.`,
          );
        }
      }
      if (mat.opacity === 0)
        warnings.push(
          `${mat.name}: source opacity is zero; material is intentionally invisible unless corrected.`,
        );
    }
    const stats = inspectScene(root),
      skeleton = analyzeSkeleton(root),
      weights = inspectWeights(root);
    if (stats.missingUVs)
      warnings.push(
        `${stats.missingUVs} meshes have no UV coordinates; textured atlas baking requires UVs.`,
      );
    if (missing.size)
      warnings.push(`Unresolved resources: ${[...missing].join(", ")}`);
    if (!skeleton.bones.length)
      warnings.push(
        "No source skeleton. Spatial regions are provisional; animation export needs rigging.",
      );
    if (weights.invalid || weights.unnormalized)
      warnings.push(
        `Skin weights: ${weights.invalid} invalid, ${weights.unnormalized} non-normalized vertices.`,
      );
    return {
      root,
      animations,
      skeleton,
      files: files.map((f) => ({
        name: f.name,
        bytes: f.data.byteLength,
        role: ["fbx", "obj", "glb", "gltf", "nud"].includes(ext(f.name))
          ? "model"
          : ["mtl", "bin", "nut", "bon"].includes(ext(f.name))
            ? "dependency"
            : textureRole(f.name),
      })),
      stats,
      warnings,
      weights,
      skinning,
      dispose() {
        for (const u of urls.values()) URL.revokeObjectURL(u);
        disposeScene(root);
      },
    };
  } catch (e) {
    for (const u of urls.values()) URL.revokeObjectURL(u);
    throw Error(`Import ${model.name}: ${e.message}`);
  }
}
function textureReady(texture) {
  const im = texture.image;
  if (texture.isDataTexture) return Boolean(im?.data?.length && im.width > 0 && im.height > 0);
  return Boolean(im?.width > 0 && im.height > 0 && (!('complete' in im) || (im.complete && im.naturalWidth > 0)));
}
export function collectMaterials(root) {
  const set = new Set();
  root.traverse((m) => {
    if (m.isMesh)
      for (const mat of Array.isArray(m.material) ? m.material : [m.material])
        set.add(mat);
  });
  return set;
}
export function describeMaterials(root) {
  return [...collectMaterials(root)].map(m => ({
    name: m.name, type: m.type, vertexColors: m.vertexColors, opacity: m.opacity,
    alphaTest: m.alphaTest, transparent: m.transparent,
    textures: Object.fromEntries(["map", "normalMap", "alphaMap", "specularMap", "metalnessMap", "roughnessMap", "aoMap"].filter(k => m[k]).map(k => [k, {name: m[k].name, width: m[k].image?.width, height: m[k].image?.height}])),
    resolution: m.userData.t3csTextureResolution ?? {method: m.map ? "source-binding" : "untextured"},
    originalAppearance: m.userData.t3csSourceAppearance,
    unresolvedTextures: m.userData.t3csUnresolvedTextures,
  }));
}
export function collectTextures(root) {
  const set = new Set();
  for (const m of collectMaterials(root))
    for (const v of Object.values(m)) if (v?.isTexture) set.add(v);
  return set;
}
export function inspectScene(root) {
  let meshes = 0,
    vertices = 0,
    triangles = 0,
    invalidPositions = 0,
    missingUVs = 0,
    skinnedMeshes = 0;
  root.traverse((m) => {
    if (!m.isMesh) return;
    meshes++;
    const g = m.geometry,
      p = g.attributes.position;
    if (!p) return;
    vertices += p.count;
    triangles += (g.index ? g.index.count : p.count) / 3;
    if (!g.attributes.uv) missingUVs++;
    if (m.isSkinnedMesh) skinnedMeshes++;
    for (let i = 0; i < p.count; i++)
      for (let k = 0; k < 3; k++)
        if (!Number.isFinite(p.getComponent(i, k))) invalidPositions++;
  });
  return {
    meshes,
    vertices,
    triangles,
    materials: collectMaterials(root).size,
    textures: collectTextures(root).size,
    skinnedMeshes,
    missingUVs,
    invalidPositions,
  };
}
export function disposeScene(root) {
  const geos = new Set();
  root.traverse((m) => {
    if (m.isMesh) geos.add(m.geometry);
  });
  for (const g of geos) g.dispose();
  for (const t of collectTextures(root)) t.dispose();
  for (const m of collectMaterials(root)) m.dispose();
}
