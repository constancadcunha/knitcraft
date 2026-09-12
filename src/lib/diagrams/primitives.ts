/**
 * primitives.ts — a tiny pixel-art SVG authoring toolkit.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Learn page used to illustrate stitches with ~20 Wikimedia photos shown
 * without the attribution their CC BY / CC BY-SA licences require, 12 hotlinked
 * all-rights-reserved images, and one photo of flat stockinette standing in for
 * six unrelated things (a decrease, an increase, short rows, i-cord and a gauge
 * swatch). Drawing our own diagrams removes the licence problem entirely and —
 * more importantly — lets a diagram show what a stitch actually DOES, which a
 * photograph of finished fabric cannot.
 *
 * DESIGN RULES
 * ------------
 * 1. Everything lives on an integer grid. Coordinates are grid cells, never
 *    pixels, so nothing ever lands on a half-pixel and `shape-rendering
 *    ="crispEdges"` gives hard, deliberate pixel edges rather than blur.
 * 2. Nothing is drawn with a stroke. Lines, curves and circles are rasterised
 *    into grid cells (Bresenham / midpoint), exactly like a sprite editor. That
 *    is what makes the output read as pixel art instead of as clip art.
 * 3. Colours are named PALETTE KEYS, never literals. A drawing carries no colour
 *    at all until `toSVG(palette)` resolves the keys, so the same canvas renders
 *    correctly on any background and in any theme, and it is structurally
 *    impossible to bake a hex value into a diagram.
 * 4. Same-coloured cells are merged into horizontal runs and concatenated into
 *    one `<path>`, because these SVGs are inlined into the page as strings.
 *
 * No React, no Next, no DOM: pure TypeScript, safe to import anywhere.
 */

// ─── palette ────────────────────────────────────────────────────────────────

/**
 * The eight roles a stitch diagram needs. Keeping the set this small is what
 * makes every diagram in the app read as one system.
 */
export interface DiagramPalette {
  /** Outlines, needles' shadows, structural linework. */
  ink: string;
  /** The diagram ground. "none" by default so the host surface shows through. */
  paper: string;
  /** Faint guides: chart grid, row rules, measurement ticks. */
  grid: string;
  /** The working yarn — the main colour of the fabric. */
  yarn: string;
  /** A second yarn: contrast colour, the strand behind, the other cable rope. */
  yarnAlt: string;
  /** The thing the diagram is teaching: the new stitch, the hole, the crossing. */
  highlight: string;
  /** Needles, hooks, tapestry needles, pins, blocking mats. */
  tool: string;
  /** Captions, step numbers, stitch counts. */
  text: string;
}

export type PaletteKey = keyof DiagramPalette;

/**
 * Theme-agnostic default. Every entry is either `currentColor` or a design-token
 * `var()` with a `currentColor` fallback — so a diagram is legible on a light
 * page, a dark page, or a page that has not loaded the token sheet at all, and
 * the emitted SVG contains no hex literal anywhere.
 */
export const DEFAULT_PALETTE: DiagramPalette = {
  ink: "currentColor",
  paper: "none",
  grid: "color-mix(in srgb, currentColor 18%, transparent)",
  yarn: "var(--color-cobalt, currentColor)",
  yarnAlt: "var(--color-berry, currentColor)",
  highlight: "var(--color-gold, currentColor)",
  tool: "var(--color-ink-faint, currentColor)",
  text: "currentColor",
};

/** The keys, in declaration order — handy for tests and for palette editors. */
export const PALETTE_KEYS: readonly PaletteKey[] = [
  "ink",
  "paper",
  "grid",
  "yarn",
  "yarnAlt",
  "highlight",
  "tool",
  "text",
];

// ─── internals ──────────────────────────────────────────────────────────────

type CellRows = Map<number, Set<number>>;

interface CellOp {
  kind: "cells";
  key: PaletteKey;
  rows: CellRows;
}

interface TextOp {
  kind: "text";
  key: PaletteKey;
  x: number;
  y: number;
  value: string;
  size: number;
  anchor: TextAnchor;
  bold: boolean;
}

type Op = CellOp | TextOp;

export type TextAnchor = "start" | "middle" | "end";

/** UI font with a monospace fallback chain — matches the app's chrome font. */
const FONT_STACK = "var(--font-ui, ui-monospace, monospace)";

const XML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => XML_ESCAPES[c]);
}

const r = Math.round;

// ─── the canvas ─────────────────────────────────────────────────────────────

export interface CanvasOptions {
  /** Pixels per grid cell in the emitted width/height. Default 4. */
  scale?: number;
  /** Accessible name. Rendered as <title> and aria-label. */
  title?: string;
}

/**
 * A fixed-size grid of cells you paint into, which emits one compact SVG.
 *
 * Draw operations are kept in order so later paint covers earlier paint, but
 * consecutive operations sharing a palette key are coalesced into a single
 * cell set — which is why a 60x40 fabric swatch emits three or four paths
 * rather than two thousand rects.
 */
export class PixelCanvas {
  readonly cols: number;
  readonly rows: number;
  readonly scale: number;
  readonly title: string;
  private readonly ops: Op[] = [];

  constructor(cols: number, rows: number, options: CanvasOptions = {}) {
    if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 1 || rows < 1) {
      throw new Error(`PixelCanvas needs positive integer dimensions, got ${cols}x${rows}`);
    }
    this.cols = cols;
    this.rows = rows;
    this.scale = options.scale ?? 4;
    this.title = options.title ?? "";
  }

  // — cell painting —

  /** Paint one cell. Out-of-bounds writes are dropped, so rasterisers that
   *  overshoot a curve by a cell cannot corrupt the drawing. */
  px(x: number, y: number, key: PaletteKey): this {
    const cx = r(x);
    const cy = r(y);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return this;
    const op = this.cellOp(key);
    let row = op.rows.get(cy);
    if (!row) {
      row = new Set<number>();
      op.rows.set(cy, row);
    }
    row.add(cx);
    return this;
  }

  /** Solid block. */
  rect(x: number, y: number, w: number, h: number, key: PaletteKey): this {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) this.px(x + dx, y + dy, key);
    }
    return this;
  }

  /** Hollow rectangle with a `t`-cell border. */
  frame(x: number, y: number, w: number, h: number, key: PaletteKey, t = 1): this {
    this.rect(x, y, w, t, key);
    this.rect(x, y + h - t, w, t, key);
    this.rect(x, y, t, h, key);
    this.rect(x + w - t, y, t, h, key);
    return this;
  }

  /** Flood the whole canvas — usually with `paper`. */
  fill(key: PaletteKey): this {
    return this.rect(0, 0, this.cols, this.rows, key);
  }

  hline(x: number, y: number, len: number, key: PaletteKey, t = 1): this {
    return this.rect(x, y, len, t, key);
  }

  vline(x: number, y: number, len: number, key: PaletteKey, t = 1): this {
    return this.rect(x, y, t, len, key);
  }

  /**
   * A dashed guide line — used for "this strand runs behind", chart rules and
   * fold lines. `on`/`off` are in cells.
   */
  dashedH(x: number, y: number, len: number, key: PaletteKey, on = 2, off = 2): this {
    for (let i = 0; i < len; i += on + off) this.hline(x + i, y, Math.min(on, len - i), key);
    return this;
  }

  // — line work (rasterised, never stroked) —

  /** Bresenham segment, thickened to a `t`x`t` brush. */
  line(x0: number, y0: number, x1: number, y1: number, key: PaletteKey, t = 1): this {
    let x = r(x0);
    let y = r(y0);
    const ex = r(x1);
    const ey = r(y1);
    const dx = Math.abs(ex - x);
    const dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1;
    const sy = y < ey ? 1 : -1;
    let err = dx + dy;
    // Centre the brush so a thick line grows symmetrically about the ideal line.
    const off = Math.floor((t - 1) / 2);
    for (;;) {
      if (t === 1) this.px(x, y, key);
      else this.rect(x - off, y - off, t, t, key);
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }
    return this;
  }

  /** Connected segments. */
  polyline(points: ReadonlyArray<readonly [number, number]>, key: PaletteKey, t = 1): this {
    for (let i = 1; i < points.length; i++) {
      this.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1], key, t);
    }
    return this;
  }

  /**
   * Quadratic Bezier, sampled and rasterised. Yarn is curved; a stitch drawn
   * with straight lines alone looks like a circuit diagram, not a loop of wool.
   * Sample count is derived from the control polygon length so short curves stay
   * cheap and long ones stay smooth.
   */
  quad(
    p0: readonly [number, number],
    c: readonly [number, number],
    p1: readonly [number, number],
    key: PaletteKey,
    t = 1,
  ): this {
    const span =
      Math.hypot(c[0] - p0[0], c[1] - p0[1]) + Math.hypot(p1[0] - c[0], p1[1] - c[1]);
    const steps = Math.max(2, Math.ceil(span));
    let prevX = p0[0];
    let prevY = p0[1];
    for (let i = 1; i <= steps; i++) {
      const u = i / steps;
      const v = 1 - u;
      const x = v * v * p0[0] + 2 * v * u * c[0] + u * u * p1[0];
      const y = v * v * p0[1] + 2 * v * u * c[1] + u * u * p1[1];
      this.line(prevX, prevY, x, y, key, t);
      prevX = x;
      prevY = y;
    }
    return this;
  }

  /** Midpoint-circle outline. */
  ring(cx: number, cy: number, radius: number, key: PaletteKey, t = 1): this {
    let x = r(radius);
    let y = 0;
    let err = 1 - x;
    const plot = (px: number, py: number) => {
      if (t === 1) this.px(px, py, key);
      else this.rect(px - Math.floor((t - 1) / 2), py - Math.floor((t - 1) / 2), t, t, key);
    };
    while (x >= y) {
      plot(cx + x, cy + y);
      plot(cx + y, cy + x);
      plot(cx - y, cy + x);
      plot(cx - x, cy + y);
      plot(cx - x, cy - y);
      plot(cx - y, cy - x);
      plot(cx + y, cy - x);
      plot(cx + x, cy - y);
      y++;
      if (err < 0) err += 2 * y + 1;
      else {
        x--;
        err += 2 * (y - x) + 1;
      }
    }
    return this;
  }

  /** Filled disc, scanline. */
  disc(cx: number, cy: number, radius: number, key: PaletteKey): this {
    const rad = r(radius);
    for (let dy = -rad; dy <= rad; dy++) {
      const half = Math.floor(Math.sqrt(Math.max(0, rad * rad - dy * dy)));
      this.hline(cx - half, cy + dy, half * 2 + 1, key);
    }
    return this;
  }

  /** Ellipse outline, parametric — chain links and puff stitches are ovals. */
  oval(cx: number, cy: number, rx: number, ry: number, key: PaletteKey, t = 1): this {
    const steps = Math.max(12, Math.ceil((rx + ry) * 3));
    let prev: [number, number] | null = null;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const p: [number, number] = [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
      if (prev) this.line(prev[0], prev[1], p[0], p[1], key, t);
      prev = p;
    }
    return this;
  }

  /**
   * Cut a hole through everything drawn so far. This is how a yarn-over eyelet
   * becomes a real hole — the host background shows through it — instead of a
   * paper-coloured patch that only works on one theme.
   */
  erase(x: number, y: number, w: number, h: number): this {
    for (const op of this.ops) {
      if (op.kind !== "cells") continue;
      for (let dy = 0; dy < h; dy++) {
        const row = op.rows.get(r(y + dy));
        if (!row) continue;
        for (let dx = 0; dx < w; dx++) row.delete(r(x + dx));
      }
    }
    return this;
  }

  // — arrows and tools —

  /** Line with a solid triangular head at (x1,y1). Direction is free-form. */
  arrow(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    key: PaletteKey,
    t = 1,
    head = 3,
  ): this {
    this.line(x0, y0, x1, y1, key, t);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    // Perpendicular of the direction: the head widens as it retreats from the tip.
    const nx = -uy;
    const ny = ux;
    for (let i = 1; i <= head; i++) {
      const bx = x1 - ux * i;
      const by = y1 - uy * i;
      for (let j = -i; j <= i; j++) this.px(bx + nx * j, by + ny * j, key);
    }
    return this;
  }

  /**
   * A knitting needle: knob at (x0,y0), tapering to a point at (x1,y1).
   * The taper matters — it is the only thing that tells a reader which end of
   * the needle the stitch is being worked off.
   */
  needle(x0: number, y0: number, x1: number, y1: number, key: PaletteKey): this {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const taper = Math.min(6, len * 0.3);
    this.line(x0, y0, x1 - ux * taper, y1 - uy * taper, key, 2);
    this.line(x1 - ux * taper, y1 - uy * taper, x1, y1, key, 1);
    this.disc(x0, y0, 2, key);
    return this;
  }

  /**
   * A crochet hook: shaft from (x0,y0) toward (x1,y1), ending in the throat and
   * the hooked lip that catches the yarn. Drawn as a curl so it cannot be
   * mistaken for a needle.
   */
  hook(x0: number, y0: number, x1: number, y1: number, key: PaletteKey): this {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const throat = 5;
    this.line(x0, y0, x1 - ux * throat, y1 - uy * throat, key, 2);
    // The lip: forward to the tip, then curling back on the near side.
    this.quad(
      [x1 - ux * throat, y1 - uy * throat],
      [x1 + ux * 1, y1 + uy * 1],
      [x1 - ux * 2 + nx * 4, y1 - uy * 2 + ny * 4],
      key,
      1,
    );
    return this;
  }

  // — text —

  /**
   * A caption or number. Text is the one thing that is NOT pixel-rasterised:
   * hand-drawing a bitmap font would cost more bytes than it is worth, and the
   * app's own UI font is already a pixel face.
   */
  text(
    x: number,
    y: number,
    value: string,
    key: PaletteKey = "text",
    options: { size?: number; anchor?: TextAnchor; bold?: boolean } = {},
  ): this {
    this.ops.push({
      kind: "text",
      key,
      x: r(x),
      y: r(y),
      value,
      size: options.size ?? 4,
      anchor: options.anchor ?? "start",
      bold: options.bold ?? false,
    });
    return this;
  }

  // — emit —

  /**
   * Resolve palette keys and serialise. Pure: the same canvas can be emitted
   * against a light palette, a dark palette and a print palette.
   */
  toSVG(palette: DiagramPalette = DEFAULT_PALETTE): string {
    const body: string[] = [];
    for (const op of this.ops) {
      const colour = palette[op.key];
      if (op.kind === "cells") {
        if (colour === "none") continue; // an invisible fill is not worth bytes
        const d = pathData(op.rows);
        if (d) body.push(`<path fill="${esc(colour)}" d="${d}"/>`);
      } else {
        const weight = op.bold ? ' font-weight="bold"' : "";
        body.push(
          `<text x="${op.x}" y="${op.y}" fill="${esc(colour)}" font-family="${FONT_STACK}"` +
            ` font-size="${op.size}" text-anchor="${op.anchor}"${weight}>${esc(op.value)}</text>`,
        );
      }
    }
    const label = this.title ? ` role="img" aria-label="${esc(this.title)}"` : ' aria-hidden="true"';
    const titleTag = this.title ? `<title>${esc(this.title)}</title>` : "";
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.cols} ${this.rows}"` +
      ` width="${this.cols * this.scale}" height="${this.rows * this.scale}"` +
      ` shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet"${label}>` +
      `${titleTag}${body.join("")}</svg>`
    );
  }

  private cellOp(key: PaletteKey): CellOp {
    const last = this.ops[this.ops.length - 1];
    if (last && last.kind === "cells" && last.key === key) return last;
    const op: CellOp = { kind: "cells", key, rows: new Map() };
    this.ops.push(op);
    return op;
  }
}

/**
 * Merge a cell set into rectangles and emit one path.
 *
 * Cells are merged into horizontal runs, then runs of identical x and width in
 * consecutive rows are merged vertically into a single rectangle. That second
 * pass matters a lot for fabric swatches, where the same stitch repeats down a
 * column: without it a 7x6 knit V repeated 42 times emits every run six times
 * over. `M x y h w v h h-w z` is one rectangle; all four sides are written
 * because `z` only draws a straight line back to the start.
 */
function pathData(rows: CellRows): string {
  // Pass 1: horizontal runs per row, as [x, width].
  const runsByRow = new Map<number, Array<[number, number]>>();
  for (const y of rows.keys()) {
    const xs = [...(rows.get(y) as Set<number>)].sort((a, b) => a - b);
    const runs: Array<[number, number]> = [];
    let start = xs[0];
    let run = 0;
    for (let i = 0; i < xs.length; i++) {
      run++;
      if (i + 1 < xs.length && xs[i + 1] === xs[i] + 1) continue;
      runs.push([start, run]);
      start = xs[i + 1];
      run = 0;
    }
    runsByRow.set(y, runs);
  }

  // Pass 2: extend each run downwards while the row below repeats it exactly.
  const ys = [...runsByRow.keys()].sort((a, b) => a - b);
  const open = new Map<string, { x: number; w: number; y: number; h: number }>();
  const out: string[] = [];

  const flush = (rect: { x: number; w: number; y: number; h: number }) => {
    // All four sides are required. `z` closes a subpath with a STRAIGHT LINE
    // back to its start point, so `M x y h w v h z` draws a triangle, not a
    // rectangle — dropping the fourth side sheared every sprite in the app.
    out.push(`M${rect.x} ${rect.y}h${rect.w}v${rect.h}h-${rect.w}z`);
  };

  for (let i = 0; i < ys.length; i++) {
    const y = ys[i];
    const seen = new Set<string>();

    for (const [x, w] of runsByRow.get(y) as Array<[number, number]>) {
      const key = `${x}:${w}`;
      seen.add(key);
      const existing = open.get(key);
      // Only extend when this row is directly below the open rectangle.
      if (existing && existing.y + existing.h === y) existing.h += 1;
      else {
        if (existing) flush(existing);
        open.set(key, { x, w, y, h: 1 });
      }
    }

    // Close anything this row did not repeat.
    for (const [key, rect] of [...open]) {
      if (!seen.has(key)) {
        flush(rect);
        open.delete(key);
      }
    }
  }
  for (const rect of open.values()) flush(rect);

  // Rectangles come out in close order; sorting keeps output deterministic so
  // two identical canvases always serialise byte-identically.
  return out.sort().join("");
}

// ─── stitch motifs ──────────────────────────────────────────────────────────
// The domain vocabulary sitting one layer above the raw canvas. These are the
// shapes every diagram in the library is assembled from, so that a knit stitch
// is drawn identically everywhere it appears.

/** Default footprint of one knitted stitch, in cells. */
export const STITCH_W = 7;
export const STITCH_H = 6;

export interface StitchMotifOptions {
  w?: number;
  h?: number;
  /** Horizontal shift of the V's apex: +1..3 leans right, -1..-3 leans left. */
  lean?: number;
  t?: number;
}

/**
 * A knit stitch as it appears on the right side: a V with the point at the
 * BOTTOM, arms rising to the row above. Leaning the apex is not decoration —
 * it is precisely how k2tog (right lean) and ssk (left lean) are told apart in
 * finished fabric, so the same parameter that draws the fabric draws the lesson.
 */
export function knitV(
  cv: PixelCanvas,
  x: number,
  y: number,
  key: PaletteKey,
  options: StitchMotifOptions = {},
): void {
  const w = options.w ?? STITCH_W;
  const h = options.h ?? STITCH_H;
  const lean = options.lean ?? 0;
  const t = options.t ?? 1;
  const apex = x + Math.floor((w - 1) / 2) + lean;
  cv.line(x, y, apex, y + h - 1, key, t);
  cv.line(apex, y + h - 1, x + w - 1, y, key, t);
}

/**
 * A purl stitch on the right side: a horizontal bump sitting on the row below.
 * Two rows of these stacked is what makes a garter ridge read as a ridge.
 */
export function purlBump(
  cv: PixelCanvas,
  x: number,
  y: number,
  key: PaletteKey,
  options: StitchMotifOptions = {},
): void {
  const w = options.w ?? STITCH_W;
  const h = options.h ?? STITCH_H;
  const t = options.t ?? 1;
  const base = y + h - 2;
  cv.quad([x, base], [x + (w - 1) / 2, y - 1], [x + w - 1, base], key, t);
  cv.hline(x, base + 1, w, key);
}

/**
 * A crochet post. `bars` is the number of yarn-over bars crossing it, which is
 * the standard notation and also the literal truth of the stitch: sc has none,
 * hdc one, dc one crossed bar at the top of two pull-throughs, tr two.
 */
export function crochetPost(
  cv: PixelCanvas,
  x: number,
  yTop: number,
  yBottom: number,
  key: PaletteKey,
  bars = 0,
  capWidth = 5,
): void {
  const half = Math.floor(capWidth / 2);
  cv.vline(x, yTop, yBottom - yTop + 1, key);
  cv.hline(x - half, yTop, capWidth, key);
  const span = yBottom - yTop;
  for (let i = 1; i <= bars; i++) {
    const by = yTop + Math.round((span * i) / (bars + 1));
    cv.line(x - 2, by + 1, x + 2, by - 1, key);
  }
}

/** The X used for single crochet in symbol charts. */
export function crochetX(cv: PixelCanvas, cx: number, cy: number, key: PaletteKey, rad = 3): void {
  cv.line(cx - rad, cy - rad, cx + rad, cy + rad, key);
  cv.line(cx + rad, cy - rad, cx - rad, cy + rad, key);
}

/** A chain link: the oval every crochet fabric is founded on. */
export function chainLink(
  cv: PixelCanvas,
  cx: number,
  cy: number,
  key: PaletteKey,
  rx = 4,
  ry = 2,
): void {
  cv.oval(cx, cy, rx, ry, key);
}

/** The slip-stitch dot — a filled circle, the flattest stitch in crochet. */
export function slipStitchDot(cv: PixelCanvas, cx: number, cy: number, key: PaletteKey): void {
  cv.disc(cx, cy, 2, key);
}
