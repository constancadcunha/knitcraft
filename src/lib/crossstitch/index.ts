/**
 * Cross stitch — fabric, sizing and floss.
 *
 * Deliberately separate from src/lib/knit: cross stitch shares no maths with
 * knitting or crochet. There is no gauge swatch, no ease, and no shaping; size
 * is fixed entirely by the fabric count and the stitch count of the chart.
 */
export {
  COMMON_FABRICS,
  finishedSize,
  makeFabric,
  recommendedStrands,
  stitchesPerCm,
  stitchesPerInch,
  type Fabric,
  type FabricKind,
  type FinishedSize,
} from "./fabric";

export {
  SKEIN_METRES,
  STRANDS_PER_SKEIN,
  THREAD_PER_CROSS,
  WASTE_FACTOR,
  estimateFloss,
  stitchesPerSkein,
  threadPerStitchMm,
  type FlossEstimate,
} from "./floss";
