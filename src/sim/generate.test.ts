import { afterEach, describe, expect, it, vi } from 'vitest'
import { METRIC_INFO, TYPICAL_BASELINE_RANGE } from './assumptions'
import { createCrew } from './crew'
import { generateMission, MISSION_START_MS } from './generate'
import { mean, series } from './test-helpers'
import { METRIC_KEYS, type ScenarioEvent } from './types'

afterEach(() => vi.restoreAllMocks())

describe('crew', () => {
  it('has four astronauts with unique ids and different baselines', () => {
    const crew = createCrew()
    expect(crew).toHaveLength(4)
    expect(new Set(crew.map((a) => a.id)).size).toBe(4)
    expect(new Set(crew.map((a) => a.baseline.restingHeartRate)).size).toBe(4)
    expect(new Set(crew.map((a) => a.baseline.hrv)).size).toBe(4)
  })

  it('keeps every baseline inside its documented typical range', () => {
    for (const a of createCrew()) {
      const { exerciseStartHour: _hour, ...numeric } = a.baseline
      for (const [key, value] of Object.entries(numeric)) {
        const [min, max] = TYPICAL_BASELINE_RANGE[key as keyof typeof numeric]
        expect(value, `${a.id} ${key}`).toBeGreaterThanOrEqual(min)
        expect(value, `${a.id} ${key}`).toBeLessThanOrEqual(max)
      }
    }
  })

  it('returns a copy, so callers cannot change the shared crew', () => {
    const crew = createCrew()
    crew[0].baseline.restingHeartRate = 999
    expect(createCrew()[0].baseline.restingHeartRate).not.toBe(999)
  })
})

describe('generateMission: shape', () => {
  const readings = generateMission(3, 1)

  it('makes one reading per astronaut per hour', () => {
    expect(readings).toHaveLength(3 * 24 * 4)
  })

  it('uses hourly timestamps from the mission start and 1-based mission days', () => {
    const first = series(readings, 'astro-1')
    expect(first[0].timestamp).toBe(MISSION_START_MS)
    expect(first[0].missionDay).toBe(1)
    expect(first[24].missionDay).toBe(2)
    expect(first[71].missionDay).toBe(3)
    for (let i = 1; i < first.length; i++) {
      expect(first[i].timestamp - first[i - 1].timestamp).toBe(3_600_000)
    }
  })

  it('orders readings by time, then by crew order', () => {
    expect(readings.slice(0, 4).map((r) => r.astronautId)).toEqual([
      'astro-1',
      'astro-2',
      'astro-3',
      'astro-4',
    ])
    expect(readings[4].timestamp - readings[0].timestamp).toBe(3_600_000)
  })

  it('keeps every value finite and inside its hard limits', () => {
    const long = generateMission(30, 2024)
    for (const r of long) {
      for (const key of METRIC_KEYS) {
        const [min, max] = METRIC_INFO[key].limits
        expect(Number.isFinite(r[key])).toBe(true)
        expect(r[key]).toBeGreaterThanOrEqual(min)
        expect(r[key]).toBeLessThanOrEqual(max)
      }
    }
  }, 20000)
})

describe('generateMission: determinism', () => {
  const scenarios: ScenarioEvent[] = [
    { type: 'solar-particle-event', startHour: 30, durationHours: 24, astronautIds: ['astro-1'] },
    { type: 'sleep-disruption', startHour: 48, durationHours: 48, astronautIds: ['astro-2'] },
  ]

  it('gives identical output for the same seed', () => {
    expect(generateMission(10, 42, scenarios)).toEqual(generateMission(10, 42, scenarios))
  })

  it('gives different output for different seeds', () => {
    const a = series(generateMission(10, 42), 'astro-1')
    const b = series(generateMission(10, 43), 'astro-1')
    expect(a.map((r) => r.heartRate)).not.toEqual(b.map((r) => r.heartRate))
  })

  it('never uses Math.random', () => {
    const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random must not be used')
    })
    expect(() => generateMission(5, 7, scenarios)).not.toThrow()
    expect(spy).not.toHaveBeenCalled()
  })

  it('starts a longer mission with exactly the readings of a shorter one', () => {
    const short = generateMission(7, 42, scenarios)
    const long = generateMission(14, 42, scenarios)
    expect(long.slice(0, short.length)).toEqual(short)
  })
})

describe('generateMission: realistic daily rhythm and baselines', () => {
  // 30 quiet days with no scenarios.
  const quiet = generateMission(30, 2026)
  const crew = createCrew()

  it('has lower resting heart rate and higher HRV at night than in the afternoon', () => {
    for (const a of crew) {
      const s = series(quiet, a.id)
      const atHour = (h: number, key: 'heartRate' | 'hrv') =>
        mean(s.filter((r) => new Date(r.timestamp).getUTCHours() === h).map((r) => r[key]))
      expect(atHour(16, 'heartRate') - atHour(4, 'heartRate'), a.id).toBeGreaterThan(5)
      expect(atHour(4, 'hrv') - atHour(16, 'hrv'), a.id).toBeGreaterThan(3)
    }
  })

  it('has body temperature that is warmest late afternoon and coolest before dawn', () => {
    for (const a of crew) {
      const s = series(quiet, a.id)
      const atHour = (h: number) =>
        mean(s.filter((r) => new Date(r.timestamp).getUTCHours() === h).map((r) => r.bodyTemp))
      expect(atHour(17) - atHour(5), a.id).toBeGreaterThan(0.4)
    }
  })

  it('has no activity while asleep and activity in each astronaut\'s exercise hour', () => {
    for (const a of crew) {
      const s = series(quiet, a.id)
      const night = s.filter((r) => {
        const h = new Date(r.timestamp).getUTCHours()
        return h >= 23 || h < 7
      })
      expect(Math.max(...night.map((r) => r.activityMinutes)), a.id).toBe(0)
      const exercise = s.filter(
        (r) => new Date(r.timestamp).getUTCHours() === a.baseline.exerciseStartHour,
      )
      expect(mean(exercise.map((r) => r.activityMinutes)), a.id).toBeGreaterThan(15)
    }
  })

  it('stays close to each astronaut\'s own baseline on average', () => {
    for (const a of crew) {
      const s = series(quiet, a.id)
      const avg = (key: (typeof METRIC_KEYS)[number]) => mean(s.map((r) => r[key]))
      expect(Math.abs(avg('heartRate') - a.baseline.restingHeartRate), a.id).toBeLessThan(2)
      expect(Math.abs(avg('hrv') - a.baseline.hrv), a.id).toBeLessThan(5)
      expect(Math.abs(avg('sleepHours') - a.baseline.sleepHours), a.id).toBeLessThan(0.4)
      expect(Math.abs(avg('bodyTemp') - a.baseline.bodyTemp), a.id).toBeLessThan(0.1)
      expect(Math.abs(avg('radiationDoseRate') - a.baseline.radiationDoseRate), a.id).toBeLessThan(0.03)
      expect(Math.abs(avg('mood') - a.baseline.mood), a.id).toBeLessThan(0.3)
    }
  })

  it('makes astronauts differ from each other, not from a shared average', () => {
    const meanHr = crew.map((a) => mean(series(quiet, a.id).map((r) => r.heartRate)))
    expect(Math.max(...meanHr) - Math.min(...meanHr)).toBeGreaterThan(8)
  })

  it('updates sleep values once a night, at 07:00', () => {
    const s = series(quiet, 'astro-1')
    // Day 2: hours 24..47. Sleep stays the same from 07:00 to 06:00 the next morning.
    const dayValues = s.slice(24 + 7, 24 + 7 + 24).map((r) => r.sleepHours)
    expect(new Set(dayValues).size).toBe(1)
    expect(s[24 + 6].sleepHours).not.toBe(s[24 + 7].sleepHours)
  })
})

describe('generateMission: input checks', () => {
  it('rejects a mission length that is not a positive whole number', () => {
    expect(() => generateMission(0, 1)).toThrow(RangeError)
    expect(() => generateMission(2.5, 1)).toThrow(RangeError)
  })

  it('rejects scenarios that are not valid', () => {
    const bad = (e: Partial<ScenarioEvent>) =>
      generateMission(2, 1, [
        { type: 'solar-particle-event', startHour: 0, durationHours: 6, astronautIds: ['astro-1'], ...e },
      ])
    expect(() => bad({ durationHours: 0 })).toThrow(/durationHours/)
    expect(() => bad({ astronautIds: ['astro-9'] })).toThrow(/unknown astronaut/)
    expect(() => bad({ intensity: 2 })).toThrow(/intensity/)
  })
})
