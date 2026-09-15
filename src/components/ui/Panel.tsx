import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Accent = "berry" | "cobalt" | "fern" | "gold" | "grape" | "blush" | "teal";

const ACCENT_BG: Record<Accent, string> = {
  berry: "bg-berry text-panel",
  cobalt: "bg-cobalt text-panel",
  fern: "bg-fern text-panel",
  gold: "bg-gold text-ink",
  grape: "bg-grape text-panel",
  blush: "bg-blush text-ink",
  teal: "bg-teal text-panel",
};

/**
 * The universal card. `title` renders a coloured, ink-outlined header bar —
 * the one place accent colour is allowed to fill a large area.
 *
 * The body is `p-4` on a phone and `p-5` from `sm` up. Both are deliberate: a
 * panel's contents must never sit against the 3px ink border, which was the
 * "text glued to the component" bug. Pass `bodyClassName="p-0"` only when the
 * child draws its own edge-to-edge surface (a chart board, a table).
 */
export function Panel({
  title,
  accent = "gold",
  action,
  footer,
  children,
  className,
  bodyClassName,
  headingAs: HeadingAs = "h2",
  id,
}: {
  title?: ReactNode;
  accent?: Accent;
  action?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  headingAs?: ElementType;
  id?: string;
}) {
  return (
    <section className={cn("panel", className)} id={id}>
      {title && (
        <header
          className={cn(
            "flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b-[3px] border-ink px-4 py-3",
            ACCENT_BG[accent]
          )}
        >
          <HeadingAs className="label">{title}</HeadingAs>
          {action}
        </header>
      )}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
      {footer && (
        <footer className="border-t-[3px] border-ink bg-panel-sunk px-4 py-3 sm:px-5">
          {footer}
        </footer>
      )}
    </section>
  );
}
