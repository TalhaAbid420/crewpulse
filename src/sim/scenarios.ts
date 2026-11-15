import { SCENARIO } from './assumptions'
import type { ScenarioEvent, ScenarioType } from './types'

export const SCENARIO_LABELS: Record<ScenarioType, string> = {
  'solar-particle-event': 'Solar particle event',
  'sleep-disruption': 'Sleep disruption',
  'isolation-fatigue': 'Isolation fatigue',
  'exercise-skipped': 'Exercise skipped',
}

/**
 * How scenarios change one astronaut's numbers at one moment.
 * "Add" values are added, "Mul" values are multiplied. The neutral values
 * (0 and 1) leave a reading exactly as it would have been with no scenario.
 */
export interface ScenarioModifiers {
  heartRateAdd: number
  hrvMul: number
  sleepHoursAdd: number
  sleepQualityAdd: number
  stressAdd: number
  activityMul: number
  moodAdd: number
  doseMul: number
}

function neutral(): ScenarioModifiers {
  return {
    heartRateAdd: 0,
    hrvMul: 1,
    sleepHoursAdd: 0,
    sleepQualityAdd: 0,
    stressAdd: 0,
    activityMul: 1,
    moodAdd: 0,
    doseMul: 1,
  }
}

/**
 * Strength (0 to 1) of an effect over time: ramps up linearly over `riseHours`
 * from `start`, holds until `end`, then fades linearly to 0 over `recoverHours`.
 */
export function envelope(
  hour: number,
  start: number,
  end: number,
  riseHours: number,
  recoverHours: number,
): number {
  if (hour < start) return 0
  // If the event ends before the ramp finishes, the effect fades from where it got to.
  const peak = riseHours > 0 ? Math.min(1, (end - start) / riseHours) : 1
  if (hour < end) return riseHours > 0 ? Math.min(1, (hour - start) / riseHours) : 1
  if (recoverHours <= 0 || hour >= end + recoverHours) return 0
  return peak * (1 - (hour - end) / recoverHours)
}

/**
 * Solar particle event shape: a quick rise to a peak, then exponential decay,
 * so the dose rate is back close to normal by the end of the window.
 */
function solarParticleStrength(hour: number, start: number, duration: number): number {
  const p = SCENARIO.solarParticleEvent
  const t = hour - start
  if (t < 0 || t >= duration) return 0
  const rise = Math.min(p.riseHoursMax, p.riseFractionOfDuration * duration)
  if (t < rise) return t / rise
  const timeConstant = (duration - rise) / p.decayTimeConstants
  return Math.exp(-(t - rise) / timeConstant)
}

/**
 * Combined effect of all scenarios on one astronaut at one mission hour.
 * Pure and random-free: scenarios never use the random stream, so a mission
 * with scenarios has exactly the same noise as the same mission without them.
 */
export function scenarioModifiers(
  hour: number,
  astronautId: string,
  scenarios: readonly ScenarioEvent[],
): ScenarioModifiers {
  const m = neutral()

  for (const event of scenarios) {
    if (!event.astronautIds.includes(astronautId)) continue
    const k = event.intensity ?? 1
    const start = event.startHour
    const end = event.startHour + event.durationHours

    switch (event.type) {
      case 'solar-particle-event': {
        const p = SCENARIO.solarParticleEvent
        const strength = solarParticleStrength(hour, start, event.durationHours)
        m.doseMul *= 1 + (p.peakMultiplier - 1) * k * strength
        break
      }
      case 'sleep-disruption': {
        const p = SCENARIO.sleepDisruption
        // Sleep goes bad straight away ...
        const direct = envelope(hour, start, end, 0, p.recoverHours)
        // ... and HRV and stress follow one day later.
        const lagged = envelope(
          hour,
          start + p.lagHours,
          end + p.lagHours,
          p.lagRiseHours,
          p.laggedRecoverHours,
        )
        m.sleepHoursAdd -= p.sleepHoursLoss * k * direct
        m.sleepQualityAdd -= p.sleepQualityLoss * k * direct
        m.hrvMul *= 1 - p.hrvDropFraction * k * lagged
        m.stressAdd += p.stressRise * k * lagged
        break
      }
      case 'isolation-fatigue': {
        const p = SCENARIO.isolationFatigue
        // Ramps up over the whole event: gradual, not sudden.
        const strength = envelope(hour, start, end, event.durationHours, p.recoverHours)
        m.moodAdd -= p.moodDecline * k * strength
        m.stressAdd += p.stressRise * k * strength
        break
      }
      case 'exercise-skipped': {
        const p = SCENARIO.exerciseSkipped
        const activity = envelope(hour, start, end, p.activityRiseHours, p.activityRecoverHours)
        // Resting heart rate drifts up slowly while exercise stays skipped.
        const drift = envelope(hour, start, end, event.durationHours, p.heartRateRecoverHours)
        m.activityMul *= 1 - p.activityDropFraction * k * activity
        m.heartRateAdd += p.heartRateDrift * k * drift
        break
      }
    }
  }

  return m
}
