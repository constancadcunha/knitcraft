import type { CSSProperties, ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "berry" | "cobalt" | "fern" | "gold" | "grape" | "blush" | "teal" | "neutral";

const TONE: Record<Tone, string> = {
  berry: "bg-berry text-panel",
  cobalt: "bg-cobalt text-panel",
  fern: "bg-fern text-panel",
  gold: "bg-gold text-ink",
  grape: "bg-grape text-panel",
  blush: "bg-blush text-ink",
  teal: "bg-teal text-panel",
  neutral: "bg-panel-sunk text-ink",
};

export function Tag({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return <span className={cn("tag", TONE[tone], className)}>{children}</span>;
}

/**
 * Page/section heading. `eyebrow` is the small Silkscreen kicker above it.
 *
 * The action sits on its own line below the text on narrow screens rather than
 * squeezing in beside it: a 9px Silkscreen button crammed against a 30px title
 * is exactly the "glued together" complaint.
 */
export function Heading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-8",
        className
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="label mb-2.5 flex items-center gap-2 text-berry">
            <span className="inline-block h-2 w-2 bg-berry" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h1 className="font-ui text-2xl uppercase leading-tight sm:text-3xl">
          {title}
        </h1>
        {description && <p className="mt-3 text-ink-soft">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * A section break inside a page. Gives the long pages an actual rhythm instead
 * of an undifferentiated stack of panels.
 */
export function SectionHeading({
  children,
  count,
  className,
  as: As = "h2",
}: {
  children: ReactNode;
  count?: ReactNode;
  className?: string;
  as?: ElementType;
}) {
  return (
    <div className={cn("mb-4 flex items-center gap-3", className)}>
      <As className="label shrink-0 text-ink-soft">{children}</As>
      <span className="stripe h-[3px] flex-1" aria-hidden />
      {count !== undefined && (
        <span className="label shrink-0 text-ink-faint">{count}</span>
      )}
    </div>
  );
}

/**
 * Segmented progress bar — reads as a game energy meter, not a smooth fill.
 *
 * The filled segments are a POSITION, not just a colour, so the meter still
 * reads when colour does not: the count beside the label repeats the same fact
 * in words, and the track is hatched where it is empty.
 */
export function Meter({
  value,
  max,
  segments = 20,
  tone = "fern",
  label,
  valueText,
  className,
}: {
  value: number;
  max: number;
  segments?: number;
  tone?: Tone;
  label?: ReactNode;
  /** Spoken form of the value — defaults to "n of m". */
  valueText?: string;
  className?: string;
}) {
  const safeMax = Math.max(1, max);
  const ratio = Math.min(1, Math.max(0, value / safeMax));
  // Never round a started-but-tiny amount down to an empty bar: one stitch
  // counted must light one segment, or the maker thinks nothing was recorded.
  const filled = value <= 0 ? 0 : Math.max(1, Math.round(ratio * segments));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="label text-ink-soft">{label}</span>
          <span className="label text-ink tabular-nums">
            {value.toLocaleString()}/{safeMax.toLocaleString()}
          </span>
        </div>
      )}
      <div
        className="stripe flex gap-[3px] border-[3px] border-ink bg-panel-sunk p-[3px]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuetext={valueText ?? `${value} of ${safeMax}`}
        aria-label={typeof label === "string" ? label : "Progress"}
      >
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={cn("h-3.5 flex-1", i < filled ? TONE[tone] : "bg-transparent")}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * A big numeric readout. Sized to be read from where the knitting is, not from
 * where the mouse is.
 */
export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div className={cn("stat", TONE[tone], className)}>
      <span className="label opacity-80">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="label opacity-80">{sub}</span>}
    </div>
  );
}

/**
 * The four-frame sprite loader. Every waiting state in the app uses this one,
 * so "the app is thinking" always looks the same.
 */
export function Loading({
  children = "Loading",
  className,
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn("label flex items-center gap-2.5 text-ink-soft", className)}
      role="status"
    >
      <span className="flex items-end gap-1" aria-hidden>
        <span className="sprite-dot inline-block h-2.5 w-2.5 bg-berry" />
        <span className="sprite-dot inline-block h-2.5 w-2.5 bg-gold" />
        <span className="sprite-dot inline-block h-2.5 w-2.5 bg-cobalt" />
      </span>
      {children}
    </p>
  );
}

export function EmptyState({
  title,
  description,
  action,
  /** Heading level, so the state does not break the page's outline. */
  as: As = "h2",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: ElementType;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "panel-flat flex flex-col items-center gap-4 px-6 py-12 text-center sm:px-10 sm:py-16",
        className
      )}
    >
      {/* A blank swatch: chart paper with nothing worked on it yet. */}
      <div
        className="chart-grid pixel-corners h-16 w-16 border-[3px] border-ink bg-panel-sunk"
        style={{ "--chart-cell": "8px" } as CSSProperties}
        aria-hidden
      />
      <As className="label text-ink">{title}</As>
      {description && (
        <p className="max-w-sm text-sm text-ink-soft">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/**
 * An inline notice. `tone` picks the colour, but the kicker always says in
 * words what the colour is implying — colour is never the only signal.
 */
export function Notice({
  title,
  tone = "gold",
  children,
  action,
  role,
  className,
}: {
  title: ReactNode;
  tone?: "gold" | "berry" | "cobalt";
  children?: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status";
  className?: string;
}) {
  const bar =
    tone === "berry" ? "bg-berry text-panel" : tone === "cobalt" ? "bg-cobalt text-panel" : "bg-gold text-ink";
  return (
    <div className={cn("panel", className)} role={role}>
      <p className={cn("label border-b-[3px] border-ink px-4 py-2.5", bar)}>{title}</p>
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0 flex-1 text-sm text-ink">{children}</div>
        {action}
      </div>
    </div>
  );
}
