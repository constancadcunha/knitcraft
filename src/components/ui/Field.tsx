import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/cn";

function Wrap({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label text-ink-soft">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-tiny text-ink-faint">{hint}</p>
      )}
      {error && (
        <p className="text-tiny text-berry" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField({
  label,
  hint,
  error,
  className,
  ...rest
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
} & ComponentProps<"input">) {
  const auto = useId();
  const id = rest.id ?? auto;
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        className={cn("field", error && "border-berry", className)}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </Wrap>
  );
}

export function TextArea({
  label,
  hint,
  error,
  className,
  ...rest
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
} & ComponentProps<"textarea">) {
  const auto = useId();
  const id = rest.id ?? auto;
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <textarea
        id={id}
        className={cn("field resize-y", error && "border-berry", className)}
        aria-invalid={error ? true : undefined}
        {...rest}
      />
    </Wrap>
  );
}

export function SelectField({
  label,
  hint,
  error,
  children,
  className,
  ...rest
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
} & ComponentProps<"select">) {
  const auto = useId();
  const id = rest.id ?? auto;
  return (
    <Wrap id={id} label={label} hint={hint} error={error}>
      <select id={id} className={cn("field", className)} {...rest}>
        {children}
      </select>
    </Wrap>
  );
}

/** Segmented single-choice control — replaces radio groups and pill filters. */
export function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label?: ReactNode;
  value: T;
  options: ReadonlyArray<{ value: T; label: ReactNode }>;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <span className="label text-ink-soft">{label}</span>}
      <div className="flex flex-wrap gap-2" role="group">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "press px-3 py-2",
                active ? "bg-cobalt text-panel" : "bg-panel text-ink hover:bg-gold"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
