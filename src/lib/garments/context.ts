/**
 * The resolved drafting context.
 *
 * One object carrying everything a construction needs: the resolved size, the
 * body table, the gauge, the craft voice, and the four conversions every piece
 * of knitwear maths is made of. Constructions never touch `resolveSize`,
 * `stitchesForWidth` or `rowsForHeight` directly, so the rounding rules (even
 * counts for symmetric shaping, repeats, minimums) are applied in one place.
 *
 * Resolution rules, and why:
 *   - An unresolvable size for a garment that NEEDS a body measurement falls
 *     back to adult M *with a warning*, never silently. The old engine's
 *     `normalizeSize()` returned "L" for anything it did not recognise, so a
 *     0-3 month cardigan was drafted with a 42-inch bust.
 *   - "One Size" is not a size. For a hat it means "drafted to the average head
 *     for the wearer scale"; for a scarf or blanket it means the table
 *     dimension. Both are handled by the construction, not by guessing a chest.
 */

import {
  type BodyMeasurementsCm,
  type CycWeight,
  type FitPreference,
  type Gauge,
  type SizeKey,
  type SnapOptions,
  type StitchRepeat,
  cmToIn,
  getBodyMeasurements,
  heightCmFor,
  isOneSize,
  resolveSize,
  roundTo,
  rowsForHeight,
  sizeLabel as formatSizeLabel,
  stitchesForWidth,
  typicalGaugeFor,
  widthCmFor,
} from "../knit";
import { type WearerScale, needsBodySize, wearerScale } from "./catalog";
import type { Craft, GarmentKind, GarmentOptions, GarmentRequest, Measurement } from "./types";
import { type CrochetStitch, type Voice, voiceFor } from "./voice";

export interface GarmentContext {
  readonly kind: GarmentKind;
  readonly craft: Craft;
  readonly size: SizeKey | null;
  readonly sizeLabel: string;
  readonly scale: WearerScale;
  readonly fit: FitPreference | undefined;
  readonly gauge: Gauge;
  readonly yarnWeight: CycWeight;
  readonly voice: Voice;
  readonly crochetStitch: CrochetStitch;
  readonly body: BodyMeasurementsCm;
  readonly options: GarmentOptions;
  readonly warnings: string[];

  /** Stitches for a width in cm, snapped to the repeat and the parity asked for. */
  sts(widthCm: number, options?: SnapOptions): number;
  /** Rows for a height in cm. */
  rowCount(heightCm: number, options?: { rowRepeat?: number; endOnWrongSide?: boolean; minimum?: number }): number;
  /** The width a stitch count really makes, in cm. */
  widthOf(stitches: number): number;
  /** The height a row count really makes, in cm. */
  heightOf(rows: number): number;
  measure(label: string, cm: number, kind: Measurement["kind"]): Measurement;
}

/** Default fabric stitch per craft and garment family. */
export function defaultCrochetStitch(kind: GarmentKind): CrochetStitch {
  switch (kind) {
    // Dense, hard-wearing fabric: these take abrasion or need to hold a shape.
    case "socks":
    case "mittens":
    case "gloves":
    case "toteBag":
    case "dishcloth":
    case "hat":
    case "headband":
      return "sc";
    // Open and quick, where drape and speed matter more than density.
    case "shawl":
    case "babyBlanket":
    case "throwBlanket":
      return "dc";
    default:
      return "hdc";
  }
}

export function createContext(request: GarmentRequest, kind: GarmentKind): GarmentContext {
  const warnings: string[] = [];
  const craft = request.craft;

  const resolved = resolveSize(request.size);
  const oneSize = isOneSize(request.size);
  let size: SizeKey | null = resolved;

  if (!resolved && needsBodySize(kind)) {
    // A garment that has to fit a body must have a body. Say so out loud.
    size = "M";
    warnings.push(
      oneSize
        ? `"One Size" is not a body measurement. ${labelFor(kind)} has been drafted to the adult M measurements; supply a size, or a measured circumference, for a garment that fits.`
        : `Size ${request.size ? `"${request.size}"` : "(not given)"} could not be resolved, so the adult M measurements were used. Pick a size from the table for a garment that fits.`,
    );
  }

  const scale = wearerScale(size);
  const body = getBodyMeasurements(size ?? "M");
  const yarnWeight: CycWeight = request.yarnWeight ?? 4;
  const gauge = request.gauge ?? typicalGaugeFor(yarnWeight, craft);
  const crochetStitch = defaultCrochetStitch(kind);
  const voice = voiceFor(craft, crochetStitch);

  if (!request.gauge) {
    warnings.push(
      "No swatch gauge was supplied, so the CYC mid-range gauge for this yarn weight was used. Swatch and re-draft before casting on — every number in this pattern moves with your gauge.",
    );
  }

  return {
    kind,
    craft,
    size,
    sizeLabel: size ? (resolved ? formatSizeLabel(size) : `${formatSizeLabel(size)} (assumed)`) : "One Size",
    scale,
    fit: request.fit,
    gauge,
    yarnWeight,
    voice,
    crochetStitch,
    body,
    options: request.options ?? {},
    warnings,
    sts(widthCm, options) {
      const result = stitchesForWidth(Math.max(0, widthCm), gauge, options);
      // Repeat-snapping warnings matter: they are how a knitter learns the
      // stitch pattern has distorted the piece past the point of fitting.
      warnings.push(...result.warnings);
      return Math.max(options?.minimum ?? 1, result.stitches);
    },
    rowCount(heightCm, options) {
      return rowsForHeight(Math.max(0, heightCm), gauge, options);
    },
    widthOf(stitches) {
      return widthCmFor(stitches, gauge);
    },
    heightOf(rows) {
      return heightCmFor(rows, gauge);
    },
    measure(label, cm, kind: Measurement["kind"]) {
      return { label, cm: roundTo(cm, 1), inches: roundTo(cmToIn(cm), 2), kind };
    },
  };
}

function labelFor(kind: GarmentKind): string {
  return kind.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

/** A repeat that keeps a 2x2 rib intact: multiple of 4 in the round, +2 flat. */
export const RIB_2X2: StitchRepeat = { multiple: 4, plus: 2 };
export const RIB_2X2_ROUND: StitchRepeat = { multiple: 4, plus: 0 };
