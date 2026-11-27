import { useEffect, useState } from 'react'
import type { RefObject } from 'react'

/**
 * The current time (seconds) of an <audio> or <video>, as React state. Reads it every animation
 * frame while the media plays (timeupdate alone only fires ~4 times a second) and on
 * seeked / timeupdate / loadedmetadata while paused. Pair it with KineticCaption or useTimeline({ time }).
 */
export function useMediaTime(ref: RefObject<HTMLMediaElement | null>): number {
  const [time, setTime] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const read = () => setTime(el.currentTime)
    const loop = () => {
      read()
      raf = requestAnimationFrame(loop)
    }
    const start = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      cancelAnimationFrame(raf)
      raf = 0
      read()
    }
    const onTime = () => {
      if (!raf) read()
    }
    const on: [string, () => void][] = [
      ['play', start],
      ['playing', start],
      ['pause', stop],
      ['ended', stop],
      ['emptied', stop],
      ['seeked', read],
      ['seeking', read],
      ['timeupdate', onTime],
      ['loadedmetadata', read],
    ]
    for (const [type, fn] of on) el.addEventListener(type, fn)
    read()
    if (!el.paused && !el.ended) start()
    return () => {
      cancelAnimationFrame(raf)
      for (const [type, fn] of on) el.removeEventListener(type, fn)
    }
  }, [ref])
  return time
}
