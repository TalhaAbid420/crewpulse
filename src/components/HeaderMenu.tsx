import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { resetDemoData } from '../db'
import { DEMO_DAYS } from '../sim'
import { MenuIcon } from './icons'

const itemClass =
  'flex min-h-11 w-full items-center rounded-md px-3 text-left text-sm hover:bg-raised focus-visible:bg-raised disabled:opacity-60'
const buttonClass =
  'inline-flex min-h-11 items-center justify-center rounded-md border border-line px-4 text-sm font-medium hover:bg-raised disabled:opacity-60'

/**
 * Header dropdown menu (keyboard and screen-reader friendly): Enter, Space or
 * the down arrow opens it, arrows move between items, Escape closes it and
 * returns focus to the button. Reset is destructive, so it asks to confirm first.
 */
export function HeaderMenu() {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()
  const confirmTitleId = useId()

  function close(returnFocus: boolean) {
    setOpen(false)
    setConfirming(false)
    setError(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  // Move focus into the menu when it opens (first item) or switches to the
  // confirmation (the safe choice, Cancel).
  useEffect(() => {
    if (!open) return
    if (confirming) cancelRef.current?.focus()
    else rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
  }, [open, confirming])

  // Close when clicking or tapping outside.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  function onPanelKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close(true)
      return
    }
    if (e.key === 'Tab') {
      close(false) // focus then moves on naturally
      return
    }
    if (confirming) return
    const items = Array.from(
      rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    )
    const index = items.indexOf(document.activeElement as HTMLElement)
    let next: number | null = null
    if (e.key === 'ArrowDown') next = (index + 1) % items.length
    if (e.key === 'ArrowUp') next = (index - 1 + items.length) % items.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = items.length - 1
    if (next !== null) {
      e.preventDefault()
      items[next]?.focus()
    }
  }

  async function confirmReset() {
    setBusy(true)
    setError(false)
    try {
      await resetDemoData()
      setAnnouncement('Demo data reset. A fresh simulated mission is loaded.')
      close(true)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-md border border-line px-3 text-sm font-medium hover:bg-raised"
      >
        <MenuIcon />
        <span className="sr-only sm:not-sr-only">Menu</span>
      </button>

      {open && (
        <div
          id={menuId}
          onKeyDown={onPanelKeyDown}
          className="absolute right-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-md border border-line bg-panel p-1 shadow-lg"
        >
          {confirming ? (
            <div role="group" aria-labelledby={confirmTitleId} className="p-3">
              <p id={confirmTitleId} className="font-medium">
                Reset demo data?
              </p>
              <p className="mt-1 text-sm text-muted">
                This replaces everything with a fresh {DEMO_DAYS}-day simulated mission and
                clears all alerts, including any you have acknowledged.
              </p>
              {error && (
                <p role="alert" className="mt-2 text-sm text-caution">
                  Could not reset the data. Try again.
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={confirmReset}
                  disabled={busy}
                  className={`${buttonClass} bg-signal text-base hover:bg-signal/90`}
                >
                  {busy ? 'Resetting…' : 'Reset data'}
                </button>
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={() => close(true)}
                  disabled={busy}
                  className={buttonClass}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div role="menu" aria-label="CrewPulse menu">
              <button
                type="button"
                role="menuitem"
                onClick={() => setConfirming(true)}
                className={itemClass}
              >
                Reset demo data
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tells screen readers the reset finished, even after the menu closes. */}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  )
}
