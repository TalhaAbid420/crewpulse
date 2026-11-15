import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateMission, demoScenarios, type Alert } from '../sim'
import { series } from '../sim/test-helpers'
import {
  acknowledgeAlert,
  DEFAULT_SETTINGS,
  db,
  ensureDemoData,
  getAlerts,
  getAstronauts,
  getReadings,
  getSettings,
  resetDemoData,
  saveAlert,
  seedMission,
  updateSettings,
} from '.'

const clearAll = () => Promise.all(db.tables.map((t) => t.clear()))

function makeAlert(overrides: Partial<Alert> = {}): Alert {
  return {
    id: 'alert-1',
    astronautId: 'astro-1',
    timestamp: 1_000,
    metric: 'heartRate',
    severity: 'watch',
    title: 'Resting heart rate is up',
    explanation: 'Higher than this astronaut\'s own baseline.',
    suggestedAction: 'Review recent activity and rest.',
    acknowledged: false,
    ...overrides,
  }
}

beforeEach(async () => {
  await clearAll()
})

describe('seedMission', () => {
  it('loads the crew and every reading, and records the mission in settings', async () => {
    const result = await seedMission(3, 7)
    expect(result).toEqual({ astronauts: 4, readings: 3 * 24 * 4 })
    expect(await db.astronauts.count()).toBe(4)
    expect(await db.readings.count()).toBe(288)
    expect((await getAstronauts()).map((a) => a.id)).toEqual([
      'astro-1',
      'astro-2',
      'astro-3',
      'astro-4',
    ])
    const settings = await getSettings()
    expect(settings.missionDays).toBe(3)
    expect(settings.missionSeed).toBe(7)
    expect(typeof settings.seededAt).toBe('number')
  })

  it('stores exactly what the simulator generates', async () => {
    await seedMission(3, 7)
    const expected = generateMission(3, 7, demoScenarios(3))
    for (const id of ['astro-1', 'astro-2', 'astro-3', 'astro-4']) {
      expect(await getReadings(id)).toEqual(series(expected, id))
    }
  })

  it('is reproducible: the same seed gives the same data, another seed does not', async () => {
    await seedMission(3, 7)
    const first = await getReadings('astro-1')
    await seedMission(3, 7)
    expect(await getReadings('astro-1')).toEqual(first)
    await seedMission(3, 8)
    expect(await getReadings('astro-1')).not.toEqual(first)
  })

  it('replaces earlier data and clears alerts', async () => {
    await seedMission(3, 7)
    await saveAlert(makeAlert())
    await seedMission(2, 7)
    expect(await db.readings.count()).toBe(2 * 24 * 4)
    expect(await getAlerts()).toEqual([])
  })

  it('includes the demo scenarios by default, and none when given an empty list', async () => {
    const peakDose = async () =>
      Math.max(...(await getReadings('astro-1')).map((r) => r.radiationDoseRate))
    await seedMission(14, 1) // day 12 holds the solar particle event
    expect(await peakDose()).toBeGreaterThan(2)
    await seedMission(14, 1, [])
    expect(await peakDose()).toBeLessThan(1)
  })

  it('keeps existing data if the mission is invalid', async () => {
    await seedMission(3, 7)
    await saveAlert(makeAlert())
    await expect(seedMission(0, 7)).rejects.toThrow(RangeError)
    expect(await db.readings.count()).toBe(288)
    expect(await getAlerts()).toHaveLength(1)
  })

  it('keeps other settings when reseeding', async () => {
    await updateSettings({ selectedAstronautId: 'astro-2' })
    await seedMission(2, 1)
    expect((await getSettings()).selectedAstronautId).toBe('astro-2')
  })
})

describe('getReadings', () => {
  beforeEach(async () => {
    await seedMission(3, 7)
  })

  it('is indexed by [astronautId+timestamp]', () => {
    expect(db.readings.schema.primKey.keyPath).toEqual(['astronautId', 'timestamp'])
  })

  it('returns only that astronaut\'s readings, oldest first', async () => {
    const readings = await getReadings('astro-2')
    expect(readings).toHaveLength(72)
    expect(readings.every((r) => r.astronautId === 'astro-2')).toBe(true)
    for (let i = 1; i < readings.length; i++) {
      expect(readings[i].timestamp).toBeGreaterThan(readings[i - 1].timestamp)
    }
  })

  it('includes both ends of the range', async () => {
    const all = await getReadings('astro-1')
    const slice = await getReadings('astro-1', { from: all[10].timestamp, to: all[20].timestamp })
    expect(slice).toHaveLength(11)
    expect(slice[0]).toEqual(all[10])
    expect(slice.at(-1)).toEqual(all[20])
  })

  it('treats a missing end as open', async () => {
    const all = await getReadings('astro-1')
    expect(await getReadings('astro-1', { from: all[10].timestamp })).toHaveLength(62)
    expect(await getReadings('astro-1', { to: all[10].timestamp })).toHaveLength(11)
  })

  it('works with ends that fall between readings', async () => {
    const all = await getReadings('astro-1')
    const slice = await getReadings('astro-1', {
      from: all[10].timestamp + 1,
      to: all[12].timestamp - 1,
    })
    expect(slice.map((r) => r.timestamp)).toEqual([all[11].timestamp])
  })

  it('returns nothing for an unknown astronaut or an empty window', async () => {
    expect(await getReadings('astro-9')).toEqual([])
    expect(await getReadings('astro-1', { from: 0, to: 1 })).toEqual([])
  })
})

describe('alerts', () => {
  it('saves and reads back an alert', async () => {
    await saveAlert(makeAlert())
    expect(await getAlerts()).toEqual([makeAlert()])
  })

  it('replaces an alert with the same id instead of duplicating it', async () => {
    await saveAlert(makeAlert())
    await saveAlert(makeAlert({ severity: 'warning', title: 'Updated' }))
    const alerts = await getAlerts()
    expect(alerts).toHaveLength(1)
    expect(alerts[0].severity).toBe('warning')
  })

  it('keeps an alert acknowledged when it is saved again', async () => {
    await saveAlert(makeAlert())
    await acknowledgeAlert('alert-1')
    await saveAlert(makeAlert({ title: 'Re-run result' }))
    const [alert] = await getAlerts()
    expect(alert.acknowledged).toBe(true)
    expect(alert.title).toBe('Re-run result')
  })

  it('acknowledges an alert and says so when the alert does not exist', async () => {
    await saveAlert(makeAlert())
    expect(await acknowledgeAlert('alert-1')).toBe(true)
    expect((await getAlerts())[0].acknowledged).toBe(true)
    expect(await acknowledgeAlert('alert-1')).toBe(true) // harmless to repeat
    expect(await acknowledgeAlert('nope')).toBe(false)
  })

  describe('getAlerts filters', () => {
    beforeEach(async () => {
      await saveAlert(makeAlert({ id: 'a', timestamp: 100, severity: 'info', metric: 'mood' }))
      await saveAlert(makeAlert({ id: 'b', timestamp: 200, severity: 'watch', metric: 'hrv' }))
      await saveAlert(
        makeAlert({ id: 'c', timestamp: 300, severity: 'warning', astronautId: 'astro-2' }),
      )
      await saveAlert(
        makeAlert({
          id: 'd',
          timestamp: 400,
          severity: 'critical',
          astronautId: 'astro-2',
          metric: 'radiationDoseRate',
          acknowledged: true,
        }),
      )
    })

    const ids = async (filters: Parameters<typeof getAlerts>[0]) =>
      (await getAlerts(filters)).map((a) => a.id)

    it('returns everything, newest first, with no filters', async () => {
      expect(await ids({})).toEqual(['d', 'c', 'b', 'a'])
    })

    it('filters by astronaut', async () => {
      expect(await ids({ astronautId: 'astro-2' })).toEqual(['d', 'c'])
      expect(await ids({ astronautId: 'astro-1' })).toEqual(['b', 'a'])
    })

    it('filters by one severity or several', async () => {
      expect(await ids({ severity: 'warning' })).toEqual(['c'])
      expect(await ids({ severity: ['warning', 'critical'] })).toEqual(['d', 'c'])
    })

    it('filters by metric', async () => {
      expect(await ids({ metric: 'hrv' })).toEqual(['b'])
    })

    it('filters by acknowledged state', async () => {
      expect(await ids({ acknowledged: true })).toEqual(['d'])
      expect(await ids({ acknowledged: false })).toEqual(['c', 'b', 'a'])
    })

    it('filters by time range, including both ends', async () => {
      expect(await ids({ from: 200, to: 300 })).toEqual(['c', 'b'])
      expect(await ids({ from: 301 })).toEqual(['d'])
    })

    it('limits to the newest alerts', async () => {
      expect(await ids({ limit: 2 })).toEqual(['d', 'c'])
      expect(await ids({ limit: 0 })).toEqual([])
    })

    it('combines filters', async () => {
      expect(await ids({ astronautId: 'astro-2', acknowledged: false })).toEqual(['c'])
      expect(await ids({ astronautId: 'astro-1', severity: 'critical' })).toEqual([])
    })

    it('puts alerts with the same time in a stable order', async () => {
      await saveAlert(makeAlert({ id: 'z', timestamp: 400 }))
      expect(await ids({ from: 400 })).toEqual(['d', 'z'])
    })
  })
})

describe('settings', () => {
  it('gives defaults when nothing is saved', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
    expect(DEFAULT_SETTINGS).toMatchObject({ missionDays: 60, selectedAstronautId: null })
  })

  it('merges changes, saves them, and returns the new settings', async () => {
    const next = await updateSettings({ selectedAstronautId: 'astro-3' })
    expect(next).toEqual({ ...DEFAULT_SETTINGS, selectedAstronautId: 'astro-3' })
    expect(await getSettings()).toEqual(next)
    await updateSettings({ missionDays: 10 })
    expect(await getSettings()).toMatchObject({ missionDays: 10, selectedAstronautId: 'astro-3' })
  })

  it('ignores undefined values', async () => {
    await updateSettings({ selectedAstronautId: 'astro-3' })
    await updateSettings({ selectedAstronautId: undefined })
    expect((await getSettings()).selectedAstronautId).toBe('astro-3')
  })
})

describe('first-run and reset (60-day demo mission)', () => {
  it('seeds the demo mission when the database is empty, and only then', async () => {
    expect(await ensureDemoData()).toBe(true)
    expect(await db.astronauts.count()).toBe(4)
    expect(await db.readings.count()).toBe(60 * 24 * 4)
    expect(await getSettings()).toMatchObject({ missionDays: 60, missionSeed: 2026 })

    await saveAlert(makeAlert())
    expect(await ensureDemoData()).toBe(false)
    expect(await getAlerts()).toHaveLength(1) // nothing was wiped
  }, 30_000)

  it('seeds once when called twice at the same time', async () => {
    const spy = vi.spyOn(db.readings, 'bulkAdd')
    await Promise.all([ensureDemoData(), ensureDemoData()])
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  }, 30_000)

  it('fills in the data again if only part of it is missing', async () => {
    await seedMission(2, 1)
    await db.readings.clear()
    expect(await ensureDemoData()).toBe(true)
    expect(await db.readings.count()).toBe(60 * 24 * 4)
  }, 30_000)

  it('resets to the default demo mission and clears alerts', async () => {
    await seedMission(3, 99)
    await saveAlert(makeAlert())
    await acknowledgeAlert('alert-1')

    await resetDemoData()
    expect(await db.readings.count()).toBe(60 * 24 * 4)
    expect(await getAlerts()).toEqual([])
    expect(await getSettings()).toMatchObject({ missionDays: 60, missionSeed: 2026 })
  }, 30_000)
})
