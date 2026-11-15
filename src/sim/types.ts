// Data model shared by the simulator, the alert engine, the database and the UI.
// All values produced from these types in this prototype are SIMULATED.

/** Every numeric health indicator carried by a Reading. */
export const METRIC_KEYS = [
  'heartRate',
  'hrv',
  'sleepHours',
  'sleepQuality',
  'stressScore',
  'activityMinutes',
  'bodyTemp',
  'spo2',
  'radiationDoseRate',
  'mood',
] as const

export type MetricKey = (typeof METRIC_KEYS)[number]

/**
 * The long-run values the simulator steers each astronaut toward.
 * This is simulator ground truth. The alert engine must NOT read it: it has to
 * learn each person's baseline from their readings (CLAUDE.md principle 2).
 */
export interface BaselineTraits {
  restingHeartRate: number // bpm
  hrv: number // ms (RMSSD)
  sleepHours: number // hours per night
  sleepQuality: number // 0-100
  stressScore: number // 0-100
  dailyActivityMinutes: number // total minutes of activity per day
  bodyTemp: number // degrees C, 24-hour mean
  spo2: number // %
  radiationDoseRate: number // mSv/day equivalent
  mood: number // 1-5
  exerciseStartHour: number // hour of day (0-23) when the 2-hour exercise block starts
}

export interface Astronaut {
  id: string
  name: string
  role: string
  age: number
  baseline: BaselineTraits
}

/**
 * One reading per astronaut per simulated hour.
 *
 * - heartRate: resting bpm
 * - hrv: ms (RMSSD)
 * - sleepHours, sleepQuality: describe the most recent COMPLETED night, so the
 *   value is the same for many consecutive readings and changes at 07:00
 * - stressScore: 0-100
 * - activityMinutes: minutes of activity within this hour (0-60)
 * - bodyTemp: degrees C
 * - spo2: %
 * - radiationDoseRate: mSv/day equivalent (a rate, not an accumulated dose)
 * - mood: 1-5
 */
export interface Reading extends Record<MetricKey, number> {
  astronautId: string
  /** Milliseconds since the Unix epoch (UTC) of the start of this simulated hour. */
  timestamp: number
  /** 1-based mission day. */
  missionDay: number
}

export type Severity = 'info' | 'watch' | 'warning' | 'critical'

/**
 * An alert. CLAUDE.md principle 3 applies to every alert:
 * - title: says WHAT CHANGED, in a short headline
 * - explanation: says WHY IT MATTERS, with the numbers compared with the
 *   astronaut's own baseline
 * - suggestedAction: says what to do next
 */
export interface Alert {
  id: string
  astronautId: string
  /** Milliseconds since the Unix epoch (UTC). */
  timestamp: number
  metric: MetricKey
  severity: Severity
  title: string
  explanation: string
  suggestedAction: string
  acknowledged: boolean
}

export type ScenarioType =
  | 'solar-particle-event'
  | 'sleep-disruption'
  | 'isolation-fatigue'
  | 'exercise-skipped'

/** An injectable event that changes some metrics for some astronauts. */
export interface ScenarioEvent {
  type: ScenarioType
  /** Hours since mission start (hour 0 = start of mission day 1). */
  startHour: number
  /** How long the event lasts, in hours. Must be greater than 0. */
  durationHours: number
  /** Which astronauts are affected. */
  astronautIds: readonly string[]
  /** Strength from 0 to 1. Defaults to 1 (full strength). */
  intensity?: number
}
