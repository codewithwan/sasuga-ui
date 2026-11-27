import { useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ImgHTMLAttributes } from 'react'
import { burst, prefersReducedMotion, spawn, uiStyle } from '@/fx'
import { cn } from '@/lib/utils'
import { Icon } from './icon'

export type ImageReveal = 'ink' | 'slash' | 'pop' | 'fade' | 'none'

export type ImageLoaderProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'width' | 'height' | 'placeholder' | 'onLoad' | 'onError' | 'className'> & {
  /** The image. While it is undefined (still being resolved) the placeholder keeps waiting. */
  src?: string
  alt: string
  /** Intrinsic size: reserves the box (no layout shift) and sizes the placeholder. */
  width: number
  height: number
  /** A tiny data URI: the image's silhouette ('shape', for cut-out art) or a small preview ('blur'). */
  placeholder?: string
  placeholderKind?: 'shape' | 'blur'
  /** How the image lands: ink spreads from the middle, slash cuts in diagonally, pop springs, fade fades. */
  reveal?: ImageReveal
  fit?: 'contain' | 'cover'
  /** Above the fold: load eagerly with high fetch priority. */
  priority?: boolean
  /** Hold the reveal (e.g. behind an intro); it plays once this turns false and the file is in. */
  paused?: boolean
  /** Extra wait before the reveal, in ms (stagger a row). */
  delay?: number
  /** A small impact burst where the image lands (cel and manga only). Off by default. */
  burst?: boolean
  className?: string
  imgClassName?: string
  style?: CSSProperties
  onLoad?: () => void
  onError?: () => void
}

type Status = 'loading' | 'loaded' | 'error'

const SHEEN =
  'pointer-events-none absolute inset-y-0 left-0 w-[200%] animate-[marquee_1.6s_linear_infinite_reverse] bg-[linear-gradient(100deg,transparent_30%,rgb(255_255_255/0.6)_50%,transparent_70%)] bg-[length:50%_100%] motion-reduce:animate-none'
const TONE: CSSProperties = {
  backgroundImage: 'radial-gradient(color-mix(in srgb, var(--color-accent) 55%, transparent) 1px, transparent 1.5px)',
  backgroundSize: '7px 7px',
}

/** Keyframes per reveal; flat swaps every one for a calm rise. */
function frames(reveal: ImageReveal, flat: boolean): { k: Keyframe[]; ms: number; ease: string } {
  if (flat || reveal === 'fade') return { k: [{ opacity: 0, translate: flat ? '0 6px' : '0 0' }, { opacity: 1, translate: '0 0' }], ms: flat ? 320 : 360, ease: 'ease-out' }
  if (reveal === 'slash')
    return {
      k: [
        { clipPath: 'polygon(0 0, 0 0, -30% 100%, -30% 100%)', opacity: 1 },
        { clipPath: 'polygon(0 0, 130% 0, 100% 100%, -30% 100%)', opacity: 1 },
      ],
      ms: 520,
      ease: 'cubic-bezier(.7,0,.2,1)',
    }
  if (reveal === 'pop')
    return {
      k: [
        { opacity: 0, scale: '0.82' },
        { opacity: 1, scale: '1.05', offset: 0.6 },
        { opacity: 1, scale: '1' },
      ],
      ms: 480,
      ease: 'cubic-bezier(.2,.8,.3,1)',
    }
  return {
    k: [
      { clipPath: 'circle(0% at 50% 55%)', scale: '1.06', opacity: 1 },
      { clipPath: 'circle(75% at 50% 55%)', scale: '1', opacity: 1 },
    ],
    ms: 680,
    ease: 'cubic-bezier(.2,.8,.2,1)',
  }
}

/**
 * An image that waits well. The box is reserved from width / height, and while the file
 * downloads a placeholder in the theme tint holds its place: the image's own silhouette for
 * cut-out art (screentone and a sheen sweeping through it), a blurred preview for photos, or a
 * plain shimmer block. When the file is in, it lands with an ink spread, a diagonal slash, a
 * pop or a fade, and the placeholder melts away. Cached images appear at once, with no replay.
 * If the file fails, the placeholder stays with a small warning and the alt text.
 */
export function ImageLoader({
  src,
  alt,
  width,
  height,
  placeholder,
  placeholderKind = 'shape',
  reveal = 'ink',
  fit = 'contain',
  priority = false,
  paused = false,
  delay = 0,
  burst: withBurst = false,
  className,
  imgClassName,
  style,
  onLoad,
  onError,
  ...img
}: ImageLoaderProps) {
  const [st, setSt] = useState<{ src?: string; status: Status; instant: boolean }>({ src, status: 'loading', instant: false })
  if (st.src !== src) setSt({ src, status: 'loading', instant: false })
  const ref = useRef<HTMLImageElement>(null)
  const ph = useRef<HTMLSpanElement>(null)
  const mounting = useRef(true)

  // a file that is already decoded when the loader mounts (cache, a revisit) shows at once,
  // without a reveal; a src that arrives later always gets its reveal
  useLayoutEffect(() => {
    const el = ref.current
    const first = mounting.current
    mounting.current = false
    if (el && src && el.complete && el.naturalWidth > 0) setSt({ src, status: 'loaded', instant: first })
  }, [src])

  const show = st.status === 'loaded' && !paused
  const played = useRef(false)
  useLayoutEffect(() => {
    if (!show) {
      played.current = false
      return
    }
    if (played.current) return
    played.current = true
    const el = ref.current
    if (!el || st.instant || reveal === 'none' || prefersReducedMotion()) return
    const flat = uiStyle() === 'flat'
    const { k, ms, ease } = frames(reveal, flat)
    el.animate(k, { duration: ms, delay, easing: ease, fill: 'backwards' })
    ph.current?.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: flat ? '1' : '1.04' }], { duration: ms * 0.8, delay: delay + ms * 0.2, easing: 'ease-out', fill: 'backwards' })
    if (withBurst && !flat)
      window.setTimeout(() => {
        const r = el.getBoundingClientRect()
        if (r.width) spawn(burst(r.left + r.width / 2, r.top + r.height * 0.55, { radius: Math.min(90, r.width / 4), spikes: 10 }))
      }, delay + ms * 0.35)
  }, [show, st.instant, reveal, delay, withBurst])

  const failed = st.status === 'error'
  const mask = placeholder && placeholderKind === 'shape' ? `url("${placeholder}") center / ${fit} no-repeat` : undefined

  return (
    <span
      data-state={failed ? 'error' : show ? 'shown' : 'loading'}
      className={cn('relative block', className)}
      style={{ aspectRatio: `${width} / ${height}`, ...style }}
    >
      <span
        ref={ph}
        aria-hidden="true"
        className={cn('pointer-events-none absolute inset-0 transition-opacity duration-300', show ? 'opacity-0' : 'opacity-100', (show && st.instant) || failed ? 'transition-none' : '')}
      >
        {mask ? (
          <span className="absolute inset-0 overflow-hidden bg-accent-soft" style={{ mask, WebkitMask: mask }}>
            <span className="absolute inset-0" style={TONE} />
            {!failed && <span className={SHEEN} />}
          </span>
        ) : placeholder ? (
          <span className={cn('ui-r-sm absolute inset-0 overflow-hidden', fit === 'contain' && 'bg-accent-soft/45')}>
            <span className="absolute -inset-4 scale-105 blur-xl" style={{ background: `url("${placeholder}") center / ${fit} no-repeat` }} />
            {!failed && <span className={SHEEN} />}
          </span>
        ) : (
          <span className="ui-r-sm absolute inset-0 overflow-hidden bg-accent-soft/45">
            <span className="absolute inset-0" style={TONE} />
            {!failed && <span className={SHEEN} />}
          </span>
        )}
      </span>

      {src && !failed && (
        <img
          ref={ref}
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          draggable={false}
          {...img}
          onLoad={() => {
            setSt((s) => (s.src === src && s.status !== 'loaded' ? { src, status: 'loaded', instant: false } : s))
            onLoad?.()
          }}
          onError={() => {
            setSt({ src, status: 'error', instant: false })
            onError?.()
          }}
          className={cn('absolute inset-0 block size-full select-none', fit === 'cover' ? 'object-cover' : 'object-contain', show ? 'opacity-100' : 'opacity-0', imgClassName)}
        />
      )}

      {failed && (
        <span role="img" aria-label={alt} className="absolute inset-0 grid place-items-center p-3 text-center">
          <span className="ui-pill ui-border-thin inline-flex max-w-full items-center gap-1.5 bg-paper px-2.5 py-1 text-xs leading-tight font-bold text-mute">
            <Icon name="warning" tone="line" size={14} className="shrink-0 text-pop" />
            <span className="truncate">{alt || 'Image failed to load'}</span>
          </span>
        </span>
      )}
    </span>
  )
}
