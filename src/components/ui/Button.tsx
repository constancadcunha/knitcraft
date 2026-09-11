import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "quiet" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-berry text-panel hover:bg-berry-deep",
  secondary: "bg-panel text-ink hover:bg-gold",
  quiet: "bg-panel-sunk text-ink hover:bg-panel",
  danger: "bg-rust text-panel hover:bg-berry-deep",
  gold: "bg-gold text-ink hover:bg-gold-deep",
};

/**
 * Every size clears a 44px tap target except `sm`, which is for chips in a
 * dense row (piece pickers, filters) and still clears 36px. The old scale
 * bottomed out at 33px, which is a mis-tap waiting to happen for someone
 * holding needles in the other hand.
 */
const SIZES: Record<Size, string> = {
  sm: "min-h-9 px-3 py-2 text-[9px]",
  md: "hit px-4 py-3 text-[9px]",
  lg: "min-h-[3.25rem] px-6 py-4 text-[11px]",
};

function classes(variant: Variant, size: Size, full: boolean, extra?: string) {
  return cn(
    "press inline-flex items-center justify-center gap-2 text-center",
    VARIANTS[variant],
    SIZES[size],
    full && "w-full",
    extra
  );
}

interface Shared {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className,
  children,
  ...rest
}: Shared & ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={classes(variant, size, full, className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  full = false,
  className,
  children,
  ...rest
}: Shared & ComponentProps<typeof Link>) {
  return (
    <Link className={classes(variant, size, full, className)} {...rest}>
      {children}
    </Link>
  );
}
