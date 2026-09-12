import type { SVGProps } from "react";
import { spriteCanvas } from "@/components/icons/pixelSprite";
import { spriteFor } from "@/components/icons/garmentSprites";
import type { DiagramPalette } from "@/lib/diagrams/primitives";

type GarmentIconProps = {
  type: string;
  active?: boolean;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "type">;

/**
 * Palette roles resolved to design tokens at emit time, so no icon ever
 * contains a hex literal and a theme change reaches all of them.
 *
 * Inactive desaturates by collapsing every fabric role onto the muted ink,
 * rather than by keeping a second parallel palette that could drift.
 */
function palette(active: boolean | undefined): DiagramPalette {
  if (!active) {
    const muted = "var(--color-ink-faint)";
    return {
      ink: muted,
      paper: "none",
      grid: "var(--color-panel-sunk)",
      yarn: "var(--color-panel-sunk)",
      yarnAlt: "var(--color-panel-sunk)",
      highlight: muted,
      tool: muted,
      text: muted,
    };
  }
  return {
    ink: "var(--color-ink)",
    paper: "none",
    grid: "var(--color-panel-sunk)",
    yarn: "var(--color-gold)",
    yarnAlt: "var(--color-berry)",
    highlight: "var(--color-cobalt)",
    tool: "var(--color-ink-soft)",
    text: "var(--color-ink)",
  };
}

/**
 * Rasterising is pure and the sprite set is fixed, so results are cached
 * across renders — a library page draws dozens of these.
 */
const CACHE = new Map<string, string>();

function svgFor(type: string, active: boolean | undefined): string {
  const key = `${type}::${active ? "on" : "off"}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const svg = spriteCanvas(spriteFor(type)).toSVG(palette(active));
  CACHE.set(key, svg);
  return svg;
}

/**
 * A garment icon.
 *
 * Silhouettes are deliberately distinct where two makes could be confused:
 * gloves show separated fingers and mittens do not, a cardigan has a centre
 * opening with buttons, leg warmers are a tapered pair. The cross-stitch makes
 * (sampler, hoop, bookmark, ornament, framed picture, cushion) are not garments
 * and do not look like them.
 */
export function GarmentIcon({
  type,
  active,
  className = "h-12 w-12",
  ...props
}: GarmentIconProps) {
  return (
    <span
      className={className}
      role="img"
      aria-label={type}
      // The sprite is generated from our own fixed art, never user input.
      dangerouslySetInnerHTML={{ __html: svgFor(type, active) }}
      {...(props as Record<string, unknown>)}
    />
  );
}

export default GarmentIcon;
