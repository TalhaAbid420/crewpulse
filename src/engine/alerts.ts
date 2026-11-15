import type { Alert, MetricKey, Reading, Severity } from '../sim'
import { computeHourlyBaselines, type BandSettings } from './circadian'
import { MIN_BASELINE_SAMPLES } from './baseline'
import type { MetricBaseline } from './types'

/** Minimum rise above personal normal before a stress "watch" fires. Assumption, see docs/ASSUMPTIONS.md. */
export const STRESS_RISE_WATCH = 8
/** Minimum fall below personal normal before a mood "watch" fires. Assumption, see docs/ASSUMPTIONS.md. */
export const MOOD_DROP_WATCH = 0.5

/** Radiation thresholds. Assumptions, see docs/ASSUMPTIONS.md section 8. */
export const RADIATION_WARNING_MSV_DAY = 1.5
export const RADIATION_CRITICAL_MSV_DAY = 5.0
export const RADIATION_WARNING_MULTIPLE = 2.5
export const RADIATION_CRITICAL_MULTIPLE = 6.0

export type RadiationStatus = 'nominal' | 'elevated' | 'storm'

/** Classifies a dose rate against the person's own baseline (same rule the alerts use). */
export function radiationStatus(value: number, baselineMean: number): RadiationStatus {
  const multiple = value / (baselineMean || 0.5)
  if (value >= RADIATION_CRITICAL_MSV_DAY || multiple >= RADIATION_CRITICAL_MULTIPLE) return 'storm'
  if (value >= RADIATION_WARNING_MSV_DAY || multiple >= RADIATION_WARNING_MULTIPLE) return 'elevated'
  return 'nominal'
}

export interface AlertInput {
  astronautId: string
  timestamp: number
  metric: MetricKey
  severity: Severity
  title: string
  explanation: string
  suggestedAction: string
  acknowledged?: boolean
}

/**
 * Factory function that guarantees every Alert strictly satisfies CLAUDE.md Principle 3:
 * - title: WHAT CHANGED
 * - explanation: WHY IT MATTERS
 * - suggestedAction: SUGGESTED ACTION
 * Throws an error if any of the three fields is missing or empty.
 */
export function createAlert(input: AlertInput): Alert {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error('Alert validation error: "title" (what changed) must not be empty.')
  }
  if (!input.explanation || input.explanation.trim().length === 0) {
    throw new Error('Alert validation error: "explanation" (why it matters) must not be empty.')
  }
  if (!input.suggestedAction || input.suggestedAction.trim().length === 0) {
    throw new Error('Alert validation error: "suggestedAction" (what to do next) must not be empty.')
  }

  const id = `alert-${input.astronautId}-${input.metric}-${input.timestamp}`

  return {
    id,
    astronautId: input.astronautId,
    timestamp: input.timestamp,
    metric: input.metric,
    severity: input.severity,
    title: input.title.trim(),
    explanation: input.explanation.trim(),
    suggestedAction: input.suggestedAction.trim(),
    acknowledged: input.acknowledged ?? false,
  }
}

/**
 * Evaluates a single reading against the astronaut's personal metric baseline.
 * Returns an Alert if the reading deviates significantly from personal baseline, or null if nominal.
 */
export function evaluateReadingForAlert(
  reading: Reading,
  baseline: MetricBaseline,
): Alert | null {
  const { metric } = baseline
  const { astronautId, timestamp } = reading
  const value = reading[metric]
  const { mean, lowerNormal, upperNormal, lowerCritical, upperCritical } = baseline

  // Heart Rate (resting/waking)
  if (metric === 'heartRate') {
    if (value > upperCritical) {
      return createAlert({
        astronautId,
        timestamp,
        metric,
        severity: 'critical',
        title: `Resting heart rate critically elevated (${Math.round(value)} bpm vs ${Math.round(mean)} bpm baseline)`,
        explanation: `Current heart rate of ${Math.round(value)} bpm is more than 2.5 standard deviations above your personal baseline of ${Math.round(mean)} bpm. Sustained tachycardia under resting microgravity conditions may indicate acute cardiovascular strain, severe dehydration, or cardiac arrhythmia.`,
        suggestedAction: 'Sit or rest immediately; check hydration and oral electrolyte status; conduct 12-lead ECG telemetry check with ground medical support.',
      })
    }
    if (value > upperNormal) {
      return createAlert({
        astronautId,
        timestamp,
        metric,
        severity: 'warning',
        title: `Resting heart rate elevated (+${Math.round(value - mean)} bpm above baseline)`,
        explanation: `Your resting heart rate is ${Math.round(value)} bpm compared to your normal average of ${Math.round(mean)} bpm (+${Math.round(((value - mean) / mean) * 100)}%). This upward shift reflects accumulated sympathetic nervous system arousal or physical deconditioning.`,
        suggestedAction: 'Log fluid consumption; verify sleep duration; reduce high-intensity aerobic exercise resistance for the next cycle.',
      })
    }
  }

  // Heart Rate Variability (HRV - RMSSD)
  if (metric === 'hrv') {
    const dropPercent = Math.round(((mean - value) / mean) * 100)
    if (value < lowerCritical && dropPercent >= 35) {
      return createAlert({
        astronautId,
        timestamp,
        metric,
        severity: 'critical',
        title: `Severe autonomic fatigue (HRV dropped ${dropPercent}% to ${Math.round(value)} ms)`,
        explanation: `HRV (RMSSD) has collapsed to ${Math.round(value)} ms compared to your personal baseline of ${Math.round(mean)} ms. Depressed parasympathetic vagal tone is a strong biomarker for systemic exhaustion, high physiological stress, and impaired immune resilience in closed environments.`,
        suggestedAction: 'Immediately defer non-critical EVA or complex operations; initiate active parasympathetic recovery session; prioritize 8.5h protected sleep block.',
      })
    }
    if (value < lowerNormal && dropPercent >= 20) {
      return createAlert({
        astronautId,
        timestamp,
        metric,
        severity: 'warning',
        title: `Reduced HRV recovery (${Math.round(value)} ms vs ${Math.round(mean)} ms baseline)`,
        explanation: `HRV is ${dropPercent}% lower than your typical baseline (${Math.round(value)} ms vs ${Math.round(mean)} ms). Indicates incomplete overnight autonomic recovery and mounting physical or mental fatigue.`,
        suggestedAction: 'Incorporate 15 minutes of paced breathing or meditation countermeasure; adjust exercise intensity; review upcoming shift handover.',
      })
    }
  }

  // Radiation Dose Rate
  if (metric === 'radiationDoseRate') {
    const multiplier = Number((value / (mean || 0.5)).toFixed(1))
    if (value >= RADIATION_CRITICAL_MSV_DAY || multiplier >= RADIATION_CRITICAL_MULTIPLE) {
      return createAlert({
        astronautId,
        timestamp,
        metric,
        severity: 'critical',
        title: `Extreme radiation dose rate (${value.toFixed(2)} mSv/day, ${multiplier}× baseline)`,
        explanation: `Ambient radiation dose rate is surging at ${value.toFixed(2)} mSv/day (normally ${mean.toFixed(2)} mSv/day). This indicates an acute Solar Particle Event (SPE) or geomagnetic anomaly posing acute radiation hazard.`,
        suggestedAction: 'Relocate immediately to designated station radiation storm shelter (water wall / polyethylene shielded core); verify dosimeter clip placement.',
      })
    }
    if (value >= RADIATION_WARNING_MSV_DAY || multiplier >= RADIATION_WARNING_MULTIPLE) {
      return createAlert({
        astronautId,
        timestamp,
        metric,
        severity: 'warning',
        title: `Elevated radiation exposure rate (${value.toFixed(2)} mSv/day)`,
        explanation: `Radiation rate of ${value.toFixed(2)} mSv/day is ${multiplier}× higher than your personal baseline of ${mean.toFixed(2)} mSv/day. While not immediately hazardous, cumulative exposure limits require tracking.`,
        suggestedAction: 'Minimize time in outer unshielded modules; verify active dosimeter readings with mission control environmental officer.',
      })
    }
  }

  // Blood Oxygen (SpO2)
  if (metric === 'spo2') {
    if (value <= 93) {
      return createAlert({
        astronautId,
        timestamp,
        metric,
        severity: 'critical',
        title: `Acute hypoxemia: SpO2 dropped to ${value.toFixed(1)}%`,
        explanation: `Blood oxygen saturation of ${value.toFixed(1)}% is dangerously below your personal baseline of ${mean.toFixed(1)}%. Hypoxia in spaceflight poses immediate cognitive and coordination impairment.`,
        suggestedAction: 'Don supplemental oxygen mask; verify environmental cabin oxygen partial pressure (ppO2) and check sensor placement.',
      })
    }
    if (value <= 95 && value < lowerNormal) {
      return createAlert({
        astronautId,
        timestamp,
        metric,
        severity: 'warning',
        title: `Mild SpO2 desaturation (${value.toFixed(1)}% vs ${mean.toFixed(1)}% baseline)`,
        explanation: `SpO2 has dropped to ${value.toFixed(1)}%, below your baseline of ${mean.toFixed(1)}%. May indicate localized hypoventilation, elevated cabin CO2, or restrictive sleep posture in microgravity.`,
        suggestedAction: 'Check cabin carbon dioxide (ppCO2) scrubbers; perform 5 deep diaphragmatic breaths; ensure sleep station airflow diffuser is unobstructed.',
      })
    }
  }

  // Sleep Hours
  if (metric === 'sleepHours') {
    if (value <= 4.0) {
      return createAlert({
        astronautId,
        timestamp,
        metric,
        severity: 'warning',
        title: `Severe sleep deficit (${value.toFixed(1)}h recorded vs ${mean.toFixed(1)}h baseline)`,
        explanation: `Only ${value.toFixed(1)} hours of sleep recorded, compared to your personal baseline of ${mean.toFixed(1)} hours. Acute sleep deprivation significantly degrades reaction time and spatial disorientation recovery in space.`,
        suggestedAction: 'Schedule a 30-45 minute midday tactical rest countermeasure before any critical robotic or maintenance tasks.',
      })
    }
    if (value < lowerNormal && mean - value >= 1.5) {
      return createAlert({
        astronautId,
        timestamp,
        metric,
        severity: 'watch',
        title: `Short sleep duration (${value.toFixed(1)}h vs ${mean.toFixed(1)}h baseline)`,
        explanation: `Sleep duration was ${(mean - value).toFixed(1)} hours shorter than your typical baseline. Repeated sub-optimal sleep accumulates cognitive debt.`,
        suggestedAction: 'Review bedtime lighting protocol; reduce blue-spectrum lighting 2 hours prior to sleep cycle.',
      })
    }
  }

  // Stress Score
  if (metric === 'stressScore') {
    if (value >= 70 && value > upperCritical) {
      return createAlert({
        astronautId,
        timestamp,
        metric,
        severity: 'warning',
        title: `Elevated physiological stress score (${Math.round(value)}/100)`,
        explanation: `Stress score of ${Math.round(value)} is substantially higher than your personal baseline of ${Math.round(mean)}. High combined cognitive and physiological stress strains crew dynamics and operational stamina.`,
        suggestedAction: 'Engage VR relaxation or crew video conference countermeasure; review daily schedule with mission planner.',
      })
    }
    // Slow build-up that never reaches the absolute level above, but is clearly
    // above this person's own normal for this hour.
    if (value > upperNormal && value - mean >= STRESS_RISE_WATCH) {
      return createAlert({
        astronautId,
        timestamp,
        metric,
        severity: 'watch',
        title: `Stress score rising above personal baseline (${Math.round(value)} vs ${Math.round(mean)})`,
        explanation: `Stress score is ${Math.round(value - mean)} points above your own typical level for this time of day. A steady climb under isolation and confinement often comes before fatigue, irritability and errors.`,
        suggestedAction: 'Review workload and schedule with the mission planner; add a short recovery or crew-contact block today; keep logging mood.',
      })
    }
  }

  // Mood / Psychological
  if (metric === 'mood') {
    if (value <= 2.5 && value < lowerCritical) {
      return createAlert({
        astronautId,
        timestamp,
        metric,
        severity: 'watch',
        title: `Declining mood & morale indicator (${value.toFixed(1)}/5.0)`,
        explanation: `Self-reported mood of ${value.toFixed(1)} has drifted below your personal baseline of ${mean.toFixed(1)}. Long-duration confinement and monotony are known risks for psychological fatigue and mission disengagement.`,
        suggestedAction: 'Connect with family comms link; arrange leisure/audio countermeasure; connect with flight psychology support during private medical conference (PMC).',
      })
    }
    // Gradual decline relative to this person's own norm.
    if (value < lowerNormal && mean - value >= MOOD_DROP_WATCH) {
      return createAlert({
        astronautId,
        timestamp,
        metric,
        severity: 'watch',
        title: `Mood trending below personal baseline (${value.toFixed(1)} vs ${mean.toFixed(1)} of 5)`,
        explanation: `Self-reported mood is ${(mean - value).toFixed(1)} points below your usual level. Slow declines during long isolation are an early sign of morale and psychological fatigue, and are easy to miss day to day.`,
        suggestedAction: 'Schedule a private check-in with flight psychology support; plan a leisure or family-contact block; keep logging mood daily.',
      })
    }
  }

  // Physical Activity
  if (metric === 'activityMinutes') {
    // If daily activity is severely lagging during waking hours
    if (value === 0 && mean > 30) {
      // evaluated daily or per session
      return null
    }
  }

  return null
}

const SEVERITY_RANK: Record<Severity, number> = { info: 0, watch: 1, warning: 2, critical: 3 }

/** Metrics the engine watches, with how many consecutive hourly readings must agree. */
const WATCHED: ReadonlyArray<{ metric: MetricKey; persistence: keyof AlertEngineOptions['persistenceHours'] }> = [
  { metric: 'heartRate', persistence: 'heartRate' },
  { metric: 'hrv', persistence: 'hrv' },
  { metric: 'spo2', persistence: 'spo2' },
  { metric: 'stressScore', persistence: 'stressScore' },
  { metric: 'mood', persistence: 'mood' },
  { metric: 'sleepHours', persistence: 'sleepHours' },
  { metric: 'radiationDoseRate', persistence: 'radiationDoseRate' },
]

export interface AlertEngineOptions extends BandSettings {
  /** Consecutive hourly readings that must be outside normal before alerting (assumptions). */
  persistenceHours: {
    heartRate: number
    hrv: number
    spo2: number
    stressScore: number
    mood: number
    sleepHours: number
    radiationDoseRate: number
  }
  /** Hours of back-to-normal readings that close an episode, so a later one can alert again. */
  episodeResetHours: number
  /** Days at the start of the mission used to learn each person's baseline. */
  baselineDays: number
}

export const DEFAULT_ALERT_OPTIONS: AlertEngineOptions = {
  normalZ: 3,
  criticalZ: 4.5,
  persistenceHours: {
    heartRate: 6,
    hrv: 6,
    spo2: 3,
    stressScore: 12,
    mood: 12,
    // Sleep values describe a whole night, and radiation spikes are acute, so one reading is enough.
    sleepHours: 1,
    radiationDoseRate: 1,
  },
  episodeResetHours: 6,
  baselineDays: 14,
}

/**
 * Scans readings across a mission and returns explainable alerts, one per episode.
 *
 * 1. Each astronaut's baseline is learned from the first `baselineDays` days, separately
 *    for every hour of the day (see computeHourlyBaselines).
 * 2. Every reading is compared with that person's baseline for its own hour.
 * 3. A deviation only alerts once it has lasted `persistenceHours` readings in a row, so
 *    single noisy hours do not alert. The severity is the lowest seen in that run.
 * 4. After an alert the episode stays open: no repeats while it continues, except when
 *    severity gets worse. It closes after `episodeResetHours` of normal readings.
 */
export function generateAlertsForReadings(
  readings: readonly Reading[],
  astronautIds: readonly string[],
  overrides: Partial<AlertEngineOptions> = {},
): Alert[] {
  const opts: AlertEngineOptions = {
    ...DEFAULT_ALERT_OPTIONS,
    ...overrides,
    persistenceHours: { ...DEFAULT_ALERT_OPTIONS.persistenceHours, ...overrides.persistenceHours },
  }
  const alerts: Alert[] = []

  for (const astronautId of astronautIds) {
    const crewReadings = readings
      .filter((r) => r.astronautId === astronautId)
      .sort((a, b) => a.timestamp - b.timestamp)

    if (crewReadings.length < MIN_BASELINE_SAMPLES) continue

    const baselineLength = Math.min(crewReadings.length, Math.max(MIN_BASELINE_SAMPLES, opts.baselineDays * 24))
    const baselineReadings = crewReadings.slice(0, baselineLength)

    for (const { metric, persistence } of WATCHED) {
      const hourly = computeHourlyBaselines(metric, astronautId, baselineReadings, opts)
      if (!hourly) continue

      const need = Math.max(1, opts.persistenceHours[persistence])
      let run: Alert[] = [] // consecutive candidate alerts, most recent last
      let open = false
      let openSeverity = -1
      let quietHours = 0

      for (const reading of crewReadings) {
        const candidate = evaluateReadingForAlert(reading, hourly[new Date(reading.timestamp).getUTCHours()])

        if (!candidate) {
          run = []
          quietHours += 1
          if (open && quietHours >= opts.episodeResetHours) {
            open = false
            openSeverity = -1
          }
          continue
        }

        quietHours = 0
        run.push(candidate)
        if (run.length > need) run.shift()
        if (run.length < need) continue

        // Lowest severity in the run, so one spiky hour cannot make a critical alert.
        const weakest = run.reduce((a, b) => (SEVERITY_RANK[b.severity] < SEVERITY_RANK[a.severity] ? b : a))
        const rank = SEVERITY_RANK[weakest.severity]
        if (!open || rank > openSeverity) {
          alerts.push(
            createAlert({
              astronautId,
              timestamp: reading.timestamp,
              metric,
              severity: weakest.severity,
              title: weakest.title,
              explanation: weakest.explanation,
              suggestedAction: weakest.suggestedAction,
            }),
          )
          open = true
          openSeverity = rank
        }
      }
    }
  }

  return alerts.sort((a, b) => b.timestamp - a.timestamp)
}
