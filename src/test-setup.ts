// Must come first: gives Dexie an in-memory IndexedDB in tests.
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Vitest globals are off, so Testing Library can't auto-clean between tests.
// Also reset the URL hash, since HashRouter reads it as the current route.
afterEach(() => {
  cleanup()
  window.location.hash = ''
})
