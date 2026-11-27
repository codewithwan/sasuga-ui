import { useLayoutEffect, useMemo } from 'react'
import { useLocation } from 'react-router'
import { FxScreen } from '@/components/ui/fx-screen'
import { useTitle } from '../use-title'
import { parseEmbed } from './params'

/**
 * /embed/fx — only the FX screen, full viewport, configured from the URL (see ./params.ts;
 * style / theme / mode are read by initTheme in main.tsx). No nav, footer, intro or wipe.
 * With background=transparent the page itself is see-through, so an iframe shows the page
 * behind it and an OBS browser source keys it over the scene.
 */
export function EmbedFx() {
  const { search } = useLocation()
  const c = useMemo(() => parseEmbed(search), [search])
  useTitle(`FX screen: ${c.effect}`)

  useLayoutEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prev = { html: html.getAttribute('style'), body: body.getAttribute('style') }
    html.style.overflow = 'hidden'
    html.style.height = '100%'
    body.style.overflow = 'hidden'
    body.style.height = '100%'
    body.style.margin = '0'
    if (c.background === 'transparent') {
      html.style.background = 'transparent'
      body.style.background = 'transparent'
      // a colour scheme that differs from the host page makes the browser paint the iframe opaque
      html.style.colorScheme = 'normal'
    }
    return () => {
      if (prev.html === null) html.removeAttribute('style')
      else html.setAttribute('style', prev.html)
      if (prev.body === null) body.removeAttribute('style')
      else body.setAttribute('style', prev.body)
    }
  }, [c.background])

  return (
    <main className="fixed inset-0">
      <h1 className="sr-only">Animated FX screen</h1>
      <FxScreen
        effect={c.effect}
        intensity={c.intensity}
        speed={c.speed}
        color={c.color}
        background={c.background}
        trigger={c.trigger}
        interval={c.interval}
        text={c.text || undefined}
        center={[c.cx, c.cy]}
        angle={c.angle}
        flashes={c.flashes}
        play={c.play}
      />
    </main>
  )
}
