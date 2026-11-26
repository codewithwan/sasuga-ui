import { useEffect, useState } from 'react'
import { loadSources } from './sources'
import type { SourceFile } from './sources'

/** Loads the component's real source (+ the kit files it imports). `null` while loading. */
export function useSources(slug: string) {
  const [state, setState] = useState<{ slug: string; files: SourceFile[] } | null>(null)
  useEffect(() => {
    let live = true
    loadSources(slug).then((files) => live && setState({ slug, files }))
    return () => {
      live = false
    }
  }, [slug])
  return state?.slug === slug ? state.files : null
}
