// Every number the simulator uses lives here, so nothing is hidden in the logic.
// ALL of these are ASSUMPTIONS, not NASA-verified values. Each one is listed in
// docs/ASSUMPTIONS.md. If you change a value here, update that file too.

import type { BaselineTraits, MetricKey } from './types'

export interface MetricInfo {
  label: string
  unit: string
  /** Hard limits. Generated values are clamped into this range. */
  limits: readonly [number, number]
}

export const METRIC_INFO: Record<MetricKey, MetricInfo> = {
  heartRate: { label: 'Resting heart rate', unit: 'bpm', limits: [35, 140] },
  hrv: { label: 'Heart rate variability (RMSSD)', unit: 'ms', limits: [5, 200] },
  sleepHours: { label: 'Sleep duration', unit: 'hours per night', limits: [2, 10] },
  sleepQuality: { label: 'Sleep quality', unit: 'score 0-100', limits: [0, 100] },
  stressScore: { label: 'Stress score', unit: 'score 0-100', limits: [0, 100] },
  activityMinutes: { label: 'Physical activity', unit: 'minutes per hour', limits: [0, 60] },
  bodyTemp: { label: 'Body temperature', unit: '°C', limits: [35, 40] },
  spo2: { label: 'Blood oxygen saturation (SpO2)', unit: '%', limits: [85, 100] },
  radiationDoseRate: { label: 'Radiation dose rate', unit: 'mSv/day equivalent', limits: [0, 50] },
  mood: { label: 'Mood', unit: 'score 1-5', limits: [1, 5] },
}

/** Range an astronaut's own average (baseline) is chosen from. */
export const TYPICAL_BASELINE_RANGE = {
  restingHeartRate: [50, 75],
  hrv: [30, 90],
  sleepHours: [5.5, 8],
  sleepQuality: [55, 90],
  stressScore: [15, 45],
  dailyActivityMinutes: [60, 150],
  bodyTemp: [36.3, 37.0],
  spo2: [96, 99],
  radiationDoseRate: [0.3, 0.8],
  mood: [3.5, 4.6],
} as const satisfies Record<
  Exclude<keyof BaselineTraits, 'exerciseStartHour'>,
  readonly [number, number]
>

/**
 * Daily rhythm. Hours are mission-clock hours (0-23).
 * Each "peak hour" is when the cosine curve is highest; the lowest point is 12 h later.
 */
export const RHYTHM = {
  sleepStartHour: 23, // asleep from 23:00 ...
  sleepEndHour: 7, // ... until 07:00
  heartRateAmplitude: 4, // bpm
  heartRatePeakHour: 16,
  hrvRelativeAmplitude: 0.15, // fraction of baseline HRV
  hrvPeakHour: 4,
  bodyTempAmplitude: 0.35, // degrees C
  bodyTempPeakHour: 17,
  stressAmplitude: 5, // score points
  stressPeakHour: 14,
  moodAmplitude: 0.12, // mood points
  moodPeakHour: 15,
  spo2SleepDip: 0.4, // percentage points lower while asleep
} as const

/** How a day's activity minutes are spread over the day. */
export const ACTIVITY = {
  exerciseHours: 2, // length of the daily exercise block
  exerciseShare: 0.65, // share of the day's activity inside that block
} as const

/** Random variation. Values are standard deviations unless noted. */
export const NOISE = {
  hourly: {
    heartRate: 1.5, // bpm
    hrv: 3, // ms
    bodyTemp: 0.08, // degrees C
    spo2: 0.35, // percentage points
    stressScore: 4, // points
    mood: 0.08, // points
    activityRelative: 0.15, // fraction of the hour's expected minutes
    doseRelative: 0.08, // fraction of baseline dose rate
  },
  /** Slow day-to-day wandering. Each day keeps `persistence` of the previous day's offset. */
  daily: {
    persistence: 0.6,
    heartRate: 1.5, // bpm
    hrv: 4, // ms
    stressScore: 4, // points
    mood: 0.2, // points
    activityRelative: 0.12, // fraction of baseline daily activity
  },
  nightly: {
    sleepHours: 0.6, // hours
    sleepQuality: 7, // points
  },
} as const

/** Scenario sizes at full intensity (intensity 1). */
export const SCENARIO = {
  solarParticleEvent: {
    peakMultiplier: 12, // dose rate at the peak, times baseline
    riseHoursMax: 2, // rise to the peak takes min(this, 20% of the duration)
    riseFractionOfDuration: 0.2,
    decayTimeConstants: 4, // decays over this many time constants within the duration
  },
  sleepDisruption: {
    sleepHoursLoss: 2.5, // hours per night
    sleepQualityLoss: 25, // points
    recoverHours: 12, // direct sleep effects fade out over this long after the event
    lagHours: 24, // HRV and stress react this long after sleep goes bad
    lagRiseHours: 12, // and take this long to reach full size
    laggedRecoverHours: 48, // then fade out over this long after the lagged window ends
    hrvDropFraction: 0.3, // HRV falls by this fraction
    stressRise: 20, // stress score points
  },
  isolationFatigue: {
    moodDecline: 1.2, // mood points, reached at the end of the event
    stressRise: 18, // stress score points, reached at the end of the event
    recoverHours: 72, // fade out over this long after the event
  },
  exerciseSkipped: {
    activityDropFraction: 0.85, // activity falls by this fraction
    activityRiseHours: 2, // and gets there within this many hours
    activityRecoverHours: 24,
    heartRateDrift: 6, // bpm, reached gradually by the end of the event
    heartRateRecoverHours: 72,
  },
} as const
