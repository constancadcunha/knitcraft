/**
 * The flat, unshaped garments: scarf, dishcloth, blankets, and the documented
 * fallback for "Other".
 *
 * "Unshaped" is not "trivial". These are the garments where the OLD engine
 * emitted a five-sentence placeholder with no numbers in it at all, and they
 * are the ones a beginner actually starts with. Each one here gets a real
 * cast-on derived from the knitter's gauge, a real row count derived from the
 * knitter's row gauge, a named edge treatment worked over a stated number of
 * stitches, and a stitch count on every line that changes one.
 */

import { plural, roundTo } from "../knit";
import { PieceBuilder } from "./builder";
import {
  BLANKET_DIMS,
  DISHCLOTH_DIMS,
  SCARF_DIMS,
  type RectDims,
} from "./catalog";
import { type ConstructionResult, baseAbbreviations, fabricFor } from "./construction";
import type { GarmentContext } from "./context";
import type { GarmentPiece, Measurement } from "./types";

/**
 * A flat rectangle with a worked border on all four sides.
 *
 * The border is a real stitch allocation, not a decorative note: `edgeSts`
 * stitches at each side are worked in the edge fabric on every row, and
 * `edgeRows` rows of it top and bottom. The body instruction therefore reads
 * "k3, work in pattern to last 3 sts, k3" and the three numbers reconcile with
 * the cast-on.
 */
export interface FlatPanelInput {
  readonly id: string;
  readonly name: string;
  readonly dims: RectDims;
  readonly makeCount?: number;
  /** What the middle of the panel is worked in, named for the instruction. */
  readonly bodyFabric: string;
  readonly edgeFabric: string;
}

export function buildFlatPanel(ctx: GarmentContext, input: FlatPanelInput): GarmentPiece {
  const { voice } = ctx;
  const { widthCm, lengthCm, borderCm } = input.dims;

  const edgeSts = Math.max(ctx.craft === "knitting" ? 3 : 2, ctx.sts(borderCm));
  const edgeRows = Math.max(2, ctx.rowCount(borderCm));
  // The panel must be wide enough for two borders plus a body worth having.
  const minimum = edgeSts * 2 + 4;
  const total = ctx.sts(widthCm, { even: true, minimum });
  const totalRows = Math.max(edgeRows * 2 + 2, ctx.rowCount(lengthCm, { endOnWrongSide: ctx.craft === "knitting" }));
  const bodyRows = totalRows - edgeRows * 2;
  const bodySts = total - edgeSts * 2;

  const piece = new PieceBuilder({
    id: input.id,
    name: input.name,
    voice,
    worked: "flat",
    makeCount: input.makeCount ?? 1,
    widthCm: ctx.widthOf(total),
    heightCm: ctx.heightOf(totalRows),
    chartRepeat: ctx.craft === "knitting" ? 4 : 1,
  });

  piece.castOn(total);
  piece.section("Lower border");
  piece.workEven(
    edgeRows,
    `Work ${plural(edgeRows, voice.row("flat"), voice.rows("flat"))} in ${input.edgeFabric} across all ${plural(total, voice.st, voice.sts)}.`,
  );

  piece.section("Body");
  piece.partition("body row", [
    { name: "side border", stitches: edgeSts },
    { name: input.bodyFabric, stitches: bodySts },
    { name: "side border", stitches: edgeSts },
  ]);
  piece.workEven(
    bodyRows,
    `Work ${plural(bodyRows, voice.row("flat"), voice.rows("flat"))} as follows: work ${plural(edgeSts, voice.st, voice.sts)} in ${input.edgeFabric}, work ${plural(bodySts, voice.st, voice.sts)} in ${input.bodyFabric}, work ${plural(edgeSts, voice.st, voice.sts)} in ${input.edgeFabric}.`,
  );

  piece.section("Upper border");
  piece.workEven(
    edgeRows,
    `Work ${plural(edgeRows, voice.row("flat"), voice.rows("flat"))} in ${input.edgeFabric} across all ${plural(total, voice.st, voice.sts)}.`,
  );
  piece.bindOff(
    ctx.craft === "knitting"
      ? `Bind off all ${plural(total, voice.st, voice.sts)} loosely in pattern — a tight bind-off pulls the top edge in and the piece will not block square.`
      : `Fasten off and weave in the ends.`,
  );

  return piece.build();
}

function edgeFabricName(ctx: GarmentContext): string {
  return ctx.craft === "knitting"
    ? "garter stitch (knit every row)"
    : `${ctx.crochetStitch} worked through both loops`;
}

function bodyFabricName(ctx: GarmentContext): string {
  return ctx.craft === "knitting" ? "stockinette (knit on RS, purl on WS)" : `${ctx.crochetStitch}`;
}

function rectMeasurements(ctx: GarmentContext, piece: GarmentPiece): Measurement[] {
  return [
    ctx.measure("Finished width", piece.widthCm, "width"),
    ctx.measure("Finished length", piece.heightCm, "length"),
  ];
}

/* -------------------------------------------------------------------------- */

export function buildScarf(ctx: GarmentContext): ConstructionResult {
  const table = SCARF_DIMS[ctx.scale];
  const dims: RectDims = {
    widthCm: ctx.options.targetWidthCm ?? table.widthCm,
    lengthCm: ctx.options.targetHeightCm ?? table.lengthCm,
    borderCm: table.borderCm,
  };
  const piece = buildFlatPanel(ctx, {
    id: "scarf",
    name: "Scarf",
    dims,
    // Stockinette curls at the edges and a scarf has two of them on show, so
    // the body is worked in a reversible fabric and the edge in garter.
    bodyFabric: ctx.craft === "knitting" ? "seed stitch (k1, p1, offset each row)" : bodyFabricName(ctx),
    edgeFabric: edgeFabricName(ctx),
  });

  return {
    construction: "none",
    constructionNotes: [
      "Worked flat in one piece from one short end to the other.",
      ctx.craft === "knitting"
        ? "The body is seed stitch and the edges garter, because both lie flat — a stockinette scarf curls into a tube however hard it is blocked, and both sides of a scarf are on show."
        : "Both faces of a crochet scarf are on show; the fabric stitch is reversible as worked, and the border rows stop the ends flaring.",
      ...ctx.voice.notes,
    ],
    pieces: [piece],
    measurements: rectMeasurements(ctx, piece),
    assembly: ["Block to the finished measurements", "Weave in the ends"],
    fabric: fabricFor(ctx, "seed"),
    abbreviations: baseAbbreviations(ctx),
  };
}

export function buildDishcloth(ctx: GarmentContext): ConstructionResult {
  const side = ctx.options.targetWidthCm ?? DISHCLOTH_DIMS.widthCm;
  const piece = buildFlatPanel(ctx, {
    id: "dishcloth",
    name: "Dishcloth",
    dims: { widthCm: side, lengthCm: ctx.options.targetHeightCm ?? side, borderCm: DISHCLOTH_DIMS.borderCm },
    bodyFabric: ctx.craft === "knitting" ? "garter stitch (knit every row)" : bodyFabricName(ctx),
    edgeFabric: edgeFabricName(ctx),
  });

  return {
    construction: "none",
    constructionNotes: [
      "A flat square worked in one piece. The whole cloth is worked in a dense, textured fabric so it scrubs and does not curl.",
      "Use a non-superwash cotton or linen: it absorbs, it takes a boil wash, and it does not melt on a hot pan.",
      ...ctx.voice.notes,
    ],
    pieces: [piece],
    measurements: rectMeasurements(ctx, piece),
    assembly: ["Weave in the ends", "Wash and block flat"],
    fabric: fabricFor(ctx, "garter"),
    abbreviations: baseAbbreviations(ctx),
  };
}

export function buildBlanket(ctx: GarmentContext, which: "babyBlanket" | "throwBlanket"): ConstructionResult {
  const table = BLANKET_DIMS[which];
  const dims: RectDims = {
    widthCm: ctx.options.targetWidthCm ?? table.widthCm,
    lengthCm: ctx.options.targetHeightCm ?? table.lengthCm,
    borderCm: table.borderCm,
  };
  const piece = buildFlatPanel(ctx, {
    id: "blanket",
    name: which === "babyBlanket" ? "Baby blanket" : "Throw",
    dims,
    bodyFabric: bodyFabricName(ctx),
    edgeFabric: edgeFabricName(ctx),
  });

  // The edging is picked up round the whole outside, so it is a real stitch
  // count: one stitch per stitch along the cast-on and bound-off edges, and the
  // craft's row-to-stitch ratio along the two sides.
  const perimeterSts =
    piece.castOn * 2 + Math.round(piece.rows * (ctx.craft === "knitting" ? 0.75 : 0.85)) * 2;

  const edging = new PieceBuilder({
    id: "blanket-edging",
    name: "Edging",
    voice: ctx.voice,
    worked: "round",
    widthCm: piece.widthCm,
    heightCm: roundTo(dims.borderCm, 2),
  });
  edging.castOn(
    perimeterSts,
    `With the right side facing, ${ctx.craft === "knitting" ? "pick up and knit" : `work`} ${plural(perimeterSts, ctx.voice.st, ctx.voice.sts)} evenly around the whole outside edge: ${plural(piece.castOn, ctx.voice.st, ctx.voice.sts)} along the lower edge, ${plural(Math.round(piece.rows * (ctx.craft === "knitting" ? 0.75 : 0.85)), ctx.voice.st, ctx.voice.sts)} up the side, ${plural(piece.castOn, ctx.voice.st, ctx.voice.sts)} along the upper edge and the same back down the second side. Place a marker at each corner.`,
  );
  const edgeRounds = Math.max(2, ctx.rowCount(dims.borderCm));
  // Four increases per round, one at each corner, or the border cups and the
  // blanket stops lying flat.
  edging.rows(
    edgeRounds,
    `Work ${plural(edgeRounds, "round")}, working ${ctx.craft === "knitting" ? "(k1, yo, k1) into the marked stitch" : `3 ${ctx.crochetStitch} into the marked stitch`} at each of the four corners on every round so the border lies flat — 8 ${ctx.voice.sts} added per round.`,
    edgeRounds * 8,
  );
  edging.bindOff();

  const edgingPiece = edging.build();

  return {
    construction: "none",
    constructionNotes: [
      "Worked flat in one piece, then finished with a border picked up all the way round.",
      "Four increases on every border round — one at each corner — keep the border flat. A border worked without corner increases cups and pulls the blanket into a dish.",
      which === "babyBlanket"
        ? "Finished at the standard 76 x 102 cm (30 x 40 in) receiving-blanket size, which fits a crib and a pram."
        : "Finished at the standard 127 x 152 cm (50 x 60 in) throw size.",
      ...ctx.voice.notes,
    ],
    pieces: [piece, edgingPiece],
    measurements: [
      ctx.measure("Finished width (with border)", piece.widthCm + dims.borderCm * 2, "width"),
      ctx.measure("Finished length (with border)", piece.heightCm + dims.borderCm * 2, "length"),
      ctx.measure("Centre panel width", piece.widthCm, "width"),
      ctx.measure("Centre panel length", piece.heightCm, "length"),
      ctx.measure("Border depth", dims.borderCm, "depth"),
    ],
    assembly: ["Work the centre panel", "Pick up and work the border", "Block to the finished measurements"],
    fabric: fabricFor(ctx, "stockinette"),
    abbreviations: baseAbbreviations(ctx),
  };
}

/**
 * "Other" — the documented fallback.
 *
 * It is still a real, gauge-driven construction: a rectangular panel at the
 * dimensions the caller asked for, or a sensible default derived from the
 * wearer scale when they asked for nothing. It is never a placeholder, it
 * always has counts, and it always produces a starter chart, because "I do not
 * know what this garment is" is not a reason to hand someone five sentences
 * with no numbers in them.
 */
export function buildOther(ctx: GarmentContext): ConstructionResult {
  const fallbackWidth = ctx.scale === "adult" ? 40 : ctx.scale === "child" ? 30 : 22;
  const fallbackHeight = ctx.scale === "adult" ? 50 : ctx.scale === "child" ? 38 : 28;
  const dims: RectDims = {
    widthCm: ctx.options.targetWidthCm ?? fallbackWidth,
    lengthCm: ctx.options.targetHeightCm ?? fallbackHeight,
    borderCm: 2.5,
  };
  const piece = buildFlatPanel(ctx, {
    id: "panel",
    name: "Panel",
    dims,
    bodyFabric: bodyFabricName(ctx),
    edgeFabric: edgeFabricName(ctx),
  });

  return {
    construction: "none",
    constructionNotes: [
      "This garment type has no named construction in the engine, so it is drafted as a single gauge-driven panel at the requested finished size.",
      "Every number below comes from your gauge and the finished measurements — change either and the pattern changes with it. Use the panel as the starting point for a custom shape, or pick a named garment type for a full construction with shaping.",
      ...ctx.voice.notes,
    ],
    pieces: [piece],
    measurements: rectMeasurements(ctx, piece),
    assembly: ["Work the panel", "Block to the finished measurements", "Weave in the ends"],
    fabric: fabricFor(ctx, "stockinette"),
    abbreviations: baseAbbreviations(ctx),
  };
}
