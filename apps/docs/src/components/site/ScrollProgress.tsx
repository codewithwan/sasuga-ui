import { useEffect, useRef } from 'react'

/** Thin accent bar with an ink underline along the top edge; it fills as you scroll. */
export function ScrollProgress() {
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-x-0 top-0 z-[150] h-1.5">
      <div
        ref={bar}
        className="h-full origin-left border-b-[length:var(--ui-bw-thin)] border-b-[color:var(--ui-line)] bg-accent"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  )
}
