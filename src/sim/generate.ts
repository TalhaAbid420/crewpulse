import { ACTIVITY, METRIC_INFO, NOISE, RHYTHM } from './assumptions'
import { createCrew } from './crew'
import { createRng, deriveSeed, type Rng } from './random'
import { scenarioModifiers } from './scenarios'
import type { Astronaut, MetricKey, Reading, ScenarioEvent } from './types'

const HOURS_PER_DAY = 24
const HOUR_MS = 3_600_000

/** Mission clock start (arbitrary): 2030-01-01 00:00 UTC. Fixed so demos are reproducible. */
export const MISSION_START_MS = Date.UTC(2030, 0, 1)

export interface MissionOptions {
  /** Defaults to the built-in crew of four. */
  crew?: readonly Astronaut[]
  /** Timestamp of mission hour 0, in ms. Defaults to MISSION_START_MS. */
  startTime?: number
}

/**
 * Generate every reading for a mission: one per astronaut per hour, ordered by
 * time and then by crew order.
 *
 * Reproducibility rules:
 * - The same (days, seed, scenarios, options) always give identical output.
 * - Each astronaut and each kind of noise has its own random stream, and
 *   scenarios never draw random numbers. So adding a scenario only changes the
 *   affected astronauts' numbers, and a longer mission starts with exactly the
 *   same readings as a shorter one.
 */
export function generateMission(
  days: number,
  seed: number,
  scenarios: readonly ScenarioEvent[] = [],
  options: MissionOptions = {},
): Reading[] {
  const crew = options.crew ?? createCrew()
  const startTime = options.startTime ?? MISSION_START_MS
  validate(days, seed, scenarios, crew, startTime)

  const states = crew.map((astronaut) => createState(astronaut, seed))
  const readings: Reading[] = []

  for (let hour = 0; hour < days * HOURS_PER_DAY; hour++) {
    for (const state of states) {
      readings.push(simulateHour(state, hour, scenarios, startTime))
    }
  }
  return readings
}

// ---------------------------------------------------------------------------
// Per-astronaut state
// ---------------------------------------------------------------------------

interface AstronautState {
  astronaut: Astronaut
  hourlyRng: Rng
  dailyRng: Rng
  nightlyRng: Rng
  /** Share of a day's activity minutes that falls in each hour (sums to 1). */
  activityWeights: number[]
  /** Slow day-to-day offsets that wander around 0. */
  dayOffset: { heartRate: number; hrv: number; stressScore: number; mood: number }
  /** Multiplier on today's baseline activity (around 1). */
  activityFactor: number
  /** Index of the night held below; night n ends at 07:00 of mission day n + 1. */
  nightIndex: number
  sleepHours: number
  sleepQuality: number
}

function createState(astronaut: Astronaut, seed: number): AstronautState {
  const stream = (name: string) => createRng(deriveSeed(seed, `${astronaut.id}/${name}`))
  return {
    astronaut,
    hourlyRng: stream('hourly'),
    dailyRng: stream('daily'),
    nightlyRng: stream('nightly'),
    activityWeights: activityWeights(astronaut.baseline.exerciseStartHour),
    dayOffset: { heartRate: 0, hrv: 0, stressScore: 0, mood: 0 },
    activityFactor: 1,
    nightIndex: -2, // "no night yet"; the first hour loads night -1
    sleepHours: astronaut.baseline.sleepHours,
    sleepQuality: astronaut.baseline.sleepQuality,
  }
}

/**
 * Spread a day's activity over 24 hours: a 2-hour exercise block holds most of
 * it, the rest is spread evenly over the other waking hours, and nothing
 * happens while asleep.
 */
function activityWeights(exerciseStartHour: number): number[] {
  const weights = new Array<number>(HOURS_PER_DAY).fill(0)
  const exercise = new Set<number>()
  for (let i = 0; i < ACTIVITY.exerciseHours; i++) exercise.add(exerciseStartHour + i)

  const light: number[] = []
  for (let h = RHYTHM.sleepEndHour; h < RHYTHM.sleepStartHour; h++) {
    if (!exercise.has(h)) light.push(h)
  }
  for (const h of exercise) weights[h] = ACTIVITY.exerciseShare / exercise.size
  for (const h of light) weights[h] = (1 - ACTIVITY.exerciseShare) / light.length
  return weights
}

// ---------------------------------------------------------------------------
// One simulated hour
// ---------------------------------------------------------------------------

function simulateHour(
  state: AstronautState,
  hour: number,
  scenarios: readonly ScenarioEvent[],
  startTime: number,
): Reading {
  const { astronaut } = state
  const base = astronaut.baseline
  const hourOfDay = hour % HOURS_PER_DAY
  const day = Math.floor(hour / HOURS_PER_DAY)

  if (hourOfDay === 0) startDay(state, day)
  loadLatestNight(state, hour, scenarios)

  const mod = scenarioModifiers(hour, astronaut.id, scenarios)

  // Always draw the same eight numbers in the same order, whatever the scenarios
  // are, so the random stream stays aligned between runs.
  const rng = state.hourlyRng
  const zHeartRate = rng.gaussian()
  const zHrv = rng.gaussian()
  const zBodyTemp = rng.gaussian()
  const zSpo2 = rng.gaussian()
  const zStress = rng.gaussian()
  const zMood = rng.gaussian()
  const zActivity = rng.gaussian()
  const zDose = rng.gaussian()

  const asleep = hourOfDay >= RHYTHM.sleepStartHour || hourOfDay < RHYTHM.sleepEndHour
  const n = NOISE.hourly

  const heartRate =
    base.restingHeartRate +
    RHYTHM.heartRateAmplitude * rhythm(hourOfDay, RHYTHM.heartRatePeakHour) +
    state.dayOffset.heartRate +
    mod.heartRateAdd +
    n.heartRate * zHeartRate

  // HRV is highest during sleep. A scenario scales the whole value.
  const hrv =
    (base.hrv * (1 + RHYTHM.hrvRelativeAmplitude * rhythm(hourOfDay, RHYTHM.hrvPeakHour)) +
      state.dayOffset.hrv +
      n.hrv * zHrv) *
    mod.hrvMul

  const bodyTemp =
    base.bodyTemp +
    RHYTHM.bodyTempAmplitude * rhythm(hourOfDay, RHYTHM.bodyTempPeakHour) +
    n.bodyTemp * zBodyTemp

  const spo2 = base.spo2 - (asleep ? RHYTHM.spo2SleepDip : 0) + n.spo2 * zSpo2

  const stressScore =
    base.stressScore +
    RHYTHM.stressAmplitude * rhythm(hourOfDay, RHYTHM.stressPeakHour) +
    state.dayOffset.stressScore +
    mod.stressAdd +
    n.stressScore * zStress

  const mood =
    base.mood +
    RHYTHM.moodAmplitude * rhythm(hourOfDay, RHYTHM.moodPeakHour) +
    state.dayOffset.mood +
    mod.moodAdd +
    n.mood * zMood

  const dayActivityMinutes = base.dailyActivityMinutes * state.activityFactor
  const activityMinutes =
    dayActivityMinutes *
    state.activityWeights[hourOfDay] *
    (1 + n.activityRelative * zActivity) *
    mod.activityMul

  const radiationDoseRate = base.radiationDoseRate * (1 + n.doseRelative * zDose) * mod.doseMul

  return {
    astronautId: astronaut.id,
    timestamp: startTime + hour * HOUR_MS,
    missionDay: day + 1,
    heartRate: finish('heartRate', heartRate, 1),
    hrv: finish('hrv', hrv, 1),
    sleepHours: finish('sleepHours', state.sleepHours, 2),
    sleepQuality: finish('sleepQuality', state.sleepQuality, 1),
    stressScore: finish('stressScore', stressScore, 1),
    activityMinutes: finish('activityMinutes', activityMinutes, 1),
    bodyTemp: finish('bodyTemp', bodyTemp, 2),
    spo2: finish('spo2', spo2, 1),
    radiationDoseRate: finish('radiationDoseRate', radiationDoseRate, 3),
    mood: finish('mood', mood, 2),
  }
}

/** Update the slow day-to-day offsets at midnight. */
function startDay(state: AstronautState, day: number): void {
  const d = NOISE.daily
  const rng = state.dailyRng
  const zHeartRate = rng.gaussian()
  const zHrv = rng.gaussian()
  const zStress = rng.gaussian()
  const zMood = rng.gaussian()
  const zActivity = rng.gaussian()

  // Autoregressive wandering: keep part of yesterday's offset and add a fresh
  // nudge, scaled so the long-run spread equals the configured value.
  // Day 0 starts from a typical value instead of exactly 0.
  const step = (previous: number, sd: number, z: number): number =>
    day === 0 ? sd * z : d.persistence * previous + Math.sqrt(1 - d.persistence ** 2) * sd * z

  const o = state.dayOffset
  o.heartRate = step(o.heartRate, d.heartRate, zHeartRate)
  o.hrv = step(o.hrv, d.hrv, zHrv)
  o.stressScore = step(o.stressScore, d.stressScore, zStress)
  o.mood = step(o.mood, d.mood, zMood)
  state.activityFactor = 1 + d.activityRelative * zActivity
}

/**
 * Sleep values describe the last COMPLETED night, so they change at 07:00 and
 * never "know" about a night that hasn't happened yet. Night n runs from 23:00
 * on the evening before mission day n + 1 to 07:00 on mission day n + 1.
 * Before the first morning we use night -1, a pre-mission night.
 * A scenario counts as affecting a night if it is active at the night's midpoint.
 */
function loadLatestNight(
  state: AstronautState,
  hour: number,
  scenarios: readonly ScenarioEvent[],
): void {
  const needed = Math.floor((hour - RHYTHM.sleepEndHour) / HOURS_PER_DAY)
  const base = state.astronaut.baseline
  const nn = NOISE.nightly

  while (state.nightIndex < needed) {
    state.nightIndex += 1
    const n = state.nightIndex
    const zHours = state.nightlyRng.gaussian()
    const zQuality = state.nightlyRng.gaussian()

    const nightStart = n * HOURS_PER_DAY + RHYTHM.sleepStartHour - HOURS_PER_DAY
    const nightEnd = n * HOURS_PER_DAY + RHYTHM.sleepEndHour
    const mod = scenarioModifiers((nightStart + nightEnd) / 2, state.astronaut.id, scenarios)

    state.sleepHours = clamp('sleepHours', base.sleepHours + nn.sleepHours * zHours + mod.sleepHoursAdd)
    state.sleepQuality = clamp(
      'sleepQuality',
      base.sleepQuality + nn.sleepQuality * zQuality + mod.sleepQualityAdd,
    )
  }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Cosine curve: 1 at `peakHour`, -1 twelve hours later. */
function rhythm(hourOfDay: number, peakHour: number): number {
  return Math.cos((2 * Math.PI * (hourOfDay - peakHour)) / HOURS_PER_DAY)
}

function clamp(key: MetricKey, value: number): number {
  const [min, max] = METRIC_INFO[key].limits
  return Math.min(max, Math.max(min, value))
}

/** Clamp to the metric's hard limits, then round. Avoids -0 so equality checks behave. */
function finish(key: MetricKey, value: number, decimals: number): number {
  const factor = 10 ** decimals
  const rounded = Math.round(clamp(key, value) * factor) / factor
  return rounded === 0 ? 0 : rounded
}

function validate(
  days: number,
  seed: number,
  scenarios: readonly ScenarioEvent[],
  crew: readonly Astronaut[],
  startTime: number,
): void {
  if (!Number.isInteger(days) || days < 1) {
    throw new RangeError(`days must be a whole number of at least 1 (got ${days})`)
  }
  if (!Number.isFinite(seed)) {
    throw new RangeError(`seed must be a finite number (got ${seed})`)
  }
  if (!Number.isFinite(startTime)) {
    throw new RangeError(`startTime must be a finite number (got ${startTime})`)
  }

  const ids = new Set(crew.map((a) => a.id))
  if (ids.size !== crew.length) throw new RangeError('crew astronaut ids must be unique')

  const lastExerciseStart = RHYTHM.sleepStartHour - ACTIVITY.exerciseHours
  for (const a of crew) {
    const h = a.baseline.exerciseStartHour
    if (!Number.isInteger(h) || h < RHYTHM.sleepEndHour || h > lastExerciseStart) {
      throw new RangeError(
        `${a.id}: exerciseStartHour must be a whole hour from ${RHYTHM.sleepEndHour} to ${lastExerciseStart} (got ${h})`,
      )
    }
  }

  scenarios.forEach((s, i) => {
    const where = `scenario ${i} (${s.type})`
    if (!Number.isFinite(s.startHour)) throw new RangeError(`${where}: startHour must be a number`)
    if (!Number.isFinite(s.durationHours) || s.durationHours <= 0) {
      throw new RangeError(`${where}: durationHours must be greater than 0`)
    }
    if (s.intensity !== undefined && !(s.intensity >= 0 && s.intensity <= 1)) {
      throw new RangeError(`${where}: intensity must be between 0 and 1`)
    }
    for (const id of s.astronautIds) {
      if (!ids.has(id)) throw new RangeError(`${where}: unknown astronaut id "${id}"`)
    }
  })
}
