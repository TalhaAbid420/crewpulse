import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  acknowledgeAlert,
  db,
  saveAlert,
  seedMission,
  updateSettings,
  useAlerts,
  useAstronauts,
  useDemoDataBootstrap,
  useLiveData,
  useReadings,
  useSettings,
} from '.'
import type { Alert } from '../sim'

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    astronautId: 'astro-1',
    timestamp: 1_000,
    metric: 'heartRate',
    severity: 'watch',
    title: 'Resting heart rate is up',
    explanation: 'Higher than baseline.',
    suggestedAction: 'Rest.',
    acknowledged: false,
    ...overrides,
  }
}

beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()))
  await seedMission(2, 1)
})

describe('useLiveData', () => {
  it('starts as loading, then returns the data', async () => {
    const { result } = renderHook(() => useAstronauts())
    expect(result.current.isLoading).toBe(true)
    expect(result.current.data).toBeUndefined()
    await waitFor(() => expect(result.current.data).toHaveLength(4))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeUndefined()
  })

  it('tells "loaded and empty" apart from "still loading"', async () => {
    const { result } = renderHook(() => useAlerts())
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toEqual([])
  })

  it('reports a failing query as an error instead of throwing', async () => {
    const { result } = renderHook(() =>
      useLiveData(() => {
        throw new Error('query failed')
      }),
    )
    await waitFor(() => expect(result.current.error?.message).toBe('query failed'))
    expect(result.current.isLoading).toBe(false)
    expect(result.current.data).toBeUndefined()
  })
})

describe('live updates', () => {
  it('useAlerts re-renders when an alert is saved and when it is acknowledged', async () => {
    const { result } = renderHook(() => useAlerts())
    await waitFor(() => expect(result.current.data).toEqual([]))

    await saveAlert(makeAlert())
    await waitFor(() => expect(result.current.data).toHaveLength(1))
    expect(result.current.data?.[0].acknowledged).toBe(false)

    await acknowledgeAlert('alert-1')
    await waitFor(() => expect(result.current.data?.[0].acknowledged).toBe(true))
  })

  it('useAlerts follows its filters, including when they change', async () => {
    await saveAlert(makeAlert({ id: 'a', astronautId: 'astro-1' }))
    await saveAlert(makeAlert({ id: 'b', astronautId: 'astro-2', timestamp: 2_000 }))

    const { result, rerender } = renderHook(({ id }) => useAlerts({ astronautId: id }), {
      initialProps: { id: 'astro-1' },
    })
    await waitFor(() => expect(result.current.data?.map((a) => a.id)).toEqual(['a']))
    rerender({ id: 'astro-2' })
    await waitFor(() => expect(result.current.data?.map((a) => a.id)).toEqual(['b']))
  })

  it('useReadings re-renders when the data is replaced', async () => {
    const { result } = renderHook(() => useReadings('astro-1'))
    await waitFor(() => expect(result.current.data).toHaveLength(48))
    const before = result.current.data?.[0]

    await seedMission(1, 2)
    await waitFor(() => expect(result.current.data).toHaveLength(24))
    expect(result.current.data?.[0]).not.toEqual(before)
  })

  it('useReadings follows the astronaut and time range it is given', async () => {
    const { result, rerender } = renderHook(
      ({ id, to }) => useReadings(id, { to }),
      { initialProps: { id: 'astro-1' as string | null, to: undefined as number | undefined } },
    )
    await waitFor(() => expect(result.current.data).toHaveLength(48))
    const third = result.current.data![2].timestamp

    rerender({ id: 'astro-1', to: third })
    await waitFor(() => expect(result.current.data).toHaveLength(3))

    rerender({ id: null, to: undefined })
    await waitFor(() => expect(result.current.data).toEqual([]))
  })

  it('useSettings re-renders when settings change', async () => {
    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current.data?.selectedAstronautId).toBeNull())
    await updateSettings({ selectedAstronautId: 'astro-4' })
    await waitFor(() => expect(result.current.data?.selectedAstronautId).toBe('astro-4'))
  })
})

describe('useDemoDataBootstrap', () => {
  it('is ready when the data is already there', async () => {
    const { result } = renderHook(() => useDemoDataBootstrap())
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ready'))
  })

  it('reports an error and recovers on retry', async () => {
    const spy = vi.spyOn(db.astronauts, 'count').mockRejectedValueOnce(new Error('blocked'))
    const { result } = renderHook(() => useDemoDataBootstrap())
    await waitFor(() => expect(result.current.status).toBe('error'))
    if (result.current.status !== 'error') throw new Error('expected error state')
    expect(result.current.error.message).toBe('blocked')

    result.current.retry()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    spy.mockRestore()
  })
})
