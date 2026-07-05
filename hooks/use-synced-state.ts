import * as React from "react"

/**
 * Local editable draft that re-initializes whenever `value` changes identity
 * (e.g. a fresh object from a React Query cache update), while letting the
 * caller freely mutate it in between. Implements React's "adjusting state
 * when a prop changes" recipe — setState during render, not inside an effect
 * — so callers should memoize `value` (e.g. with `useMemo`) to avoid
 * resetting the draft on every render.
 */
export function useSyncedState<T>(value: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [prevValue, setPrevValue] = React.useState(value)
  const [state, setState] = React.useState(value)

  if (!Object.is(prevValue, value)) {
    setPrevValue(value)
    setState(value)
  }

  return [state, setState]
}
