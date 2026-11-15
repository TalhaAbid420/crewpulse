import { describe, expect, it } from 'vitest'
import { DEMO_DAYS, DEMO_SEED, demoScenarios } from './demo'
import { generateMission } from './generate'

describe('demo mission', () => {
  it('uses a 60-day mission', () => {
    expect(DEMO_DAYS).toBe(60)
  })

  it('has exactly one event of each type, all inside the mission', () => {
    const events = demoScenarios()
    expect(events.map((e) => e.type).sort()).toEqual([
      'exercise-skipped',
      'isolation-fatigue',
      'sleep-disruption',
      'solar-particle-event',
    ])
    for (const e of events) {
      expect(e.startHour + e.durationHours).toBeLessThanOrEqual(DEMO_DAYS * 24)
    }
  })

  it('is accepted by the generator (valid ids and durations)', () => {
    expect(() => generateMission(DEMO_DAYS, DEMO_SEED, demoScenarios())).not.toThrow()
  })

  it('leaves out events that would start after a shorter mission ends', () => {
    expect(demoScenarios(10)).toEqual([])
    expect(demoScenarios(14).map((e) => e.type)).toEqual(['solar-particle-event'])
  })
})
