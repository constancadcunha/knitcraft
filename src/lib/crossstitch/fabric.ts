/**
 * Cross-stitch fabric and sizing maths.
 *
 * The whole craft hangs off one number: the fabric's COUNT, meaning how many
 * stitches fit in an inch. Everything else — finished size, how much fabric to
 * cut, how many strands to use, how much floss to buy — follows from it.
 *
 * The one trap: Aida is counted in blocks and worked one stitch per block, so
 * a 14-count Aida gives 14 stitches per inch. Evenweave and linen are counted
 * in THREADS and normally worked over two of them, so a 28-count linen also
 * gives 14 stitches per inch. Conflating the two is the classic beginner error
 * and doubles or halves the finished size.
 */

export type FabricKind = "aida" | "evenweave" | "linen";

export interface Fabric {
  readonly kind: FabricKind;
  /** Holes per inch for Aida; threads per inch for evenweave and linen. */
  readonly count: number;
  /** Threads covered by one stitch. Always 1 on Aida, normally 2 otherwise. */
  readonly over: number;
}

/** The counts people actually buy. */
export const COMMON_FABRICS: readonly Fabric[] = [
  { kind: "aida", count: 11, over: 1 },
  { kind: "aida", count: 14, over: 1 },
  { kind: "aida", count: 16, over: 1 },
  { kind: "aida", count: 18, over: 1 },
  { kind: "evenweave", count: 25, over: 2 },
  { kind: "evenweave", count: 28, over: 2 },
  { kind: "evenweave", count: 32, over: 2 },
  { kind: "linen", count: 28, over: 2 },
  { kind: "linen", count: 32, over: 2 },
  { kind: "linen", count: 36, over: 2 },
];

export function makeFabric(kind: FabricKind, count: number, over?: number): Fabric {
  if (count <= 0) throw new Error(`fabric count must be positive, got ${count}`);
  return { kind, count, over: over ?? (kind === "aida" ? 1 : 2) };
}

/**
 * Stitches per inch. This is the number that actually governs size — NOT the
 * count printed on the fabric band.
 */
export function stitchesPerInch(fabric: Fabric): number {
  return fabric.count / fabric.over;
}

export function stitchesPerCm(fabric: Fabric): number {
  return stitchesPerInch(fabric) / 2.54;
}

export interface FinishedSize {
  widthIn: number;
  heightIn: number;
  widthCm: number;
  heightCm: number;
  /** Fabric to cut, including a margin for framing or finishing. */
  cutWidthIn: number;
  cutHeightIn: number;
  cutWidthCm: number;
  cutHeightCm: number;
}

/**
 * Finished stitched area, plus the fabric to cut.
 *
 * `marginIn` is per side. Three inches all round is the usual advice for
 * anything that will be framed — it leaves enough to mount over board and to
 * hold in a hoop while stitching the edges.
 */
export function finishedSize(
  stitchesWide: number,
  stitchesHigh: number,
  fabric: Fabric,
  marginIn = 3
): FinishedSize {
  const spi = stitchesPerInch(fabric);
  const widthIn = stitchesWide / spi;
  const heightIn = stitchesHigh / spi;
  const cutWidthIn = widthIn + marginIn * 2;
  const cutHeightIn = heightIn + marginIn * 2;

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    widthIn: round(widthIn),
    heightIn: round(heightIn),
    widthCm: round(widthIn * 2.54),
    heightCm: round(heightIn * 2.54),
    cutWidthIn: round(cutWidthIn),
    cutHeightIn: round(cutHeightIn),
    cutWidthCm: round(cutWidthIn * 2.54),
    cutHeightCm: round(cutHeightIn * 2.54),
  };
}

/**
 * How many strands of six-strand floss give good coverage.
 *
 * Coverage is about the thread filling the hole, so it tracks stitches per
 * inch rather than the printed count — which is why 28-count linen worked over
 * two takes the same two strands as 14-count Aida.
 */
export function recommendedStrands(fabric: Fabric): number {
  const spi = stitchesPerInch(fabric);
  if (spi <= 11) return 3;
  if (spi <= 16) return 2;
  return 1;
}
