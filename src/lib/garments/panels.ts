/**
 * Panel dimensions for every garment kind.
 *
 * This is the piece the old app never had: given a size, a craft and a gauge,
 * it says how many stitches wide and how many rows tall each piece of a
 * garment actually is. Without it the chart editor had nothing to draw, which
 * is why choosing Cowl or Gloves produced an empty grid with no baseline at
 * all — the bug this module exists to close.
 *
 * Every number comes from a real body measurement plus ease, converted through
 * the knitter's own gauge. Nothing here is a hard-coded stitch count, which is
 * what the old GARMENT_TEMPLATES were (a size-L back was always 76 stitches,
 * whatever yarn you used).
 *
 * These are PANELS, not full constructions: a panel is the rectangle a piece
 * is charted on. Shaping schedules live with the constructions.
 */

import { ribDepthCm, wearerScale } from "./catalog";
import type { GarmentContext } from "./context";
import type { GarmentKind } from "./types";

/**
 * How a piece begins.
 *
 * Every piece used to be written as "cast on N", which told a hat knitter to
 * cast on twice — once for the brim and again for the body that continues out
 * of it — and told them to cast on a neckband that is picked up from an
 * existing edge. All three starts are different operations.
 */
export type PieceStart = "cast-on" | "continue" | "pick-up";

export interface Panel {
  readonly name: string;
  readonly stitches: number;
  readonly rows: number;
  readonly worked: "flat" | "round";
  /** Rows of rib or border at the bottom edge, if the piece has one. */
  readonly edgeRows?: number;
  /** What the panel measures, for the schematic. */
  readonly widthCm: number;
  readonly heightCm: number;
  /** Defaults to "cast-on". */
  readonly start?: PieceStart;
  /** The piece this one continues out of, or is picked up from. */
  readonly from?: string;
  readonly note?: string;
}

/** Ease applied to a circumference that is worked in the round and must stretch on. */
const SNUG = 0.9;

function panel(
  ctx: GarmentContext,
  name: string,
  widthCm: number,
  heightCm: number,
  options: {
    worked?: "flat" | "round";
    edgeCm?: number;
    note?: string;
    start?: PieceStart;
    from?: string;
  } = {}
): Panel {
  const stitches = ctx.sts(widthCm);
  const rows = ctx.rowCount(heightCm);
  return {
    name,
    stitches,
    rows,
    worked: options.worked ?? "flat",
    edgeRows: options.edgeCm ? ctx.rowCount(options.edgeCm) : undefined,
    widthCm: ctx.widthOf(stitches),
    heightCm: ctx.heightOf(rows),
    start: options.start ?? "cast-on",
    from: options.from,
    note: options.note,
  };
}

/**
 * The pieces a garment is made of, with real counts.
 *
 * Sleeved bodies are drafted flat here (front, back, two sleeves). The
 * construction modules refine that into raglan or yoke shaping; this is the
 * rectangle each piece is charted on.
 */
export function panelsFor(ctx: GarmentContext, kind: GarmentKind): Panel[] {
  const b = ctx.body;
  const scale = wearerScale(ctx.size);
  const hemCm = ribDepthCm(scale, "hem");
  const cuffCm = ribDepthCm(scale, "cuff");
  const brimCm = ribDepthCm(scale, "brim");

  // Finished chest already includes the wearer's chosen ease.
  const chest = ctx.body.chest;
  const halfChest = chest / 2;

  switch (kind) {
    case "sweater":
    case "cardigan": {
      const bodyLength = b.totalLength;
      const sleeveLength = b.sleeveLengthToUnderarm;
      const front: Panel[] =
        kind === "cardigan"
          ? [
              panel(ctx, "Left front", halfChest / 2, bodyLength, { edgeCm: hemCm }),
              panel(ctx, "Right front", halfChest / 2, bodyLength, { edgeCm: hemCm }),
              panel(ctx, "Button band", 3, bodyLength, {
                start: "pick-up",
                from: "the front edge",
                note: "Worked along the front edge; length is the front edge, not a panel height.",
              }),
            ]
          : [panel(ctx, "Front", halfChest, bodyLength, { edgeCm: hemCm })];
      return [
        panel(ctx, "Back", halfChest, bodyLength, { edgeCm: hemCm }),
        ...front,
        panel(ctx, "Left sleeve", b.upperArm, sleeveLength, { edgeCm: cuffCm }),
        panel(ctx, "Right sleeve", b.upperArm, sleeveLength, { edgeCm: cuffCm }),
        panel(ctx, "Neckband", b.neckCircumference, 5, {
          worked: "round",
          start: "pick-up",
          from: "the neckline",
        }),
      ];
    }

    case "vest":
    case "tankTop":
      return [
        panel(ctx, "Back", halfChest, b.totalLength, { edgeCm: hemCm }),
        panel(ctx, "Front", halfChest, b.totalLength, { edgeCm: hemCm }),
        panel(ctx, "Neckband", b.neckCircumference, 4, {
          worked: "round", start: "pick-up", from: "the neckline",
        }),
        panel(ctx, "Armhole bands", b.armholeDepth * 2, 4, {
          worked: "round", start: "pick-up", from: "each armhole",
        }),
      ];

    case "hat":
      // A hat must stretch onto the head, so it is drafted with negative ease.
      return [
        panel(ctx, "Brim", b.headCircumference * SNUG, brimCm, { worked: "round" }),
        panel(ctx, "Body", b.headCircumference * SNUG, b.headCircumference * 0.32, {
          worked: "round",
          start: "continue",
          from: "Brim",
          note: "Crown decreases begin at the top of this panel.",
        }),
      ];

    case "cowl":
      return [
        panel(ctx, "Cowl", Math.max(b.headCircumference * 1.15, 55), 25, {
          worked: "round",
          edgeCm: 3,
          note: "Circumference must clear the head, so it is drafted from head measurement, not neck.",
        }),
      ];

    case "scarf":
      return [panel(ctx, "Scarf", 20, 150, { edgeCm: 4 })];

    case "shawl":
      return [
        panel(ctx, "Shawl", 140, 60, {
          note: "Charted as the finished triangle's bounding box; increases shape it.",
        }),
      ];

    case "socks": {
      const circumference = b.footCircumference * SNUG;
      return [
        panel(ctx, "Cuff", circumference, cuffCm, { worked: "round" }),
        panel(ctx, "Leg", circumference, 15, {
          worked: "round", start: "continue", from: "Cuff",
        }),
        panel(ctx, "Heel flap", circumference / 2, b.footLength * 0.22, {
          start: "continue", from: "Leg",
        }),
        panel(ctx, "Foot", circumference, b.footLength * 0.7, {
          worked: "round", start: "continue", from: "Heel flap",
        }),
        panel(ctx, "Toe", circumference, b.footLength * 0.18, {
          worked: "round", start: "continue", from: "Foot",
        }),
      ];
    }

    case "mittens": {
      const circumference = b.handCircumference * SNUG;
      return [
        panel(ctx, "Cuff", circumference, cuffCm, { worked: "round" }),
        panel(ctx, "Hand", circumference, b.handCircumference * 0.85, {
          worked: "round", start: "continue", from: "Cuff",
        }),
        panel(ctx, "Thumb", circumference * 0.28, b.handCircumference * 0.3, {
          worked: "round", start: "pick-up", from: "the held gusset stitches",
        }),
      ];
    }

    case "gloves": {
      const circumference = b.handCircumference * SNUG;
      return [
        panel(ctx, "Cuff", circumference, cuffCm, { worked: "round" }),
        panel(ctx, "Hand", circumference, b.handCircumference * 0.6, {
          worked: "round", start: "continue", from: "Cuff",
        }),
        panel(ctx, "Thumb", circumference * 0.28, b.handCircumference * 0.3, {
          worked: "round", start: "pick-up", from: "the held gusset stitches",
        }),
        panel(ctx, "Fingers", circumference * 0.25, b.handCircumference * 0.35, {
          worked: "round",
          start: "pick-up",
          from: "the held hand stitches",
          note: "Each finger is worked on roughly a quarter of the hand stitches.",
        }),
      ];
    }

    case "headband":
      return [
        panel(ctx, "Headband", b.headCircumference * 0.85, 9, {
          note: "Drafted short so it grips; the fabric stretches to fit.",
        }),
      ];

    case "legWarmers":
      return [
        panel(ctx, "Left leg warmer", b.upperArm * 1.35, 40, { worked: "round", edgeCm: cuffCm }),
        panel(ctx, "Right leg warmer", b.upperArm * 1.35, 40, { worked: "round", edgeCm: cuffCm }),
      ];

    case "toteBag":
      return [
        panel(ctx, "Front", 35, 40),
        panel(ctx, "Back", 35, 40),
        panel(ctx, "Base", 35, 12),
        panel(ctx, "Straps", 6, 60),
      ];

    case "dishcloth":
      return [panel(ctx, "Cloth", 25, 25, { edgeCm: 2 })];

    case "babyBlanket":
      return [panel(ctx, "Blanket", 75, 90, { edgeCm: 4 })];

    case "throwBlanket":
      return [panel(ctx, "Blanket", 125, 150, { edgeCm: 5 })];

    case "other":
    default:
      // Never an empty grid: fall back to a square drafted from the gauge.
      return [
        panel(ctx, "Panel", 30, 30, {
          note: "A plain panel drafted from your gauge. Resize it to whatever you are making.",
        }),
      ];
  }
}
