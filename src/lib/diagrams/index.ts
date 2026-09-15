/**
 * src/lib/diagrams — licence-clean, semantically exact pixel-art stitch imagery.
 *
 * Framework-free: no React, no Next, no DOM. Everything here is a pure function
 * from an id (and optionally a palette) to an SVG string you can inline.
 *
 * WHAT IS HERE
 *   primitives.ts        the pixel-SVG authoring toolkit and the palette contract
 *   stitchDiagrams.ts    one hand-authored technique drawing per stitch id
 *   techniqueDiagrams.ts numbered step sequences for the Learn page essentials
 *   fabricSwatch.ts      procedural "what the fabric looks like" tiles
 *   attribution.ts       the few genuinely-better photographs, correctly credited
 *
 * THE RULE THIS MODULE ENFORCES
 *   Never show a picture of the wrong thing. A learner comparing their work
 *   against an image of a different stitch concludes that they made a mistake.
 *   So `diagramFor` degrades toward vaguer but still-true imagery, and never
 *   toward a specific-but-wrong photograph. See the fallback ladder below.
 */

export * from "./primitives";
export * from "./stitchDiagrams";
export * from "./techniqueDiagrams";
export * from "./fabricSwatch";
export * from "./attribution";

import { DEFAULT_PALETTE, type DiagramPalette } from "./primitives";
import {
  FABRIC_FOR_STITCH,
  FABRIC_LABELS,
  fabricSwatch,
  fabricSwatchCanvas,
  type FabricKind,
  type FabricSwatchOptions,
} from "./fabricSwatch";
import { hasStitchDiagram, stitchDiagram, stitchDiagramTitle } from "./stitchDiagrams";
import type { CraftType } from "@/types";

/** How a resolved image was arrived at — surface this if you want, it is honest. */
export type DiagramKind =
  /** A drawing authored specifically for this stitch. */
  | "stitch-diagram"
  /** A generated texture tile for the fabric this stitch makes. */
  | "fabric-swatch"
  /** A generated texture tile that is only true at the craft level. */
  | "generic-fabric";

export interface ResolvedDiagram {
  kind: DiagramKind;
  /** Inline-ready SVG. */
  svg: string;
  /** Accessible label. Always describes what is actually drawn. */
  title: string;
  /**
   * False when the image is a craft-level generic rather than specific to the
   * stitch. Use it to decide whether to caption the tile "knitted fabric"
   * instead of naming the stitch.
   */
  exact: boolean;
}

export interface DiagramOptions {
  palette?: DiagramPalette;
  /** Used only by the last two rungs of the fallback ladder. */
  craftType?: CraftType;
}

/**
 * Resolve the best available image for a stitch id.
 *
 * FALLBACK LADDER — each rung is less specific but never less TRUE:
 *
 *   1. A hand-authored diagram for this exact stitch id. This is the intended
 *      path and covers every id in STITCH_LIBRARY.
 *   2. A procedural swatch of the fabric this id produces, if the id is known
 *      to `FABRIC_FOR_STITCH`. Less instructive, still correct.
 *   3. A generic knitted or crocheted texture, labelled as generic. Vague, but
 *      it cannot mislead: nobody looking at "knitted fabric" concludes their
 *      decrease is wrong.
 *   4. Generic knitted texture, when even the craft type is unknown.
 *
 * There is deliberately NO rung that returns a photograph or another stitch's
 * drawing. An unknown id degrades to a texture, never to a wrong-but-plausible
 * picture — that substitution is the exact failure this library replaces, where
 * one photo of flat stockinette illustrated six unrelated stitches.
 */
export function diagramFor(stitchId: string, options: DiagramOptions = {}): ResolvedDiagram {
  const palette = options.palette ?? DEFAULT_PALETTE;

  if (hasStitchDiagram(stitchId)) {
    return {
      kind: "stitch-diagram",
      svg: stitchDiagram(stitchId, palette) as string,
      title: stitchDiagramTitle(stitchId) as string,
      exact: true,
    };
  }

  const fabric = FABRIC_FOR_STITCH[stitchId];
  if (fabric) {
    return {
      kind: "fabric-swatch",
      svg: fabricSwatch(fabric, palette),
      title: FABRIC_LABELS[fabric],
      exact: true,
    };
  }

  const generic: FabricKind = options.craftType === "crocheting" ? "generic-crochet" : "generic-knit";
  return {
    kind: "generic-fabric",
    svg: fabricSwatch(generic, palette),
    title: FABRIC_LABELS[generic],
    exact: false,
  };
}

/**
 * The fabric tile for a stitch, independent of its technique diagram — for the
 * "what does it look like" slot beside a stitch card. Falls back the same way,
 * and never returns a photograph.
 */
export function fabricFor(
  stitchId: string,
  options: DiagramOptions & { swatch?: FabricSwatchOptions } = {},
): ResolvedDiagram {
  const palette = options.palette ?? DEFAULT_PALETTE;
  const known = FABRIC_FOR_STITCH[stitchId];
  const kind: FabricKind =
    known ?? (options.craftType === "crocheting" ? "generic-crochet" : "generic-knit");
  return {
    kind: known ? "fabric-swatch" : "generic-fabric",
    svg: fabricSwatchCanvas(kind, options.swatch).toSVG(palette),
    title: FABRIC_LABELS[kind],
    exact: Boolean(known),
  };
}
