import { useCallback, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { Intro } from '@/components/site/Intro'
import { ScrollProgress } from '@/components/site/ScrollProgress'
import { Wipe } from '@/components/site/Wipe'
import { landOn } from '@/components/site/wipe-context'
import { Toaster } from '@/components/ui/toaster'
import { DocPage } from '@/pages/docs/DocPage'
import { DocsIndex } from '@/pages/docs/DocsIndex'
import { DocsLayout } from '@/pages/docs/DocsLayout'
import { FxMotion } from '@/pages/docs/guides/FxMotion'
import { Installation } from '@/pages/docs/guides/Installation'
import { Introduction } from '@/pages/docs/guides/Introduction'
import { Roadmap } from '@/pages/docs/guides/Roadmap'
import { Theming } from '@/pages/docs/guides/Theming'
import { Home } from '@/pages/Home'
import { NotFound } from '@/pages/NotFound'
import { Footer } from '@/sections/Footer'
import { Nav } from '@/sections/Nav'

/** New page → top (or the #hash), including browser back/forward. In-page jumps are handled by the wipe. */
function ScrollManager() {
  const { pathname } = useLocation()
  useEffect(() => {
    const id = requestAnimationFrame(() => landOn(window.location.hash.slice(1)))
    return () => cancelAnimationFrame(id)
  }, [pathname])
  return null
}

const INTRO_KEY = 'ui-kit-intro'

/** The title sequence opens the landing page once per session; docs readers land straight on the page. */
function firstLanding() {
  const home = import.meta.env.BASE_URL.replace(/\/$/, '') || ''
  if (window.location.pathname.replace(/\/$/, '') !== home) return false
  if (new URLSearchParams(window.location.search).get('intro') === '0') return false
  try {
    return !sessionStorage.getItem(INTRO_KEY)
  } catch {
    return true
  }
}

export default function App() {
  const [intro, setIntro] = useState(firstLanding)
  // the page holds its entrance until the intro's cover starts to open
  const [ready, setReady] = useState(!intro)
  const reveal = useCallback(() => setReady(true), [])
  const done = useCallback(() => setIntro(false), [])
  useEffect(() => {
    if (!intro) return
    try {
      sessionStorage.setItem(INTRO_KEY, '1')
    } catch {
      /* storage can be blocked: it just plays again next time */
    }
  }, [intro])

  return (
    <Toaster>
      <Wipe>
        {intro && <Intro onReveal={reveal} onDone={done} />}
        <a
          href="#main"
          className="ui-head ui-border ui-pill ui-shadow-sm ui-fill fixed -top-16 left-4 z-[200] bg-accent px-4 py-2.5 leading-none text-white no-underline transition-[top] duration-200 ease-snap focus:top-4"
        >
          Skip to content
        </a>
        <ScrollManager />
        <ScrollProgress />
        <Nav ready={ready} />
        <Routes>
          <Route path="/" element={<Home ready={ready} />} />
          <Route element={<DocsLayout />}>
            <Route path="/docs" element={<Introduction />} />
            <Route path="/docs/installation" element={<Installation />} />
            <Route path="/docs/theming" element={<Theming />} />
            <Route path="/docs/motion" element={<FxMotion />} />
            <Route path="/docs/roadmap" element={<Roadmap />} />
            <Route path="/components" element={<DocsIndex />} />
            <Route path="/components/:slug" element={<DocPage />} />
          </Route>
          {/* the CLI points here when a project uses a framework that has no port yet */}
          <Route path="/roadmap" element={<Navigate to="/docs/roadmap" replace />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </Wipe>
    </Toaster>
  )
}
