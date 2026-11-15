import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { DataGate } from './DataGate'
import { Footer } from './Footer'
import { Header } from './Header'
import { Nav } from './Nav'

export function AppShell() {
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const isFirstRender = useRef(true)

  // Move focus to the page content after navigating, so keyboard and
  // screen-reader users start at the new page instead of the nav.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    mainRef.current?.focus()
  }, [pathname])

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        onClick={(e) => {
          // HashRouter owns the URL hash, so focus main directly instead of
          // letting the browser change the hash.
          e.preventDefault()
          mainRef.current?.focus()
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-signal focus:px-3 focus:py-2 focus:font-medium focus:text-base"
      >
        Skip to content
      </a>
      <Header />
      <div className="flex flex-1">
        <Nav />
        {/* pb-20 keeps content clear of the fixed bottom nav on phones */}
        <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
          <main
            id="main"
            ref={mainRef}
            tabIndex={-1}
            className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8"
          >
            <DataGate>
              <Outlet />
            </DataGate>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  )
}
