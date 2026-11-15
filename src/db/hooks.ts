import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useEffect, useState } from 'react'
import type { Astronaut, Alert, Reading } from '../sim'
import { getAlerts, type AlertFilters } from './alerts'
import { getAstronauts } from './astronauts'
import type { Settings } from './database'
import { getReadings, type TimeRange } from './readings'
import { ensureDemoData } from './seed'
import { getSettings } from './settings'

export interface LiveResult<T> {
  /** The latest result. Undefined while loading or after an error. */
  data: T | undefined
  isLoading: boolean
  error: Error | undefined
}

/**
 * Run a database query and re-render whenever the data it read changes (in this
 * tab or any other). A thin wrapper over Dexie's useLiveQuery that tells
 * "still loading" apart from "loaded, and the answer is empty", and reports
 * errors instead of throwing them during render.
 *
 * `deps` works like React's: put in every value the query uses, and keep them
 * simple (strings, numbers) so they compare correctly.
 */
export function useLiveData<T>(
  querier: () => Promise<T> | T,
  deps: readonly unknown[] = [],
): LiveResult<T> {
  const outcome = useLiveQuery(async () => {
    try {
      return { ok: true as const, value: await querier() }
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error : new Error(String(error)) }
    }
  }, [...deps])

  if (outcome === undefined) return { data: undefined, isLoading: true, error: undefined }
  if (!outcome.ok) return { data: undefined, isLoading: false, error: outcome.error }
  return { data: outcome.value, isLoading: false, error: undefined }
}

export function useAstronauts(): LiveResult<Astronaut[]> {
  return useLiveData(() => getAstronauts(), [])
}

/** One astronaut's readings in a time window. With no astronaut id, returns an empty list. */
export function useReadings(
  astronautId: string | null | undefined,
  range: TimeRange = {},
): LiveResult<Reading[]> {
  return useLiveData(
    () => (astronautId ? getReadings(astronautId, range) : []),
    [astronautId, range.from, range.to],
  )
}

export function useAlerts(filters: AlertFilters = {}): LiveResult<Alert[]> {
  // Filters can hold an array, so compare them by value.
  return useLiveData(() => getAlerts(filters), [JSON.stringify(filters)])
}

export function useSettings(): LiveResult<Settings> {
  return useLiveData(() => getSettings(), [])
}

export type BootstrapState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'error'; error: Error; retry: () => void }

/**
 * Makes sure the database has data when the app opens: on a first run it loads
 * the demo mission. Reports progress so the UI can show a loading or error state.
 */
export function useDemoDataBootstrap(): BootstrapState {
  const [state, setState] = useState<BootstrapState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    ensureDemoData().then(
      () => {
        if (!cancelled) setState({ status: 'ready' })
      },
      (error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            error: error instanceof Error ? error : new Error(String(error)),
            retry,
          })
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [attempt, retry])

  return state
}
