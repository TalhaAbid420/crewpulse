import type { ReactNode } from 'react'
import { useDemoDataBootstrap } from '../db'

/**
 * Shows the page only once local data is ready. On the very first run this
 * loads the demo mission, which takes a moment. If the browser blocks local
 * storage (some private-browsing modes do), explains it and offers a retry.
 */
export function DataGate({ children }: { children: ReactNode }) {
  const state = useDemoDataBootstrap()

  if (state.status === 'loading') {
    return (
      <p role="status" className="text-muted">
        Preparing the simulated mission data…
      </p>
    )
  }

  if (state.status === 'error') {
    return (
      <div role="alert" className="max-w-prose rounded-lg border border-caution p-5">
        <p className="font-medium">Could not open the local data store</p>
        <p className="mt-1 text-sm text-muted">
          CrewPulse keeps its data in your browser, with no internet needed. This browser
          blocked it, which can happen in private browsing. Try a normal window, then retry.
        </p>
        <button
          type="button"
          onClick={state.retry}
          className="mt-4 inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm font-medium hover:bg-raised"
        >
          Retry
        </button>
      </div>
    )
  }

  return <>{children}</>
}
