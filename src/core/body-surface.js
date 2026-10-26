import { redistributeHandSurface } from "./hand-surface.js";
import { regularizeHandTopology } from "./hand-topology.js";
import { geometricBoundaryMask } from "./art-director.js";
import { compareBoundaries } from "./mesh-integrity.js";
import { subsetSurface } from "./projected-topology.js";
export function reduceBodySurface(
  g,
  role,
  simplifier,
  {
    target = 200,
    featureMask = null,
    candidate = false,
    reprojectUV = false,
    materialIds = null,
    boneMap = null,
    uvMask = null,
    maximumError = null,
    deformationFields = null,
  } = {},
) {
  const hand = /Hand$/.test(role),
    p = g.attributes.position,
    uv = g.attributes.uv,
    n = g.attributes.normal,
    mask = geometricBoundaryMask(g),
    sets = [
      ["skinIndex", "skinWeight"],
      ...Object.keys(g.attributes)
        .filter((n) => /^joints_\d+$/.test(n))
        .map((n) => [n, n.replace("joints_", "weights_")]),
    ].filter(([j, w]) => g.attributes[j] && g.attributes[w]),
    totals = new Map();
  for (let v = 0; v < p.count; v++)
    for (const [j, w] of sets)
      for (let k = 0; k < g.attributes[j].itemSize; k++) {
        const raw = g.attributes[j].getComponent(v, k),
          b = boneMap ? boneMap[raw] : raw,
          weight = g.attributes[w].getComponent(v, k);
        if (weight > 0) totals.set(b, (totals.get(b) ?? 0) + weight);
      }
  const boundaryVertices = mask.reduce((n, v) => n + v, 0);
  if (featureMask)
    for (let i = 0; i < mask.length; i++) mask[i] |= featureMask[i];
  const fieldSize = deformationFields?.size ?? 0;
  if (
    fieldSize > 24 ||
    (deformationFields &&
      deformationFields.values.length !== p.count * fieldSize)
  )
    throw Error("Invalid deformation field dimensions");
  const bones = [...totals]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(24, 32 - 5 - (materialIds ? 1 : 0) - fieldSize))
      .map((b) => b[0]),
    boneIndex = new Map(bones.map((b, i) => [b, i])),
    stride = 5 + bones.length + (materialIds ? 1 : 0) + fieldSize,
    attributes = new Float32Array(p.count * stride);
  let residualLocked = 0;
  for (let v = 0; v < p.count; v++) {
    const base = v * stride;
    attributes.set(
      [
        uvMask?.[v] ? 0 : (uv?.getX(v) ?? 0),
        uvMask?.[v] ? 0 : (uv?.getY(v) ?? 0),
        n?.getX(v) ?? 0,
        n?.getY(v) ?? 0,
        n?.getZ(v) ?? 1,
      ],
      base,
    );
    let residual = 0;
    for (const [j, w] of sets)
      for (let k = 0; k < g.attributes[j].itemSize; k++) {
        const raw = g.attributes[j].getComponent(v, k),
          b = boneMap ? boneMap[raw] : raw,
          weight = g.attributes[w].getComponent(v, k),
          i = boneIndex.get(b);
        if (i !== undefined) attributes[base + 5 + i] += weight;
        else residual += weight;
      }
    if (materialIds) attributes[base + 5 + bones.length] = materialIds[v];
    if (fieldSize)
      attributes.set(
        deformationFields.values.subarray(v * fieldSize, (v + 1) * fieldSize),
        base + 5 + bones.length + (materialIds ? 1 : 0),
      );
    if (residual > 0.02) {
      mask[v] = 1;
      residualLocked++;
    }
  }
  const source = new Uint32Array(g.index.array),
    goal = Math.min(
      source.length / 3,
      Math.max(candidate ? (hand ? 80 : 24) : hand ? 180 : 48, target),
    ),
    errorLimit =
      maximumError ??
      (candidate
        ? hand
          ? 0.028
          : /spine|hips/.test(role)
            ? 0.055
            : 0.025
        : hand
          ? 0.012
          : /spine|hips/.test(role)
            ? 0.035
            : 0.018),
    weights = [
      reprojectUV ? 0 : candidate ? 0.2 : 0.8,
      reprojectUV ? 0 : candidate ? 0.2 : 0.8,
      0.003,
      0.003,
      0.003,
      ...bones.map(() => (candidate ? 0.06 : 0.025)),
      ...(materialIds ? [10] : []),
      ...Array(fieldSize).fill(1),
    ];
  let [index, error] =
    source.length > goal * 3
      ? simplifier.simplifyWithAttributes(
          source,
          p.array,
          3,
          attributes,
          stride,
          weights,
          mask,
          goal * 3,
          errorLimit,
          ["Permissive", "RegularizeLight"],
        )
      : [source, 0];
  const handLayout = hand ? regularizeHandTopology(g, index) : null;
  if (handLayout) index = handLayout.indices;
  const handSurface = hand ? redistributeHandSurface(g, index, mask) : null;
  const output = subsetSurface(g, index),
    integrity = compareBoundaries(g, output);
  output.dispose();
  const fallback =
    integrity.unexpectedOpenEdges > 0 ||
    integrity.inconsistentWinding > integrity.sourceInconsistentWinding;
  return {
    handSurface,
    handLayout: handLayout?.report ?? null,
    indices: fallback ? source : index,
    method: hand
      ? "Source-anatomical hand topology with weighted joint fields"
      : "Continuous body topology with invariant regional borders",
    target: goal,
    error,
    errorLimit,
    boundaryLockedVertices: boundaryVertices,
    lockedVertices: mask.reduce((n, v) => n + v, 0),
    trackedSkinBones: bones.length,
    anatomicalWeightFields: !!boneMap,
    deformationFeatureKind: deformationFields?.kind ?? null,
    deformationPoses: deformationFields?.poses ?? 0,
    deformationJoints: deformationFields?.joints ?? 0,
    deformationAttributeCount: fieldSize,
    materialBoundaryAttribute: !!materialIds,
    residualLockedVertices: residualLocked,
    integrity,
    fallbackReason: fallback
      ? "Reduction introduced a discontinuity; reliable source surface retained"
      : null,
  };
}
