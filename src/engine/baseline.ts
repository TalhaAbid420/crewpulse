import { METRIC_KEYS, type MetricKey, type Reading } from '../sim'
import type { MetricBaseline, PersonalBaselines } from './types'

/** Minimum number of readings required to establish a statistically meaningful baseline. */
export const MIN_BASELINE_SAMPLES = 24 // at least 24 hourly readings (1 full day)

/**
 * Calculates personal baseline statistics for a single metric from a series of readings.
 * Returns null if there are insufficient readings.
 */
export function computeMetricBaseline(
  metric: MetricKey,
  astronautId: string,
  readings: readonly Reading[],
): MetricBaseline | null {
  const values = readings
    .filter((r) => r.astronautId === astronautId && typeof r[metric] === 'number' && !isNaN(r[metric]))
    .map((r) => r[metric])

  if (values.length < MIN_BASELINE_SAMPLES) {
    return null
  }

  const n = values.length
  const sum = values.reduce((acc, v) => acc + v, 0)
  const mean = sum / n

  const variance =
    n > 1
      ? values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1)
      : 0
  const stdDev = Math.sqrt(variance)

  const sorted = [...values].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]

  const getPercentile = (p: number): number => {
    const idx = (sorted.length - 1) * p
    const lower = Math.floor(idx)
    const upper = Math.ceil(idx)
    const weight = idx - lower
    return sorted[lower] * (1 - weight) + sorted[upper] * weight
  }

  const median = getPercentile(0.5)
  const q25 = getPercentile(0.25)
  const q75 = getPercentile(0.75)
  const iqr = q75 - q25

  // Normal personal bounds: +/- 1.5 standard deviations (or IQR equivalent)
  // Critical personal bounds: +/- 2.5 standard deviations
  const lowerNormal = mean - 1.5 * stdDev
  const upperNormal = mean + 1.5 * stdDev
  const lowerCritical = mean - 2.5 * stdDev
  const upperCritical = mean + 2.5 * stdDev

  return {
    metric,
    astronautId,
    sampleCount: n,
    mean: Number(mean.toFixed(2)),
    stdDev: Number(stdDev.toFixed(2)),
    median: Number(median.toFixed(2)),
    q25: Number(q25.toFixed(2)),
    q75: Number(q75.toFixed(2)),
    iqr: Number(iqr.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    lowerNormal: Number(lowerNormal.toFixed(2)),
    upperNormal: Number(upperNormal.toFixed(2)),
    lowerCritical: Number(lowerCritical.toFixed(2)),
    upperCritical: Number(upperCritical.toFixed(2)),
  }
}

/**
 * Computes all personal metric baselines for a given astronaut from historical readings.
 */
export function computePersonalBaselines(
  astronautId: string,
  readings: readonly Reading[],
): Partial<PersonalBaselines> {
  const result: Partial<PersonalBaselines> = {}
  for (const metric of METRIC_KEYS) {
    const baseline = computeMetricBaseline(metric, astronautId, readings)
    if (baseline) {
      result[metric] = baseline
    }
  }
  return result
}
