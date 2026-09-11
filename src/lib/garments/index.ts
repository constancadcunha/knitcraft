/**
 * Garment drafting — public surface.
 *
 * Given a size, a craft and a gauge, this produces the pieces a garment is
 * made of with real stitch and row counts, and a starter chart for each one.
 * Every number is derived from a body measurement through the knitter's own
 * gauge; there are no hard-coded stitch counts anywhere.
 */

export { createContext, type GarmentContext } from "./context";
export { panelsFor, type Panel } from "./panels";
export {
  MAX_CHART_HEIGHT,
  MAX_CHART_WIDTH,
  chartCraftFor,
  starterChartFor,
  type StarterChartInput,
} from "./starterChart";
export {
  defaultConstruction,
  needsBodySize,
  resolveGarmentKind,
  ribDepthCm,
  wearerScale,
} from "./catalog";
export { voiceFor } from "./voice";
export type {
  ConstructionMethod,
  GarmentKind,
  GarmentOptions,
  GarmentRequest,
  WorkedAs,
} from "./types";

import { createContext } from "./context";
import { panelsFor, type Panel } from "./panels";
import { resolveGarmentKind } from "./catalog";
import { starterChartFor } from "./starterChart";
import type { GarmentRequest } from "./types";
import type { SymbolChart } from "@/lib/chart";

export interface DraftedPiece {
  panel: Panel;
  chart: SymbolChart;
}

export interface GarmentDraft {
  kind: ReturnType<typeof resolveGarmentKind>;
  pieces: DraftedPiece[];
  /** Anything the engine had to assume, e.g. a size it could not resolve. */
  warnings: string[];
}

/**
 * Draft a garment into charted pieces.
 *
 * This is the call the chart editor and the studio both make. It always
 * returns at least one piece with a real baseline chart — the "Other" kind
 * falls back to a gauge-derived square rather than an empty grid.
 */
export function draftGarment(request: GarmentRequest): GarmentDraft {
  const kind = resolveGarmentKind(request.garment);
  const ctx = createContext(request, kind);
  const panels = panelsFor(ctx, kind);

  return {
    kind,
    warnings: ctx.warnings,
    pieces: panels.map((panel) => ({
      panel,
      chart: starterChartFor({
        id: `${kind}-${panel.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: panel.name,
        craft: ctx.craft,
        stitches: panel.stitches,
        rows: panel.rows,
        worked: panel.worked,
        edgeRows: panel.edgeRows,
        crochetStitch: ctx.crochetStitch,
      }),
    })),
  };
}
