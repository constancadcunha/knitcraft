import type { ReactNode } from "react";
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
 */
export function Panel({
  title,
  accent = "gold",
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  accent?: Accent;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("panel", className)}>
      {title && (
        <header
          className={cn(
            "flex items-center justify-between gap-3 border-b-[3px] border-ink px-4 py-2.5",
            ACCENT_BG[accent]
          )}
        >
          <h2 className="label">{title}</h2>
          {action}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
