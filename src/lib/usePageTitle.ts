import { useEffect } from 'react'

/** Sets the browser tab / screen-reader page title, e.g. "Search · Wine Discovery". */
export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title ? `${title} · Wine Discovery` : 'Wine Discovery'
  }, [title])
}
