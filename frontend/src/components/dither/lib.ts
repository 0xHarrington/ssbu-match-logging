import { type ClassValue, clsx } from "clsx"

/** className combiner — vendored change: upstream wraps clsx in tailwind-merge,
 * but this app has no Tailwind (utilities live in dither.css), so plain clsx
 * is sufficient. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}
