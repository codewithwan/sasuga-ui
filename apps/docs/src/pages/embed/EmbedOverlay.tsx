import { useLayoutEffect, useMemo } from 'react'
import { useLocation } from 'react-router'
import { StreamScene } from '@/components/ui/stream-overlay'
import type { StreamSceneKind } from '@/components/ui/stream-overlay'
import { ART } from '@/data/art'
import type { ArtName } from '@/data/art'
import { useTitle } from '../use-title'
import { parseOverlay } from './overlay-params'

/** One pose of the mascot per scene: a wink before, walking off on a break, cheering at the end. */
const POSE: Record<StreamSceneKind, ArtName> = {
  starting: 'mascot/koma-wink',
  brb: 'mascot/koma-side',
  ending: 'mascot/koma-happy',
}

/**
 * /embed/overlay — one stream scene, full viewport, configured from the URL (see
 * ./overlay-params.ts; style / theme / mode are read by initTheme in main.tsx). No nav, footer,
 * intro or wipe. With bg=transparent the page itself is see-through, so an OBS browser source
 * keys it over the scene. The entrance plays once on load.
 */
export function EmbedOverlay() {
  const { search } = useLocation()
  const c = useMemo(() => parseOverlay(search), [search])
  useTitle(`Stream overlay: ${c.scene}`)

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
      <h1 className="sr-only">Stream overlay</h1>
      <StreamScene
        scene={c.scene}
        title={c.title || undefined}
        subtitle={c.subtitle || undefined}
        channel={c.channel || undefined}
        countdown={c.countdown > 0 ? c.countdown : undefined}
        countdownTo={c.until > 0 ? c.until : undefined}
        next={c.next || undefined}
        ticker={c.ticker}
        art={c.art ? ART[POSE[c.scene]].src : undefined}
        background={c.background}
        intro
      />
    </main>
  )
}
