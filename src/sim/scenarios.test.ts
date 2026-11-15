import { describe, expect, it } from 'vitest'
import { generateMission } from './generate'
import { envelope, scenarioModifiers } from './scenarios'
import { mean, metricWindow, series, sum } from './test-helpers'
import type { ScenarioEvent } from './types'

const SEED = 2026
const DAYS = 20
const control = generateMission(DAYS, SEED)

/** Run one scenario and return the affected astronaut's readings next to the control run. */
function run(event: ScenarioEvent) {
  const readings = generateMission(DAYS, SEED, [event])
  return { readings, ids: event.astronautIds }
}

/** Mean difference (scenario minus control) of a metric over mission hours [from, to). */
function meanDiff(
  readings: ReturnType<typeof generateMission>,
  id: string,
  metric: Parameters<typeof metricWindow>[1],
  from: number,
  to: number,
) {
  const a = metricWindow(series(readings, id), metric, from, to)
  const b = metricWindow(series(control, id), metric, from, to)
  return mean(a) - mean(b)
}

describe('envelope', () => {
  it('rises, holds, then fades', () => {
    // start 10, end 30, rise 10 h, recover 20 h
    expect(envelope(5, 10, 30, 10, 20)).toBe(0)
    expect(envelope(15, 10, 30, 10, 20)).toBe(0.5)
    expect(envelope(20, 10, 30, 10, 20)).toBe(1)
    expect(envelope(29, 10, 30, 10, 20)).toBe(1)
    expect(envelope(40, 10, 30, 10, 20)).toBe(0.5)
    expect(envelope(50, 10, 30, 10, 20)).toBe(0)
  })

  it('fades from where it got to if the event ends before the ramp finishes', () => {
    // ramp would take 20 h but the event lasts 10 h, so it peaks at 0.5
    expect(envelope(10, 0, 10, 20, 10)).toBe(0.5)
    expect(envelope(15, 0, 10, 20, 10)).toBeCloseTo(0.25)
  })
})

describe('scenarioModifiers', () => {
  const event: ScenarioEvent = {
    type: 'exercise-skipped',
    startHour: 10,
    durationHours: 50,
    astronautIds: ['astro-2'],
  }

  it('changes nothing for astronauts who are not affected', () => {
    expect(scenarioModifiers(30, 'astro-1', [event])).toEqual(scenarioModifiers(30, 'astro-1', []))
  })

  it('changes nothing before the event starts', () => {
    expect(scenarioModifiers(5, 'astro-2', [event])).toEqual(scenarioModifiers(5, 'astro-2', []))
  })

  it('scales with intensity', () => {
    const half = scenarioModifiers(40, 'astro-2', [{ ...event, intensity: 0.5 }])
    const full = scenarioModifiers(40, 'astro-2', [event])
    expect(half.heartRateAdd).toBeCloseTo(full.heartRateAdd / 2)
    expect(1 - half.activityMul).toBeCloseTo((1 - full.activityMul) / 2)
  })

  it('combines overlapping events', () => {
    const both = scenarioModifiers(40, 'astro-2', [
      event,
      { type: 'isolation-fatigue', startHour: 10, durationHours: 100, astronautIds: ['astro-2'] },
    ])
    expect(both.heartRateAdd).toBeGreaterThan(0)
    expect(both.moodAdd).toBeLessThan(0)
  })
})

describe('Solar particle event', () => {
  const start = 96
  const duration = 36
  const { readings } = run({
    type: 'solar-particle-event',
    startHour: start,
    durationHours: duration,
    astronautIds: ['astro-1', 'astro-2'],
  })

  // Dose rate of the scenario run divided by the control run, at one mission hour.
  const ratio = (id: string, hour: number) =>
    series(readings, id)[hour].radiationDoseRate / series(control, id)[hour].radiationDoseRate

  it('spikes the dose rate, then decays', () => {
    const peak = ratio('astro-1', start + 2)
    expect(peak).toBeGreaterThan(10)
    expect(peak).toBeGreaterThan(ratio('astro-1', start + 8))
    expect(ratio('astro-1', start + 8)).toBeGreaterThan(ratio('astro-1', start + 20))
    expect(ratio('astro-1', start + 20)).toBeGreaterThan(ratio('astro-1', start + 33))
    expect(ratio('astro-1', start + 33)).toBeLessThan(2)
  })

  it('leaves the dose rate unchanged before and after the event', () => {
    for (const hour of [0, 50, start - 1, start + duration, start + duration + 40]) {
      expect(series(readings, 'astro-1')[hour].radiationDoseRate).toBe(
        series(control, 'astro-1')[hour].radiationDoseRate,
      )
    }
  })

  it('does not change any other metric', () => {
    for (const key of ['heartRate', 'hrv', 'stressScore', 'mood', 'sleepHours'] as const) {
      expect(series(readings, 'astro-1').map((r) => r[key])).toEqual(
        series(control, 'astro-1').map((r) => r[key]),
      )
    }
  })

  it('leaves unaffected astronauts exactly as they were', () => {
    for (const id of ['astro-3', 'astro-4']) {
      expect(series(readings, id)).toEqual(series(control, id))
    }
  })
})

describe('Sleep disruption', () => {
  // Three nights of bad sleep (nights ending mornings of days 6, 7 and 8).
  const start = 120
  const duration = 72
  const { readings } = run({
    type: 'sleep-disruption',
    startHour: start,
    durationHours: duration,
    astronautIds: ['astro-3'],
  })
  const id = 'astro-3'

  it('cuts sleep hours and quality during the event', () => {
    // At noon each day, the sleep values are last night's.
    for (const day of [5, 6, 7]) {
      const hour = day * 24 + 12
      const dh = series(readings, id)[hour].sleepHours - series(control, id)[hour].sleepHours
      const dq = series(readings, id)[hour].sleepQuality - series(control, id)[hour].sleepQuality
      expect(dh).toBeCloseTo(-2.5, 1)
      expect(dq).toBeCloseTo(-25, 0)
    }
    // The night before the event is untouched.
    const before = 4 * 24 + 12
    expect(series(readings, id)[before].sleepHours).toBe(series(control, id)[before].sleepHours)
  })

  it('lowers HRV and raises stress only AFTER sleep has gone bad', () => {
    // First day: no change yet.
    expect(metricWindow(series(readings, id), 'hrv', start, start + 24)).toEqual(
      metricWindow(series(control, id), 'hrv', start, start + 24),
    )
    expect(metricWindow(series(readings, id), 'stressScore', start, start + 24)).toEqual(
      metricWindow(series(control, id), 'stressScore', start, start + 24),
    )
    // Once the lag has passed, HRV is clearly lower and stress clearly higher.
    const hrvScn = mean(metricWindow(series(readings, id), 'hrv', start + 36, start + 96))
    const hrvCtl = mean(metricWindow(series(control, id), 'hrv', start + 36, start + 96))
    expect(hrvScn / hrvCtl).toBeLessThan(0.75)
    expect(meanDiff(readings, id, 'stressScore', start + 36, start + 96)).toBeGreaterThan(15)
  })

  it('leaves unaffected astronauts exactly as they were', () => {
    for (const other of ['astro-1', 'astro-2', 'astro-4']) {
      expect(series(readings, other)).toEqual(series(control, other))
    }
  })
})

describe('Isolation fatigue', () => {
  const start = 48
  const duration = 240 // ten days
  const { readings } = run({
    type: 'isolation-fatigue',
    startHour: start,
    durationHours: duration,
    astronautIds: ['astro-4'],
  })
  const id = 'astro-4'

  it('declines mood gradually, not suddenly', () => {
    const windows = [0, 1, 2, 3, 4].map((i) =>
      meanDiff(readings, id, 'mood', start + i * 48, start + (i + 1) * 48),
    )
    expect(windows[0]).toBeGreaterThan(-0.3) // barely changed at first
    expect(windows[4]).toBeLessThan(-0.9) // clearly lower by the end
    for (let i = 1; i < windows.length; i++) {
      expect(windows[i]).toBeLessThan(windows[i - 1]) // keeps getting worse
    }
  })

  it('raises stress over the same period', () => {
    const early = meanDiff(readings, id, 'stressScore', start, start + 48)
    const late = meanDiff(readings, id, 'stressScore', start + 192, start + 240)
    expect(early).toBeLessThan(5)
    expect(late).toBeGreaterThan(14)
  })

  it('leaves unaffected astronauts exactly as they were', () => {
    for (const other of ['astro-1', 'astro-2', 'astro-3']) {
      expect(series(readings, other)).toEqual(series(control, other))
    }
  })
})

describe('Exercise skipped', () => {
  const start = 72
  const duration = 120 // five days
  const { readings } = run({
    type: 'exercise-skipped',
    startHour: start,
    durationHours: duration,
    astronautIds: ['astro-1'],
  })
  const id = 'astro-1'

  it('drops activity sharply', () => {
    const dayTotal = (data: typeof readings, day: number) =>
      sum(metricWindow(series(data, id), 'activityMinutes', day * 24, day * 24 + 24))
    // Mission day 5 (index 4) is well inside the event.
    expect(dayTotal(readings, 4) / dayTotal(control, 4)).toBeLessThan(0.25)
  })

  it('lets resting heart rate drift up gradually', () => {
    const early = meanDiff(readings, id, 'heartRate', start, start + 24)
    const late = meanDiff(readings, id, 'heartRate', start + 96, start + 120)
    expect(early).toBeGreaterThan(0)
    expect(early).toBeLessThan(2)
    expect(late).toBeGreaterThan(4)
  })

  it('leaves unaffected astronauts exactly as they were', () => {
    for (const other of ['astro-2', 'astro-3', 'astro-4']) {
      expect(series(readings, other)).toEqual(series(control, other))
    }
  })
})
