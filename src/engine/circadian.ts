import type { MetricKey, Reading } from '../sim'
import { MIN_BASELINE_SAMPLES } from './baseline'
import type { MetricBaseline } from './types'

/** Readings needed for one hour of the day before that hour gets its own baseline. */
export const MIN_SAMPLES_PER_HOUR = 3

// Converts a median absolute deviation into a standard-deviation-like spread
// (exact for normally distributed data).
const MAD_TO_SD = 1.4826

export interface BandSettings {
  /** Distance from the typical value, in spreads, that counts as outside normal. */
  normalZ: number
  /** Distance from the typical value, in spreads, that counts as a critical departure. */
  criticalZ: number
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function quantile(sorted: readonly number[], p: number): number {
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

const r2 = (n: number) => Number(n.toFixed(2))

/**
 * Builds one personal baseline per hour of the day (UTC) for one astronaut and metric.
 *
 * Why per hour: heart rate, HRV, temperature and stress follow a daily rhythm. Comparing
 * a 16:00 reading with an all-day average flags normal afternoons as "elevated".
 * Comparing it with this person's typical 16:00 value does not.
 *
 * Why medians: the baseline window can contain a real event (for example a solar particle
 * event). The median and MAD ignore a few extreme hours, where a mean and standard
 * deviation would be dragged toward them and hide the next event.
 *
 * The spread is measured on the residuals (value minus that hour's typical value), so it
 * describes only unexplained variation, not the daily rhythm. Returns null when there is
 * too little history.
 */
export function computeHourlyBaselines(
  metric: MetricKey,
  astronautId: string,
  baselineReadings: readonly Reading[],
  bands: BandSettings,
): MetricBaseline[] | null {
  const mine = baselineReadings.filter(
    (r) => r.astronautId === astronautId && Number.isFinite(r[metric]),
  )
  if (mine.length < MIN_BASELINE_SAMPLES) return null

  const byHour: number[][] = Array.from({ length: 24 }, () => [])
  for (const r of mine) byHour[new Date(r.timestamp).getUTCHours()].push(r[metric])
  const all = mine.map((r) => r[metric])

  // With under ~3 days of history there is not enough per-hour data, so use one flat baseline.
  const perHour = byHour.every((h) => h.length >= MIN_SAMPLES_PER_HOUR)
  const overallMedian = median(all)
  const center = byHour.map((h) => (perHour ? median(h) : overallMedian))

  const residuals = mine.map((r) => r[metric] - center[new Date(r.timestamp).getUTCHours()])
  const resMedian = median(residuals)
  const mad = median(residuals.map((x) => Math.abs(x - resMedian)))
  const resMean = residuals.reduce((a, b) => a + b, 0) / residuals.length
  const classicSd = Math.sqrt(
    residuals.reduce((a, x) => a + (x - resMean) ** 2, 0) / Math.max(1, residuals.length - 1),
  )
  // Never trust a spread of ~0 (constant data): half the classical SD or a tiny fraction of
  // the value keeps one-off wobble from looking like a huge deviation.
  const spread = Math.max(mad * MAD_TO_SD, 0.5 * classicSd, 0.005 * Math.abs(overallMedian), 1e-6)

  return center.map((c, hour) => {
    const samples = [...(perHour ? byHour[hour] : all)].sort((a, b) => a - b)
    const q25 = quantile(samples, 0.25)
    const q75 = quantile(samples, 0.75)
    return {
      metric,
      astronautId,
      sampleCount: samples.length,
      mean: r2(c), // the typical value for this hour (a median, see above)
      stdDev: r2(spread),
      median: r2(c),
      q25: r2(q25),
      q75: r2(q75),
      iqr: r2(q75 - q25),
      min: r2(samples[0]),
      max: r2(samples[samples.length - 1]),
      lowerNormal: r2(c - bands.normalZ * spread),
      upperNormal: r2(c + bands.normalZ * spread),
      lowerCritical: r2(c - bands.criticalZ * spread),
      upperCritical: r2(c + bands.criticalZ * spread),
    }
  })
}
