import * as THREE from "three";
import {inspectNativeMotion} from "./native-motion.js";
import {
  decodeDonor,
  decodeTextureArchive,
  evaluateTerms,
  materialTexel,
  donorPreview,
} from "./donor.js";
import {
  parseBindProfile,
  sourceBindFrames,
  retargetSourceVertex,
  digest,
} from "./bind.js";
import { SurfaceIndex, triangleRecord, materialSampler } from "./surface.js";
import { rebuildNativeNormals } from "./native-rebuild.js";
import { quantize, rgba555, writeTIM, readARC } from "./ps1.js";
import {pixelateRGBA} from './art-atlas.js';

function abort(signal) {
  if (signal?.aborted) throw Error("Native reconstruction cancelled");
}
export function sourceSurfaces(root, profile) {
  root.updateMatrixWorld(true);
  const bind = sourceBindFrames(root, profile),
    regional = new Map(),
    materials = new Set();
  let vertices = 0;
  root.traverseVisible((mesh) => {
    if (!mesh.isMesh) return;
    const g = mesh.geometry,
      idx = g.index,
      total = idx?.count ?? g.attributes.position.count,
      points = [];
    for (let i = 0; i < g.attributes.position.count; i++) {
      points.push(retargetSourceVertex(mesh, i, bind, profile));
      vertices++;
    }
    const groups = g.groups.length
        ? g.groups
        : [{ start: 0, count: total, materialIndex: 0 }],
      mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const group of groups) {
      const material = mats[group.materialIndex];
      if (!material) throw Error("Invalid source material group");
      if (material.userData.t3csTextureResolution?.method === "untextured-eye-shell-fallback") continue;
      materials.add(material);
      for (let t = group.start; t < group.start + group.count; t += 3) {
        const ids = [0, 1, 2].map((k) => (idx ? idx.getX(t + k) : t + k)),
          roles = ids.map((i) => points[i].role),
          role =
            roles.find((r) => roles.filter((v) => v === r).length >= 2) ??
            roles[0],
          uv = g.attributes.uv,
          record = triangleRecord(
            ids.map((i) => points[i].point),
            {
              material,
              region: role,
              uvs: uv
                ? ids.map((i) => new THREE.Vector2(uv.getX(i), uv.getY(i)))
                : null,
            },
          );
        if (!record) continue;
        if (!regional.has(role)) regional.set(role, []);
        regional.get(role).push(record);
      }
    }
  });
  return {
    regional: new Map(
      [...regional].map(([role, triangles]) => [
        role,
        new SurfaceIndex(triangles),
      ]),
    ),
    materials,
    vertices,
    bind,
  };
}
export function projectTemplate(
  decoded,
  profile,
  surfaces,
  { seamIterations = 60, maxProjectionDistance = Infinity } = {},
) {
  for (const shared of decoded.sharedVertexOwners ?? []) {
    const [first, ...other] = shared.rows;
    if (
      other.some(
        (r) =>
          !profile.frames[r].equals(profile.frames[first]) ||
          profile.rowRoles[r] !== profile.rowRoles[first],
      )
    )
      throw Error(
        "Shared donor vertex block needs topology splitting before asymmetric projection",
      );
  }
  const world = new Map(),
    local = new Map();
  let maxDistance = 0,
    totalDistance = 0;
  for (const v of decoded.ownVertices) {
    const role = profile.rowRoles[v.row],
      surface = surfaces.get(role);
    if (!surface)
      throw Error(`No source surface for donor row ${v.row} (${role})`);
    const initial = new THREE.Vector3()
        .fromArray(v.position)
        .applyMatrix4(profile.frames[v.row]),
      hit = surface.nearest(initial, maxProjectionDistance);
    if (!hit)
      throw Error(`Donor row ${v.row} lies outside source projection range`);
    world.set(v.offset, hit.point);
    maxDistance = Math.max(maxDistance, hit.distance);
    totalDistance += hit.distance;
  }
  // Orthogonal projection onto seam equality constraints. Shared/cache topology remains intact.
  let seamResidual = 0;
  for (let iteration = 0; iteration < seamIterations; iteration++) {
    seamResidual = 0;
    for (const c of decoded.constraints) {
      const coefficients = new Map();
      for (const [terms, sign] of [
        [c.a, 1],
        [c.b, -1],
      ])
        for (const t of terms)
          coefficients.set(
            t.vertex.offset,
            (coefficients.get(t.vertex.offset) ?? 0) + sign * t.weight,
          );
      const error = new THREE.Vector3();
      let denominator = 0;
      for (const [offset, w] of coefficients) {
        error.addScaledVector(world.get(offset), w);
        denominator += w * w;
      }
      if (denominator < 1e-12) continue;
      seamResidual = Math.max(seamResidual, error.length());
      for (const [offset, w] of coefficients)
        world.get(offset).addScaledVector(error, -w / denominator);
    }
    if (seamResidual < 1e-5) break;
  }
  const bytes = decoded.model.bytes.slice(),
    view = new DataView(bytes.buffer);
  for (const v of decoded.ownVertices) {
    const p = world
      .get(v.offset)
      .clone()
      .applyMatrix4(profile.frames[v.row].clone().invert())
      .toArray()
      .map(Math.round);
    if (p.some((v) => v < -32768 || v > 32767))
      throw Error("Reconstructed donor vertex exceeds s16 coordinates");
    local.set(v.offset, p);
    for (let k = 0; k < 3; k++) view.setInt16(v.offset + k * 2, p[k], true);
  }
  return {
    bytes,
    positions: local,
    report: {
      ownVertices: world.size,
      maxProjectionDistance: maxDistance,
      meanProjectionDistance: totalDistance / world.size,
      seamResidualBeforeQuantization: seamResidual,
    },
  };
}
function barycentricUV(uvs, u, v) {
  const [a, b, c] = uvs,
    det = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  if (Math.abs(det) < 1e-9) return null;
  const x = ((b[1] - c[1]) * (u - c[0]) + (c[0] - b[0]) * (v - c[1])) / det,
    y = ((c[1] - a[1]) * (u - c[0]) + (a[0] - c[0]) * (v - c[1])) / det;
  return [x, y, 1 - x - y];
}
export async function bakeDonorTextures(
  decoded,
  profile,
  positions,
  archive,
  surfaces,
  sample,
  { onProgress = () => {}, signal, art = null } = {},
) {
  const pixels = new Map(
      archive.tiles.map((tile) => {
        const rgba = new Uint8Array(tile.indices.length * 4);
        for (let i = 0; i < tile.indices.length; i++)
          rgba.set(rgba555(tile.palette[tile.indices[i]]), i * 4);
        return [tile.entry, rgba];
      }),
    ),
    written = new Map(),
    conflicts = [],
    used = new Set();
  let samples = 0;
  for (let rowIndex = 0; rowIndex < decoded.rows.length; rowIndex++) {
    abort(signal);
    const row = decoded.rows[rowIndex],
      surface = surfaces.get(profile.rowRoles[row.row]);
    if (!surface) throw Error("Missing anatomically matched bake surface");
    for (const poly of row.polygons) {
      const points = poly.vertices.map((t) =>
          evaluateTerms(t, profile.frames, positions),
        ),
        triangles =
          poly.slots.length === 4
            ? [
                [0, 1, 2],
                [1, 3, 2],
              ]
            : [[0, 1, 2]];
      for (const ids of triangles) {
        const uvs = ids.map((i) => poly.uvs[i]),
          minX = Math.max(0, Math.ceil(Math.min(...uvs.map((p) => p[0])))),
          maxX = Math.min(255, Math.floor(Math.max(...uvs.map((p) => p[0])))),
          minY = Math.max(0, Math.ceil(Math.min(...uvs.map((p) => p[1])))),
          maxY = Math.min(255, Math.floor(Math.max(...uvs.map((p) => p[1]))));
        for (let v = minY; v <= maxY; v++)
          for (let u = minX; u <= maxX; u++) {
            const bary = barycentricUV(uvs, u, v);
            if (!bary || bary.some((b) => b < -1e-7)) continue;
            const target = materialTexel(archive, poly.material, u, v),
              world = new THREE.Vector3();
            for (let k = 0; k < 3; k++)
              world.addScaledVector(points[ids[k]], bary[k]);
            const hit = surface.nearest(world),
              rgba = sample(hit),
              key = `${target.tile.entry}:${target.pixel}`,
              previous = written.get(key);
            if (
              previous &&
              Math.max(...rgba.map((c, k) => Math.abs(c - previous[k]))) > 48
            ) {
              conflicts.push({
                row: row.row,
                entry: target.tile.entry,
                pixel: target.pixel,
              });
              continue;
            }
            written.set(key, rgba);
            pixels.get(target.tile.entry).set(rgba, target.pixel * 4);
            used.add(target.tile.entry);
            samples++;
          }
      }
    }
    onProgress({
      step: "Donor UV surface baking",
      fraction: (rowIndex + 1) / decoded.rows.length,
    });
    await new Promise((r) => setTimeout(r, 0));
  }
  if (conflicts.length)
    throw Error(
      `${conflicts.length} donor UV texels require incompatible source colors (mirrored/overlapping UVs). Native bake stopped instead of overwriting features.`,
    );
  // Quantize all tiles sharing each CLUT together; preserve archive members and byte ranges.
  const groups = new Map();
  for (const tile of archive.tiles) {
    const key = `${tile.clut}:${tile.palette.length}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tile);
  }
  const replacements = new Map();
  for (const tiles of groups.values()) {
    if (!tiles.some((t) => used.has(t.entry))) continue;
    const length = tiles.reduce((s, t) => s + pixels.get(t.entry).length, 0),
      rgba = new Uint8Array(length);
    let offset = 0;
    for (const t of tiles) {
      rgba.set(pixels.get(t.entry), offset);
      offset += pixels.get(t.entry).length;
    }
    const q = quantize(art?pixelateRGBA(rgba,art.pixelation,art.dither,tiles[0].width,art.colorLevels):rgba, tiles[0].palette.length);
    offset = 0;
    for (const t of tiles) {
      const indices = q.indices.slice(offset, offset + t.indices.length);
      offset += t.indices.length;
      const tim = writeTIM({ ...t, indices, palette: q.palette });
      if (tim.length !== t.bytes.length)
        throw Error("Texture replacement changes donor TIM size");
      replacements.set(t.entry, tim);
    }
  }
  return {
    replacements,
    report: {
      paintedSamples: samples,
      paintedTiles: used.size,
      reindexedTiles: replacements.size,
      conflictingTexels: conflicts.length,
    },
  };
}
export function patchArchive(original, replacements) {
  const bytes = original.slice(),
    v = new DataView(bytes.buffer),
    entries = readARC(original);
  for (const [entry, replacement] of replacements) {
    if (!entries[entry] || replacement.length !== entries[entry].length)
      throw Error("ARC replacement must preserve member size");
    const offset = v.getUint32(4 + entry * 8, true);
    bytes.set(replacement, offset);
  }
  return bytes;
}
export async function reconstructOnDonor({
  source,
  donor,
  textureARC,
  bindProfile,
  onProgress = () => {},
  signal,
  maxProjectionDistance,
  materialMode = "albedo",
}) {
  abort(signal);
  const decoded = decodeDonor(donor),
    profile = await parseBindProfile(bindProfile, decoded),
    archive = decodeTextureArchive(textureARC);
  onProgress({
    step: "Retargeting source into donor bind frames",
    fraction: 0,
  });
  const surfaces = sourceSurfaces(source.root, profile),
    projection = projectTemplate(decoded, profile, surfaces.regional, {
      maxProjectionDistance,
    });
  abort(signal);
  const baked = await bakeDonorTextures(
      decoded,
      profile,
      projection.positions,
      archive,
      surfaces.regional,
      materialSampler(surfaces.materials, { mode: materialMode }),
      { onProgress, signal, art:source.artSettings },
    ),
    arc = patchArchive(textureARC, baked.replacements),
    rebuilt = rebuildNativeNormals(projection.bytes, profile.frames),
    result = rebuilt.decoded;
  const sourcePreview=retargetedPreview(surfaces),preview=donorPreview(result,profile.frames,decodeTextureArchive(arc)),segments=[];
  for(const [a,b]of [['hips','spine'],['spine','head'],['spine','leftShoulder'],['leftShoulder','leftUpperArm'],['leftUpperArm','leftLowerArm'],['leftLowerArm','leftHand'],['spine','rightShoulder'],['rightShoulder','rightUpperArm'],['rightUpperArm','rightLowerArm'],['rightLowerArm','rightHand'],['hips','leftUpperLeg'],['leftUpperLeg','leftLowerLeg'],['leftLowerLeg','leftFoot'],['hips','rightUpperLeg'],['rightUpperLeg','rightLowerLeg'],['rightLowerLeg','rightFoot']]){const x=profile.frames[profile.roleRows[a]],y=profile.frames[profile.roleRows[b]];if(x&&y)segments.push(...new THREE.Vector3().setFromMatrixPosition(x).toArray(),...new THREE.Vector3().setFromMatrixPosition(y).toArray());}
  sourcePreview.userData.boneSegments=segments;preview.userData.boneSegments=segments;
  const after = await digest(rebuilt.model);
  return {
    model: rebuilt.model,
    relocations: rebuilt.relocations,
    arc,
    decoded: result,
    profile,
    positions: new Map(result.ownVertices.map((v) => [v.offset, v.position])),
    preview,sourcePreview,
    report: {
      schema: "t3cs-donor-reconstruction/1",
      method:
        "anatomically retargeted nearest-surface projection onto original donor topology",
      donorSha256: profile.donorSha256,
      modelSha256: after,
      bindingEvidence: profile.verification,
      motionDiagnostics: inspectNativeMotion(result, profile),
      donorBytes: donor.length,
      modelBytes: rebuilt.model.length,
      textureARCBytes: arc.length,
      topology: result.report,
      projection: projection.report,
      normals: rebuilt.report,
      baking: { ...baked.report, materialMode },
      gameVerified: false,
      limitations: [
        "Game execution and donor animation compatibility have not been tested.",
        "Bind frame input must be established against the actual donor/runtime.",
        "Flat normals are rebuilt; smooth Gouraud relighting is not preserved.",
        "Mirrored UVs that need different source colors are rejected.",
        materialMode === "albedo"
          ? "Normal/specular/metallic maps are excluded in albedo mode."
          : "PBR and normal detail use a fixed bake light/view; dynamic PBR is not retained in PS1 textures.",
        "Donor topology cannot add missing hair sheets or accessories.",
      ],
    },
  };
}

export function retargetedPreview(surfaces) {
  const root = new THREE.Group();
  root.name = "High-resolution source in donor bind frames";
  const materialCopies = new Map();
  for (const [role, surface] of surfaces.regional) {
    const groups = new Map();
    for (const t of surface.triangles) {
      if (!groups.has(t.material)) groups.set(t.material, []);
      groups.get(t.material).push(t);
    }
    for (const [material, triangles] of groups) {
      const geometry = new THREE.BufferGeometry(),
        positions = [],
        uvs = [];
      for (const t of triangles)
        for (let k = 0; k < 3; k++) {
          positions.push(...t.points[k].toArray());
          uvs.push(...(t.uvs?.[k]?.toArray() ?? [0, 0]));
        }
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geometry.computeVertexNormals();
      if (!materialCopies.has(material)) {
        const copy = material.clone();
        for (const [key, value] of Object.entries(copy))
          if (value?.isTexture) copy[key] = value.clone();
        materialCopies.set(material, copy);
      }
      const mesh = new THREE.Mesh(geometry, materialCopies.get(material));
      mesh.name = `Retargeted ${role}`;
      root.add(mesh);
    }
  }
  return root;
}
