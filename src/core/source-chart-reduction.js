import { reduceBodySurface } from "./body-surface.js";
import { uvChartLabels, mixedUVSheetTriangles } from "./surface-components.js";

// Most source limbs already reduce correctly. Add a categorical constraint only
// after a real generated triangle crosses distinct measured source UV sheets.
export function reduceSourceLimb(g, role, simplifier, options) {
  const charts = uvChartLabels(g),
    first = reduceBodySurface(g, role, simplifier, options),
    before = mixedUVSheetTriangles(first.indices, charts);
  let result = first,
    after = before,
    fallback = false;
  if (before) {
    const mask = new Uint8Array(
      options.featureMask ?? g.attributes.position.count,
    );
    for (let v = 0; v < mask.length; v++) mask[v] |= charts.ambiguous[v];
    result = reduceBodySurface(g, role, simplifier, {
      ...options,
      featureMask: mask,
      materialIds: Array.from(charts.labels),
    });
    after = mixedUVSheetTriangles(result.indices, charts);
    if (after) {
      fallback = true;
      result = {
        ...result,
        indices: new Uint32Array(g.index.array),
        fallbackReason:
          "Source UV sheet ownership remained ambiguous; reliable source surface retained",
      };
      after = mixedUVSheetTriangles(result.indices, charts);
    }
  }
  return {
    ...result,
    sourceUVCharts: charts.count,
    sourceUVChartValidation: {
      initialMixedTriangles: before,
      finalMixedTriangles: after,
      retried: before > 0,
      fallback,
    },
  };
}
