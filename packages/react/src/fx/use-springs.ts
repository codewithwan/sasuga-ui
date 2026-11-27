import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'
import { createSpring } from '@/fx/spring'
import type { Spring, SpringConfig, SpringRender, SpringValues } from '@/fx/spring'

export type { SpringConfig }

/**
 * Damped springs that write straight to the DOM (no React re-render per frame).
 * `set` moves the targets, `kick` adds velocity — that is what gives the
 * squash-and-overshoot feel. React adapter over createSpring() from the FX core.
 */
export function useSprings<K extends string, T extends HTMLElement = HTMLElement>(
  ref: RefObject<T | null>,
  initial: SpringValues<K>,
  render: SpringRender<K, T>,
  config: SpringConfig = {},
): Spring<K, T> {
  // Stable identity: components list `spring` in effect deps.
  const [spring] = useState(() => createSpring<K, T>(initial))

  // the latest element, render function and config, read by the spring on every frame
  useLayoutEffect(() => {
    spring.bind({ el: () => ref.current, render, config: () => config })
  })

  useLayoutEffect(() => {
    spring.draw()
    return () => spring.stop()
  }, [spring, ref])

  return spring
}
