import { edgeConnectedSurfaces } from "./surface-components.js";
import * as THREE from "three";
import { boundaryLoops } from "./boundary-loops.js";
import { reduceBodySurface } from "./body-surface.js";
import { SurfaceIndex, triangleRecord, materialSampler } from "./surface.js";
import {
  transferSurfaceAttributes,
  surfaceTexture,
  subsetSurface,
} from "./projected-topology.js";
import { skinSets } from "./skinning.js";
import { sourceSkinLighting } from "./skin-surface.js";
import { repairWinding } from "./winding.js";
import { compareBoundaries } from "./mesh-integrity.js";

// Five/six measured digital patches, source collar loops and articulated source
// bone curves. Unknown rigs retain the established source-hand fallback.
export function reconstructAnatomicalHand(
  g,
  material,
  { mesh, hand, simplifier, columns = 8, textureSize = 256 } = {},
) {
  const fail = (reason) => ({ geometry: null, reason });
  if (!mesh?.skeleton || !hand || !g.attributes.uv)
    return fail("No reliable hand rig or UV surface");
  const local = mesh.matrixWorld.clone().invert(),
    point = (b) => b.getWorldPosition(new THREE.Vector3()).applyMatrix4(local),
    chains = hand.children
      .filter((b) => b.isBone)
      .map((b) => {
        const chain = [];
        while (b?.isBone && chain.length < 8) {
          chain.push(b);
          const children = b.children.filter((c) => c.isBone);
          if (children.length !== 1) break;
          b = children[0];
        }
        return chain;
      })
      .filter(
        (c) => c.length >= 3 && point(c.at(-1)).distanceTo(point(c[0])) > 1e-5,
      );
  if (chains.length < 3 || chains.length > 6)
    return fail("Ambiguous structural finger branches");
  const p = g.attributes.position,
    uv = g.attributes.uv,
    index = g.index,
    sets = skinSets(g),
    boneIndex = new Map(mesh.skeleton.bones.map((b, i) => [b, i])),
    digitSets = chains.map(
      (chain) => new Set(chain.slice(-3).map((b) => boneIndex.get(b))),
    ),
    scores = Array.from(
      { length: p.count },
      () => new Float32Array(chains.length),
    );
  for (let v = 0; v < p.count; v++)
    for (const [j, w] of sets)
      for (let k = 0; k < 4; k++)
        for (let d = 0; d < chains.length; d++)
          if (digitSets[d].has(j.getComponent(v, k)))
            scores[v][d] += w.getComponent(v, k);
  const records = [],
    patches = chains.map(() => []),
    palm = [];
  for (let t = 0; t < index.count; t += 3) {
    const ids = [0, 1, 2].map((k) => index.getX(t + k)),
      r = triangleRecord(
        ids.map((i) => new THREE.Vector3().fromBufferAttribute(p, i)),
        {
          uvs: ids.map((i) => new THREE.Vector2().fromBufferAttribute(uv, i)),
          material,
        },
      );
    if (!r) continue;
    r.ids = ids;
    records.push(r);
    const weights = chains.map(
        (_, d) => ids.reduce((s, i) => s + scores[i][d], 0) / 3,
      ),
      value = Math.max(...weights);
    (value > 0.6 ? patches[weights.indexOf(value)] : palm).push(r);
  }
  if (!palm.length || patches.some((r) => r.length < 24))
    return fail("Insufficient measured palm or finger surface");
  const accessories = [],
    sourceFingerCounts = patches.map((p) => p.length);
  for (let d = 0; d < patches.length; d++) {
    const components = edgeConnectedSurfaces(
        g,
        patches[d].flatMap((r) => r.ids),
      ),
      open = [];
    for (const indices of components) {
      const view = new THREE.BufferGeometry();
      view.setAttribute("position", p);
      view.setIndex(indices);
      const loops = boundaryLoops(view);
      view.dispose();
      const triangles = [];
      const ids = new Set(indices);
      for (const r of patches[d])
        if (r.ids.every((i) => ids.has(i))) triangles.push(r);
      if (loops.length) open.push(triangles);
      else accessories.push(triangles);
    }
    if (open.length !== 1) return fail("Ambiguous connected finger surfaces");
    patches[d] = open[0];
  }
  const center = chains
      .reduce((v, c) => v.add(point(c[0])), new THREE.Vector3())
      .multiplyScalar(1 / chains.length),
    spread = point(chains.at(-1)[0]).sub(point(chains[0][0])),
    palmNormal = new THREE.Vector3()
      .crossVectors(spread, center.clone().sub(point(hand)))
      .normalize();
  if (palmNormal.lengthSq() < 0.1)
    return fail("Degenerate measured palm frame");
  const paths = [];
  for (let d = 0; d < chains.length; d++) {
    const chain = chains[d].slice(-3),
      curve = chain.map(point),
      direction = curve[2].clone().sub(curve[1]).normalize(),
      last = boneIndex.get(chain[2]);
    let extent = 0;
    const distalPoints=new Map();
    for (const r of patches[d])
      for (const v of r.ids) {
        let weight = 0;
        for (const [j, w] of sets)
          for (let k = 0; k < 4; k++)
            if (j.getComponent(v, k) === last) weight += w.getComponent(v, k);
        if(weight>.4){const position=new THREE.Vector3().fromBufferAttribute(p,v),s=position.clone().sub(curve[2]).dot(direction);extent=Math.max(extent,s);distalPoints.set(position.toArray().map(v=>Math.round(v*1e6)).join(','),{position,s});}
      }
    if (extent <= 1e-4 || extent > curve[2].distanceTo(curve[1]) * 2)
      return fail("Unreliable measured fingertip extent");
    const frontier=[...distalPoints.values()].filter(q=>q.s>=extent*.95),tipCenter=frontier.reduce((center,q)=>center.add(q.position),new THREE.Vector3()).divideScalar(frontier.length);
    curve.push(tipCenter);

    const distances = [0];
    for (let i = 1; i < curve.length; i++)
      distances.push(distances[i - 1] + curve[i].distanceTo(curve[i - 1]));
    const length = distances.at(-1),
      projectArc = (q) => {
        let best = null;
        for (let i = 0; i < curve.length - 1; i++) {
          const line = new THREE.Line3(curve[i], curve[i + 1]),
            s = THREE.MathUtils.clamp(
              line.closestPointToPointParameter(q),
              0,
              1,
            ),
            nearest = line.at(s, new THREE.Vector3()),
            distance = nearest.distanceToSquared(q);
          if (!best || distance < best.distance)
            best = {
              distance,
              s: distances[i] + s * (distances[i + 1] - distances[i]),
            };
        }
        return best.s;
      },
      frame = (s) => {
        let i = 0;
        while (i < curve.length - 2 && distances[i + 1] < s) i++;
        const axis = curve[i + 1].clone().sub(curve[i]).normalize(),
          center = curve[i]
            .clone()
            .lerp(
              curve[i + 1],
              THREE.MathUtils.clamp(
                (s - distances[i]) / (distances[i + 1] - distances[i]),
                0,
                1,
              ),
            ),
          x = new THREE.Vector3().crossVectors(palmNormal, axis).normalize();
        if (x.lengthSq() < 0.1)
          x.crossVectors(new THREE.Vector3(1, 0, 0), axis).normalize();
        return {
          center,
          axis,
          x,
          y: new THREE.Vector3().crossVectors(axis, x).normalize(),
        };
      };
    const view = new THREE.BufferGeometry();
    view.setAttribute("position", p);
    view.setIndex(patches[d].flatMap((r) => r.ids));
    const loops = boundaryLoops(view);
    view.dispose();
    if (loops.length !== 1 || loops[0].length < 5)
      return fail("Finger patch lacks one reliable palm interface");
    let collar = loops[0];
    const base =
        collar.reduce(
          (n, i) =>
            n + projectArc(new THREE.Vector3().fromBufferAttribute(p, i)),
          0,
        ) / collar.length,
      baseFrame = frame(base),
      collarCenter = collar
        .reduce(
          (n, i) => n.add(new THREE.Vector3().fromBufferAttribute(p, i)),
          new THREE.Vector3(),
        )
        .multiplyScalar(1 / collar.length),
      q = (i) =>
        new THREE.Vector3().fromBufferAttribute(p, i).sub(collarCenter),
      area = collar.reduce(
        (sum, i, k) =>
          sum +
          new THREE.Vector3()
            .crossVectors(q(i), q(collar[(k + 1) % collar.length]))
            .dot(baseFrame.axis),
        0,
      );
    if (area < 0) collar = collar.slice().reverse();
    const angle = (i) =>
        (Math.atan2(q(i).dot(baseFrame.y), q(i).dot(baseFrame.x)) /
          (Math.PI * 2) +
          1) %
        1,
      start = collar.reduce(
        (best, i, k) => (angle(i) < angle(collar[best]) ? k : best),
        0,
      );
    collar = collar.slice(start).concat(collar.slice(0, start));
    const perimeter = collar.reduce(
      (sum, i, k) => sum + q(i).distanceTo(q(collar[(k + 1) % collar.length])),
      0,
    );
    let distance = 0;
    const ordered = collar.map((i, k) => {
      const item = { i, u: distance / perimeter };
      distance += q(i).distanceTo(q(collar[(k + 1) % collar.length]));
      return item;
    });
    const phase = angle(collar[0]),
      levels = [distances[1], distances[2], (distances[2]+length*.95)/2, length * 0.95].filter(
        (s, i, a) =>
          s > base + length * 0.025 &&
          (i === 0 || s > a[i - 1] + length * 0.025),
      );
    if (levels.length < 2)
      return fail("Insufficient articulated finger span beyond collar");
    const surface = new SurfaceIndex(patches[d]),
      radius = new THREE.Box3()
        .setFromPoints(patches[d].flatMap((r) => r.points))
        .getSize(new THREE.Vector3())
        .length();
    const caches = new Map(),
      project = (u, s) => {
        const f = frame(s),
          dir = f.x
            .clone()
            .multiplyScalar(Math.cos((u + phase) * Math.PI * 2))
            .addScaledVector(f.y, Math.sin((u + phase) * Math.PI * 2)),
          cache = Math.round((s / length) * 1000);
        if (!caches.has(cache)) {
          const near = patches[d].filter(
            (r) => Math.abs(projectArc(r.center) - s) < length * 0.16,
          );
          caches.set(cache, near.length ? new SurfaceIndex(near) : surface);
        }
        const hit = caches
          .get(cache)
          .raycast(
            f.center.clone().addScaledVector(dir, radius),
            dir.clone().negate(),
            radius * 2,
          );
        const result =
          hit ??
          caches
            .get(cache)
            .nearest(f.center.clone().addScaledVector(dir, length * 0.1));
        if (result && !result.barycentric)
          result.barycentric = result.triangle.triangle.getBarycoord(
            result.point,
            new THREE.Vector3(),
          );
        return result;
      };
    paths.push({
      curve,
      distances,
      length,
      projectArc,
      frame,
      base,
      ordered,
      phase,
      levels,
      surface,
      project,
      radius,
    });
  }
  const palmInput = palm.flatMap((r) => r.ids),
    palmView = subsetSurface(g, palmInput),
    palmReduction = reduceBodySurface(palmView, "palm", simplifier, {
      target: 100,
      candidate: true,
      maximumError: 0.035,
    }),
    palmIds = [...new Set(palmInput)],
    palmIndex = Array.from(palmReduction.indices, (i) => palmIds[i]);
  palmView.dispose();
  const accessoryReports = [];
  for (const component of accessories) {
    const source = component.flatMap((r) => r.ids),
      ids = [...new Set(source)],
      view = subsetSurface(g, source),
      reduced = reduceBodySurface(view, "hand-accessory", simplifier, {
        target: 56,
        candidate: true,
        maximumError:
          (0.012 * simplifier.getScale(p.array, 3)) /
          Math.max(
            1e-9,
            simplifier.getScale(view.attributes.position.array, 3),
          ),
      });
    palmIndex.push(...Array.from(reduced.indices, (i) => ids[i]));
    view.dispose();
    accessoryReports.push({
      before: source.length / 3,
      after: reduced.indices.length / 3,
      error: reduced.error,
      errorLimit: reduced.errorLimit,
      absoluteError:
        reduced.error * simplifier.getScale(view.attributes.position.array, 3),
    });
  }
  const hits = [],
    positions = [],
    outUV = [],
    indices = [],
    digitFaces = paths.map(() => []),
    fake = (i) => ({
      triangle: { ids: [i, i, i] },
      barycentric: new THREE.Vector3(1, 0, 0),
    }),
    append = (hit, position, coords) => {
      const i = hits.length;
      if (!hit.barycentric)
        hit = {
          ...hit,
          barycentric: hit.triangle.triangle.getBarycoord(
            position,
            new THREE.Vector3(),
          ),
        };
      hits.push(hit);
      positions.push(position.clone());
      outUV.push(coords);
      return i;
    };
  for (const i of palmIndex) {
    indices.push(
      append(
        fake(i),
        new THREE.Vector3().fromBufferAttribute(p, i),
        new THREE.Vector2(uv.getX(i), 0.55 + uv.getY(i) * 0.45),
      ),
    );
  }
  for (let d = 0; d < paths.length; d++) {
    const path = paths[d],
      chart = (u, s) =>
        new THREE.Vector2(
          (d + 0.02 + 0.96 * u) / paths.length,
          0.005 + (0.49 * (s - path.base)) / (path.length - path.base),
        ),
      collar = path.ordered.map(({ i, u }) => ({ i, u }));
    collar.push({ ...collar[0], u: 1 });
    const base = collar.map(({ i, u }) =>
        append(
          fake(i),
          new THREE.Vector3().fromBufferAttribute(p, i),
          chart(u, path.base),
        ),
      ),
      rings = [];
    for (const s of path.levels) {
      const ring = [];
      for (let col = 0; col <= columns; col++) {
        const u = col / columns,
          hit = path.project(u === 1 ? 0 : u, s);
        ring.push(append(hit, hit.point, chart(u, s)));
      }
      rings.push(ring);
    }
    const start = indices.length;
    let a = 0,
      b = 0;
    while (a < base.length - 1 || b < columns) {
      if (
        b === columns ||
        (a < base.length - 1 && collar[a + 1].u <= (b + 1) / columns)
      ) {
        indices.push(base[a], base[a + 1], rings[0][b]);
        a++;
      } else {
        indices.push(base[a], rings[0][b + 1], rings[0][b]);
        b++;
      }
    }
    for (let row = 0; row < rings.length - 1; row++)
      for (let col = 0; col < columns; col++) {
        const a = rings[row][col],
          b = rings[row][col + 1],
          c = rings[row + 1][col + 1],
          e = rings[row + 1][col];
        indices.push(a, b, c, a, c, e);
      }
    const f = path.frame(path.length),
      tip =
        path.surface.raycast(
          f.center.clone().addScaledVector(f.axis, path.radius),
          f.axis.clone().negate(),
          path.radius * 2,
        ) ?? path.surface.nearest(f.center),
      tipId = append(tip, tip.point, chart(0.5, path.length)),
      last = rings.at(-1);
    for (let col = 0; col < columns; col++)
      indices.push(last[col], last[col + 1], tipId);
    for (let t = start; t < indices.length; t += 3)
      digitFaces[d].push(indices.slice(t, t + 3));
  }
  const surfaceQuality = [];
  for (let d = 0; d < paths.length; d++) {
    const path = paths[d];
    let maximumDeviation = 0,
      minimumAspect = 1,
      negativeArea = 0,
      totalArea = 0;
    for (const ids of digitFaces[d]) {
      const tri = new THREE.Triangle(...ids.map((i) => positions[i])),
        area = tri.getArea(),
        denominator =
          tri.a.distanceToSquared(tri.b) +
          tri.b.distanceToSquared(tri.c) +
          tri.c.distanceToSquared(tri.a);
      minimumAspect = Math.min(
        minimumAspect,
        denominator ? (4 * Math.sqrt(3) * area) / denominator : 0,
      );
      const center = tri.getMidpoint(new THREE.Vector3()),
        hit = path.surface.nearest(center);
      totalArea += area;
      if (
        hit &&
        tri.getNormal(new THREE.Vector3()).dot(hit.triangle.normal) < -0.15
      )
        negativeArea += area;
      for (const q of [
        center,
        tri.a.clone().lerp(tri.b, 0.5),
        tri.b.clone().lerp(tri.c, 0.5),
        tri.c.clone().lerp(tri.a, 0.5),
      ])
        maximumDeviation = Math.max(
          maximumDeviation,
          path.surface.nearest(q).distance,
        );
    }
    const quality = {
      maximumDeviation,
      relativeDeviation: maximumDeviation / path.length,
      minimumAspect,
      reversedAreaFraction: negativeArea / (totalArea || 1),
    };
    surfaceQuality.push(quality);
    if (
      quality.relativeDeviation > 0.06 ||
      quality.reversedAreaFraction > 0.1 ||
      !Number.isFinite(quality.relativeDeviation)
    )
      return fail(
        "Generated finger failed measured surface / orientation guard",
      );
  }
  const geometry = transferSurfaceAttributes(
    g,
    hits,
    positions,
    outUV,
  ).geometry;
  geometry.setIndex(indices);
  repairWinding(geometry);
  geometry.computeVertexNormals();
  const integrity = compareBoundaries(g, geometry);
  if (
    integrity.unexpectedOpenEdges ||
    integrity.inconsistentWinding > integrity.sourceInconsistentWinding
  ) {
    geometry.dispose();
    return fail("Generated hand failed source boundary / winding guard");
  }
  const normalMaterial = material.normalMap
      ? new THREE.MeshBasicMaterial({ map: material.normalMap })
      : null,
    normalSample = normalMaterial ? materialSampler([normalMaterial],{filter:"linear"}) : null;
  const lighting = (hit) => {
    const old = hit.triangle.ids.reduce(
      (q, i, k) =>
        q.addScaledVector(
          new THREE.Vector2().fromBufferAttribute(uv, i),
          hit.barycentric.getComponent(k),
        ),
      new THREE.Vector2(),
    );
    let mapped = null,
      fallback = 1;
    if (normalSample) {
      const n = normalSample({
        triangle: { material: normalMaterial, uvs: [old, old, old] },
        barycentric: new THREE.Vector3(1, 0, 0),
      });
      mapped = new THREE.Vector3(
        (n[0] / 127.5 - 1) * (material.normalScale?.x ?? 1),
        (n[1] / 127.5 - 1) * (material.normalScale?.y ?? 1),
        n[2] / 127.5 - 1,
      ).normalize();
      fallback =
        0.7 + 0.3 * Math.max(0, mapped.dot(new THREE.Vector3(-0.3, 0.5, 0.8)));
    }
    return sourceSkinLighting(material, old.x, old.y, mapped, fallback);
  };
  const sample = materialSampler([material],{filter:"linear"}),
    rgba = new Uint8Array(textureSize * textureSize * 4);
  for (let row = 0; row < textureSize; row++)
    for (let col = 0; col < textureSize; col++) {
      const u = (col + 0.5) / textureSize,
        v = (row + 0.5) / textureSize;
      let color;
      if (v >= 0.55) {
        const old = new THREE.Vector2(u, (v - 0.55) / 0.45),
          hit = {
            triangle: { uvs: [old, old, old], material },
            barycentric: new THREE.Vector3(1, 0, 0),
          };
        color = sample(hit);
        const normal = normalSample
            ? normalSample({
                triangle: { material: normalMaterial, uvs: [old, old, old] },
                barycentric: new THREE.Vector3(1, 0, 0),
              })
            : null,
          mapped = normal
            ? new THREE.Vector3(
                (normal[0] / 127.5 - 1) * (material.normalScale?.x ?? 1),
                (normal[1] / 127.5 - 1) * (material.normalScale?.y ?? 1),
                normal[2] / 127.5 - 1,
              ).normalize()
            : null;
        const light = sourceSkinLighting(
          material,
          old.x,
          old.y,
          mapped,
          mapped
            ? 0.7 +
                0.3 * Math.max(0, mapped.dot(new THREE.Vector3(-0.3, 0.5, 0.8)))
            : 1,
        );
        for (let k = 0; k < 3; k++) color[k] *= light;
      } else {
        const d = Math.min(paths.length - 1, Math.floor(u * paths.length)),
          path = paths[d];
        let surfacePoint = null;
        for (const tri of digitFaces[d]) {
          const [a, b, c] = tri.map((i) => outUV[i]),
            det = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
          if (Math.abs(det) < 1e-10) continue;
          const wa = ((b.y - c.y) * (u - c.x) + (c.x - b.x) * (v - c.y)) / det,
            wb = ((c.y - a.y) * (u - c.x) + (a.x - c.x) * (v - c.y)) / det,
            wc = 1 - wa - wb;
          if (Math.min(wa, wb, wc) >= -1e-6) {
            surfacePoint = positions[tri[0]]
              .clone()
              .multiplyScalar(wa)
              .addScaledVector(positions[tri[1]], wb)
              .addScaledVector(positions[tri[2]], wc);
            break;
          }
        }
        const hit = surfacePoint
          ? path.surface.nearest(surfacePoint)
          : path.project(
              THREE.MathUtils.clamp((u * paths.length - d - 0.02) / 0.96, 0, 1),
              path.base +
                THREE.MathUtils.clamp((v - 0.005) / 0.49, 0, 1) *
                  (path.length - path.base),
            );
        color = sample(hit);
        const light = lighting(hit);
        for (let k = 0; k < 3; k++) color[k] *= light;
      }
      rgba.set(
        color.map((v) => Math.round(v)),
        (row * textureSize + col) * 4,
      );
    }
  const output = material.clone();
  output.name = material.name + "_anatomical";
  output.map = surfaceTexture(rgba, textureSize, textureSize);
  output.color.set(0xffffff);
  for (const name of [
    "normalMap",
    "alphaMap",
    "specularMap",
    "aoMap",
    "metalnessMap",
    "roughnessMap",
  ])
    output[name] = null;
  output.userData.t3csSkinBake = {
    method:
      "Articulated source finger patches with per-surface diffuse and retained palm albedo",
    sourceTriangles: records.length,
    generatedTriangles: indices.length / 3,
    sourceCorrespondence: true,
  };
  return {
    geometry,
    material: output,
    generatedVertices: hits.length,
    triangles: indices.length / 3,
    method:
      "Articulated anatomical finger reconstruction with measured source palm collars",
    fingers: paths.length,
    columns,
    palmTriangles: palmIndex.length / 3,
    fingerTriangles: digitFaces.map((f) => f.length),
    integrity,
    sourceFingerTriangles: sourceFingerCounts,
    accessories: accessoryReports,
    surfaceQuality,
  };
}
