import type { ReactNode } from "react";
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

/** Page/section heading. `eyebrow` is the small Silkscreen kicker above it. */
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
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="label mb-2 text-berry">{eyebrow}</p>}
        <h1 className="font-ui text-2xl uppercase leading-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2.5 text-ink-soft">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

/** Segmented progress bar — reads as a game energy meter, not a smooth fill. */
export function Meter({
  value,
  max,
  segments = 20,
  tone = "fern",
  label,
}: {
  value: number;
  max: number;
  segments?: number;
  tone?: Tone;
  label?: ReactNode;
}) {
  const safeMax = Math.max(1, max);
  const ratio = Math.min(1, Math.max(0, value / safeMax));
  const filled = Math.round(ratio * segments);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <span className="label text-ink-soft">{label}</span>
          <span className="label text-ink">
            {value}/{safeMax}
          </span>
        </div>
      )}
      <div
        className="flex gap-[3px] border-[3px] border-ink bg-panel-sunk p-[3px]"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
      >
        {Array.from({ length: segments }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-3 flex-1",
              i < filled ? TONE[tone] : "bg-transparent"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="panel-flat flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="dither h-10 w-10 border-[3px] border-ink" aria-hidden />
      <h3 className="label text-ink">{title}</h3>
      {description && (
        <p className="max-w-sm text-sm text-ink-soft">{description}</p>
      )}
      {action}
    </div>
  );
}
