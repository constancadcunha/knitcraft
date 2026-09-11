/**
 * PieceBuilder — the machine that makes an unknittable pattern impossible.
 *
 * A construction never writes a stitch count into prose. It calls a builder
 * method, the builder moves the live stitch count, and the prose is generated
 * from the count the builder now holds. That is the whole trick: the "(58 sts)"
 * a knitter reads is the same number the engine is carrying, because it is
 * literally the same variable.
 *
 * The builder additionally refuses to:
 *   - take the stitch count below zero,
 *   - consume more rows than the section was given,
 *   - split a live count into parts that do not sum to it.
 * Each of those is recorded as a warning on the piece (never thrown), because a
 * pattern with a stated problem is far more useful to a knitter than a pattern
 * that silently lies — and because the property test asserts the warning list
 * is empty for every garment, craft and size.
 */

import {
  type BindOffCurve,
  type RowDelta,
  type ShapingSchedule,
  checkPartition,
  plural,
  roundTo,
  runningStitchCounts,
} from "../knit";
import { starterChartFor } from "./starterChart";
import type {
  GarmentPiece,
  InstructionKind,
  InstructionLine,
  PieceSection,
  Reconciliation,
  WorkedAs,
} from "./types";
import type { Voice } from "./voice";

export interface PieceBuilderOptions {
  readonly id: string;
  readonly name: string;
  readonly voice: Voice;
  readonly worked: WorkedAs;
  readonly makeCount?: number;
  /** Finished flat width and height, for the schematic and the yarn area. */
  readonly widthCm: number;
  readonly heightCm: number;
  /** Narrow end of a tapered piece, if any — used for the trapezium area. */
  readonly minWidthCm?: number;
  /** Chart hint: the stitch multiple the fabric repeats over. */
  readonly chartRepeat?: number;
}

interface PendingSection {
  name: string;
  note?: string;
  lines: InstructionLine[];
}

export class PieceBuilder {
  private readonly options: PieceBuilderOptions;
  private readonly voice: Voice;
  private sections: PendingSection[] = [];
  private current: PendingSection | null = null;
  private lineIndex = 0;
  private live = 0;
  private rowCursor = 0;
  private deltas: RowDelta[] = [];
  private reconciliations: Reconciliation[] = [];
  private warnings: string[] = [];
  private castOnCount = 0;
  private held: { name: string; stitches: number }[] = [];

  constructor(options: PieceBuilderOptions) {
    this.options = options;
    this.voice = options.voice;
    this.section("Instructions");
  }

  /* ---------------------------------------------------------------------- */
  /* Reading                                                                 */
  /* ---------------------------------------------------------------------- */

  /** Stitches currently on the needle or hook. */
  get stitches(): number {
    return this.live;
  }

  /** Rows/rounds worked so far. */
  get rowsWorked(): number {
    return this.rowCursor;
  }

  /* ---------------------------------------------------------------------- */
  /* Structure                                                               */
  /* ---------------------------------------------------------------------- */

  section(name: string, note?: string): this {
    if (this.current && this.current.lines.length === 0) {
      // Replace an empty placeholder section rather than emitting a blank one.
      this.sections.pop();
    }
    this.current = { name, note, lines: [] };
    this.sections.push(this.current);
    return this;
  }

  note(text: string): this {
    this.push({ rows: 0, delta: 0, text, kind: "note" });
    return this;
  }

  warn(message: string): this {
    this.warnings.push(message);
    return this;
  }

  /* ---------------------------------------------------------------------- */
  /* Rows                                                                    */
  /* ---------------------------------------------------------------------- */

  /**
   * Start the piece. `text` overrides the craft's default cast-on/foundation
   * wording, which is what a garter tab or a magic ring needs.
   */
  castOn(stitches: number, text?: string): this {
    this.castOnCount = stitches;
    this.live = stitches;
    this.push({
      rows: 0,
      delta: 0,
      text: text ?? this.voice.castOn(stitches, this.options.worked),
      kind: "setup",
      forceCount: false,
    });
    return this;
  }

  /** Work plain rows. Never changes the stitch count. */
  workEven(rows: number, text?: string): this {
    if (rows <= 0) return this;
    this.push({
      rows,
      delta: 0,
      text: text ?? this.voice.workEven(rows, this.options.worked),
      kind: "work",
    });
    return this;
  }

  /** One row that changes the stitch count by `delta`. */
  row(text: string, delta = 0, kind: InstructionKind = "work"): this {
    this.push({ rows: 1, delta, text, kind });
    return this;
  }

  /**
   * Several rows that together change the count by `totalDelta`, e.g. a rib
   * transition row plus its plain rows. The delta is attributed to the FIRST
   * row of the block, which is where it actually happens.
   */
  rows(rowCount: number, text: string, totalDelta = 0, kind: InstructionKind = "work"): this {
    this.push({ rows: Math.max(1, rowCount), delta: totalDelta, text, kind });
    return this;
  }

  /* ---------------------------------------------------------------------- */
  /* Solved shaping                                                          */
  /* ---------------------------------------------------------------------- */

  /**
   * Apply a schedule solved by `distributeShaping` / `taperSchedule`.
   *
   * `stitchesPerEvent` is the change per shaping row: +2 for an increase at
   * each end of a row, -2 for a decrease at each end, -k for a hat crown round.
   * The row budget consumed is the schedule's own `overRows`, so shaping can
   * never overrun the fabric it was solved inside.
   */
  shape(
    schedule: ShapingSchedule,
    stitchesPerEvent: number,
    options: { label?: string; kind?: InstructionKind; text?: string } = {},
  ): this {
    if (!schedule.fits) {
      this.warnings.push(...schedule.warnings);
    }
    const delta = schedule.scheduledCount * stitchesPerEvent;
    const rows = Math.max(schedule.overRows, schedule.rowsUsed);
    if (schedule.scheduledCount === 0) {
      if (rows > 0) this.workEven(rows);
      return this;
    }
    const body = options.text ?? schedule.instruction;
    this.push({ rows, delta, text: body, kind: options.kind ?? "shape" });
    if (schedule.plainRowsAfter > 0) {
      // The schedule's own budget already contains these rows, so they are
      // described but not charged again.
      this.annotate(
        `The last shaping ${this.voice.row(this.options.worked)} falls ${plural(schedule.plainRowsAfter, this.voice.row(this.options.worked), this.voice.rows(this.options.worked))} before the end of this section.`,
      );
    }
    return this;
  }

  /**
   * Apply a stepped bind-off curve solved by `bindOffCurve` — an armhole, a
   * neckline, a shoulder slope. Consumes the curve's own row count.
   */
  bindOffCurve(curve: BindOffCurve, options: { kind?: InstructionKind } = {}): this {
    if (curve.total === 0) return this;
    this.warnings.push(...curve.warnings);
    const delta = -curve.total * curve.edges;
    this.push({
      rows: curve.rowsUsed,
      delta,
      text: curve.instruction,
      kind: options.kind ?? "shape",
    });
    return this;
  }

  /* ---------------------------------------------------------------------- */
  /* Splitting, holding, finishing                                           */
  /* ---------------------------------------------------------------------- */

  /**
   * Split the live stitches into named parts and PROVE the split.
   *
   * This is the guard on the bug the audit found: the old engine bound off 34
   * and claimed two 21-stitch shoulders from 58 live stitches. `checkPartition`
   * makes 21 + 34 + 21 = 76 != 58 an explicit, reported failure.
   */
  partition(where: string, parts: readonly { name: string; stitches: number }[]): this {
    const result = checkPartition(this.live, parts);
    this.reconciliations.push({
      where,
      liveStitches: this.live,
      parts: parts.map((p) => ({ ...p })),
      ok: result.ok,
      message: result.message,
    });
    if (!result.ok) {
      this.warnings.push(`${where}: ${result.message}`);
    }
    return this;
  }

  /** Move stitches off the needle to a holder; they leave the live count. */
  hold(name: string, stitches: number, text?: string): this {
    this.held.push({ name, stitches });
    this.push({
      rows: 0,
      delta: -stitches,
      text:
        text ??
        `Place the ${plural(stitches, this.voice.st, this.voice.sts)} for the ${name} on a holder or waste yarn.`,
      kind: "divide",
    });
    return this;
  }

  /** Return held stitches to the needle. */
  resume(name: string, stitches: number, text?: string): this {
    this.push({
      rows: 0,
      delta: stitches,
      text: text ?? `Return the ${plural(stitches, this.voice.st, this.voice.sts)} of the ${name} to the needle.`,
      kind: "join",
    });
    return this;
  }

  /** Add stitches without working a row — an underarm cast-on, a thumb gap. */
  addStitches(stitches: number, text: string): this {
    this.push({ rows: 0, delta: stitches, text, kind: "join" });
    return this;
  }

  /** Remove stitches without working a row. */
  removeStitches(stitches: number, text: string): this {
    this.push({ rows: 0, delta: -stitches, text, kind: "divide" });
    return this;
  }

  bindOff(text?: string): this {
    const count = this.live;
    this.push({
      rows: 0,
      delta: -count,
      text: text ?? this.voice.bindOffAll(count),
      kind: "finish",
      forceCount: false,
    });
    return this;
  }

  /** Close a tube or a fingertip by drawing the yarn through the live stitches. */
  drawThrough(text?: string): this {
    const count = this.live;
    this.push({
      rows: 0,
      delta: -count,
      text:
        text ??
        `Cut the yarn, thread it through the remaining ${plural(count, this.voice.st, this.voice.sts)}, draw up tight and fasten off on the inside.`,
      kind: "finish",
      forceCount: false,
    });
    return this;
  }

  /** A plain trailing remark attached to the previous line's section. */
  annotate(text: string): this {
    this.push({ rows: 0, delta: 0, text, kind: "note" });
    return this;
  }

  /* ---------------------------------------------------------------------- */
  /* Emit                                                                    */
  /* ---------------------------------------------------------------------- */

  build(): GarmentPiece {
    const ledgerCheck = runningStitchCounts(this.castOnCount, this.deltas);
    if (!ledgerCheck.valid) this.warnings.push(...ledgerCheck.errors);

    const sections = this.sections.filter((s) => s.lines.length > 0);
    const area = areaFor(this.options);

    const piece: Omit<GarmentPiece, "starterChart"> = {
      id: this.options.id,
      name: this.options.name,
      makeCount: this.options.makeCount ?? 1,
      worked: this.options.worked,
      castOn: this.castOnCount,
      rows: this.rowCursor,
      finalStitches: this.live,
      widthCm: roundTo(this.options.widthCm, 2),
      heightCm: roundTo(this.options.heightCm, 2),
      areaCm2: roundTo(area, 1),
      sections: sections as PieceSection[],
      ledger: this.deltas,
      reconciliations: this.reconciliations,
      warnings: this.warnings,
    };

    return {
      ...piece,
      starterChart: starterChartFor({
        id: `${this.options.id}-chart`,
        name: `${this.options.name} — baseline`,
        craft: this.voice.craft,
        stitches: Math.max(1, this.castOnCount || Math.round(this.options.widthCm) || 12),
        rows: Math.max(1, this.rowCursor || Math.round(this.options.heightCm) || 12),
        worked: this.options.worked,
        repeat: this.options.chartRepeat,
      }),
    };
  }

  /* ---------------------------------------------------------------------- */

  private push(input: {
    rows: number;
    delta: number;
    text: string;
    kind: InstructionKind;
    forceCount?: boolean;
  }) {
    const before = this.live;
    let after = before + input.delta;
    if (after < 0) {
      this.warnings.push(
        `"${input.text}" removes ${Math.abs(input.delta)} ${this.voice.sts} but only ${plural(before, this.voice.st, this.voice.sts)} are live.`,
      );
      after = 0;
    }
    const startRow = input.rows > 0 ? this.rowCursor + 1 : null;
    const endRow = input.rows > 0 ? this.rowCursor + input.rows : null;

    if (input.delta !== 0) {
      // Attribute the change to the first row of the block, which is where the
      // shaping row actually is. Notes and holders carry the current row.
      this.deltas.push({
        row: startRow ?? Math.max(1, this.rowCursor),
        delta: input.delta,
        note: input.text,
      });
    }

    const showCount = input.forceCount ?? (input.delta !== 0 && after > 0);
    const text = showCount ? `${input.text} ${this.voice.count(after)}` : input.text;

    const line: InstructionLine = {
      index: this.lineIndex,
      startRow,
      endRow,
      rows: input.rows,
      stitchesBefore: before,
      stitchesAfter: after,
      text,
      kind: input.kind,
    };
    this.lineIndex += 1;
    this.rowCursor += input.rows;
    this.live = after;
    if (!this.current) this.section("Instructions");
    this.current!.lines.push(line);
  }
}

function areaFor(options: PieceBuilderOptions): number {
  const min = options.minWidthCm;
  if (min !== undefined && min !== options.widthCm) {
    // A tapered piece is a trapezium, not a rectangle: a sleeve counted as
    // cuff-to-bicep rectangle over-orders yarn by a third.
    return ((Math.max(0, min) + Math.max(0, options.widthCm)) / 2) * Math.max(0, options.heightCm);
  }
  return Math.max(0, options.widthCm) * Math.max(0, options.heightCm);
}
