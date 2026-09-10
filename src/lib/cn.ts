/**
 * Join class names, keeping only non-empty strings. No dependencies.
 * Accepts `unknown` so `someReactNode && "class"` guards type-check cleanly.
 */
export function cn(...parts: unknown[]): string {
  return parts.filter((p): p is string => typeof p === "string" && p !== "").join(" ");
}
