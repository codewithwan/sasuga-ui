import { useCallback, useMemo, useState } from 'react'

export type UseComboOptions = {
  /** How long the chain lives without a hit, in ms. */
  timeout?: number
}

/**
 * State for a `<ComboCounter>`: `hit()` adds to the chain, the counter calls
 * `onTimeout` (here: `reset`) when it decays. Spread `props` onto the counter.
 *
 *   const combo = useCombo()
 *   <ComboCounter {...combo.props} />
 *   onEnemyHit={() => combo.hit()}
 */
export function useCombo({ timeout = 2400 }: UseComboOptions = {}) {
  const [count, setCount] = useState(0)
  const [best, setBest] = useState(0)
  // adjust-during-render: keeps the best chain without an effect
  if (count > best) setBest(count)
  const hit = useCallback((n = 1) => setCount((c) => c + n), [])
  const reset = useCallback(() => setCount(0), [])
  const props = useMemo(() => ({ value: count, timeout, onTimeout: reset }), [count, timeout, reset])
  return { count, best, hit, reset, props }
}
