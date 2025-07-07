import { useEffect } from 'react'

export function usePageTitle(title: string) {
  useEffect(() => {
    const originalTitle = document.title
    document.title = `${title} | Flowna`
    
    // Cleanup function to restore original title
    return () => {
      document.title = originalTitle
    }
  }, [title])
}
