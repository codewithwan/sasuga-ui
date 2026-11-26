import { centerOf, delayed, rand, spawn } from './engine'
import { burst, rays, shards, smoke, sparkle, sfx } from './effects'
import { C } from './palette'

export * from './engine'
export * from './effects'
export * from './palette'
export * from './style'
export { useSprings } from './spring'

type ImpactOpts = { text?: string | false; size?: number; color?: string; smoky?: boolean }

/** The full "hit": focus lines, starburst, debris, smoke and SFX lettering. */
export function impactAt(x: number, y: number, { text, size = 1, color = C.accent, smoky = true }: ImpactOpts = {}) {
  spawn(
    rays(x, y, { inner: 30 * size, outer: 160 * size, count: Math.round(14 + 6 * size) }),
    burst(x, y, { radius: 52 * size, color }),
    shards(x, y, { count: Math.round(8 + 6 * size), speed: 420 + 200 * size }),
  )
  if (smoky) spawn(delayed(0.05, smoke(x, y + 8 * size, { spread: 60 * size, size: 14 * size })))
  spawn(delayed(0.12, sparkle(x + rand(30, 60) * size, y - rand(20, 50) * size, { size: 14 * size })))
  if (text) spawn(sfx(x + rand(-10, 10), y - 54 * size, text, { size: 46 * size, color }))
}

export function impactOn(el: Element, opts: ImpactOpts = {}) {
  const { x, y } = centerOf(el)
  impactAt(x, y, opts)
}
