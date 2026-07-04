import "server-only"

/**
 * Composes route-handler wrappers right-to-left, so `compose(a, b)(handler)`
 * behaves like `a(b(handler))` — `a` is the outermost layer (runs first on
 * the way in, last on the way out).
 */
export function compose<T extends (...args: never[]) => Promise<Response>>(
  ...wrappers: Array<(handler: T) => T>
): (handler: T) => T {
  return (handler: T): T => wrappers.reduceRight((wrapped, wrap) => wrap(wrapped), handler)
}
