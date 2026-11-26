import { useState } from 'react'
import { Hero } from '@/sections/Hero'
import { KitBand } from '@/sections/KitBand'
import { UseCases } from '@/sections/UseCases'
import { XRayContext } from '@/sections/xray-context'
import { useTitle } from './use-title'

export function Home({ ready }: { ready: boolean }) {
  useTitle()
  // one X-ray for the whole page (on by default): every sample reads it through <XRay>
  const [xray, setXray] = useState(true)

  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <XRayContext.Provider value={xray}>
        <Hero ready={ready} />
        <UseCases xray={xray} onXrayChange={setXray} />
        <KitBand />
      </XRayContext.Provider>
    </main>
  )
}
