import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type FrameStageProps = {
  /** Frame width in logical pixels (the video resolution), e.g. 1080. */
  width: number
  /** Frame height in logical pixels, e.g. 1920. */
  height: number
  /** Largest height the frame may take on screen (any CSS length). Default: 70svh. */
  maxHeight?: string
  /** Classes for the outer box (it takes the available width). */
  className?: string
  /** Classes for the frame itself (border, radius, background). */
  frameClassName?: string
  children: ReactNode
}

/**
 * A fixed-resolution frame for video-style motion. Children are laid out at exactly
 * `width` × `height` logical pixels (design at 1080 × 1920 like a video editor) and the frame is
 * scaled down to fit the available width and `maxHeight`, so what you see is the final
 * composition at any screen size. Motion components inside fill it with `h-full w-full`.
 */
export function FrameStage({ width, height, maxHeight = '70svh', className, frameClassName, children }: FrameStageProps) {
  const outer = useRef<HTMLDivElement>(null)
  const probe = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const el = outer.current
    const ph = probe.current
    if (!el || !ph) return
    const fit = () => {
      const s = Math.min(el.clientWidth / width, ph.clientHeight / height)
      setScale(Number.isFinite(s) && s > 0 ? s : 0)
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    ro.observe(ph)
    return () => ro.disconnect()
  }, [width, height])

  const box: CSSProperties = { width: width * scale, height: height * scale }
  return (
    <div ref={outer} className={cn('relative grid w-full justify-items-center', className)}>
      {/* measures how tall the frame may get */}
      <div ref={probe} aria-hidden="true" className="pointer-events-none invisible absolute top-0 w-px" style={{ height: maxHeight }} />
      <div className={cn('relative overflow-hidden', frameClassName)} style={box}>
        <div className="absolute top-0 left-0 origin-top-left" style={{ width, height, transform: `scale(${scale})`, visibility: scale ? undefined : 'hidden' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
