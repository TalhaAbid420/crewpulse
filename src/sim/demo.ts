import type { ScenarioEvent } from './types'

/** The demo mission loaded on first run and by "Reset demo data". */
export const DEMO_DAYS = 60
export const DEMO_SEED = 2026

const HOURS_PER_DAY = 24
/** Hour (since mission start) at which the given 1-based mission day begins. */
const startOfDay = (missionDay: number) => (missionDay - 1) * HOURS_PER_DAY

/**
 * A scripted set of events for the demo mission, so the dashboard always has
 * something to find. One event of each type, each aimed at a different
 * astronaut (except the solar event, which affects everyone). Events that would
 * start after the end of a shorter mission are left out.
 * The schedule is documented in docs/ASSUMPTIONS.md.
 */
export function demoScenarios(days: number = DEMO_DAYS): ScenarioEvent[] {
  const events: ScenarioEvent[] = [
    {
      type: 'solar-particle-event',
      startHour: startOfDay(12),
      durationHours: 36,
      astronautIds: ['astro-1', 'astro-2', 'astro-3', 'astro-4'],
    },
    {
      type: 'sleep-disruption',
      startHour: startOfDay(25),
      durationHours: 72,
      astronautIds: ['astro-3'],
    },
    {
      type: 'isolation-fatigue',
      startHour: startOfDay(35),
      durationHours: 240,
      astronautIds: ['astro-4'],
    },
    {
      type: 'exercise-skipped',
      startHour: startOfDay(47),
      durationHours: 120,
      astronautIds: ['astro-1'],
    },
  ]
  return events.filter((e) => e.startHour < days * HOURS_PER_DAY)
}
