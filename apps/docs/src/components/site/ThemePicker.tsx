import { useRef } from 'react'
import { centerOf, prefersReducedMotion } from '@/fx'
import { STYLES, THEMES, useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

/* A ui-card-ish segmented control: pill items, the selected one filled with the accent. */
const GROUP = 'ui-border ui-pill ui-shadow-sm inline-flex gap-1 bg-paper p-1'
const ITEM =
  'ui-head ui-pill ui-fill group flex cursor-pointer items-center gap-1.5 border-0 bg-transparent text-[13px] leading-none text-ink transition-[background-color,color,translate] duration-200 ease-snap hover:bg-canvas active:translate-y-px aria-checked:bg-accent aria-checked:text-white'

/** Colour picker: swaps accent / soft / pop. */
export function ThemePicker({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { theme, setTheme } = useTheme()
  return (
    <div role="radiogroup" aria-label="Colour" className={cn(GROUP, className)}>
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={theme === t.id}
          aria-label={t.label}
          title={t.label}
          onClick={(e) => {
            if (theme === t.id) return
            const { x, y } = centerOf(e.currentTarget)
            setTheme(t.id, { x, y })
          }}
          className={cn(ITEM, compact ? 'p-2' : 'px-3 py-2')}
        >
          <span className="ui-border-thin size-3.5 shrink-0 rounded-full" style={{ background: t.swatch }} />
          {!compact && <span>{t.label}</span>}
        </button>
      ))}
    </div>
  )
}

/** Style picker: changes shape, type, depth and how loud the effects are. */
export function StylePicker({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { style, setStyle } = useTheme()
  return (
    <div role="radiogroup" aria-label="Style" className={cn(GROUP, className)}>
      {STYLES.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={style === s.id}
          title={s.blurb}
          onClick={(e) => {
            if (style === s.id) return
            const { x, y } = centerOf(e.currentTarget)
            setStyle(s.id, { x, y })
          }}
          className={cn(ITEM, compact ? 'px-2.5 py-2 text-xs' : 'px-3.5 py-2')}
        >
          {s.label}
          {!compact && <span className="font-jp text-[0.85em] font-normal not-italic opacity-70">{s.jp}</span>}
        </button>
      ))}
    </div>
  )
}

/** Light / dark toggle: the sun sets and the moon rises (they swap with a spin), the page opens as a circle from here. */
export function ModeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme()
  const icon = useRef<HTMLSpanElement>(null)
  const dark = mode === 'dark'
  return (
    <button
      type="button"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark}
      title={dark ? 'Light mode' : 'Dark mode'}
      onClick={(e) => {
        const { x, y } = centerOf(e.currentTarget)
        setMode(dark ? 'light' : 'dark', { x, y })
        if (!prefersReducedMotion()) {
          icon.current?.animate(
            [
              { transform: 'rotate(0) scale(1)' },
              { transform: 'rotate(200deg) scale(.6)', offset: 0.4 },
              { transform: 'rotate(360deg) scale(1.15)', offset: 0.75 },
              { transform: 'rotate(360deg) scale(1)' },
            ],
            { duration: 640, easing: 'cubic-bezier(.3,1.2,.4,1)' },
          )
        }
      }}
      className={cn(
        'ui-pill ui-border-thin ui-shadow-sm grid size-9 shrink-0 cursor-pointer place-items-center bg-paper p-0 text-ink transition duration-200 ease-snap hover:-translate-y-px hover:bg-accent-soft focus-visible:ui-focus active:translate-y-px active:ui-shadow-press',
        className,
      )}
    >
      <span ref={icon} aria-hidden="true" className="grid size-5 place-items-center">
        {dark ? (
          <svg viewBox="0 0 24 24" className="size-5 fill-pop stroke-ink [stroke-linejoin:round]" strokeWidth={2}>
            <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-5 fill-pop stroke-ink [stroke-linecap:round]" strokeWidth={2}>
            <circle cx="12" cy="12" r="4.5" />
            <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" fill="none" />
          </svg>
        )}
      </span>
    </button>
  )
}
