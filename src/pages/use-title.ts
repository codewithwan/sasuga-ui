import { useEffect } from 'react'
import { pageTitle } from '@/data/site'

/** Sets document.title to "<page> — <brand name>" (or the home title when `page` is omitted). */
export function useTitle(page?: string) {
  useEffect(() => {
    document.title = pageTitle(page)
  }, [page])
}
